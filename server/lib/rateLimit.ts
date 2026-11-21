import type { Request, Response, NextFunction } from 'express';

/** Tiny in-memory fixed-window rate limiter (fine for a single-instance deployment). */
export function rateLimit(opts: { windowMs: number; max: number; keyFn?: (req: Request) => string; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, Math.min(opts.windowMs, 60_000)).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = opts.keyFn ? opts.keyFn(req) : req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: opts.message || 'Too many requests, please try again later.' });
    }
    next();
  };
}
