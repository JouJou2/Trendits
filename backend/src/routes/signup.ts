import { Router } from 'express';
import { Resend } from 'resend';
import { adminAuth } from '../firebaseAdmin.js';
import { OtpStore } from '../otpStore.js';
import { isPasswordValid } from '../passwordPolicy.js';

const router = Router();
const pendingCodes = new OtpStore();

// Emails that have passed the code check, valid for a short window in which
// /create-account must be called — keeps "verify" and "create" as separate
// steps without holding the verification open indefinitely.
const verifiedEmails = new Map<string, number>();
const VERIFIED_TTL_MS = 15 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

router.post('/send-code', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return res.status(500).json({ error: 'Email sending is not configured on the server.' });
  }

  const normalized = normalizeEmail(email);

  try {
    // An existing account means this person should log in, not sign up again.
    await adminAuth.getUserByEmail(normalized);
    return res.status(400).json({ error: 'An account with this email already exists. Try logging in instead.' });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') {
      console.error('getUserByEmail error:', error);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }

  const waitSeconds = pendingCodes.checkCooldown(normalized);
  if (waitSeconds) {
    return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another code.` });
  }

  const code = pendingCodes.issue(normalized);

  const resend = new Resend(resendApiKey);
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: normalized,
    subject: `Your Trendit verification code: ${code}`,
    html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });

  if (sendError) {
    console.error('Resend send error:', sendError);
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }

  return res.json({ success: true });
});

router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email || !code) {
    return res.status(400).json({ error: 'Missing email or code.' });
  }

  const normalized = normalizeEmail(email);
  const result = pendingCodes.verify(normalized, code);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  verifiedEmails.set(normalized, Date.now() + VERIFIED_TTL_MS);
  return res.json({ success: true });
});

router.post('/create-account', async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const normalized = normalizeEmail(email);
  const verifiedUntil = verifiedEmails.get(normalized);
  if (!verifiedUntil || Date.now() > verifiedUntil) {
    return res.status(400).json({ error: 'Please verify your email before creating an account.' });
  }
  if (!isPasswordValid(password)) {
    return res.status(400).json({ error: 'Password does not meet the requirements.' });
  }
  if (name.trim().length === 0 || name.length > 100) {
    return res.status(400).json({ error: 'Enter a valid name.' });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: normalized,
      password,
      displayName: name.trim(),
    });
    // They just proved ownership of this email via the code above, so there's
    // no need to make them verify again immediately after signing in.
    await adminAuth.setCustomUserClaims(userRecord.uid, { tfaVerifiedAt: Math.floor(Date.now() / 1000) });
    verifiedEmails.delete(normalized);
    return res.json({ success: true });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    console.error('create-account error:', error);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

export const signupRouter = router;
