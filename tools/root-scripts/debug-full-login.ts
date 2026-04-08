import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function debugLogin() {
    const email = 'thatkindchic@gmail.com';
    const password = 'ANJ123';

    console.log(`\n=== DEBUG LOGIN FOR: ${email} ===\n`);

    try {
        // Step 1: Query user
        console.log('Step 1: Querying user...');
        const userResult = await db.execute({
            sql: 'SELECT id, email, password_hash, name FROM users WHERE email = ?',
            args: [email]
        });

        if (userResult.rows.length === 0) {
            console.log('❌ User NOT FOUND in database.');
            return;
        }

        const user = userResult.rows[0] as any;
        console.log('✅ User found:', { id: user.id, email: user.email, name: user.name });
        console.log('   Password hash exists:', !!user.password_hash);
        console.log('   Hash length:', user.password_hash?.length);

        // Step 2: Test bcrypt compare
        console.log('\nStep 2: Testing bcrypt.compare...');
        console.time('bcrypt.compare');
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        console.timeEnd('bcrypt.compare');
        console.log('   Password match:', passwordMatch);

        // Step 3: Query streaks
        console.log('\nStep 3: Querying streaks...');
        const streakResult = await db.execute({
            sql: 'SELECT * FROM streaks WHERE user_id = ?',
            args: [user.id]
        });
        console.log('   Streaks found:', streakResult.rows.length > 0 ? streakResult.rows[0] : 'NONE');

        console.log('\n=== DEBUG COMPLETE ===');

    } catch (error) {
        console.error('❌ Error during debug:', error);
    }
}

debugLogin();
