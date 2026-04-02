import { createClient, type RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const IS_DEV_MODE = process.env.DEV_MODE === 'true';
const redisUrl = String(process.env.REDIS_URL || process.env.REDIS_URI || '').trim();
const redisConnectTimeoutMs = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 3000);
const redisMaxReconnectDelayMs = Number(process.env.REDIS_MAX_RECONNECT_DELAY_MS || 3000);
const redisReconnectWarningAfterAttempts = Number(process.env.REDIS_RECONNECT_WARN_AFTER || 5);

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

const RT_PREFIX = 'rt';
const BLOCKLIST_PREFIX = 'blocklist';
const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;

// ── In-memory fallback for DEV_MODE (no Redis required) ─────────────────────
// Tokens reset on restart — that's fine for a dev/staging server.
const memStore = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSec: number): void {
  memStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

function memDel(key: string): void {
  memStore.delete(key);
}

function memScan(pattern: string): string[] {
  // Simple glob matching for "prefix:*" patterns
  const prefix = pattern.replace('*', '');
  return Array.from(memStore.keys()).filter((k) => k.startsWith(prefix));
}

// ── Redis connection (production only) ──────────────────────────────────────

if (!IS_DEV_MODE && !redisUrl) {
  throw new Error('[AUTH] Missing required Redis configuration. Set REDIS_URL or REDIS_URI.');
}

if (IS_DEV_MODE && !redisUrl) {
  console.log('[AUTH] DEV MODE — using in-memory token store (no Redis required)');
}

function getOrCreateRedisClient(): RedisClientType | null {
  if (IS_DEV_MODE && !redisUrl) return null;
  if (redisClient) return redisClient;

  redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: redisConnectTimeoutMs,
      reconnectStrategy: (retries) => {
        if (retries >= redisReconnectWarningAfterAttempts) {
          console.warn(`[REDIS] Reconnect attempt #${retries + 1}`);
        }
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
  // In DEV_MODE without Redis, return null — callers below use memStore instead
  if (IS_DEV_MODE && !redisUrl) return null;

  const client = getOrCreateRedisClient();
  if (!client) return null;
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
    throw new Error('[AUTH] Redis connection unavailable. Token storage must persist across restarts.');
  }

  return connectedClient;
}

// ── Token CRUD (auto-delegates to memStore when Redis is unavailable) ────────

export async function storeRefreshToken(
  userId: string,
  familyId: string,
  tokenId: string
): Promise<void> {
  const key = `${RT_PREFIX}:${familyId}:${tokenId}`;
  const client = await getRedisClient();
  if (client) {
    await client.set(key, userId, { EX: REFRESH_TTL_SEC });
  } else {
    memSet(key, userId, REFRESH_TTL_SEC);
  }
}

export async function validateAndRotateRefreshToken(
  familyId: string,
  tokenId: string
): Promise<{ userId: string; newTokenId: string } | null> {
  const key = `${RT_PREFIX}:${familyId}:${tokenId}`;
  const client = await getRedisClient();

  let userId: string | null;
  if (client) {
    userId = await client.get(key);
  } else {
    userId = memGet(key);
  }

  if (!userId) {
    return null;
  }

  const newTokenId = uuidv4();
  const newKey = `${RT_PREFIX}:${familyId}:${newTokenId}`;

  if (client) {
    await client.del(key);
    await client.set(newKey, userId, { EX: REFRESH_TTL_SEC });
  } else {
    memDel(key);
    memSet(newKey, userId, REFRESH_TTL_SEC);
  }

  return { userId, newTokenId };
}

export async function revokeFamilyTokens(familyId: string): Promise<void> {
  const pattern = `${RT_PREFIX}:${familyId}:*`;
  const client = await getRedisClient();
  if (client) {
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      await client.del(key);
    }
  } else {
    for (const key of memScan(pattern)) {
      memDel(key);
    }
  }
}

export async function blocklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
  if (ttlSeconds <= 0) return;

  const key = `${BLOCKLIST_PREFIX}:${jti}`;
  const client = await getRedisClient();
  if (client) {
    await client.set(key, '1', { EX: ttlSeconds });
  } else {
    memSet(key, '1', ttlSeconds);
  }
}

export async function isAccessTokenBlocked(jti: string): Promise<boolean> {
  const key = `${BLOCKLIST_PREFIX}:${jti}`;
  const client = await getRedisClient();
  if (client) {
    const result = await client.get(key);
    return result !== null;
  } else {
    return memGet(key) !== null;
  }
}

export function generateFamilyId(): string {
  return uuidv4();
}

export function generateTokenId(): string {
  return uuidv4();
}
