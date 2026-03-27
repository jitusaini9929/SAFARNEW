/**
 * Reusable Redis caching helpers.
 *
 * Uses the existing ioredis client from redis.client.ts.
 * Falls back gracefully (returns null / no-ops) when Redis is unavailable.
 */

import { getRedisClient } from './redis.client';

// ── Core helpers ────────────────────────────────────────────────────────

/**
 * Get a cached value by key. Returns parsed JSON or null.
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cache value with a TTL in seconds.
 */
export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Ignore cache write failures — the app works without cache.
  }
}

/**
 * Delete a single cache key.
 */
export async function cacheDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(key);
  } catch {
    // best-effort
  }
}

/**
 * Invalidate all keys matching a glob pattern (e.g. "mehfil:analytics:user123*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '100',
      );
      if (keys.length > 0) {
        await client.del(...keys);
      }
      cursor = nextCursor;
    } while (cursor !== '0');
  } catch {
    // best-effort
  }
}
