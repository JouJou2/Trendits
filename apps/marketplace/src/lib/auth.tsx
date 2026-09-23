import {
  onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut, type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { postJson } from './api';
import { auth, db } from './firebase';

/**
 * Shopper accounts — the same accounts as the website.
 *
 * Signing up goes through the website's backend so the rules are identical:
 * an emailed code proves the address, the backend creates the account and
 * marks the email proven. Signing in is plain Firebase Auth; if an older
 * account has never proven its email, the app asks for a code, exactly as
 * the website does.
 */

/** Set by the backend once an account's email has been proven. Never expires. */
const emailProven = (claims: Record<string, unknown>) => typeof claims.tfaVerifiedAt === 'number';

export interface Shopper {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'vendor' | 'admin' | 'super_admin';
}

interface AuthValue {
  user: Shopper | null;
  firebaseUser: FirebaseUser | null;
  /** False until the first auth check finishes, so screens don't flash. */
  ready: boolean;
  /** Signed in, but the email has never been proven — ask for a code. */
  needsEmailVerification: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  sendSignupCode: (email: string) => Promise<void>;
  verifySignupCode: (email: string, code: string) => Promise<void>;
  createAccount: (details: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  sendVerificationCode: () => Promise<void>;
  verifyEmailCode: (code: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutShopper: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Shopper | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async current => {
      unsubProfile?.();
      unsubProfile = null;
      setFirebaseUser(current);

      if (!current) {
        setProfile(null);
        setNeedsEmailVerification(false);
        setReady(true);
        return;
      }

      try {
        const token = await current.getIdTokenResult();
        setNeedsEmailVerification(!emailProven(token.claims));
      } catch (err) {
        console.error('Could not read the sign-in token:', err);
      }

      // The profile document carries the name, phone and role.
      unsubProfile = onSnapshot(doc(db, 'users', current.uid), snap => {
        const data = (snap.data() || {}) as Partial<Shopper>;
        setProfile({
          id: current.uid,
          name: data.name || current.displayName || 'Shopper',
          email: data.email || current.email || '',
          phone: data.phone,
          role: data.role || 'user',
        });
        setReady(true);
      }, err => {
        console.error('Could not read your profile:', err);
        setProfile({ id: current.uid, name: current.displayName || 'Shopper', email: current.email || '', role: 'user' });
        setReady(true);
      });
    });

    return () => { unsub(); unsubProfile?.(); };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user: profile,
    firebaseUser,
    ready,
    needsEmailVerification,

    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },

    /** Step 1 of signing up: email a code to prove the address. */
    sendSignupCode: async email => {
      await postJson('/api/signup/send-code', { email: email.trim() });
    },

    /** Step 2: hand the code back to the backend. */
    verifySignupCode: async (email, code) => {
      await postJson('/api/signup/verify-code', { email: email.trim(), code: code.trim() });
    },

    /** Step 3: the backend creates the account; then sign in and save the profile. */
    createAccount: async ({ email, password, name, phone }) => {
      const address = email.trim();
      await postJson('/api/signup/create-account', { email: address, password, name: name.trim() });
      const { user: created } = await signInWithEmailAndPassword(auth, address, password);
      await setDoc(doc(db, 'users', created.uid), {
        name: name.trim(),
        email: address,
        ...(phone?.trim() ? { phone: phone.trim() } : {}),
        role: 'user',
        createdAt: new Date().toISOString(),
      });
    },

    /** For an older account whose email was never proven. */
    sendVerificationCode: async () => {
      await postJson('/api/2fa/send-code', {}, { authenticated: true });
    },

    verifyEmailCode: async code => {
      await postJson('/api/2fa/verify-code', { code: code.trim() }, { authenticated: true });
      // Force a refresh so the new claim is visible straight away.
      const refreshed = await auth.currentUser?.getIdTokenResult(true);
      setNeedsEmailVerification(!refreshed || !emailProven(refreshed.claims));
    },

    resetPassword: async email => {
      await sendPasswordResetEmail(auth, email.trim());
    },

    signOutShopper: async () => {
      await signOut(auth);
    },
  }), [profile, firebaseUser, ready, needsEmailVerification]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** Mirrors backend/src/passwordPolicy.ts, so the app rejects what the server would. */
export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'One number', test: pw => /[0-9]/.test(pw) },
  { label: 'One special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

export const isPasswordStrong = (pw: string) => PASSWORD_RULES.every(rule => rule.test(pw));

/** Firebase's sign-in errors, in words a shopper can act on. */
export const describeAuthError = (error: unknown): string => {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'That email or password is not right.';
  }
  if (code.includes('invalid-email')) return 'That email address does not look right.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a minute and try again.';
  if (code.includes('network')) return 'No connection. Check your internet and try again.';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
};
