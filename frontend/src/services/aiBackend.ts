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

/**
 * The chatbot sends only what the shopper typed plus the recent turns. The
 * assistant's instructions and the product data live on the server: anything
 * sent from here could be replaced by whoever is using the browser, which is
 * how the chatbot ended up writing code for people on the store's credit.
 */
export const fetchChatReply = (message: string, history: { role: 'user' | 'assistant'; content: string }[]) =>
  postJson<{ text: string }>('/api/chat', { message, history });

/** The server reads the product itself, so only its id is sent. */
export const fetchElevatorPitch = (productId: string) =>
  postJson<{ text: string }>('/api/elevator-pitch', { productId });

// Staff-only on the server (it spends AI credit), so the caller's ID token
// must be attached — the backend re-reads the role from Firestore to authorise.
export const fetchImageAnalysis = async (imageBase64: string, mimeType: string) => {
  const { auth } = await import('./firebase');
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Sign in required.');
  return postJson<{ text: string }>('/api/analyze-image', { imageBase64, mimeType, idToken });
};
