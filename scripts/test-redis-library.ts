import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://default:jt8NFL0JfE0ctD8Am2lac00pBizSY7MyKMQ0q7KykFXMtR6jxCE529jVZEpS8oUJ@69.62.77.8:5432/0';

console.log('Testing Redis connection with node-redis library...');
console.log('URL:', redisUrl.replace(/:[^:@]+@/, ':****@')); // Mask password in logs

const client = createClient({
    url: redisUrl,
    socket: {
        connectTimeout: 10000,
        keepAlive: 10000,
        noDelay: true,
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
});

client.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

client.on('ready', () => {
    console.log('✅ Redis Client Ready!');
    client.quit();
});

async function test() {
    try {
        await client.connect();
        console.log('Connected!');
    } catch (e) {
        console.error('Connection failed:', e);
    }
}

test();
