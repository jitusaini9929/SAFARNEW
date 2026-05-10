import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkAvatarSize() {
    const email = 'thatkindchic@gmail.com';
    try {
        const result = await db.execute({
            sql: 'SELECT length(avatar) as len, avatar FROM users WHERE email = ?',
            args: [email]
        });

        if (result.rows.length > 0) {
            const row = result.rows[0] as any;
            console.log(`Avatar length for ${email}: ${row.len} characters`);
            if (row.len > 1000) {
                console.log('Avatar preview:', row.avatar.substring(0, 50) + '...');
            } else {
                console.log('Avatar content:', row.avatar);
            }
        } else {
            console.log("User not found.");
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAvatarSize();
