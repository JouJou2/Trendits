// ?? (not ||) so an explicitly-empty string — same-origin calls through the
// Hosting rewrite to Cloud Functions in production — isn't overridden.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

const post = async <T>(path: string, body: unknown, idToken?: string): Promise<T> => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
  return data;
};

export interface CreatedInvite {
  token: string;
  email: string;
  expiresAt: string;
  expiresInDays: number;
}

/** Admin: creates the vendor's login and returns a one-time setup token. */
export const createVendorInvite = (idToken: string, email: string, storeName?: string) =>
  post<CreatedInvite>('/api/vendors/invite', { email, storeName }, idToken);

export interface InviteDetails {
  email: string;
  storeName: string;
  passwordRequirements: string[];
}

/** Vendor: checks the link is real before showing the wizard. */
export const verifyVendorInvite = (token: string) =>
  post<InviteDetails>('/api/vendors/invite/verify', { token });

export interface VendorSetupPayload {
  token: string;
  password: string;
  storeName: string;
  ownerName: string;
  phone: string;
  recoveryEmail: string;
  description: string;
  location: string;
  category: string;
  /** data: URLs; the server validates and stores them. */
  logo: string;
  banner: string;
}

/** Vendor: finishes setup. Returns a custom token used to sign them straight in. */
export const completeVendorSetup = (payload: VendorSetupPayload) =>
  post<{ ok: boolean; storeName: string; email: string }>('/api/vendors/invite/complete', payload);

/** Sends a reset link to the store's recovery email rather than its login inbox. */
export const requestVendorPasswordReset = (email: string) =>
  post<{ ok: boolean; message: string }>('/api/vendors/reset', { email });

/** Builds the link an admin sends to the vendor. */
export const buildInviteUrl = (token: string) =>
  `${window.location.origin}/vendor/setup?token=${token}`;
