import Redis from 'ioredis';

type RedisClient = Redis;

const redisUrl = String(process.env.REDIS_URL || '').trim();
let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient | null {
  if (!redisUrl) return null;
  if (redisClient) return redisClient;

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  redisClient.on('connect', () => {
    console.log('[REDIS] Connected');
  });

  redisClient.on('error', (err) => {
    console.error('[REDIS] Connection error:', err);
  });

  return redisClient;
}
