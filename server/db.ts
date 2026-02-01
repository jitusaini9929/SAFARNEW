import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
// Using process.cwd() for Vite compatibility
dotenv.config({ path: path.join(process.cwd(), '.env') });

// PostgreSQL connection via Neon
// Connection string format: postgresql://user:password@host/database?sslmode=require
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.warn('⚠️  DATABASE_URL not set. Database operations will fail.');
}

export const pool = new Pool({
    connectionString,
    // SSL configuration for Neon PostgreSQL
    // rejectUnauthorized: false allows self-signed certificates
    ssl: connectionString?.includes('neon.tech') ? {
        rejectUnauthorized: false
    } : false,
    max: 20, // Max connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.query('SELECT NOW()')
    .then(() => console.log('📁 Database: PostgreSQL (Neon) connected'))
    .catch(err => console.error('❌ Database connection failed:', err.message));

// Helper function to match the old interface pattern
// This makes migration easier - routes can use db.query() similar to before
export const db = {
    async execute(params: string | { sql: string; args?: any[] }) {
        // Support both string and object parameter formats
        let sql: string;
        let args: any[] = [];

        if (typeof params === 'string') {
            sql = params;
        } else {
            sql = params.sql;
            args = params.args || [];
        }

        // Convert ? placeholders to $1, $2, $3... for PostgreSQL
        let pgSql = sql;
        let paramIndex = 0;
        pgSql = pgSql.replace(/\?/g, () => `$${++paramIndex}`);

        const result = await pool.query(pgSql, args);
        return {
            rows: result.rows,
            rowsAffected: result.rowCount || 0
        };
    },

    // Direct query access
    query: pool.query.bind(pool)
};

// Initialize tables (PostgreSQL syntax)
export async function initDatabase() {
    // Users table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT,
            exam_type TEXT,
            preparation_stage TEXT,
            gender TEXT,
            selected_perk_id TEXT,
            selected_achievement_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Moods table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS moods (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            mood TEXT NOT NULL,
            intensity INTEGER NOT NULL,
            notes TEXT,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Goals table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            text TEXT NOT NULL,
            type TEXT NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE
        )
    `);

    // Journal entries table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS journal (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            content TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Streaks table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS streaks (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
            login_streak INTEGER DEFAULT 0,
            check_in_streak INTEGER DEFAULT 0,
            goal_completion_streak INTEGER DEFAULT 0,
            last_active_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Sessions table (for express-session)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            sid TEXT PRIMARY KEY NOT NULL,
            sess TEXT NOT NULL,
            expire TIMESTAMP WITH TIME ZONE NOT NULL
        )
    `);

    // Login/Activity history
    await pool.query(`
        CREATE TABLE IF NOT EXISTS login_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Focus sessions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS focus_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            duration_minutes INTEGER NOT NULL,
            break_minutes INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE
        )
    `);

    // Perk definitions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS perk_definitions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT CHECK(type IN ('aura', 'echo', 'seasonal')) NOT NULL,
            category TEXT CHECK(category IN ('focus', 'goals', 'mood', 'streak', 'special')) NOT NULL,
            rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
            tier INTEGER,
            color_code TEXT,
            criteria_json TEXT NOT NULL,
            is_limited BOOLEAN DEFAULT FALSE,
            available_from TEXT,
            available_until TEXT,
            max_recipients INTEGER,
            display_priority INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // User perks table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_perks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            perk_id TEXT NOT NULL REFERENCES perk_definitions(id),
            acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            lost_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(user_id, perk_id)
        )
    `);

    // Achievement definitions table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS achievement_definitions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT CHECK(type IN ('badge', 'title')) NOT NULL,
            category TEXT CHECK(category IN ('focus', 'goals', 'emotional')) NOT NULL,
            rarity TEXT CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'special')),
            tier INTEGER,
            criteria_json TEXT NOT NULL DEFAULT '{}',
            display_priority INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // User achievements table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_achievements (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id),
            acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            UNIQUE(user_id, achievement_id)
        )
    `);

    // Mehfil topics table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS mehfil_topics (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            message_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Mehfil messages table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS mehfil_messages (
            id TEXT PRIMARY KEY,
            topic_id TEXT NOT NULL REFERENCES mehfil_topics(id),
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            image_url TEXT,
            relatable_count INTEGER DEFAULT 0,
            flag_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

    // Mehfil votes table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS mehfil_votes (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL REFERENCES mehfil_messages(id),
            session_id TEXT NOT NULL,
            vote_option INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(message_id, session_id)
        )
    `);

    // Seed default topics if none exist
    const existingTopics = await pool.query(`SELECT COUNT(*) as count FROM mehfil_topics`);
    if (parseInt(existingTopics.rows[0]?.count) === 0) {
        await pool.query(`
            INSERT INTO mehfil_topics (id, name, description) VALUES
            ('1', 'General', 'General discussions and thoughts'),
            ('2', 'Study Tips', 'Share your study strategies'),
            ('3', 'Stress Relief', 'Support for stressful times'),
            ('4', 'Achievements', 'Celebrate your wins')
        `);
        console.log('Seeded default Mehfil topics');
    }

    console.log('Database initialized successfully (PostgreSQL)');
}

// Graceful shutdown
process.on('SIGINT', () => {
    pool.end().then(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
