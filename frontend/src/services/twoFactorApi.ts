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

export const requestTwoFactorCode = (idToken: string) =>
  postJson<{ success: boolean }>('/api/2fa/send-code', { idToken });

export const submitTwoFactorCode = (idToken: string, code: string) =>
  postJson<{ success: boolean }>('/api/2fa/verify-code', { idToken, code });
