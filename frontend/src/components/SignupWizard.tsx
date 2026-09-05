import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Phone, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { requestSignupCode, verifySignupCode, createSignupAccount } from '../services/signupApi';
import { isValidPhone, PHONE_HINT } from '../utils/phone';

type Step = 'email' | 'code' | 'password' | 'profile';
const STEPS: Step[] = ['email', 'code', 'password', 'profile'];

const PASSWORD_REQUIREMENTS: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const inputClass = 'block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow disabled:bg-gray-50';
const primaryButtonClass = 'w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

interface SignupWizardProps {
  onDone: () => void;
}

export const SignupWizard = ({ onDone }: SignupWizardProps) => {
  const { finalizeSignup } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = PASSWORD_REQUIREMENTS.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestSignupCode(email.trim());
      toast.success('Verification code sent to your email.');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    try {
      await requestSignupCode(email.trim());
      toast.success('Code re-sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await verifySignupCode(email.trim(), code.trim());
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid || !passwordsMatch) return;
    setError('');
    setStep('profile');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidPhone(phone)) return;
    setLoading(true);
    setError('');
    try {
      await createSignupAccount(email.trim(), password, name.trim());
      await finalizeSignup(email.trim(), password, name.trim(), phone);
      toast.success('Account created successfully!');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 w-8 rounded-full transition-colors ${
              step === s ? 'bg-blue-600' : STEPS.indexOf(step) > i ? 'bg-blue-300' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {step === 'email' && (
        <form className="space-y-6" onSubmit={handleSendCode}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="space-y-6" onSubmit={handleVerifyCode}>
          <p className="text-sm text-gray-500 text-center">
            We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span>.
          </p>
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
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading || code.length !== 6} className={primaryButtonClass}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="w-full text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
          >
            Didn't get it? Resend code
          </button>
        </form>
      )}

      {step === 'password' && (
        <form className="space-y-6" onSubmit={handlePasswordContinue}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-red-600 text-xs mt-1">Passwords do not match.</p>
            )}
          </div>
          <ul className="space-y-1">
            {PASSWORD_REQUIREMENTS.map((req) => {
              const met = req.test(password);
              return (
                <li key={req.label} className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}>
                  {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {req.label}
                </li>
              );
            })}
          </ul>
          <button type="submit" disabled={!passwordValid || !passwordsMatch} className={primaryButtonClass}>
            Continue
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form className="space-y-6" onSubmit={handleCreateAccount}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder="John Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className={inputClass}
                placeholder={PHONE_HINT}
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading || !name.trim() || !isValidPhone(phone)} className={primaryButtonClass}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  );
};
