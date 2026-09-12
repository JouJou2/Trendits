import { Router } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { adminAuth, adminDb, adminBucket, STORAGE_BUCKET } from '../firebaseAdmin.js';
import { isPasswordValid, PASSWORD_REQUIREMENTS } from '../passwordPolicy.js';
import { sniffImageType } from '../safeImageFetch.js';
import { requireAuth, type AuthedRequest } from '../requireAuth.js';
import { rateLimit } from '../rateLimit.js';
import { randomUUID } from 'node:crypto';

export const vendorInviteRouter = Router();

const INVITE_TTL_DAYS = 7;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const INVITES = 'vendorInvites';

/**
 * Admin-issued onboarding for a new vendor.
 *
 * An invite link lets whoever holds it set the password on a real account, so
 * the token is treated as a credential: 32 random bytes, stored only as a
 * SHA-256 hash, single use, and expiring. A leak of the Firestore collection
 * therefore hands an attacker nothing usable.
 */

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Constant-time compare so a wrong token cannot be found by timing. */
const hashesMatch = (a: string, b: string) => {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
};

interface InviteDoc {
  emailLower: string;
  uid: string;
  tokenHash: string;
  storeName: string;
  expiresAt: string;
  usedAt: string | null;
  createdBy: string;
  createdAt: string;
}

/** Loads an invite by raw token, or explains why it cannot be used. */
const loadInvite = async (token: unknown): Promise<{ id: string; data: InviteDoc } | { error: string }> => {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return { error: 'This invite link is not valid.' };
  }

  const tokenHash = hashToken(token);
  const snap = await adminDb.collection(INVITES).where('tokenHash', '==', tokenHash).limit(1).get();
  if (snap.empty) return { error: 'This invite link is not valid.' };

  const doc = snap.docs[0];
  const data = doc.data() as InviteDoc;

  if (!hashesMatch(data.tokenHash, tokenHash)) return { error: 'This invite link is not valid.' };
  if (data.usedAt) return { error: 'This invite link has already been used. Ask Trendit for a new one.' };
  if (new Date(data.expiresAt).getTime() < Date.now()) {
    return { error: 'This invite link has expired. Ask Trendit for a new one.' };
  }

  return { id: doc.id, data };
};

/** Stores a data: URL image and returns its permanent URL. */
const storeDataUrlImage = async (dataUrl: string, prefix: string): Promise<string> => {
  const match = /^data:([a-z/+-]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error('That image could not be read.');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error('Images must be 5MB or smaller.');

  // Trust the bytes, never the declared type.
  const sniffed = sniffImageType(buffer);
  if (!sniffed) throw new Error('That file is not a supported image.');
  const extension = sniffed.split('/')[1].replace('jpeg', 'jpg');

  const objectPath = `${prefix}/${randomUUID()}.${extension}`;
  const downloadToken = randomUUID();

  await adminBucket.file(objectPath).save(buffer, {
    resumable: false,
    contentType: sniffed,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/`
    + `${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;
};

// ── 1. Admin creates the invite ─────────────────────────────────────────────

vendorInviteRouter.post('/invite', requireAuth({ staffOnly: true }), async (req: AuthedRequest, res) => {
  const { email, storeName } = (req.body ?? {}) as { email?: unknown; storeName?: unknown };

  // Only full admins may mint these — a vendor must not be able to create logins.
  const callerSnap = await adminDb.collection('users').doc(req.uid || '').get();
  const callerRole = (callerSnap.data() as { role?: string } | undefined)?.role;
  if (!['admin', 'super_admin'].includes(callerRole || '')) {
    return res.status(403).json({ error: 'Only admins can invite vendors.' });
  }

  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Enter a valid email address for the vendor.' });
  }
  const emailLower = email.trim().toLowerCase();
  const store = typeof storeName === 'string' ? storeName.trim().slice(0, 100) : '';

  try {
    // Reuse the account if it exists, otherwise create it with a password the
    // vendor never learns — the invite is what lets them set a real one.
    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(emailLower);
      uid = existing.uid;
    } catch {
      const created = await adminAuth.createUser({
        email: emailLower,
        password: randomBytes(32).toString('base64url'),
        emailVerified: false,
      });
      uid = created.uid;
    }

    // Any earlier unused invite for this account is void from now on.
    const stale = await adminDb.collection(INVITES).where('uid', '==', uid).where('usedAt', '==', null).get();
    await Promise.all(stale.docs.map(d => d.ref.update({ usedAt: new Date().toISOString(), voided: true })));

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();

    await adminDb.collection(INVITES).add({
      emailLower,
      uid,
      tokenHash: hashToken(token),
      storeName: store,
      expiresAt,
      usedAt: null,
      createdBy: req.uid || 'unknown',
      createdAt: new Date().toISOString(),
    } satisfies InviteDoc);

    // The raw token is returned exactly once, to the admin who asked for it.
    return res.json({ token, email: emailLower, expiresAt, expiresInDays: INVITE_TTL_DAYS });
  } catch (err) {
    console.error('Vendor invite failed:', err);
    return res.status(500).json({ error: 'Could not create the invite.' });
  }
});

// ── 2. Vendor opens the link ────────────────────────────────────────────────

vendorInviteRouter.post('/invite/verify', rateLimit({ windowMs: 60_000, max: 20, name: 'invite-verify' }), async (req, res) => {
  const result = await loadInvite((req.body ?? {}).token);
  if ('error' in result) return res.status(400).json({ error: result.error });

  return res.json({
    email: result.data.emailLower,
    storeName: result.data.storeName,
    passwordRequirements: PASSWORD_REQUIREMENTS.map(r => r.label),
  });
});

// ── 3. Vendor finishes the wizard ───────────────────────────────────────────

vendorInviteRouter.post('/invite/complete', rateLimit({ windowMs: 60_000, max: 10, name: 'invite-complete' }), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = await loadInvite(body.token);
  if ('error' in result) return res.status(400).json({ error: result.error });

  const { id: inviteId, data: invite } = result;
  const password = typeof body.password === 'string' ? body.password : '';
  const storeName = String(body.storeName ?? '').trim();
  const recoveryEmail = String(body.recoveryEmail ?? '').trim().toLowerCase();

  if (!isPasswordValid(password)) {
    return res.status(400).json({ error: 'Password does not meet the requirements.' });
  }
  if (!storeName) {
    return res.status(400).json({ error: 'Store name is required.' });
  }
  if (recoveryEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recoveryEmail)) {
    return res.status(400).json({ error: 'Enter a valid personal email address.' });
  }
  if (recoveryEmail === invite.emailLower) {
    return res.status(400).json({ error: 'Your personal email must be different from your store login email.' });
  }

  try {
    // Claim the invite first: if two tabs submit at once, only one wins.
    const claimed = await adminDb.runTransaction(async tx => {
      const ref = adminDb.collection(INVITES).doc(inviteId);
      const fresh = await tx.get(ref);
      if (!fresh.exists || (fresh.data() as InviteDoc).usedAt) return false;
      tx.update(ref, { usedAt: new Date().toISOString() });
      return true;
    });
    if (!claimed) {
      return res.status(400).json({ error: 'This invite link has already been used.' });
    }

    const logoUrl = typeof body.logo === 'string' && body.logo.startsWith('data:')
      ? await storeDataUrlImage(body.logo, 'vendor-logos') : '';
    const bannerUrl = typeof body.banner === 'string' && body.banner.startsWith('data:')
      ? await storeDataUrlImage(body.banner, 'vendor-banners') : '';

    await adminAuth.updateUser(invite.uid, { password, emailVerified: true });

    const now = new Date().toISOString();
    const ownerName = String(body.ownerName ?? '').trim().slice(0, 100);

    await adminDb.collection('users').doc(invite.uid).set({
      name: ownerName || storeName,
      email: invite.emailLower,
      phone: String(body.phone ?? '').trim().slice(0, 30),
      recoveryEmail,
      role: 'vendor',
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    await adminDb.collection('vendors').doc(invite.uid).set({
      id: invite.uid,
      name: storeName,
      description: String(body.description ?? '').trim().slice(0, 2000),
      location: String(body.location ?? '').trim().slice(0, 200),
      category: String(body.category ?? '').trim().slice(0, 100),
      phone: String(body.phone ?? '').trim().slice(0, 30),
      image: logoUrl,
      bannerImage: bannerUrl,
      ownerId: invite.uid,
      ownerName: ownerName || storeName,
      email: invite.emailLower,
      recoveryEmail,
      // Never self-activate: an admin approves the store before it can sell.
      status: 'pending',
      rating: 0,
      productCount: 0,
      totalProducts: 0,
      totalSales: 0,
      orderCount: 0,
      commissionRate: 8,
      joinedDate: new Date().toLocaleDateString(),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    // Marks the account as already email-proven so the 2FA gate does not
    // immediately challenge someone who just proved themselves via the invite.
    await adminAuth.setCustomUserClaims(invite.uid, { tfaVerifiedAt: Date.now() });

    // Signs them straight in at the end of the wizard.
    const customToken = await adminAuth.createCustomToken(invite.uid);

    return res.json({ customToken, storeName, email: invite.emailLower });
  } catch (err) {
    console.error('Vendor setup failed:', err);
    const message = err instanceof Error && /image/i.test(err.message) ? err.message : 'Could not finish setting up the store.';
    return res.status(500).json({ error: message });
  }
});

// ── 4. Password reset that reaches the vendor's personal inbox ──────────────

vendorInviteRouter.post('/reset', rateLimit({ windowMs: 15 * 60_000, max: 5, name: 'vendor-reset' }), async (req, res) => {
  const email = String((req.body ?? {}).email ?? '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Enter your store email.' });

  // Always answer the same way, so this cannot be used to discover which
  // addresses have accounts.
  const genericOk = { ok: true, message: 'If that store exists, we have sent a reset link to its recovery email.' };

  try {
    const user = await adminAuth.getUserByEmail(email).catch(() => null);
    if (!user) return res.json(genericOk);

    const profile = await adminDb.collection('users').doc(user.uid).get();
    const recoveryEmail = (profile.data() as { recoveryEmail?: string } | undefined)?.recoveryEmail;
    if (!recoveryEmail) return res.json(genericOk);

    const link = await adminAuth.generatePasswordResetLink(email);

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      console.error('Vendor reset: email is not configured.');
      return res.json(genericOk);
    }

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: recoveryEmail,
      subject: 'Reset your Trendit store password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#10162f">
          <h2 style="color:#0452c8;margin-bottom:4px">Reset your store password</h2>
          <p style="color:#5a6478;font-size:14px;margin-top:0">
            A password reset was requested for the Trendit store account
            <strong>${email}</strong>.
          </p>
          <p style="margin:26px 0">
            <a href="${link}" style="background:#0452c8;color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:600;display:inline-block">
              Choose a new password
            </a>
          </p>
          <p style="color:#8b94a8;font-size:12.5px">
            If you did not ask for this, you can ignore this email and your password stays the same.
          </p>
        </div>`,
    });

    return res.json(genericOk);
  } catch (err) {
    console.error('Vendor reset failed:', err);
    return res.json(genericOk);
  }
});
