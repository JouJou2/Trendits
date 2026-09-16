// Thin client for the backend's AI proxy routes (see backend/src/routes).
// The AI API key must only ever live in backend/.env — never in frontend code
// or Vite's `define` config, since anything defined there ships in the public bundle.
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

export const fetchChatReply = (systemInstruction: string, conversationHistory: string) =>
  postJson<{ text: string }>('/api/chat', { systemInstruction, conversationHistory });

export const fetchElevatorPitch = (productTitle: string, productDescription: string, brand: string) =>
  postJson<{ text: string }>('/api/elevator-pitch', { productTitle, productDescription, brand });

// Staff-only on the server (it spends AI credit), so the caller's ID token
// must be attached — the backend re-reads the role from Firestore to authorise.
export const fetchImageAnalysis = async (imageBase64: string, mimeType: string) => {
  const { auth } = await import('./firebase');
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Sign in required.');
  return postJson<{ text: string }>('/api/analyze-image', { imageBase64, mimeType, idToken });
};
