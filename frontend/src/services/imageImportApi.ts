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
export const importImageFromUrl = async (idToken: string, url: string): Promise<ImportedImage> => {
  const res = await fetch(`${BACKEND_URL}/api/images/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ url }),
  });

  const data = (await res.json().catch(() => ({}))) as Partial<ImportedImage> & { error?: string };

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
 */
export const importImages = async (
  idToken: string,
  urls: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, { url?: string; error?: string }>> => {
  const unique = [...new Set(urls.filter(u => u && u.trim()))];
  const results = new Map<string, { url?: string; error?: string }>();
  const CONCURRENCY = 4;

  let index = 0;
  let done = 0;

  const worker = async () => {
    while (index < unique.length) {
      const source = unique[index++];
      try {
        const imported = await importImageFromUrl(idToken, source);
        results.set(source, { url: imported.url });
      } catch (err) {
        results.set(source, { error: err instanceof Error ? err.message : 'Import failed.' });
      }
      onProgress?.(++done, unique.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));
  return results;
};
