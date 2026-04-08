import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function deleteUser() {
    const email = 'thatkindchic@gmail.com';

    console.log(`\n🗑️  Deleting user: ${email}\n`);

    try {
        // First, get the user ID
        const userResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [email]
        });

        if (userResult.rows.length === 0) {
            console.log('❌ User not found in database.');
            return;
        }

        const userId = userResult.rows[0].id as string;
        console.log(`✅ Found user ID: ${userId}`);

        // Delete all related data
        console.log('\n🗑️  Deleting related data...');

        // Delete streaks
        await db.execute({
            sql: 'DELETE FROM streaks WHERE user_id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted streaks');

        // Delete goals
        await db.execute({
            sql: 'DELETE FROM goals WHERE user_id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted goals');

        // Delete moods
        await db.execute({
            sql: 'DELETE FROM moods WHERE user_id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted moods');

        // Delete journal entries
        await db.execute({
            sql: 'DELETE FROM journal WHERE user_id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted journal entries');

        // Delete login history
        await db.execute({
            sql: 'DELETE FROM login_history WHERE user_id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted login history');

        // Delete focus sessions
        await db.execute({
            sql: 'DELETE FROM focus_sessions WHERE user_id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted focus sessions');

        // Finally, delete the user
        await db.execute({
            sql: 'DELETE FROM users WHERE id = ?',
            args: [userId]
        });
        console.log('  ✅ Deleted user account');

        console.log(`\n🎉 Successfully deleted all data for ${email}`);
        console.log('You can now register a new account with this email.\n');

    } catch (error) {
        console.error('❌ Error deleting user:', error);
    }
}

deleteUser();
