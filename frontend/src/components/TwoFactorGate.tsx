import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const TwoFactorGate = () => {
  const { user, logout, sendTwoFactorCode, verifyTwoFactorCode } = useAuth();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      await sendTwoFactorCode();
      setSent(true);
      toast.success('Verification code sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      await verifyTwoFactorCode(code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Verify it's you</h2>
        <p className="text-gray-500 text-sm mb-6">
          {sent ? (
            <>We sent a 6-digit code to <span className="font-semibold text-gray-700">{user?.email}</span>. Enter it below to continue.</>
          ) : (
            <>For your security, we'll email a verification code to <span className="font-semibold text-gray-700">{user?.email}</span>.</>
          )}
        </p>

        {!sent ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {sending ? 'Sending...' : 'Send Verification Code'}
          </button>
        ) : (
          <form className="space-y-4" onSubmit={handleVerify}>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="block w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow"
            />

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {verifying ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {sending ? 'Sending...' : "Didn't get it? Resend code"}
            </button>
          </form>
        )}

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

        <button onClick={logout} className="mt-6 text-xs text-gray-400 hover:text-gray-700">
          Sign out
        </button>
      </div>
    </div>
  );
};
