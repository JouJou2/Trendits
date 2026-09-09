import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { adminBucket, STORAGE_BUCKET } from '../firebaseAdmin.js';
import { fetchRemoteImage, ImageFetchError } from '../safeImageFetch.js';
import type { AuthedRequest } from '../requireAuth.js';

export const importImageRouter = Router();

/**
 * Copies a remote image into our own Storage bucket and returns the permanent
 * URL. Product records then reference a file we control, so a listing does not
 * break when a vendor tidies their Drive, and we are not hotlinking a third
 * party's bandwidth.
 *
 * Mounted behind requireAuth({ staffOnly: true }) and a rate limit in app.ts.
 * The fetch itself is guarded against SSRF in safeImageFetch.ts.
 */
importImageRouter.post('/import', async (req: AuthedRequest, res) => {
  const { url } = (req.body ?? {}) as { url?: unknown };

  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'An image url is required.' });
  }
  if (url.length > 2048) {
    return res.status(400).json({ error: 'That url is too long.' });
  }

  try {
    const image = await fetchRemoteImage(url);

    // Random name: never derive a storage path from caller input, and never
    // reuse a name that another import could overwrite.
    const objectPath = `products/${randomUUID()}.${image.extension}`;
    const downloadToken = randomUUID();

    await adminBucket.file(objectPath).save(image.buffer, {
      resumable: false,
      contentType: image.contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          importedBy: req.uid || 'unknown',
          sourceUrl: url.slice(0, 500),
        },
      },
    });

    // Same URL shape the client SDK produces, so it satisfies the site's CSP.
    const publicUrl =
      `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/` +
      `${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`;

    return res.json({ url: publicUrl, bytes: image.buffer.length, contentType: image.contentType });
  } catch (err) {
    if (err instanceof ImageFetchError) {
      // These messages are written for the person pasting the spreadsheet.
      return res.status(422).json({ error: err.message });
    }
    console.error('Image import failed:', err);
    return res.status(500).json({ error: 'Could not import that image.' });
  }
});
