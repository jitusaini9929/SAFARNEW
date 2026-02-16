import { MongoClient, Db, Collection } from 'mongodb';
import { loadEnv } from './load-env';

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'safar';

if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set. Database operations will fail.');
}

let client: MongoClient;
let database: Db;

export function getMongoClient(): MongoClient {
    return client;
}

export function getDb(): Db {
    if (!database) {
        throw new Error('Database not initialized. Call connectMongo() first.');
    }
    return database;
}

// Collection accessors
export const collections = {
    users: () => getDb().collection('users'),
    moods: () => getDb().collection('moods'),
    moodSnapshots: () => getDb().collection('mood_snapshots'),
    goals: () => getDb().collection('goals'),
    goalActivityLogs: () => getDb().collection('goal_activity_logs'),
    journal: () => getDb().collection('journal'),
    streaks: () => getDb().collection('streaks'),
    sessions: () => getDb().collection('sessions'),
    passwordResetTokens: () => getDb().collection('password_reset_tokens'),
    loginHistory: () => getDb().collection('login_history'),
    focusSessions: () => getDb().collection('focus_sessions'),
    focusSessionLogs: () => getDb().collection('focus_session_logs'),
    focusOverlayState: () => getDb().collection('focus_overlay_state'),
    focusOverlaySessions: () => getDb().collection('focus_overlay_sessions'),
    sectionActivity: () => getDb().collection('section_activity'),
    dailyAggregates: () => getDb().collection('daily_aggregates'),
    monthlyReports: () => getDb().collection('monthly_reports'),
    perkDefinitions: () => getDb().collection('perk_definitions'),
    userPerks: () => getDb().collection('user_perks'),
    achievementDefinitions: () => getDb().collection('achievement_definitions'),
    userAchievements: () => getDb().collection('user_achievements'),
    mehfilThoughts: () => getDb().collection('mehfil_thoughts'),
    mehfilReactions: () => getDb().collection('mehfil_reactions'),
    mehfilComments: () => getDb().collection('mehfil_comments'),
    mehfilSaves: () => getDb().collection('mehfil_saves'),
    mehfilReports: () => getDb().collection('mehfil_reports'),
    mehfilShares: () => getDb().collection('mehfil_shares'),
    mehfilFriendships: () => getDb().collection('mehfil_friendships'),
    orders: () => getDb().collection('orders'),
    payments: () => getDb().collection('payments'),
    refunds: () => getDb().collection('refunds'),
    courseEnrollments: () => getDb().collection('course_enrollments'),
    transactionLogs: () => getDb().collection('transaction_logs'),
    uploadedImages: () => getDb().collection('uploaded_images'),
    sandeshMessages: () => getDb().collection('sandesh_messages'),
};

export async function connectMongo(): Promise<void> {
    if (client) return;

    const maxRetries = 3;
    let delay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            client = new MongoClient(MONGODB_URI, {
                connectTimeoutMS: 30000,
                serverSelectionTimeoutMS: 30000,
            });
            await client.connect();
            database = client.db(DB_NAME);
            // Quick ping to verify
            await database.command({ ping: 1 });
            console.log('📁 Database: MongoDB connected');
            return;
        } catch (err: any) {
            console.warn(`⚠️  MongoDB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
            if (attempt < maxRetries) {
                console.log(`   Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    }
    console.error('❌ MongoDB connection failed after all retries.');
}

export async function initDatabase(): Promise<void> {
    const db = getDb();

    // Create unique indexes to enforce constraints
    try {
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ id: 1 }, { unique: true });
        await db.collection('users').createIndex({ is_shadow_banned: 1, spam_strike_count: 1 });
        await db.collection('users').createIndex({ mehfil_banned_forever: 1, mehfil_banned_until: 1, mehfil_ban_level: 1 });
        await db.collection('streaks').createIndex({ user_id: 1 }, { unique: true });
        await db.collection('password_reset_tokens').createIndex({ token_hash: 1 }, { unique: true });
        await db.collection('password_reset_tokens').createIndex({ user_id: 1 });
        await db.collection('password_reset_tokens').createIndex({ expires_at: 1 });
        await db.collection('login_history').createIndex({ user_id: 1 });
        await db.collection('moods').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('mood_snapshots').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('mood_snapshots').createIndex({ user_id: 1, date_key: 1 });
        await db.collection('goals').createIndex({ user_id: 1, created_at: -1 });
        await db.collection('goals').createIndex({ user_id: 1, lifecycle_status: 1, expires_at: 1 });
        await db.collection('goal_activity_logs').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('goal_activity_logs').createIndex({ user_id: 1, event_type: 1, timestamp: -1 });
        await db.collection('goal_activity_logs').createIndex({ goal_id: 1, timestamp: -1 });
        await db.collection('journal').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('focus_sessions').createIndex({ user_id: 1, completed_at: -1 });
        await db.collection('focus_session_logs').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('focus_session_logs').createIndex({ user_id: 1, date_key: 1 });
        await db.collection('focus_overlay_state').createIndex({ user_id: 1 }, { unique: true });
        await db.collection('focus_overlay_state').createIndex({ updated_at: -1 });
        await db.collection('focus_overlay_sessions').createIndex({ user_id: 1, updated_at: -1 });
        await db.collection('focus_overlay_sessions').createIndex({ user_id: 1, session_id: 1 }, { unique: true });
        await db.collection('section_activity').createIndex({ chunk_key: 1 }, { unique: true });
        await db.collection('section_activity').createIndex({ user_id: 1, date: 1 });
        await db.collection('daily_aggregates').createIndex({ user_id: 1, date: 1 }, { unique: true });
        await db.collection('monthly_reports').createIndex({ user_id: 1, month: 1 }, { unique: true });
        await db.collection('perk_definitions').createIndex({ id: 1 }, { unique: true });
        await db.collection('user_perks').createIndex({ user_id: 1, perk_id: 1 }, { unique: true });
        await db.collection('achievement_definitions').createIndex({ id: 1 }, { unique: true });
        await db.collection('user_achievements').createIndex({ user_id: 1, achievement_id: 1 }, { unique: true });
        await db.collection('mehfil_thoughts').createIndex({ user_id: 1 });
        await db.collection('mehfil_thoughts').createIndex({ created_at: -1 });
        await db.collection('mehfil_thoughts').createIndex({ category: 1, status: 1, created_at: -1 });
        await db.collection('mehfil_thoughts').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
        await db.collection('mehfil_reactions').createIndex({ thought_id: 1, user_id: 1 }, { unique: true });
        await db.collection('mehfil_comments').createIndex({ thought_id: 1 });
        await db.collection('mehfil_saves').createIndex({ user_id: 1, thought_id: 1 }, { unique: true });
        await db.collection('mehfil_reports').createIndex({ thought_id: 1 });
        await db.collection('mehfil_reports').createIndex({ thought_id: 1, reporter_id: 1 });
        await db.collection('mehfil_shares').createIndex({ thought_id: 1 });
        await db.collection('mehfil_friendships').createIndex({ user_id: 1, friend_id: 1 }, { unique: true });
        await db.collection('mehfil_friendships').createIndex({ friend_id: 1 });
        await db.collection('orders').createIndex({ razorpay_order_id: 1 }, { unique: true });
        await db.collection('orders').createIndex({ user_id: 1 });
        await db.collection('payments').createIndex({ razorpay_payment_id: 1 }, { unique: true });
        await db.collection('payments').createIndex({ razorpay_order_id: 1 });
        await db.collection('payments').createIndex({ user_id: 1 });
        await db.collection('refunds').createIndex({ razorpay_refund_id: 1 }, { unique: true });
        await db.collection('refunds').createIndex({ razorpay_payment_id: 1 });
        await db.collection('course_enrollments').createIndex({ user_id: 1, course_id: 1 }, { unique: true });
        await db.collection('transaction_logs').createIndex({ order_id: 1 });
        await db.collection('uploaded_images').createIndex({ user_id: 1 });

        await db.collection('mehfil_reactions').createIndex({ thought_id: 1, user_id: 1 }, { unique: true });
        await db.collection('mehfil_comments').createIndex({ thought_id: 1 });
        await db.collection('mehfil_saves').createIndex({ user_id: 1, thought_id: 1 }, { unique: true });
        await db.collection('mehfil_reports').createIndex({ thought_id: 1 });
        await db.collection('mehfil_shares').createIndex({ thought_id: 1 });
        await db.collection('mehfil_friendships').createIndex({ user_id: 1, friend_id: 1 }, { unique: true });
        await db.collection('mehfil_friendships').createIndex({ friend_id: 1 });
        await db.collection('orders').createIndex({ razorpay_order_id: 1 }, { unique: true });
        await db.collection('orders').createIndex({ user_id: 1 });
        await db.collection('payments').createIndex({ razorpay_payment_id: 1 }, { unique: true });
        await db.collection('payments').createIndex({ razorpay_order_id: 1 });
        await db.collection('payments').createIndex({ user_id: 1 });
        await db.collection('refunds').createIndex({ razorpay_refund_id: 1 }, { unique: true });
        await db.collection('refunds').createIndex({ razorpay_payment_id: 1 });
        await db.collection('course_enrollments').createIndex({ user_id: 1, course_id: 1 }, { unique: true });
        await db.collection('transaction_logs').createIndex({ order_id: 1 });
        await db.collection('uploaded_images').createIndex({ user_id: 1 });

        console.log('✅ MongoDB indexes created');
    } catch (err: any) {
        console.warn('⚠️  Index creation warning:', err.message);
    }
}
