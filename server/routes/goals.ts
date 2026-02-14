import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Helper function to get IST timestamp
const getISTTimestamp = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    return new Date(now.getTime() + istOffset).toISOString();
};

// Get all goals
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const result = await db.execute({
            sql: 'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
            args: [req.session.userId]
        });
        res.json(result.rows);
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create goal
router.post('/', requireAuth, async (req: Request, res) => {
    const { text, type } = req.body;

    if (!text || !type) {
        return res.status(400).json({ message: 'Text and type are required' });
    }

    try {
        const id = uuidv4();
        const userId = req.session.userId;
        const createdAt = getISTTimestamp();

        await db.execute({
            sql: `INSERT INTO goals (id, user_id, text, type, completed, created_at) VALUES (?, ?, ?, ?, FALSE, ?)`,
            args: [id, userId, text, type, createdAt]
        });

        res.status(201).json({
            id,
            userId,
            text,
            type,
            completed: false,
            createdAt: createdAt
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update goal (toggle completion)
router.patch('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const userId = req.session.userId;

    try {
        const completedAt = completed ? getISTTimestamp() : null;

        const result = await db.execute({
            sql: `UPDATE goals SET completed = ?, completed_at = ? WHERE id = ? AND user_id = ?`,
            args: [completed, completedAt, id, userId]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        // Update goal completion streak if completed
        if (completed) {
            const todayIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];

            // Check if user already completed a goal today
            const todayGoals = await db.execute({
                sql: `SELECT id FROM goals WHERE user_id = ? AND completed = TRUE AND DATE(completed_at) = DATE(?)`,
                args: [userId, todayIST]
            });

            // Only update streak if this is the first goal completion today
            if (todayGoals.rows.length <= 1) {
                // Get current streak data
                const streakResult = await db.execute({
                    sql: 'SELECT * FROM streaks WHERE user_id = ?',
                    args: [userId]
                });
                const currentStreak = streakResult.rows[0] as any;

                if (currentStreak) {
                    const lastActiveDate = currentStreak.last_active_date ? currentStreak.last_active_date.split(' ')[0].split('T')[0] : null;

                    // Calculate yesterday's date
                    const yesterday = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActiveDate === todayIST) {
                        // Already completed goal today - increment streak count
                        await db.execute({
                            sql: `UPDATE streaks SET goal_completion_streak = goal_completion_streak + 1 WHERE user_id = ?`,
                            args: [userId]
                        });
                        console.log('🟢 [GOAL] Streak incremented - same day');
                    } else if (lastActiveDate === yesterdayStr || currentStreak.goal_completion_streak === 0) {
                        // Consecutive day or first goal completion - increment
                        await db.execute({
                            sql: `UPDATE streaks SET goal_completion_streak = goal_completion_streak + 1 WHERE user_id = ?`,
                            args: [userId]
                        });
                        console.log('🟢 [GOAL] Streak incremented - consecutive day');
                    } else {
                        // Missed days, reset to 1
                        await db.execute({
                            sql: `UPDATE streaks SET goal_completion_streak = 1 WHERE user_id = ?`,
                            args: [userId]
                        });
                        console.log('🔴 [GOAL] Streak reset to 1 due to gap');
                    }
                }
            } else {
                console.log('🟡 [GOAL] Additional goal completion today - streak unchanged');
            }
        }

        res.json({ message: 'Goal updated', completed, completedAt });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete goal
router.delete('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const userId = req.session.userId;

    try {
        const result = await db.execute({
            sql: 'DELETE FROM goals WHERE id = ? AND user_id = ?',
            args: [id, userId]
        });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const goalRoutes = router;
