import { API_BASE, auth } from './firebase';

/**
 * Calls the website's backend — the same endpoints the website itself uses,
 * so signup, email verification and (next) placing an order all go through
 * one set of server-side rules.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface PostOptions {
  /** Attach the signed-in shopper's token, for endpoints that require one. */
  authenticated?: boolean;
}

export const postJson = async <T,>(path: string, body: unknown, options: PostOptions = {}): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.authenticated) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new ApiError('Please sign in again.', 401);
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0);
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status);
  }
  return data;
};
