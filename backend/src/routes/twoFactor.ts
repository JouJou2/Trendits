import { Router } from 'express';
import { Resend } from 'resend';
import { adminAuth } from '../firebaseAdmin.js';
import { OtpStore } from '../otpStore.js';

const router = Router();
const pendingCodes = new OtpStore();

router.post('/send-code', async (req, res) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    return res.status(400).json({ error: 'Missing idToken.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return res.status(500).json({ error: 'Email sending is not configured on the server.' });
  }

  try {
    // Verifying the token (rather than trusting a client-supplied uid/email) is
    // what makes this safe — the code always goes to the address on the actual
    // Firebase account, never one the caller supplies.
    const decoded = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decoded;
    if (!email) {
      return res.status(400).json({ error: 'Account has no email address on file.' });
    }

    const waitSeconds = pendingCodes.checkCooldown(uid);
    if (waitSeconds) {
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting another code.` });
    }

    const code = pendingCodes.issue(uid);

    const resend = new Resend(resendApiKey);
    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your Trendit verification code: ${code}`,
      html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    });

    if (sendError) {
      console.error('Resend send error:', sendError);
      return res.status(500).json({ error: 'Failed to send verification email.' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('send-code error:', error);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { idToken, code } = req.body as { idToken?: string; code?: string };
  if (!idToken || !code) {
    return res.status(400).json({ error: 'Missing idToken or code.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const result = pendingCodes.verify(uid, code);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    // Merge with any existing claims rather than overwrite them wholesale.
    const user = await adminAuth.getUser(uid);
    await adminAuth.setCustomUserClaims(uid, {
      ...(user.customClaims || {}),
      tfaVerifiedAt: Math.floor(Date.now() / 1000),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('verify-code error:', error);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
});

export const twoFactorRouter = router;
