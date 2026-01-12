
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
    console.log('Adding gender column to users table...');
    try {
        await db.execute("ALTER TABLE users ADD COLUMN gender TEXT");
        console.log('Successfully added gender column.');
    } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
            console.log('Column already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    }
}

migrate();
