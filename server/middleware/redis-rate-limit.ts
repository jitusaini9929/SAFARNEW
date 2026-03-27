import type { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../lib/redis.client';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

type LocalBucket = {
  count: number;
  resetAt: number;
};

const localBuckets = new Map<string, LocalBucket>();

function isLocallyRateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = localBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSec: 0 };
  }

  bucket.count += 1;
  localBuckets.set(key, bucket);

  if (bucket.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return { limited: true, retryAfterSec };
  }

  return { limited: false, retryAfterSec: 0 };
}

export function redisRateLimit({ windowMs, max, keyPrefix = 'rate' }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const client = getRedisClient();

    if (!client) {
      const fallback = isLocallyRateLimited(key, max, windowMs);
      if (fallback.limited) {
        res.set('Retry-After', String(fallback.retryAfterSec));
        return res.status(429).json({ error: 'Too many requests' });
      }
      return next();
    }

    try {
      const count = await client.incr(key);
      if (count === 1) {
        await client.pexpire(key, windowMs);
      }

      if (count > max) {
        const ttlMs = await client.pttl(key);
        const retryAfterSec = Math.max(1, Math.ceil(ttlMs / 1000));
        res.set('Retry-After', String(retryAfterSec));
        return res.status(429).json({ error: 'Too many requests' });
      }

      return next();
    } catch (error) {
      const fallback = isLocallyRateLimited(key, max, windowMs);
      if (fallback.limited) {
        res.set('Retry-After', String(fallback.retryAfterSec));
        return res.status(429).json({ error: 'Too many requests' });
      }
      return next();
    }
  };
}
