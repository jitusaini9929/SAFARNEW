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
    max: 10, // Reduced for Neon free tier limits
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // Increased to 30s for Neon cold starts
    keepAlive: true, // Prevent connection drops
});

// Helper function to test connection with retries
async function testConnection(retries = 3, delay = 2000): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await pool.query('SELECT NOW()');
            console.log('📁 Database: PostgreSQL (Neon) connected');
            return true;
        } catch (err: any) {
            console.warn(`⚠️  Database connection attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt < retries) {
                console.log(`   Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
    console.error('❌ Database connection failed after all retries. Server will continue but DB operations may fail.');
    return false;
}

// Test connection on startup (non-blocking - doesn't prevent server start)
testConnection().catch(() => { });

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

// Retry wrapper for database operations
async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = 3,
    delay = 2000
): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await operation();
        } catch (err: any) {
            console.warn(`⚠️  ${operationName} attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt < retries) {
                console.log(`   Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw err;
            }
        }
    }
    throw new Error(`${operationName} failed after ${retries} attempts`);
}

// Initialize tables (PostgreSQL syntax)
export async function initDatabase() {
    return withRetry(async () => {
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

        // Password reset tokens
        await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);
        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
        ON password_reset_tokens(user_id)
    `);
        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
        ON password_reset_tokens(expires_at)
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

        // ═══════════════════════════════════════════════════════════
        // Mehfil - Thought Sharing Platform
        // ═══════════════════════════════════════════════════════════

        // Mehfil thoughts table - stores user thoughts/posts
        await pool.query(`
        CREATE TABLE IF NOT EXISTS mehfil_thoughts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            author_name TEXT NOT NULL,
            author_avatar TEXT,
            content TEXT NOT NULL,
            image_url TEXT,
            relatable_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

        // Mehfil reactions table - tracks who reacted to which thought
        await pool.query(`
        CREATE TABLE IF NOT EXISTS mehfil_reactions (
            id TEXT PRIMARY KEY,
            thought_id TEXT NOT NULL REFERENCES mehfil_thoughts(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(thought_id, user_id)
        )
    `);

        // Indexes for performance
        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mehfil_thoughts_user_id 
        ON mehfil_thoughts(user_id)
    `);

        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mehfil_thoughts_created_at 
        ON mehfil_thoughts(created_at DESC)
    `);

        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mehfil_reactions_thought_id 
        ON mehfil_reactions(thought_id)
    `);

        await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mehfil_reactions_user_id 
        ON mehfil_reactions(user_id)
    `);

        // ═══════════════════════════════════════════════════════════
        // Payment System - Razorpay Integration
        // ═══════════════════════════════════════════════════════════

        // Orders table
        await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            razorpay_order_id TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL REFERENCES users(id),
            course_id TEXT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT DEFAULT 'created',
            receipt TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

        // Payments table
        await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            razorpay_payment_id TEXT UNIQUE NOT NULL,
            razorpay_order_id TEXT NOT NULL,
            user_id TEXT NOT NULL REFERENCES users(id),
            amount DECIMAL(10, 2) NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT NOT NULL,
            method TEXT,
            email TEXT,
            contact TEXT,
            card_last4 TEXT,
            card_network TEXT,
            bank TEXT,
            wallet TEXT,
            vpa TEXT,
            razorpay_signature TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            captured_at TIMESTAMP WITH TIME ZONE,
            refunded_at TIMESTAMP WITH TIME ZONE
        )
    `);

        // Refunds table
        await pool.query(`
        CREATE TABLE IF NOT EXISTS refunds (
            id TEXT PRIMARY KEY,
            razorpay_refund_id TEXT UNIQUE NOT NULL,
            razorpay_payment_id TEXT NOT NULL,
            razorpay_order_id TEXT NOT NULL,
            user_id TEXT NOT NULL REFERENCES users(id),
            amount DECIMAL(10, 2) NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT NOT NULL,
            reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE
        )
    `);

        // Course enrollments table
        await pool.query(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            course_id TEXT NOT NULL,
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            access_granted BOOLEAN DEFAULT FALSE,
            expires_at TIMESTAMP WITH TIME ZONE,
            UNIQUE(user_id, course_id)
        )
    `);

        // Transaction logs (audit trail)
        await pool.query(`
        CREATE TABLE IF NOT EXISTS transaction_logs (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            payment_id TEXT,
            event_type TEXT NOT NULL,
            event_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);

        // Payment indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_razorpay_id ON orders(razorpay_order_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(razorpay_order_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(razorpay_payment_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON course_enrollments(user_id, course_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_transaction_logs_order ON transaction_logs(order_id)`);

        console.log('Database initialized successfully (PostgreSQL)');
    }, 'Database initialization', 3, 3000);
}

// Graceful shutdown
process.on('SIGINT', () => {
    pool.end().then(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});
