import { createClient, type RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
const redisEnabled = Boolean(redisUrl);
const redisConnectTimeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000);
const redisMaxReconnectDelayMs = Number(process.env.REDIS_MAX_RECONNECT_DELAY_MS || 3000);
const redisReconnectWarningAfterAttempts = Number(process.env.REDIS_RECONNECT_WARN_AFTER || 5);

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

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: redisConnectTimeoutMs,
      reconnectStrategy: (retries) => {
        if (retries >= redisReconnectWarningAfterAttempts) {
          console.warn(`[REDIS] Reconnect attempt #${retries + 1}`);
        }

        // Keep retrying with bounded exponential backoff to survive transient network drops.
        return Math.min(100 * 2 ** retries, redisMaxReconnectDelayMs);
      },
    },
  });
  redisClient.on('error', (error) => {
    console.error('[REDIS] Client error:', error);
  });

  return redisClient;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
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
    redisConnectPromise = withTimeout(
      client.connect().then(() => client),
      redisConnectTimeoutMs,
    )
      .then((connectedClient) => {
        if (!connectedClient) {
          console.error(`[REDIS] Connection timed out after ${redisConnectTimeoutMs}ms`);
          if (redisClient && !redisClient.isOpen) {
            redisClient = null;
          }
        }
        return connectedClient;
      })
      .catch((error) => {
        console.error('[REDIS] Connection failed:', error);
        redisClient = null;
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
    try {
      await client.set(key, userId, { EX: REFRESH_TTL_SEC });
      return;
    } catch (error) {
      console.error('[REDIS] Failed to store refresh token, using in-memory fallback:', error);
    }
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
    try {
      const userId = await client.get(key);

      if (!userId) {
        // A missing token can happen after a legitimate concurrent refresh.
        return null;
      }

      const newTokenId = uuidv4();
      const newKey = `${RT_PREFIX}:${familyId}:${newTokenId}`;

      await client.del(key);
      await client.set(newKey, userId, { EX: REFRESH_TTL_SEC });

      return { userId, newTokenId };
    } catch (error) {
      console.error('[REDIS] Failed to rotate refresh token, using in-memory fallback:', error);
    }
  }

  const userId = getMemoryRefreshToken(key);
  if (!userId) {
    // A missing token can happen after a legitimate concurrent refresh.
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
    try {
      for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        await client.del(key);
      }
      return;
    } catch (error) {
      console.error('[REDIS] Failed to revoke token family in Redis, using in-memory fallback:', error);
    }
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
    try {
      await client.set(key, '1', { EX: ttlSeconds });
      return;
    } catch (error) {
      console.error('[REDIS] Failed to blocklist access token in Redis, using in-memory fallback:', error);
    }
  }

  blocklistMemoryToken(key, ttlSeconds);
}

export async function isAccessTokenBlocked(jti: string): Promise<boolean> {
  const key = `${BLOCKLIST_PREFIX}:${jti}`;
  const client = await getRedisClient();

  if (client) {
    try {
      const result = await client.get(key);
      return result !== null;
    } catch (error) {
      console.error('[REDIS] Failed to check blocklisted token in Redis, using in-memory fallback:', error);
    }
  }

  return isMemoryTokenBlocked(key);
}

export function generateFamilyId(): string {
  return uuidv4();
}

export function generateTokenId(): string {
  return uuidv4();
}
