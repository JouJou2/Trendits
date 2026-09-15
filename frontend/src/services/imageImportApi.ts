// ?? (not ||) so an explicitly-empty string — same-origin calls through the
// Hosting rewrite to Cloud Functions in production — isn't overridden.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

export interface ImportedImage {
  url: string;
  bytes: number;
  contentType: string;
}

/**
 * Asks the backend to copy a remote image into our own Storage bucket and hand
 * back the permanent URL. The fetch happens server-side so the product ends up
 * referencing a file we control rather than hotlinking someone else's host.
 */
export type ImageDestination = 'products' | 'categories' | 'banners';

/** The import endpoint allows a fixed number of images a minute. */
export class RateLimitedError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Too many images at once. Try again in ${retryAfterSeconds}s.`);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const importImageFromUrl = async (
  idToken: string,
  url: string,
  folder: ImageDestination = 'products',
): Promise<ImportedImage> => {
  const res = await fetch(`${BACKEND_URL}/api/images/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ url, folder }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<ImportedImage> & { error?: string };

  if (res.status === 429) {
    throw new RateLimitedError(Number(res.headers.get('Retry-After')) || 10);
  }
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Image import failed (HTTP ${res.status}).`);
  }

  return { url: data.url, bytes: data.bytes ?? 0, contentType: data.contentType ?? '' };
};

/**
 * Imports many images with a small concurrency cap — a spreadsheet can carry
 * hundreds of rows, and firing them all at once would trip the endpoint's rate
 * limit and hammer the source host. Failures are returned rather than thrown so
 * one bad link cannot abandon the whole import.
 *
 * Several photos per product can easily pass the endpoint's per-minute limit,
 * so a rate-limited image waits for the time the server names and tries again
 * rather than being reported as failed.
 */
export const importImages = async (
  idToken: string,
  urls: string[],
  onProgress?: (done: number, total: number) => void,
  onWait?: (seconds: number) => void,
): Promise<Map<string, { url?: string; error?: string }>> => {
  const unique = [...new Set(urls.filter(u => u && u.trim()))];
  const results = new Map<string, { url?: string; error?: string }>();
  const CONCURRENCY = 4;
  const MAX_WAITS = 6;

  let index = 0;
  let done = 0;
  // Shared by all workers, so one 429 pauses everyone instead of each worker
  // discovering the limit separately.
  let resumeAt = 0;
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const worker = async () => {
    while (index < unique.length) {
      const source = unique[index++];
      for (let attempt = 0; ; attempt++) {
        const wait = resumeAt - Date.now();
        if (wait > 0) await sleep(wait);
        try {
          const imported = await importImageFromUrl(idToken, source);
          results.set(source, { url: imported.url });
        } catch (err) {
          if (err instanceof RateLimitedError && attempt < MAX_WAITS) {
            const seconds = Math.min(Math.max(err.retryAfterSeconds, 1), 60);
            resumeAt = Math.max(resumeAt, Date.now() + seconds * 1000);
            onWait?.(seconds);
            continue;
          }
          results.set(source, { error: err instanceof Error ? err.message : 'Import failed.' });
        }
        break;
      }
      onProgress?.(++done, unique.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));
  return results;
};
