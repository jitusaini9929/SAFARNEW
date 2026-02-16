import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Explicitly use the one from the user request if env is missing
const redisUrl = process.env.REDIS_URL || 'redis://default:jt8NFL0JfE0ctD8Am2lac00pBizSY7MyKMQ0q7KykFXMtR6jxCE529jVZEpS8oUJ@69.62.77.8:5432/0';

console.log('Testing Redis connection with node-redis library...');
// Mask password only for logging
const maskedUrl = redisUrl.replace(/:[^:@]+@/, ':****@');
console.log('URL:', maskedUrl);

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
        process.exit(1);
    }
}

test();
