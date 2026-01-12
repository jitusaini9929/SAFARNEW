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

  console.log('Database initialized successfully');
}
