import { createClient } from '@libsql/client';
import 'dotenv/config';

// Connect to Turso cloud database
const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://nistha-ashish252003.aws-ap-south-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function deleteAllGoals() {
    try {
        console.log('🔌 Connecting to Turso database...');

        // First check current goals
        const currentGoals = await db.execute({
            sql: 'SELECT COUNT(*) as count FROM goals',
            args: []
        });
        console.log('📊 Current goals count:', currentGoals.rows[0]);

        // Delete all goals
        const result = await db.execute({
            sql: 'DELETE FROM goals',
            args: []
        });
        console.log('✅ All goals deleted!');
        console.log('Rows affected:', result.rowsAffected);

        // Reset goal completion streak
        await db.execute({
            sql: 'UPDATE streaks SET goal_completion_streak = 0',
            args: []
        });
        console.log('✅ Goal completion streak reset to 0');

        // Verify deletion
        const afterDelete = await db.execute({
            sql: 'SELECT COUNT(*) as count FROM goals',
            args: []
        });
        console.log('📊 Goals count after delete:', afterDelete.rows[0]);

    } catch (error) {
        console.error('❌ Error:', error);
    }
    process.exit(0);
}

deleteAllGoals();
