import React, { useState } from 'react';
import { User as UserIcon, Phone, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isValidPhone, PHONE_HINT } from '../utils/phone';

const inputClass =
  'block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-shadow disabled:bg-gray-50';

/**
 * Google sign-in never asks for a phone number, and older accounts predate the
 * field — so anyone missing it is asked once, here, before they can use the app.
 */
export const ProfileCompletionGate = () => {
  const { user, completeProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name && user.name !== 'User' ? user.name : '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = name.trim().length > 0 && isValidPhone(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      await completeProfile(name, phone);
    } catch (err) {
      console.error('Profile completion failed:', err);
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <UserIcon className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Complete your profile</h2>
          <p className="text-gray-500 text-sm">
            We just need your name and a phone number so we can deliver your orders.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className={inputClass}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                className={inputClass}
                placeholder={PHONE_HINT}
              />
            </div>
            {phone.length > 0 && !isValidPhone(phone) && (
              <p className="text-red-600 text-xs mt-1">Enter a valid phone number.</p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>

        <button onClick={logout} className="mt-6 w-full text-xs text-gray-400 hover:text-gray-700">
          Sign out
        </button>
      </div>
    </div>
  );
};
