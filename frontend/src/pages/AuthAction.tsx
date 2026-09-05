import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Circle } from 'lucide-react';

/**
 * Branded handler for Firebase's email action links (password reset, email
 * verification, email-change revert). Firebase points here instead of its own
 * generic page once the custom action URL is set in the console.
 *
 * Firebase appends: ?mode=<action>&oobCode=<code>&apiKey=...&continueUrl=...
 */

const PASSWORD_REQUIREMENTS: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'One number', test: pw => /[0-9]/.test(pw) },
  { label: 'One special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12 px-4">
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">{children}</div>
  </div>
);

const Spinner = ({ label }: { label: string }) => (
  <Shell>
    <div className="text-center py-6">
      <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </Shell>
);

const Failed = ({ message }: { message: string }) => (
  <Shell>
    <div className="text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <AlertCircle className="w-7 h-7 text-red-600" />
      </div>
      <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">Link not valid</h1>
      <p className="text-sm text-slate-500 mb-6">{message}</p>
      <Link
        to="/login"
        className="inline-flex justify-center items-center py-3 px-6 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        Back to sign in
      </Link>
    </div>
  </Shell>
);

export const AuthAction = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  const [status, setStatus] = useState<'checking' | 'ready' | 'done' | 'error'>('checking');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const passwordValid = PASSWORD_REQUIREMENTS.every(r => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirm;

  useEffect(() => {
    if (!oobCode || !mode) {
      setStatus('error');
      setError('This link is missing required information.');
      return;
    }

    (async () => {
      try {
        if (mode === 'resetPassword') {
          // Validates the code and tells us which account it belongs to.
          const addr = await verifyPasswordResetCode(auth, oobCode);
          setEmail(addr);
          setStatus('ready');
        } else if (mode === 'verifyEmail') {
          await applyActionCode(auth, oobCode);
          setStatus('done');
        } else if (mode === 'recoverEmail') {
          const info = await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          setEmail(info.data.email || '');
          setStatus('done');
        } else {
          setStatus('error');
          setError('Unsupported action.');
        }
      } catch {
        setStatus('error');
        setError('This link has expired or has already been used. Request a new one.');
      }
    })();
  }, [mode, oobCode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch || !oobCode) return;
    setSaving(true);
    setError('');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus('done');
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Could not reset the password. The link may have expired.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'checking') return <Spinner label="Checking your link..." />;
  if (status === 'error') return <Failed message={error} />;

  if (status === 'done') {
    const heading =
      mode === 'resetPassword' ? 'Password updated'
      : mode === 'verifyEmail' ? 'Email verified'
      : 'Email change reverted';
    const body =
      mode === 'resetPassword' ? 'You can now sign in with your new password.'
      : mode === 'verifyEmail' ? 'Thanks — your email address is confirmed.'
      : `Your account has been restored to ${email || 'your previous address'}.`;

    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">{heading}</h1>
          <p className="text-sm text-slate-500 mb-6">{body}</p>
          <Link
            to="/login"
            className="inline-flex justify-center items-center py-3 px-6 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Continue to sign in
          </Link>
        </div>
      </Shell>
    );
  }

  // status === 'ready' — password reset form
  return (
    <Shell>
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">Choose a new password</h1>
        <p className="text-sm text-slate-500">
          for <span className="font-semibold text-slate-700">{email}</span>
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleReset}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={saving}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow disabled:bg-gray-50"
              placeholder="........"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              disabled={saving}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow disabled:bg-gray-50"
              placeholder="........"
            />
          </div>
          {confirm.length > 0 && !passwordsMatch && (
            <p className="text-red-600 text-xs mt-1">Passwords do not match.</p>
          )}
        </div>

        <ul className="space-y-1">
          {PASSWORD_REQUIREMENTS.map(req => {
            const met = req.test(password);
            return (
              <li key={req.label} className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-slate-400'}`}>
                {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                {req.label}
              </li>
            );
          })}
        </ul>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving || !passwordValid || !passwordsMatch}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </Shell>
  );
};
