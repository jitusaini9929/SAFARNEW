import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const COMMON_AVATAR_URL = 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';

async function updateAllAvatars() {
    console.log('🔄 Connecting to database...');

    const db = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        // Get count of users
        const countResult = await db.execute('SELECT COUNT(*) as count FROM users');
        const userCount = countResult.rows[0].count;
        console.log(`📊 Found ${userCount} users in database`);

        // Update all users to use the common blue silhouette avatar
        // Only update those who don't have a custom base64 avatar
        const result = await db.execute({
            sql: `UPDATE users SET avatar = ? WHERE avatar NOT LIKE 'data:image%' OR avatar IS NULL`,
            args: [COMMON_AVATAR_URL]
        });

        console.log(`✅ Updated ${result.rowsAffected} user avatars to the blue silhouette`);
        console.log(`🎉 Avatar migration complete!`);
        console.log(`\nNew avatar URL: ${COMMON_AVATAR_URL}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

updateAllAvatars();
