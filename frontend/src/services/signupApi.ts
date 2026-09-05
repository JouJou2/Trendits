// ?? (not ||) so an explicitly-empty string — same-origin calls through the
// Hosting rewrite to Cloud Functions in production — isn't overridden.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request to ${path} failed`);
  }
  return data as T;
}

export const requestSignupCode = (email: string) =>
  postJson<{ success: boolean }>('/api/signup/send-code', { email });

export const verifySignupCode = (email: string, code: string) =>
  postJson<{ success: boolean }>('/api/signup/verify-code', { email, code });

export const createSignupAccount = (email: string, password: string, name: string) =>
  postJson<{ success: boolean }>('/api/signup/create-account', { email, password, name });
