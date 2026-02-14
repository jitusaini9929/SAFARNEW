import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Helper function to get IST timestamp
const getISTTimestamp = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset).toISOString();
};

// Get all goals
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const rows = await collections.goals()
            .find({ user_id: req.session.userId })
            .sort({ created_at: -1 })
            .toArray();
        res.json(rows);
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
        const userId = req.session.userId!;
        const createdAt = new Date();

        await collections.goals().insertOne({
            id, user_id: userId, text, type, completed: false, created_at: createdAt, completed_at: null
        });

        res.status(201).json({
            id, userId, text, type, completed: false, createdAt: createdAt.toISOString()
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
    const userId = req.session.userId!;

    try {
        const completedAt = completed ? new Date() : null;

        const result = await collections.goals().updateOne(
            { id, user_id: userId },
            { $set: { completed, completed_at: completedAt } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        // Update goal completion streak if completed
        if (completed) {
            const now = new Date();
            const todayIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
            const startOfDay = new Date(todayIST + 'T00:00:00.000Z');
            startOfDay.setTime(startOfDay.getTime() - (5.5 * 60 * 60 * 1000));
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

            const todayGoalsCount = await collections.goals().countDocuments({
                user_id: userId,
                completed: true,
                completed_at: { $gte: startOfDay, $lt: endOfDay }
            });

            if (todayGoalsCount <= 1) {
                const currentStreak = await collections.streaks().findOne({ user_id: userId });

                if (currentStreak) {
                    const lastActiveDate = currentStreak.last_active_date
                        ? String(currentStreak.last_active_date).split(' ')[0].split('T')[0]
                        : null;

                    const yesterday = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    if (lastActiveDate === todayIST) {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $inc: { goal_completion_streak: 1 } }
                        );
                        console.log('🟢 [GOAL] Streak incremented - same day');
                    } else if (lastActiveDate === yesterdayStr || currentStreak.goal_completion_streak === 0) {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $inc: { goal_completion_streak: 1 } }
                        );
                        console.log('🟢 [GOAL] Streak incremented - consecutive day');
                    } else {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $set: { goal_completion_streak: 1 } }
                        );
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
        const result = await collections.goals().deleteOne({ id, user_id: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const goalRoutes = router;
