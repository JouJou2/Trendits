import dns from 'node:dns';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

/**
 * Fetches a remote image on behalf of a staff user during product import.
 *
 * Anything that fetches a caller-supplied URL from the server is an SSRF
 * primitive: on Cloud Run the metadata service at 169.254.169.254 will hand out
 * an access token for this function's service account, and the VPC may expose
 * internal services on private ranges. So every hop is checked against a
 * blocklist of non-public address space, the check runs again at socket-connect
 * time (closing the DNS-rebinding window between resolve and connect), and
 * redirects are followed manually so each new host is validated too.
 */

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

/** Content types we are willing to store, mapped to the extension we give them. */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export class ImageFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageFetchError';
  }
}

// ── Address space checks ────────────────────────────────────────────────────

const ipv4ToInt = (ip: string): number =>
  ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;

const inV4Range = (ip: string, cidr: string): boolean => {
  const [base, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
};

// Everything that is not routable public internet.
const BLOCKED_V4 = [
  '0.0.0.0/8',        // "this network"
  '10.0.0.0/8',       // private
  '100.64.0.0/10',    // carrier-grade NAT
  '127.0.0.0/8',      // loopback
  '169.254.0.0/16',   // link-local — cloud metadata lives here
  '172.16.0.0/12',    // private
  '192.0.0.0/24',     // IETF protocol assignments
  '192.0.2.0/24',     // TEST-NET-1
  '192.168.0.0/16',   // private
  '198.18.0.0/15',    // benchmarking
  '198.51.100.0/24',  // TEST-NET-2
  '203.0.113.0/24',   // TEST-NET-3
  '224.0.0.0/4',      // multicast
  '240.0.0.0/4',      // reserved, includes 255.255.255.255
];

export const isPublicAddress = (ip: string): boolean => {
  const version = net.isIP(ip);
  if (version === 4) return !BLOCKED_V4.some(range => inV4Range(ip, range));
  if (version !== 6) return false;

  const addr = ip.toLowerCase().split('%')[0]; // strip any zone index

  // IPv4-mapped (::ffff:10.0.0.1) and IPv4-compatible forms must be judged as v4.
  const mapped = addr.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicAddress(mapped[1]);
  if (addr.startsWith('64:ff9b::')) return false; // NAT64

  if (addr === '::' || addr === '::1') return false;           // unspecified, loopback
  if (/^f[cd]/.test(addr)) return false;                        // fc00::/7 unique local
  if (/^fe[89ab]/.test(addr)) return false;                     // fe80::/10 link-local
  if (addr.startsWith('ff')) return false;                      // ff00::/8 multicast
  return true;
};

/**
 * A dns.lookup replacement that refuses to hand a non-public address to the
 * socket. Passed into http.request, so it runs at connect time — a hostname that
 * resolves public during validation and private a moment later still fails here.
 */
const guardedLookup: typeof dns.lookup = ((
  hostname: string,
  options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address?: unknown, family?: number) => void,
) => {
  const cb = typeof options === 'function' ? (options as typeof callback) : callback;
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return cb(err);
    if (!addresses.length) return cb(new Error('DNS returned no addresses'));

    // If ANY resolved address is private, refuse outright rather than picking a
    // public one — a host answering with both is a rebinding attempt.
    for (const entry of addresses) {
      if (!isPublicAddress(entry.address)) {
        return cb(new ImageFetchError(`refusing to connect to non-public address ${entry.address}`));
      }
    }

    const wantsAll = typeof options === 'object' && options !== null && (options as { all?: boolean }).all;
    if (wantsAll) return cb(null, addresses as unknown);
    return cb(null, addresses[0].address, addresses[0].family);
  });
}) as typeof dns.lookup;

// ── Content sniffing ────────────────────────────────────────────────────────

/** Reads the real format from the bytes; a Content-Type header is only a claim. */
export const sniffImageType = (buf: Buffer): string | null => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
};

// ── URL normalisation ───────────────────────────────────────────────────────

const DRIVE_ID_PATTERNS = [
  /drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{10,})/,
  /drive\.google\.com\/open\?(?:.*&)?id=([a-zA-Z0-9_-]{10,})/,
  /(?:drive|docs)\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]{10,})/,
  /drive\.google\.com\/thumbnail\?(?:.*&)?id=([a-zA-Z0-9_-]{10,})/,
];

/**
 * Drive share links point at a viewer *page*, which serves HTML. Rewrite them to
 * the CDN path that serves the bytes, so the fetch below has something to read.
 */
export const normalizeSourceUrl = (raw: string): string => {
  const url = raw.trim();
  for (const pattern of DRIVE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
};

// ── Fetch ───────────────────────────────────────────────────────────────────

const assertFetchableUrl = (raw: string): URL => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new ImageFetchError('Not a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ImageFetchError(`Unsupported protocol "${parsed.protocol}" — only http and https are allowed.`);
  }
  if (parsed.username || parsed.password) {
    throw new ImageFetchError('URLs carrying credentials are not accepted.');
  }
  // A literal private IP never needs DNS, so catch it before the lookup guard.
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && !isPublicAddress(host)) {
    throw new ImageFetchError('Refusing to fetch from a non-public address.');
  }
  return parsed;
};

export interface FetchedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const requestOnce = (target: URL): Promise<{ status: number; headers: http.IncomingHttpHeaders; body?: Buffer; location?: string }> =>
  new Promise((resolve, reject) => {
    const transport = target.protocol === 'https:' ? https : http;
    const req = transport.request(
      target,
      {
        method: 'GET',
        lookup: guardedLookup,
        timeout: REQUEST_TIMEOUT_MS,
        headers: { Accept: 'image/*', 'User-Agent': 'Trendit-ImageImport/1.0' },
      },
      res => {
        const status = res.statusCode || 0;

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume(); // drain, we are not reading this body
          return resolve({ status, headers: res.headers, location: res.headers.location });
        }

        // Reject on the declared length before reading a byte, when it is given.
        const declared = Number(res.headers['content-length'] || 0);
        if (declared && declared > MAX_IMAGE_BYTES) {
          res.destroy();
          return reject(new ImageFetchError(`Image is ${Math.round(declared / 1024 / 1024)}MB; the limit is ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`));
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          // A missing or lying Content-Length is caught here instead.
          if (total > MAX_IMAGE_BYTES) {
            res.destroy();
            return reject(new ImageFetchError(`Image exceeds the ${MAX_IMAGE_BYTES / 1024 / 1024}MB limit.`));
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      },
    );

    req.on('timeout', () => {
      req.destroy(new ImageFetchError('The image host did not respond in time.'));
    });
    req.on('error', err => reject(err instanceof ImageFetchError ? err : new ImageFetchError(`Could not reach the image: ${err.message}`)));
    req.end();
  });

export const fetchRemoteImage = async (rawUrl: string): Promise<FetchedImage> => {
  let target = assertFetchableUrl(normalizeSourceUrl(rawUrl));

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(target);

    if (res.location) {
      if (hop === MAX_REDIRECTS) throw new ImageFetchError('Too many redirects.');
      // Re-run every check against the new destination.
      target = assertFetchableUrl(new URL(res.location, target).toString());
      continue;
    }

    if (res.status !== 200) {
      throw new ImageFetchError(`The image host returned HTTP ${res.status}.`);
    }

    const body = res.body ?? Buffer.alloc(0);
    if (!body.length) throw new ImageFetchError('The image was empty.');

    // Trust the bytes, not the header: a text/html "request access" page or a
    // disguised payload is rejected here regardless of what it claims to be.
    const sniffed = sniffImageType(body);
    if (!sniffed) {
      const claimed = String(res.headers['content-type'] || 'unknown').split(';')[0];
      throw new ImageFetchError(
        claimed.startsWith('text/')
          ? 'That link returns a web page, not an image file. If it is a Google Drive link, make sure the file is shared with "Anyone with the link".'
          : `That file is not a supported image (server said "${claimed}").`,
      );
    }
    const extension = ALLOWED_TYPES[sniffed];
    if (!extension) throw new ImageFetchError(`${sniffed} images are not supported.`);

    return { buffer: body, contentType: sniffed, extension };
  }

  throw new ImageFetchError('Too many redirects.');
};
