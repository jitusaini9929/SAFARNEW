
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env_open') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'safar';

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
}

const TARGET_EMAILS = [
    'onesaffar@gmail.com',         // "Me"
    'steve123@example.com',        // Admin
    'safarparmar0@gmail.com'       // Admin
];

async function main() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(DB_NAME);
        const usersCol = db.collection('users');
        const sandeshCol = db.collection('sandesh_messages');

        // 1. Find User IDs
        console.log(`Finding users: ${TARGET_EMAILS.join(', ')}`);
        const users = await usersCol.find({
            email: { $in: TARGET_EMAILS.map(e => new RegExp(`^${e}$`, 'i')) } // Case insensitive
        }).toArray();

        if (users.length === 0) {
            console.log('No matching users found.');
            return;
        }

        const userIds = users.map(u => u.id);
        const foundEmails = users.map(u => u.email);
        console.log(`Found ${users.length} users:`, foundEmails);
        console.log('User IDs:', userIds);

        // 2. Delete Posts from Sandesh
        const sandeshResult = await sandeshCol.deleteMany({
            author_id: { $in: userIds }
        });
        console.log(`Deleted ${sandeshResult.deletedCount} posts from sandesh_messages.`);

        // 3. Delete Thoughts from Mehfil
        const thoughtsCol = db.collection('mehfil_thoughts');
        const thoughtsResult = await thoughtsCol.deleteMany({
            user_id: { $in: userIds }
        });
        console.log(`Deleted ${thoughtsResult.deletedCount} thoughts from mehfil_thoughts.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('Database connection closed');
    }
}

main();
