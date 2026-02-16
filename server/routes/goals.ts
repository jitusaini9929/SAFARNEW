// Forces rebuild
import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { endOfDay, endOfWeek } from 'date-fns';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type GoalType = 'daily' | 'weekly';
type GoalEventType = 'CREATED' | 'COMPLETED' | 'ABANDONED' | 'ROLLED_OVER';
type GoalLifecycleStatus = 'active' | 'missed' | 'rolled_over' | 'abandoned';

const toISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);

const getISTDateKey = (date: Date) => {
    return toISTDate(date).toISOString().split('T')[0];
};

const getISTDayName = (date: Date) => {
    return toISTDate(date).toLocaleDateString('en-IN', { weekday: 'long' });
};

const getISTHour = (date: Date) => {
    return toISTDate(date).getUTCHours();
};

const getStartOfISTDayUTC = (date: Date) => {
    const istDateKey = getISTDateKey(date);
    const startOfDayUTC = new Date(`${istDateKey}T00:00:00.000Z`);
    startOfDayUTC.setTime(startOfDayUTC.getTime() - IST_OFFSET_MS);
    return startOfDayUTC;
};

const getISTDateKeyAfterDays = (date: Date, daysToAdd: number) => {
    const shifted = new Date(date.getTime() + daysToAdd * DAY_MS);
    return getISTDateKey(shifted);
};

const parseScheduledDateInput = (raw: unknown): string | null => {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return null;
    return getISTDateKey(parsed);
};

const calculateExpiryUTC = (goalType: GoalType, now: Date, scheduledDate?: Date | null) => {
    const targetDate = scheduledDate ? toISTDate(scheduledDate) : toISTDate(now);
    const zonedExpiry = goalType === 'weekly'
        ? endOfWeek(targetDate, { weekStartsOn: 1 })
        : endOfDay(targetDate);
    return new Date(zonedExpiry.getTime() - IST_OFFSET_MS);
};

const normalizeGoalType = (raw: unknown): GoalType | null => {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'daily' || value === 'weekly') return value;
    return null;
};

const getGoalExpiry = (goal: any) => {
    if (goal?.expires_at) return new Date(goal.expires_at);
    if (goal?.expiresAt) return new Date(goal.expiresAt);
    const goalType = normalizeGoalType(goal?.type) || 'daily';
    const baseDate = goal?.scheduled_date || goal?.scheduledDate || goal?.created_at || goal?.createdAt || new Date();
    return calculateExpiryUTC(goalType, new Date(), new Date(baseDate));
};

const normalizeGoalResponse = (goal: any) => {
    const createdAt = new Date(goal.created_at || goal.createdAt || Date.now());
    const completedAt = goal.completed_at ? new Date(goal.completed_at) : null;
    const expiresAt = getGoalExpiry(goal);
    return {
        ...goal,
        createdAt: createdAt.toISOString(),
        completedAt: completedAt ? completedAt.toISOString() : null,
        expiresAt: expiresAt.toISOString(),
        scheduledDate: goal.scheduled_date ? new Date(goal.scheduled_date).toISOString() : null,
        lifecycleStatus: (goal.lifecycle_status || 'active') as GoalLifecycleStatus,
    };
};

const isDailyCreationBlockedNow = (now: Date) => {
    const nowIST = toISTDate(now);
    const hour = nowIST.getUTCHours();
    const minute = nowIST.getUTCMinutes();
    return hour === 23 && minute >= 1;
};

const logGoalActivity = async (
    userId: string,
    goalId: string,
    goalType: GoalType,
    eventType: GoalEventType,
    timestamp: Date = new Date()
) => {
    await collections.goalActivityLogs().insertOne({
        id: uuidv4(),
        user_id: userId,
        event_type: eventType,
        goal_id: goalId,
        goal_type: goalType,
        timestamp,
        day_of_week: getISTDayName(timestamp),
        hour_of_day: getISTHour(timestamp),
        created_at: new Date(),
    });
};

const syncExpiredGoalsToMissed = async (userId: string) => {
    const now = new Date();
    const candidates = await collections.goals().find({
        user_id: userId,
        completed: false,
        $or: [
            { lifecycle_status: { $exists: false } },
            { lifecycle_status: null },
            { lifecycle_status: 'active' },
        ],
    }).toArray();

    if (candidates.length === 0) return;

    const ops: any[] = [];
    for (const goal of candidates) {
        const expiresAt = getGoalExpiry(goal);
        const setFields: Record<string, any> = {};
        if (!goal.expires_at) {
            setFields.expires_at = expiresAt;
        }

        if (now.getTime() >= expiresAt.getTime()) {
            setFields.lifecycle_status = 'missed';
            setFields.rollover_prompt_pending = true;
            if (!goal.missed_at) setFields.missed_at = now;
        }

        if (Object.keys(setFields).length > 0) {
            ops.push({
                updateOne: {
                    filter: { id: goal.id, user_id: userId },
                    update: { $set: setFields },
                },
            });
        }
    }

    if (ops.length > 0) {
        await collections.goals().bulkWrite(ops, { ordered: false });
    }
};

// Get all goals
router.get('/', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        await syncExpiredGoalsToMissed(userId);

        const rows = await collections.goals()
            .find({ user_id: userId })
            .sort({ created_at: -1 })
            .toArray();

        res.json(rows.map(normalizeGoalResponse));
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get pending rollover prompts
router.get('/rollover-prompts', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        await syncExpiredGoalsToMissed(userId);

        const rows = await collections.goals()
            .find({
                user_id: userId,
                completed: false,
                lifecycle_status: 'missed',
                rollover_prompt_pending: true,
            })
            .sort({ missed_at: -1, created_at: -1 })
            .toArray();

        res.json(rows.map(normalizeGoalResponse));
    } catch (error) {
        console.error('Get rollover prompts error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Create goal
router.post('/', requireAuth, async (req: Request, res) => {
    const { text, scheduledDate } = req.body;
    const type = normalizeGoalType(req.body?.type);

    if (!text || !type) {
        return res.status(400).json({ message: 'Text and type are required' });
    }

    try {
        const now = new Date();
        const parsedScheduledDateKey = parseScheduledDateInput(scheduledDate);
        if (scheduledDate && !parsedScheduledDateKey) {
            return res.status(400).json({ message: 'Invalid scheduled date' });
        }

        const todayISTDateKey = getISTDateKey(now);
        const maxAllowedISTDateKey = getISTDateKeyAfterDays(now, 7);
        const scheduledDateKey = parsedScheduledDateKey || todayISTDateKey;

        if (scheduledDateKey < todayISTDateKey) {
            return res.status(400).json({ message: 'Cannot schedule goals in the past' });
        }

        if (scheduledDateKey > maxAllowedISTDateKey) {
            return res.status(400).json({ message: 'Cannot schedule goals more than 7 days ahead' });
        }

        const scheduledDateObj = new Date(`${scheduledDateKey}T00:00:00.000Z`);

        // Daily goals are frozen in the 11:01 PM to 11:59 PM IST window for goals scheduled for today.
        if (type === 'daily' && scheduledDateKey === todayISTDateKey && isDailyCreationBlockedNow(now)) {
            return res.status(403).json({ message: 'Sorry cannot create goals at this time, save that for tomorrow' });
        }

        const id = uuidv4();
        const userId = req.session.userId!;
        const createdAt = now;
        const expiresAt = calculateExpiryUTC(type, now, scheduledDateObj);

        const doc = {
            id,
            user_id: userId,
            text: String(text).trim(),
            type,
            completed: false,
            created_at: createdAt,
            completed_at: null,
            expires_at: expiresAt,
            lifecycle_status: 'active' as GoalLifecycleStatus,
            rollover_prompt_pending: false,
            source_goal_id: null as string | null,
            scheduled_date: scheduledDateObj,
            missed_at: null as Date | null,
            rolled_over_at: null as Date | null,
            abandoned_at: null as Date | null,
        };

        await collections.goals().insertOne(doc);
        await logGoalActivity(userId, id, type, 'CREATED', createdAt);

        res.status(201).json(normalizeGoalResponse(doc));
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Rollover decision for a missed goal
router.post('/:id/rollover-action', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const action = String(req.body?.action || '').trim().toLowerCase();
    const userId = req.session.userId!;

    if (action !== 'retry' && action !== 'archive') {
        return res.status(400).json({ message: 'Invalid action. Use retry or archive.' });
    }

    try {
        await syncExpiredGoalsToMissed(userId);

        const goal = await collections.goals().findOne({ id, user_id: userId });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        if (goal.completed || goal.lifecycle_status !== 'missed' || !goal.rollover_prompt_pending) {
            return res.status(400).json({ message: 'Goal is not pending rollover action' });
        }

        const goalType = normalizeGoalType(goal.type) || 'daily';
        const now = new Date();

        if (action === 'retry') {
            const newGoalId = uuidv4();
            const expiresAt = calculateExpiryUTC(goalType, now);
            const scheduledDateObj = new Date(`${getISTDateKey(now)}T00:00:00.000Z`);
            const clonedGoal = {
                id: newGoalId,
                user_id: userId,
                text: goal.text,
                type: goalType,
                completed: false,
                created_at: now,
                completed_at: null,
                expires_at: expiresAt,
                lifecycle_status: 'active' as GoalLifecycleStatus,
                rollover_prompt_pending: false,
                source_goal_id: id,
                scheduled_date: scheduledDateObj,
                missed_at: null as Date | null,
                rolled_over_at: null as Date | null,
                abandoned_at: null as Date | null,
            };

            await collections.goals().insertOne(clonedGoal);
            await collections.goals().updateOne(
                { id, user_id: userId },
                {
                    $set: {
                        lifecycle_status: 'rolled_over',
                        rollover_prompt_pending: false,
                        rolled_over_at: now,
                        rolled_over_to_goal_id: newGoalId,
                    },
                }
            );

            await logGoalActivity(userId, id, goalType, 'ROLLED_OVER', now);
            await logGoalActivity(userId, newGoalId, goalType, 'CREATED', now);

            return res.json({
                message: 'Goal rolled over for today',
                goal: normalizeGoalResponse(clonedGoal),
            });
        }

        await collections.goals().updateOne(
            { id, user_id: userId },
            {
                $set: {
                    lifecycle_status: 'abandoned',
                    rollover_prompt_pending: false,
                    abandoned_at: now,
                },
            }
        );
        await logGoalActivity(userId, id, goalType, 'ABANDONED', now);

        res.json({ message: 'Goal archived as abandoned' });
    } catch (error) {
        console.error('Rollover action error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update goal (toggle completion)
router.patch('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    const userId = req.session.userId!;

    try {
        await syncExpiredGoalsToMissed(userId);

        const goal = await collections.goals().findOne({ id, user_id: userId });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        if (goal.lifecycle_status === 'abandoned' || goal.lifecycle_status === 'rolled_over') {
            return res.status(400).json({ message: 'This goal is archived and cannot be updated' });
        }

        const goalType = normalizeGoalType(goal.type) || 'daily';
        const now = new Date();
        const expiresAt = getGoalExpiry(goal);

        if (completed && now.getTime() >= expiresAt.getTime()) {
            await collections.goals().updateOne(
                { id, user_id: userId },
                { $set: { lifecycle_status: 'missed', rollover_prompt_pending: true, missed_at: now } }
            );
            return res.status(400).json({ message: 'Goal expired. Continue it for tomorrow from missed goals.' });
        }

        const wasCompleted = Boolean(goal.completed);
        const completedAt = completed ? now : null;

        const lifecycleStatus: GoalLifecycleStatus = completed ? 'active' : (goal.lifecycle_status || 'active');
        await collections.goals().updateOne(
            { id, user_id: userId },
            {
                $set: {
                    completed: Boolean(completed),
                    completed_at: completedAt,
                    lifecycle_status: lifecycleStatus,
                    rollover_prompt_pending: false,
                },
            }
        );

        if (completed && !wasCompleted) {
            await logGoalActivity(userId, id, goalType, 'COMPLETED', now);

            const todayIST = getISTDateKey(now);
            const startOfDay = getStartOfISTDayUTC(now);
            const endOfDay = new Date(startOfDay.getTime() + DAY_MS);

            const todayGoalsCount = await collections.goals().countDocuments({
                user_id: userId,
                completed: true,
                completed_at: { $gte: startOfDay, $lt: endOfDay },
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
                    } else if (lastActiveDate === yesterdayStr || currentStreak.goal_completion_streak === 0) {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $inc: { goal_completion_streak: 1 } }
                        );
                    } else {
                        await collections.streaks().updateOne(
                            { user_id: userId },
                            { $set: { goal_completion_streak: 1 } }
                        );
                    }
                }
            }
        }

        res.json({ message: 'Goal updated', completed: Boolean(completed), completedAt });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete goal
router.delete('/:id', requireAuth, async (req: Request, res) => {
    const { id } = req.params;
    const userId = req.session.userId!;

    try {
        const goal = await collections.goals().findOne({ id, user_id: userId });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        const result = await collections.goals().deleteOne({ id, user_id: userId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        const goalType = normalizeGoalType(goal.type);
        if (!goal.completed && goalType) {
            await logGoalActivity(userId, id, goalType, 'ABANDONED', new Date());
        }

        res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const goalRoutes = router;
