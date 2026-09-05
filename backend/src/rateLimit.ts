import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal in-memory rate limiter.
 *
 * Deliberately dependency-free and per-instance: Cloud Functions can run several
 * instances, so this is a blunt abuse brake (stopping one client hammering an
 * endpoint), not a distributed quota. Firebase Auth already applies its own
 * brute-force protection to sign-in itself.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Keep the map from growing without bound on a long-lived instance.
const sweep = () => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now > b.resetAt) buckets.delete(key);
  }
};

export const rateLimit = (opts: { windowMs: number; max: number; name: string }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Cloud Functions sits behind a proxy, so the real client is the first hop
    // in x-forwarded-for; req.ip would be the load balancer.
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined) || '';
    const ip = forwarded.split(',')[0].trim() || req.ip || 'unknown';
    const key = `${opts.name}:${ip}`;
    const now = Date.now();

    if (buckets.size > 5000) sweep();

    const existing = buckets.get(key);
    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > opts.max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `Too many requests. Try again in ${retryAfter}s.` });
    }

    return next();
  };
};
