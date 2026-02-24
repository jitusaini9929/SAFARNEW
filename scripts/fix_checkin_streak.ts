
import { connectMongo, collections, getMongoClient } from '../server/db';
import { v4 as uuidv4 } from 'uuid';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);
const getISTDateKey = (date: Date) => toISTDate(date).toISOString().split('T')[0];
const shiftISTDateKey = (dateKey: string, days: number) => {
    const baseUTC = new Date(`${dateKey}T00:00:00.000Z`);
    const shifted = new Date(baseUTC.getTime() + days * DAY_MS);
    return getISTDateKey(shifted);
};

const normalizeTimestamp = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed;
};

async function fixStreak() {
    console.log('Connecting to DB...');
    await connectMongo();

    const targetEmail = "steve123@example.com";
    console.log(`\n🔍 Checking user: ${targetEmail}`);

    const user = await collections.users().findOne({ email: targetEmail });

    if (!user) {
        console.error(`❌ User not found: ${targetEmail}`);
        process.exit(1);
    }

    const userId = user.id;
    console.log(`✅ Found user_id: ${userId}`);

    // GET MOODS
    const moods = await collections.moods()
        .find({ user_id: userId })
        .sort({ timestamp: -1 })
        .toArray();

    console.log(`📊 Found ${moods.length} total mood entries.`);

    // GET SNAPSHOTS
    const snapshots = await collections.moodSnapshots()
        .find({ user_id: userId })
        .toArray();
    console.log(`📸 Found ${snapshots.length} mood snapshots.`);

    // GET LOGIN HISTORY
    const logins = await collections.loginHistory()
        .find({ user_id: userId })
        .sort({ timestamp: -1 })
        .toArray();
    console.log(`🔑 Found ${logins.length} login history entries.`);

    const moodDaySet = new Set<string>();
    let latestMoodKey: string | null = null;

    for (const row of moods) {
        const ts = normalizeTimestamp((row as any).timestamp);
        if (!ts) continue;
        const key = getISTDateKey(ts);
        moodDaySet.add(key);
        if (!latestMoodKey || key > latestMoodKey) latestMoodKey = key;
    }

    const loginDaySet = new Set<string>();
    for (const row of logins) {
        const ts = normalizeTimestamp((row as any).timestamp);
        if (!ts) continue;
        const key = getISTDateKey(ts);
        loginDaySet.add(key);
    }

    const snapshotDaySet = new Set<string>();
    for (const row of snapshots) {
        const ts = normalizeTimestamp((row as any).timestamp);
        const key = (row as any).date_key || (ts ? getISTDateKey(ts) : null);
        if (key) snapshotDaySet.add(key);
    }

    console.log(`\n📅 Activity Summary (IST Keys):`);
    const allDays = Array.from(new Set([...moodDaySet, ...loginDaySet, ...snapshotDaySet])).sort().reverse();

    console.log(`Day\t\tMood\tSnapshot\tLogin`);
    for (const day of allDays) {
        console.log(`${day}\t${moodDaySet.has(day) ? '✅' : '❌'}\t${snapshotDaySet.has(day) ? '✅' : '❌'}\t${loginDaySet.has(day) ? '✅' : '❌'}`);
    }

    let calculatedStreak = 0;
    if (latestMoodKey) {
        let cursorKey = latestMoodKey;
        while (moodDaySet.has(cursorKey)) {
            calculatedStreak += 1;
            cursorKey = shiftISTDateKey(cursorKey, -1);
        }
    }

    console.log(`\n🔥 Calculated Check-In Streak: ${calculatedStreak}`);

    // GET STORED STREAK
    const storedStreakDoc = await collections.streaks().findOne({ user_id: userId });
    const storedStreak = storedStreakDoc?.check_in_streak || 0;

    console.log(`💾 Stored Streak in DB: ${storedStreak}`);

    if (calculatedStreak !== storedStreak) {
        console.log(`⚠️ MISMATCH DETECTED! Updating streak to ${calculatedStreak}...`);
        await collections.streaks().updateOne(
            { user_id: userId },
            {
                $set: {
                    check_in_streak: calculatedStreak,
                    last_check_in_date: latestMoodKey,
                    last_active_date: new Date(),
                }
            }
        );
        console.log(`✅ Streak updated successfully.`);
    } else {
        console.log(`✅ Streak is already correct in the database.`);
    }

    // Close connection
    await getMongoClient().close();
    process.exit(0);
}

fixStreak().catch(console.error);
