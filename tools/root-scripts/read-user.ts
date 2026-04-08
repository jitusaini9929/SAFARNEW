
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function readUser() {
    const email = 'thatkindchic@gmail.com';
    console.log(`Reading user: ${email}`);
    try {
        const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email]
        });

        if (userResult.rows.length === 0) {
            console.log("User not found.");
            return;
        }
        const user = userResult.rows[0];
        console.log("User found:", user);

        const streakResult = await db.execute({
            sql: 'SELECT * FROM streaks WHERE user_id = ?',
            args: [user.id]
        });
        console.log("Streaks:", streakResult.rows);

    } catch (error) {
        console.error('Error:', error);
    }
}

readUser();
