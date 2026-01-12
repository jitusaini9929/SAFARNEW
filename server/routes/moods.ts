import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Get all moods for the current user
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM moods WHERE user_id = ? ORDER BY timestamp DESC',
            args: [req.session.userId]
        });
        res.json(result.rows);
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
        const userId = req.session.userId;

        // Check if there's already a mood entry for today (IST)
        const todayIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const existingMood = await db.execute({
            sql: `SELECT id FROM moods WHERE user_id = ? AND DATE(timestamp) = DATE(?)`,
            args: [userId, todayIST]
        });

        const isFirstCheckInToday = existingMood.rows.length === 0;

        await db.execute({
            sql: `INSERT INTO moods (id, user_id, mood, intensity, notes) VALUES (?, ?, ?, ?, ?)`,
            args: [id, userId, mood, intensity, notes || '']
        });

        // Only update check_in streak if this is the first check-in today
        if (isFirstCheckInToday) {
            // Get current streak data
            const streakResult = await db.execute({
                sql: 'SELECT * FROM streaks WHERE user_id = ?',
                args: [userId]
            });
            const currentStreak = streakResult.rows[0] as any;

            if (currentStreak) {
                const lastActiveDate = currentStreak.last_active_date ? currentStreak.last_active_date.split(' ')[0].split('T')[0] : null;

                if (lastActiveDate === todayIST) {
                    // Already active today, no change
                    console.log('🟡 [CHECK-IN] Already checked in today, streak unchanged');
                } else {
                    // Calculate if consecutive day or missed days
                    const yesterday = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActiveDate === yesterdayStr || currentStreak.check_in_streak === 0) {
                        // Consecutive day or first check-in, increment
                        await db.execute({
                            sql: `UPDATE streaks SET check_in_streak = check_in_streak + 1, last_active_date = ? WHERE user_id = ?`,
                            args: [todayIST, userId]
                        });
                        console.log('🟢 [CHECK-IN] Streak incremented');
                    } else {
                        // Missed days, reset to 1
                        await db.execute({
                            sql: `UPDATE streaks SET check_in_streak = 1, last_active_date = ? WHERE user_id = ?`,
                            args: [todayIST, userId]
                        });
                        console.log('🔴 [CHECK-IN] Streak reset to 1 due to gap');
                    }
                }
            }
        } else {
            console.log('🟡 [CHECK-IN] Additional check-in today, streak unchanged');
        }

        res.status(201).json({
            id,
            userId,
            mood,
            intensity,
            notes,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create mood error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const moodRoutes = router;
