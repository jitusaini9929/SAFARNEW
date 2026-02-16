import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getISTDateKey = (date: Date) => {
    return new Date(date.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
};

const getStartOfISTDayUTC = (date: Date) => {
    const istDateKey = getISTDateKey(date);
    const startOfDayUTC = new Date(`${istDateKey}T00:00:00.000Z`);
    startOfDayUTC.setTime(startOfDayUTC.getTime() - IST_OFFSET_MS);
    return startOfDayUTC;
};

const getEndOfISTDayUTC = (date: Date) => {
    return new Date(getStartOfISTDayUTC(date).getTime() + DAY_MS);
};

const getGoalExpiry = (goal: any) => {
    if (goal?.expires_at) return new Date(goal.expires_at);
    if (goal?.expiresAt) return new Date(goal.expiresAt);
    const createdAt = goal?.created_at || goal?.createdAt || new Date();
    return getEndOfISTDayUTC(new Date(createdAt));
};

const isGoalCreationBlockedNow = () => {
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    const hour = nowIST.getUTCHours();
    const minute = nowIST.getUTCMinutes();
    // Block creation between 11:01 PM and 11:59 PM IST.
    return hour === 23 && minute >= 1;
};

// Get all goals
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const rows = await collections.goals()
            .find({ user_id: req.session.userId })
            .sort({ created_at: -1 })
            .toArray();

        const normalizedGoals = rows.map((goal: any) => {
            const createdAt = new Date(goal.created_at || goal.createdAt || Date.now());
            const completedAt = goal.completed_at ? new Date(goal.completed_at) : null;
            const expiresAt = getGoalExpiry(goal);
            return {
                ...goal,
                createdAt: createdAt.toISOString(),
                completedAt: completedAt ? completedAt.toISOString() : null,
                expiresAt: expiresAt.toISOString(),
            };
        });

        res.json(normalizedGoals);
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
        if (isGoalCreationBlockedNow()) {
            return res.status(403).json({ message: 'Sorry cannot create goals att this time , save that for tommorow' });
        }

        const id = uuidv4();
        const userId = req.session.userId!;
        const createdAt = new Date();
        const expiresAt = getEndOfISTDayUTC(createdAt);

        await collections.goals().insertOne({
            id,
            user_id: userId,
            text,
            type,
            completed: false,
            created_at: createdAt,
            completed_at: null,
            expires_at: expiresAt,
        });

        res.status(201).json({
            id,
            userId,
            text,
            type,
            completed: false,
            created_at: createdAt.toISOString(),
            createdAt: createdAt.toISOString(),
            completed_at: null,
            completedAt: null,
            expires_at: expiresAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
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
        const goal = await collections.goals().findOne({ id, user_id: userId });

        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        if (completed) {
            const expiresAt = getGoalExpiry(goal);
            if (Date.now() >= expiresAt.getTime()) {
                return res.status(400).json({ message: 'Goal timer expired. Create a new goal for today.' });
            }
        }

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
            const todayIST = getISTDateKey(now);
            const startOfDay = getStartOfISTDayUTC(now);
            const endOfDay = new Date(startOfDay.getTime() + DAY_MS);

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

                    const yesterday = new Date(now.getTime() + IST_OFFSET_MS);
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
