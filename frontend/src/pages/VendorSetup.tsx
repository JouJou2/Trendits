import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Store, Image as ImageIcon,
  ShieldCheck, MapPin, Mail, AlertCircle, PartyPopper, Upload, X,
} from 'lucide-react';
import { auth } from '../services/firebase';
import {
  verifyVendorInvite, completeVendorSetup, type InviteDetails,
} from '../services/vendorInviteApi';

/** Mirrors backend/src/passwordPolicy.ts so the checklist updates as they type. */
const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'One number', test: pw => /[0-9]/.test(pw) },
  { label: 'One special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

const CATEGORIES = [
  'Fashion', 'Beauty', 'Electronics', 'Home & Living',
  'Grocery', 'Kids & Toys', 'Handmade', 'Other',
];

const LEBANON_ZONES = [
  'Beirut', 'Mount Lebanon', 'North Lebanon', 'Akkar',
  'Beqaa', 'Baalbek-Hermel', 'South Lebanon', 'Nabatieh',
];

/**
 * Shrinks an image in the browser before it is sent, so a vendor photographing
 * a shopfront on their phone does not post a 12MB payload.
 */
const fileToResizedDataUrl = (file: File, maxWidth: number, maxHeight: number): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not process that image.'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

interface FormState {
  password: string;
  confirmPassword: string;
  ownerName: string;
  phone: string;
  recoveryEmail: string;
  storeName: string;
  category: string;
  location: string;
  description: string;
  logo: string;
  banner: string;
}

export const VendorSetup: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState('');
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  const [form, setForm] = useState<FormState>({
    password: '', confirmPassword: '', ownerName: '', phone: '', recoveryEmail: '',
    storeName: '', category: '', location: '', description: '', logo: '', banner: '',
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) { setLoadError('This link is missing its invite code.'); setChecking(false); return; }
    verifyVendorInvite(token)
      .then(details => {
        setInvite(details);
        setForm(prev => ({ ...prev, storeName: details.storeName || '' }));
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'This invite link is not valid.'))
      .finally(() => setChecking(false));
  }, [token]);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map(rule => ({ label: rule.label, ok: rule.test(form.password) })),
    [form.password],
  );
  const passwordStrong = passwordChecks.every(c => c.ok);

  const handleImage = async (
    e: React.ChangeEvent<HTMLInputElement>, kind: 'logo' | 'banner',
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = kind === 'logo'
        ? await fileToResizedDataUrl(file, 512, 512)
        : await fileToResizedDataUrl(file, 1600, 600);
      set(kind, dataUrl);
      setSubmitError('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'That image could not be used.');
    }
  };

  // ── Steps ─────────────────────────────────────────────────────────────────
  const steps = [
    { key: 'welcome', title: 'Welcome to Trendit', valid: () => true },
    { key: 'password', title: 'Create your password', valid: () => passwordStrong && form.password === form.confirmPassword },
    // Phone is required, not optional: AuthContext blocks any non-admin without
    // one, so leaving it blank would strand the vendor on the profile-completion
    // gate the moment this wizard signs them in.
    { key: 'contact', title: 'Your contact details', valid: () =>
        form.ownerName.trim().length > 1
        && form.phone.trim().length >= 6
        && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.recoveryEmail.trim())
        && form.recoveryEmail.trim().toLowerCase() !== (invite?.email || '') },
    { key: 'store', title: 'About your store', valid: () => form.storeName.trim().length > 1 && !!form.category && !!form.location },
    { key: 'description', title: 'Describe what you sell', valid: () => true },
    { key: 'images', title: 'Your logo and banner', valid: () => true },
  ];

  const isLast = step === steps.length - 1;
  const canAdvance = steps[step]?.valid();

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await completeVendorSetup({
        token,
        password: form.password,
        storeName: form.storeName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        recoveryEmail: form.recoveryEmail.trim(),
        description: form.description.trim(),
        location: form.location,
        category: form.category,
        logo: form.logo,
        banner: form.banner,
      });
      // Signs them in immediately — no second login after finishing the wizard.
      await signInWithCustomToken(auth, result.customToken);
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [token, form]);

  // ── Gates ─────────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900">This link can't be used</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{loadError}</p>
          <p className="text-xs text-slate-400 mt-6">
            Contact Trendit and ask for a fresh invite link.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-5">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-9 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <PartyPopper className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Profile Setup Complete</h1>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            Welcome aboard, <span className="font-semibold text-slate-700">{form.storeName}</span>.
            You're signed in and your store has been sent to Trendit for approval —
            you can start adding products straight away.
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="mt-7 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* progress */}
      <div className="px-5 pt-7 pb-5 max-w-xl w-full mx-auto">
        <div className="flex items-center gap-1.5">
          {steps.map((s, index) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                index <= step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3">
          Step {step + 1} of {steps.length}
        </p>
      </div>

      <div className="flex-1 px-5 pb-8 max-w-xl w-full mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-9">

          {/* 0 — Welcome */}
          {step === 0 && (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Store className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900 leading-tight">
                Welcome to Trendit
              </h1>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                Trendit is Lebanon's marketplace for local sellers. We've created your
                store account for <span className="font-semibold text-slate-700">{invite?.email}</span> —
                this short setup gets your shop ready.
              </p>

              <div className="mt-7 space-y-3.5">
                {[
                  { icon: ShieldCheck, title: 'Choose a password', text: 'Your email is already set up, so you only pick a password.' },
                  { icon: Mail, title: 'Add a personal email', text: 'Used for password resets, so you are never locked out.' },
                  { icon: Store, title: 'Tell us about your store', text: 'Name, what you sell, and where you are based.' },
                  { icon: ImageIcon, title: 'Add your logo and banner', text: 'This is what shoppers see on your store page.' },
                ].map(item => (
                  <div key={item.title} className="flex gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                      <item.icon className="w-4.5 h-4.5 text-slate-500" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-400 mt-7">Takes about three minutes.</p>
            </div>
          )}

          {/* 1 — Password */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Create your password</h1>
              <p className="text-sm text-slate-500 mt-2">
                You'll sign in with <span className="font-semibold text-slate-700">{invite?.email}</span>.
              </p>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-7 mb-2">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="Choose a strong password"
              />

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-5 mb-2">Confirm password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="Type it again"
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-rose-600 mt-2">Those two passwords don't match.</p>
              )}

              <div className="mt-6 space-y-2">
                {passwordChecks.map(check => (
                  <div key={check.label} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${check.ok ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      {check.ok && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
                    </div>
                    <span className={`text-xs ${check.ok ? 'text-slate-600' : 'text-slate-400'}`}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2 — Contact */}
          {step === 2 && (
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Your contact details</h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Your personal email is where we send password resets — keep it different
                from your store login so you can always get back in.
              </p>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-7 mb-2">Your name</label>
              <input
                value={form.ownerName}
                onChange={e => set('ownerName', e.target.value)}
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="e.g. Rana Haddad"
              />

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-5 mb-2">Personal email</label>
              <input
                type="email"
                value={form.recoveryEmail}
                onChange={e => set('recoveryEmail', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="you@gmail.com"
              />
              {form.recoveryEmail.trim().toLowerCase() === (invite?.email || '') && form.recoveryEmail && (
                <p className="text-xs text-rose-600 mt-2">
                  This needs to be different from your store login email.
                </p>
              )}
              <p className="text-xs text-slate-400 mt-2">
                Password reset links go here, not to your store inbox.
              </p>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-5 mb-2">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="+961 71 234 567"
              />
            </div>
          )}

          {/* 3 — Store */}
          {step === 3 && (
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">About your store</h1>
              <p className="text-sm text-slate-500 mt-2">This is how shoppers will find you.</p>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-7 mb-2">Store name</label>
              <input
                value={form.storeName}
                onChange={e => set('storeName', e.target.value)}
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="e.g. Atelier Beautanique"
              />

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-5 mb-2">What do you mainly sell?</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => set('category', category)}
                    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                      form.category === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-6 mb-2">Where are you based?</label>
              <div className="flex flex-wrap gap-2">
                {LEBANON_ZONES.map(zone => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => set('location', zone)}
                    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      form.location === zone
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {form.location === zone && <MapPin className="w-3.5 h-3.5" />}
                    {zone}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4 — Description */}
          {step === 4 && (
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Describe what you sell</h1>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                A short paragraph shown on your store page. What you make or stock,
                and what makes it worth buying.
              </p>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                autoFocus
                rows={6}
                maxLength={600}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base mt-6 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                placeholder="We hand-pour ceramics in Batroun — tableware, vases and planters, all fired in small batches."
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">You can change this later.</p>
                <p className="text-xs text-slate-400">{form.description.length}/600</p>
              </div>
            </div>
          )}

          {/* 5 — Images */}
          {step === 5 && (
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">Your logo and banner</h1>
              <p className="text-sm text-slate-500 mt-2">Both are optional — you can add them later.</p>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-7 mb-2">Store logo</label>
              <input ref={logoInput} type="file" accept="image/*" hidden onChange={e => handleImage(e, 'logo')} />
              {form.logo ? (
                <div className="flex items-center gap-4">
                  <img src={form.logo} alt="" className="w-20 h-20 rounded-2xl object-cover border border-slate-200" />
                  <button type="button" onClick={() => set('logo', '')} className="text-sm text-rose-600 font-medium flex items-center gap-1.5">
                    <X className="w-4 h-4" /> Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">Upload a square logo</span>
                </button>
              )}

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-7 mb-2">Store banner</label>
              <input ref={bannerInput} type="file" accept="image/*" hidden onChange={e => handleImage(e, 'banner')} />
              {form.banner ? (
                <div>
                  <img src={form.banner} alt="" className="w-full h-28 rounded-2xl object-cover border border-slate-200" />
                  <button type="button" onClick={() => set('banner', '')} className="text-sm text-rose-600 font-medium flex items-center gap-1.5 mt-3">
                    <X className="w-4 h-4" /> Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bannerInput.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center gap-2 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">Upload a wide banner image</span>
                </button>
              )}
            </div>
          )}

          {submitError && (
            <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 leading-relaxed">{submitError}</p>
            </div>
          )}

          {/* nav */}
          <div className="flex items-center gap-3 mt-9">
            {step > 0 && (
              <button
                type="button"
                onClick={() => { setStep(step - 1); setSubmitError(''); }}
                disabled={submitting}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? submit() : setStep(step + 1))}
              disabled={!canAdvance || submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your store...</>
              ) : isLast ? (
                <>Finish setup <Check className="w-4 h-4" /></>
              ) : step === 0 ? (
                <>Get started <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Having trouble? Contact Trendit support.
        </p>
      </div>
    </div>
  );
};
