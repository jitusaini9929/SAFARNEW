import { createClient, type RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
const redisEnabled = Boolean(redisUrl);

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;
let redisWarningLogged = false;

const refreshTokenStore = new Map<string, string>();
const refreshTokenExpiry = new Map<string, number>();
const blocklistStore = new Map<string, number>();

const RT_PREFIX = 'rt';
const BLOCKLIST_PREFIX = 'blocklist';
const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;

function logRedisDisabled(reason: string) {
  if (redisWarningLogged) return;
  redisWarningLogged = true;
  console.warn(`[REDIS] ${reason}. Falling back to in-memory token storage.`);
}

function getOrCreateRedisClient(): RedisClientType | null {
  if (!redisEnabled) return null;
  if (redisClient) return redisClient;

  redisClient = createClient({ url: redisUrl });
  redisClient.on('error', (error) => {
    console.error('[REDIS] Client error:', error);
  });

  return redisClient;
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  const client = getOrCreateRedisClient();
  if (!client) {
    logRedisDisabled('REDIS_URL not set');
    return null;
  }

  if (client.isOpen && client.isReady) {
    return client;
  }

  if (!redisConnectPromise) {
    redisConnectPromise = client
      .connect()
      .then(() => client)
      .catch((error) => {
        console.error('[REDIS] Connection failed:', error);
        return null;
      })
      .finally(() => {
        redisConnectPromise = null;
      });
  }

  const connectedClient = await redisConnectPromise;
  if (!connectedClient) {
    logRedisDisabled('Redis connection unavailable');
  }

  return connectedClient;
}

function cleanupExpiredMemoryEntries() {
  const now = Date.now();

  for (const [key, expiresAt] of refreshTokenExpiry.entries()) {
    if (expiresAt <= now) {
      refreshTokenExpiry.delete(key);
      refreshTokenStore.delete(key);
    }
  }

  for (const [key, expiresAt] of blocklistStore.entries()) {
    if (expiresAt <= now) {
      blocklistStore.delete(key);
    }
  }
}

function setMemoryRefreshToken(key: string, userId: string, ttlSeconds: number) {
  refreshTokenStore.set(key, userId);
  refreshTokenExpiry.set(key, Date.now() + ttlSeconds * 1000);
}

function getMemoryRefreshToken(key: string): string | null {
  cleanupExpiredMemoryEntries();
  return refreshTokenStore.get(key) ?? null;
}

function deleteMemoryRefreshToken(key: string) {
  refreshTokenStore.delete(key);
  refreshTokenExpiry.delete(key);
}

function blocklistMemoryToken(key: string, ttlSeconds: number) {
  blocklistStore.set(key, Date.now() + ttlSeconds * 1000);
}

function isMemoryTokenBlocked(key: string): boolean {
  cleanupExpiredMemoryEntries();
  const expiresAt = blocklistStore.get(key);
  return typeof expiresAt === 'number' && expiresAt > Date.now();
}

export async function storeRefreshToken(
  userId: string,
  familyId: string,
  tokenId: string
): Promise<void> {
  const key = `${RT_PREFIX}:${familyId}:${tokenId}`;
  const client = await getRedisClient();

  if (client) {
    await client.set(key, userId, { EX: REFRESH_TTL_SEC });
    return;
  }

  setMemoryRefreshToken(key, userId, REFRESH_TTL_SEC);
}

export async function validateAndRotateRefreshToken(
  familyId: string,
  tokenId: string
): Promise<{ userId: string; newTokenId: string } | null> {
  const key = `${RT_PREFIX}:${familyId}:${tokenId}`;
  const client = await getRedisClient();

  if (client) {
    const userId = await client.get(key);

    if (!userId) {
      await revokeFamilyTokens(familyId);
      return null;
    }

    const newTokenId = uuidv4();
    const newKey = `${RT_PREFIX}:${familyId}:${newTokenId}`;

    await client.del(key);
    await client.set(newKey, userId, { EX: REFRESH_TTL_SEC });

    return { userId, newTokenId };
  }

  const userId = getMemoryRefreshToken(key);
  if (!userId) {
    await revokeFamilyTokens(familyId);
    return null;
  }

  const newTokenId = uuidv4();
  const newKey = `${RT_PREFIX}:${familyId}:${newTokenId}`;

  deleteMemoryRefreshToken(key);
  setMemoryRefreshToken(newKey, userId, REFRESH_TTL_SEC);

  return { userId, newTokenId };
}

export async function revokeFamilyTokens(familyId: string): Promise<void> {
  const pattern = `${RT_PREFIX}:${familyId}:*`;
  const client = await getRedisClient();

  if (client) {
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      await client.del(key);
    }
    return;
  }

  cleanupExpiredMemoryEntries();
  for (const key of [...refreshTokenStore.keys()]) {
    if (key.startsWith(`${RT_PREFIX}:${familyId}:`)) {
      deleteMemoryRefreshToken(key);
    }
  }
}

export async function blocklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return;

  const key = `${BLOCKLIST_PREFIX}:${jti}`;
  const client = await getRedisClient();

  if (client) {
    await client.set(key, '1', { EX: ttlSeconds });
    return;
  }

  blocklistMemoryToken(key, ttlSeconds);
}

export async function isAccessTokenBlocked(jti: string): Promise<boolean> {
  const key = `${BLOCKLIST_PREFIX}:${jti}`;
  const client = await getRedisClient();

  if (client) {
    const result = await client.get(key);
    return result !== null;
  }

  return isMemoryTokenBlocked(key);
}

export function generateFamilyId(): string {
  return uuidv4();
}

export function generateTokenId(): string {
  return uuidv4();
}
