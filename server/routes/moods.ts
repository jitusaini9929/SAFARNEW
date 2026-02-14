import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

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
    const { mood, intensity, notes } = req.body;

    if (!mood || !intensity) {
        return res.status(400).json({ message: 'Mood and intensity are required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId!;
        const now = new Date();

        // Check if there's already a mood entry for today (IST)
        const todayIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const startOfDay = new Date(todayIST + 'T00:00:00.000Z');
        startOfDay.setTime(startOfDay.getTime() - (5.5 * 60 * 60 * 1000)); // Convert IST midnight to UTC
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const existingCount = await collections.moods().countDocuments({
            user_id: userId,
            timestamp: { $gte: startOfDay, $lt: endOfDay }
        });
        console.log('🔵 [CHECK-IN] Checking existing for:', todayIST, 'Found:', existingCount);

        const isFirstCheckInToday = existingCount === 0;

        await collections.moods().insertOne({
            id, user_id: userId, mood, intensity, notes: notes || '', timestamp: now
        });

        // Only update check_in streak if this is the first check-in today
        if (isFirstCheckInToday) {
            const currentStreak = await collections.streaks().findOne({ user_id: userId });

            if (currentStreak) {
                let lastActiveDate: string | null = null;
                if (currentStreak.last_active_date) {
                    const dateObj = new Date(currentStreak.last_active_date);
                    const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
                    lastActiveDate = istDate.toISOString().split('T')[0];
                }

                if (lastActiveDate === todayIST) {
                    console.log('🟡 [CHECK-IN] Already checked in today, streak unchanged');
                } else {
                    const yesterday = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActiveDate === yesterdayStr || currentStreak.check_in_streak === 0) {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $inc: { check_in_streak: 1 }, $set: { last_active_date: todayIST } }
                        );
                        console.log('🟢 [CHECK-IN] Streak incremented');
                    } else {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $set: { check_in_streak: 1, last_active_date: todayIST } }
                        );
                        console.log('🔴 [CHECK-IN] Streak reset to 1 due to gap');
                    }
                }
            }
        } else {
            console.log('🟡 [CHECK-IN] Additional check-in today, streak unchanged');
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
