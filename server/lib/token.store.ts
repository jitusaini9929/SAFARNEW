import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

// In SAFAR we don't have a standalone 'server/lib/redis.ts', but we can create a simple client wrapper here.
// Let's create the client pointing to our REDIS_URL.
const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
export const redis = createClient({
    url: redisUrl,
});

redis.connect().catch(console.error);

const RT_PREFIX        = 'rt';         // rt:{familyId}:{tokenId}
const BLOCKLIST_PREFIX = 'blocklist';  // blocklist:{jti}
const REFRESH_TTL_SEC  = 30 * 24 * 60 * 60; // 30 days

// ── Refresh token operations ──────────────────────────────────────────────────

export async function storeRefreshToken(
  userId: string,
  familyId: string,
  tokenId: string
): Promise<void> {
  const key = `${RT_PREFIX}:${familyId}:${tokenId}`;
  await redis.set(key, userId, { EX: REFRESH_TTL_SEC });
}

export async function validateAndRotateRefreshToken(
  familyId: string,
  tokenId: string
): Promise<{ userId: string; newTokenId: string } | null> {
  const key = `${RT_PREFIX}:${familyId}:${tokenId}`;
  const userId = await redis.get(key);

  if (!userId) {
    // Token not found — either expired or already rotated.
    // Treat as potential theft: nuke the entire family.
    await revokeFamilyTokens(familyId);
    return null;
  }

  // Rotate: delete old, create new
  const newTokenId = uuidv4();
  const newKey = `${RT_PREFIX}:${familyId}:${newTokenId}`;

  await redis.del(key);
  await redis.set(newKey, userId, { EX: REFRESH_TTL_SEC });

  return { userId, newTokenId };
}

export async function revokeFamilyTokens(familyId: string): Promise<void> {
  // Scan and delete all rt:{familyId}:* keys
  const pattern = `${RT_PREFIX}:${familyId}:*`;
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    await redis.del(key);
  }
}

// ── Access token blocklist (for logout before expiry) ─────────────────────────

export async function blocklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return; // already expired, nothing to do
  await redis.set(`${BLOCKLIST_PREFIX}:${jti}`, '1', { EX: ttlSeconds });
}

export async function isAccessTokenBlocked(jti: string): Promise<boolean> {
  const result = await redis.get(`${BLOCKLIST_PREFIX}:${jti}`);
  return result !== null;
}

// ── Family ID factory ─────────────────────────────────────────────────────────

export function generateFamilyId(): string {
  return uuidv4();
}

export function generateTokenId(): string {
  return uuidv4();
}
