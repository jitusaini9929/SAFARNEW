import { createClient } from '@libsql/client';

// Turso cloud database connection
// For local development, you can use a local SQLite file as fallback
const isProduction = process.env.TURSO_DATABASE_URL ? true : false;

export const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

console.log('📁 Database:', isProduction ? 'Turso Cloud' : 'Local SQLite');

// Initialize tables
export async function initDatabase() {
    // Users table
    await db.execute(`
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Moods table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS moods (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            mood TEXT NOT NULL,
            intensity INTEGER NOT NULL,
            notes TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Goals table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            text TEXT NOT NULL,
            type TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Journal entries table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS journal (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Streaks table
    await db.execute(`
        CREATE TABLE IF NOT EXISTS streaks (
            id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            login_streak INTEGER DEFAULT 0,
            check_in_streak INTEGER DEFAULT 0,
            goal_completion_streak INTEGER DEFAULT 0,
            last_active_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Store session
    await db.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
            sid TEXT PRIMARY KEY NOT NULL,
            sess TEXT NOT NULL,
            expire DATETIME NOT NULL
        )
    `);

    // Login/Activity history
    await db.execute(`
        CREATE TABLE IF NOT EXISTS login_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Focus sessions table for Study With Me analytics
    await db.execute(`
        CREATE TABLE IF NOT EXISTS focus_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            break_minutes INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT 0,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Perk definitions table - stores all available perks
    await db.execute(`
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
            is_limited INTEGER DEFAULT 0,
            available_from TEXT,
            available_until TEXT,
            max_recipients INTEGER,
            display_priority INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User perks table - tracks which perks each user has earned
    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_perks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            perk_id TEXT NOT NULL,
            acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            lost_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (perk_id) REFERENCES perk_definitions(id),
            UNIQUE(user_id, perk_id)
        )
    `);

    // Migration: Ensure selected_perk_id column exists on users table (for existing databases)
    try {
        await db.execute(`ALTER TABLE users ADD COLUMN selected_perk_id TEXT`);
        console.log('Added selected_perk_id column to users table');
    } catch (e) {
        // Column likely already exists - ignore
    }

    // ========================================
    // NEW: Achievement System Tables
    // ========================================

    // Achievement definitions table - stores all available achievements
    await db.execute(`
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User achievements table - tracks which achievements each user has earned
    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_achievements (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            achievement_id TEXT NOT NULL,
            acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (achievement_id) REFERENCES achievement_definitions(id),
            UNIQUE(user_id, achievement_id)
        )
    `);

    // Migration: Add selected_achievement_id to users table
    try {
        await db.execute(`ALTER TABLE users ADD COLUMN selected_achievement_id TEXT`);
        console.log('Added selected_achievement_id column to users table');
    } catch (e) {
        // Column likely already exists - ignore
    }

    console.log('Database initialized successfully');
}
