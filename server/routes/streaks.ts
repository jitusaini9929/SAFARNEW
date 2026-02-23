import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

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

const calculateCheckInStreakFromMoods = async (userId: string) => {
    const recentMoods = await collections.moods()
        .find({ user_id: userId }, { projection: { timestamp: 1 } })
        .sort({ timestamp: -1 })
        .limit(500)
        .toArray();

    const daySet = new Set<string>();
    let latestKey: string | null = null;
    for (const row of recentMoods) {
        const ts = normalizeTimestamp((row as any).timestamp);
        if (!ts) continue;
        const key = getISTDateKey(ts);
        daySet.add(key);
        if (!latestKey || key > latestKey) latestKey = key;
    }

    if (!latestKey) {
        return { streak: 0, latestKey: null };
    }

    let streak = 0;
    let cursorKey = latestKey;
    while (daySet.has(cursorKey)) {
        streak += 1;
        cursorKey = shiftISTDateKey(cursorKey, -1);
    }

    return { streak, latestKey };
};

// Get streak data for current user
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId;
        const streak = await collections.streaks().findOne({ user_id: userId });
        const { streak: checkInStreak, latestKey } = await calculateCheckInStreakFromMoods(userId);

        const loginStreak = streak?.login_streak || 0;
        const goalCompletionStreak = streak?.goal_completion_streak || 0;
        const lastActiveDate = streak?.last_active_date || null;
        const storedCheckIn = streak?.check_in_streak || 0;

        if (storedCheckIn !== checkInStreak || (latestKey && streak?.last_check_in_date !== latestKey)) {
            await collections.streaks().updateOne(
                { user_id: userId },
                {
                    $set: {
                        check_in_streak: checkInStreak,
                        ...(latestKey ? { last_check_in_date: latestKey } : {}),
                    },
                    $setOnInsert: {
                        id: uuidv4(),
                        user_id: userId,
                        login_streak: loginStreak,
                        goal_completion_streak: goalCompletionStreak,
                        last_active_date: new Date(),
                    },
                },
                { upsert: true }
            );
        }

        res.json({
            loginStreak,
            checkInStreak,
            goalCompletionStreak,
            lastActiveDate,
        });
    } catch (error) {
        console.error('Get streaks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const streakRoutes = router;
