import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);
const getISTDateKey = (date: Date) => toISTDate(date).toISOString().split('T')[0];
const getStartOfISTDayUTC = (date: Date) => {
    const istKey = getISTDateKey(date);
    const startUTC = new Date(`${istKey}T00:00:00.000Z`);
    startUTC.setTime(startUTC.getTime() - IST_OFFSET_MS);
    return startUTC;
};
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

const calculateCheckInStreakFromMoods = async (userId: string, todayIST: string) => {
    const recentMoods = await collections.moods()
        .find({ user_id: userId }, { projection: { timestamp: 1 } })
        .sort({ timestamp: -1 })
        .limit(500)
        .toArray();

    const daySet = new Set<string>();
    for (const row of recentMoods) {
        const ts = normalizeTimestamp((row as any).timestamp);
        if (!ts) continue;
        daySet.add(getISTDateKey(ts));
    }

    let streak = 0;
    let cursorKey = todayIST;
    while (daySet.has(cursorKey)) {
        streak += 1;
        cursorKey = shiftISTDateKey(cursorKey, -1);
    }

    return Math.max(streak, 1);
};

// Get all moods for the current user
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const rows = await collections.moods()
            .find({ user_id: req.session.userId })
            .sort({ timestamp: -1 })
            .toArray();
        res.json(rows);
    } catch (error) {
        console.error('Get moods error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create a new mood entry
router.post('/', requireAuth, async (req: Request, res) => {
    const { mood, intensity, notes, preStudyMood, postStudyMood } = req.body;

    if (!mood || !intensity) {
        return res.status(400).json({ message: 'Mood and intensity are required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId!;
        const now = new Date();

        // Check if there's already a mood entry for today (IST)
        const todayIST = getISTDateKey(now);
        const startOfDay = getStartOfISTDayUTC(now);
        const endOfDay = new Date(startOfDay.getTime() + DAY_MS);

        const existingCount = await collections.moods().countDocuments({
            user_id: userId,
            timestamp: { $gte: startOfDay, $lt: endOfDay }
        });
        console.log('🔵 [CHECK-IN] Checking existing for:', todayIST, 'Found:', existingCount);

        const isFirstCheckInToday = existingCount === 0;

        await collections.moods().insertOne({
            id, user_id: userId, mood, intensity, notes: notes || '', timestamp: now
        });

        await collections.moodSnapshots().insertOne({
            id: uuidv4(),
            user_id: userId,
            mood_score: Number(intensity),
            pre_study_mood: preStudyMood || mood,
            post_study_mood: postStudyMood || null,
            timestamp: now,
            date_key: todayIST,
            source: 'check_in',
            created_at: new Date(),
        });

        const nextStreak = await calculateCheckInStreakFromMoods(userId, todayIST);

        await collections.streaks().updateOne(
            { user_id: userId },
            {
                $set: {
                    check_in_streak: nextStreak,
                    last_check_in_date: todayIST,
                    last_active_date: now,
                },
                $setOnInsert: {
                    id: uuidv4(),
                    user_id: userId,
                    login_streak: 0,
                    goal_completion_streak: 0,
                },
            },
            { upsert: true }
        );

        if (isFirstCheckInToday) {
            console.log(`[CHECK-IN] Streak updated to ${nextStreak}`);
        } else {
            console.log(`[CHECK-IN] Additional check-in today, streak still ${nextStreak}`);
        }

        res.status(201).json({
            id, userId, mood, intensity, notes, timestamp: now.toISOString()
        });
    } catch (error) {
        console.error('Create mood error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const moodRoutes = router;
