import type { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin.js';

export interface AuthedRequest extends Request {
  uid?: string;
  email?: string;
}

/**
 * Verifies the caller's Firebase ID token, and optionally that they hold a
 * staff role. Role is read from Firestore rather than the client, so a user
 * can't grant themselves access by editing anything locally.
 */
export const requireAuth = (opts: { staffOnly?: boolean } = {}) => {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const bodyToken = (req.body as { idToken?: string } | undefined)?.idToken;
    const token = header.startsWith('Bearer ') ? header.slice(7) : bodyToken;

    if (!token) {
      return res.status(401).json({ error: 'Sign in required.' });
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      req.uid = decoded.uid;
      req.email = decoded.email;

      if (opts.staffOnly) {
        const snap = await adminDb.collection('users').doc(decoded.uid).get();
        const role = (snap.data() as { role?: string } | undefined)?.role;
        if (!['vendor', 'admin', 'super_admin'].includes(role || '')) {
          return res.status(403).json({ error: 'Not authorised.' });
        }
      }

      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
  };
};
