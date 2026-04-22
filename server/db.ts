import { MongoClient, Db, Collection } from 'mongodb';
import { loadEnv } from './load-env';
import { createInMemoryDb, MemoryDb } from './db-memory';

loadEnv();

const IS_DEV_MODE = process.env.DEV_MODE === 'true';
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'safar';

if (!IS_DEV_MODE && !MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set. Database operations will fail.');
}

let client: MongoClient;
let database: Db | MemoryDb;

export function getMongoClient(): MongoClient {
    return client;
}

export function getDb(): Db {
    if (!database) {
        throw new Error('Database not initialized. Call connectMongo() first.');
    }
    // In DEV_MODE the MemoryDb duck-types the Db interface
    return database as Db;
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
    ekagraModeSessions: () => getDb().collection('ekagra_mode_sessions'),
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
    legacyUploadUsageDaily: () => getDb().collection('legacy_upload_usage_daily'),
    appSettings: () => getDb().collection('app_settings'),
    sandeshMessages: () => getDb().collection('sandesh_messages'),
    sandeshReactions: () => getDb().collection('sandesh_reactions'),
    sandeshComments: () => getDb().collection('sandesh_comments'),
    userSocialHandles: () => getDb().collection('user_social_handles'),
    
    // ── Mission Mode ──
    missionProfiles: () => getDb().collection('mission_profiles'),
    missionPlans: () => getDb().collection('mission_plans'),
    missionTasks: () => getDb().collection('mission_tasks'),
    revisionItems: () => getDb().collection('revision_items'),
    mockResults: () => getDb().collection('mock_results'),
    mockRecoveryPlans: () => getDb().collection('mock_recovery_plans'),
    readinessSnapshots: () => getDb().collection('readiness_snapshots'),
    backlogEvents: () => getDb().collection('backlog_events'),
};

export async function connectMongo(): Promise<void> {
    if (client) return;

    // ── DEV_MODE: use in-memory stub, no real MongoDB needed ──
    if (IS_DEV_MODE) {
        database = createInMemoryDb();
        console.log('📁 Database: DEV MODE (in-memory stub — data resets on restart)');
        return;
    }

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is required for server startup.');
    }

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
            } else {
                // Re-throw on final attempt so startup cannot proceed with an uninitialized DB.
                throw err;
            }
        }
    }
}

export async function initDatabase(): Promise<void> {
    if (IS_DEV_MODE) {
        console.log('✅ DEV MODE — skipping index creation');
        return;
    }

    const db = getDb();

    // Create indexes — idempotent (no-ops if they already exist)
    try {
        // ── Users ──
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ id: 1 }, { unique: true });
        await db.collection('users').createIndex({ is_shadow_banned: 1, spam_strike_count: 1 });
        await db.collection('users').createIndex({ mehfil_banned_forever: 1, mehfil_banned_until: 1, mehfil_ban_level: 1 });

        // ── Streaks ──
        await db.collection('streaks').createIndex({ user_id: 1 }, { unique: true });

        // ── Password reset ──
        await db.collection('password_reset_tokens').createIndex({ token_hash: 1 }, { unique: true });
        await db.collection('password_reset_tokens').createIndex({ user_id: 1 });
        await db.collection('password_reset_tokens').createIndex({ expires_at: 1 });

        // ── Login history ──
        await db.collection('login_history').createIndex({ user_id: 1 });
        await db.collection('login_history').createIndex({ user_id: 1, timestamp: -1 });

        // ── Moods ──
        await db.collection('moods').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('mood_snapshots').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('mood_snapshots').createIndex({ user_id: 1, date_key: 1 });

        // ── Goals ──
        await db.collection('goals').createIndex({ user_id: 1, created_at: -1 });
        await db.collection('goals').createIndex({ user_id: 1, lifecycle_status: 1, expires_at: 1 });
        await db.collection('goal_activity_logs').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('goal_activity_logs').createIndex({ user_id: 1, event_type: 1, timestamp: -1 });
        await db.collection('goal_activity_logs').createIndex({ goal_id: 1, timestamp: -1 });

        // ── Journal ──
        await db.collection('journal').createIndex({ user_id: 1, timestamp: -1 });

        // ── Focus sessions ──
        await db.collection('focus_sessions').createIndex({ user_id: 1, completed_at: -1 });
        // Partial index: most analytics only query completed sessions — smaller & faster
        await db.collection('focus_sessions').createIndex(
            { user_id: 1, completed_at: -1 },
            { partialFilterExpression: { completed: true }, name: 'focus_sessions_completed_partial' }
        );
        await db.collection('focus_session_logs').createIndex({ user_id: 1, timestamp: -1 });
        await db.collection('focus_session_logs').createIndex({ user_id: 1, date_key: 1 });
        await db.collection('ekagra_mode_sessions').createIndex({ user_id: 1, status: 1, updated_at: -1 });
        await db.collection('ekagra_mode_sessions').createIndex({ user_id: 1, goal_id: 1, status: 1, updated_at: -1 });
        await db.collection('ekagra_mode_sessions').createIndex(
            { user_id: 1, goal_id: 1 },
            {
                unique: true,
                partialFilterExpression: { status: { $in: ['active', 'paused'] } },
                name: 'ekagra_open_session_per_goal_unique',
            },
        );
        await db.collection('ekagra_mode_sessions').createIndex({ user_id: 1, id: 1 }, { unique: true });
        await db.collection('focus_overlay_state').createIndex({ user_id: 1 }, { unique: true });
        await db.collection('focus_overlay_state').createIndex({ updated_at: -1 });
        await db.collection('focus_overlay_sessions').createIndex({ user_id: 1, updated_at: -1 });
        await db.collection('focus_overlay_sessions').createIndex({ user_id: 1, session_id: 1 }, { unique: true });

        // ── Section activity & aggregates ──
        await db.collection('section_activity').createIndex({ chunk_key: 1 }, { unique: true });
        await db.collection('section_activity').createIndex({ user_id: 1, date: 1 });
        await db.collection('daily_aggregates').createIndex({ user_id: 1, date: 1 }, { unique: true });
        await db.collection('monthly_reports').createIndex({ user_id: 1, month: 1 }, { unique: true });

        // ── Perks & Achievements ──
        await db.collection('perk_definitions').createIndex({ id: 1 }, { unique: true });
        await db.collection('user_perks').createIndex({ user_id: 1, perk_id: 1 }, { unique: true });
        await db.collection('achievement_definitions').createIndex({ id: 1 }, { unique: true });
        await db.collection('user_achievements').createIndex({ user_id: 1, achievement_id: 1 }, { unique: true });

        // ── Mehfil ──
        await db.collection('mehfil_thoughts').createIndex({ user_id: 1 });
        await db.collection('mehfil_thoughts').createIndex({ created_at: -1 });
        // Partial index: only covers approved/pending posts — smaller & faster for feed queries
        await db.collection('mehfil_thoughts').createIndex(
            { category: 1, status: 1, created_at: -1 },
            { partialFilterExpression: { status: { $in: ['approved', 'pending'] } }, name: 'mehfil_thoughts_feed_partial' }
        );
        await db.collection('mehfil_thoughts').createIndex(
            { content: 'text', author_name: 'text' },
            { name: 'mehfil_thoughts_text_search', default_language: 'none' }
        );
        await db.collection('mehfil_thoughts').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
        await db.collection('mehfil_reactions').createIndex({ thought_id: 1, user_id: 1 }, { unique: true });
        await db.collection('mehfil_comments').createIndex({ thought_id: 1, created_at: -1 });
        await db.collection('mehfil_saves').createIndex({ user_id: 1, thought_id: 1 }, { unique: true });
        await db.collection('mehfil_reports').createIndex({ thought_id: 1 });
        await db.collection('mehfil_reports').createIndex({ thought_id: 1, reporter_id: 1 });
        await db.collection('mehfil_shares').createIndex({ thought_id: 1 });
        await db.collection('mehfil_friendships').createIndex({ user_id: 1, friend_id: 1 }, { unique: true });
        await db.collection('mehfil_friendships').createIndex({ friend_id: 1 });

        // ── Payments ──
        await db.collection('orders').createIndex({ razorpay_order_id: 1 }, { unique: true });
        await db.collection('orders').createIndex({ user_id: 1 });
        await db.collection('payments').createIndex({ razorpay_payment_id: 1 }, { unique: true });
        await db.collection('payments').createIndex({ razorpay_order_id: 1 });
        await db.collection('payments').createIndex({ user_id: 1 });
        await db.collection('refunds').createIndex({ razorpay_refund_id: 1 }, { unique: true });
        await db.collection('refunds').createIndex({ razorpay_payment_id: 1 });
        await db.collection('course_enrollments').createIndex({ user_id: 1, course_id: 1 }, { unique: true });
        await db.collection('transaction_logs').createIndex({ order_id: 1 });

        // ── Uploads ──
        await db.collection('uploaded_images').createIndex({ user_id: 1 });
        await db.collection('legacy_upload_usage_daily').createIndex({ event: 1, day: 1 }, { unique: true });
        await db.collection('legacy_upload_usage_daily').createIndex({ day: 1 });
        await db.collection('legacy_upload_usage_daily').createIndex({ updatedAt: -1 });

        // ── App settings ──
        await db.collection('app_settings').createIndex({ key: 1 }, { unique: true });

        // ── Sandesh ──
        await db.collection('sandesh_messages').createIndex({ created_at: -1 });
        await db.collection('sandesh_reactions').createIndex({ sandesh_id: 1, user_id: 1 }, { unique: true });
        await db.collection('sandesh_comments').createIndex({ sandesh_id: 1, created_at: 1 });

        // ── Social handles ──
        await db.collection('user_social_handles').createIndex({ user_id: 1 }, { unique: true });

        // ── Mission Mode ──
        await db.collection('mission_profiles').createIndex({ user_id: 1 }, { unique: true });
        await db.collection('mission_plans').createIndex({ user_id: 1, status: 1 });
        await db.collection('mission_tasks').createIndex({ plan_id: 1, user_id: 1, date: 1 });
        await db.collection('revision_items').createIndex({ user_id: 1, plan_id: 1, next_due_date: 1 });
        await db.collection('mock_results').createIndex({ user_id: 1, date_taken: -1 });
        await db.collection('mock_recovery_plans').createIndex({ mock_result_id: 1 }, { unique: true });
        await db.collection('readiness_snapshots').createIndex({ user_id: 1, computed_at: -1 });
        await db.collection('backlog_events').createIndex({ user_id: 1, status: 1 });

        console.log('✅ MongoDB indexes created');
    } catch (err: any) {
        console.warn('⚠️  Index creation warning:', err.message);
    }
}
