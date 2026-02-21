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
type GoalCategory = 'academic' | 'health' | 'personal' | 'other';
type GoalPriority = 'high' | 'medium' | 'low';
type GoalSubtask = { id: string; text: string; done: boolean };

const ALLOWED_CATEGORIES = new Set<GoalCategory>(['academic', 'health', 'personal', 'other']);
const ALLOWED_PRIORITIES = new Set<GoalPriority>(['high', 'medium', 'low']);

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

const normalizeGoalTitle = (rawTitle: unknown, fallbackText?: unknown) => {
    const title = String(rawTitle ?? fallbackText ?? '').trim();
    return title || null;
};

const normalizeGoalDescription = (raw: unknown) => {
    if (raw === undefined || raw === null) return null;
    const description = String(raw).trim();
    return description || null;
};

const normalizeGoalCategory = (raw: unknown): GoalCategory | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_CATEGORIES.has(value as GoalCategory)) return value as GoalCategory;
    return null;
};

const normalizeGoalPriority = (raw: unknown): GoalPriority | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_PRIORITIES.has(value as GoalPriority)) return value as GoalPriority;
    return null;
};

const normalizeGoalSubtasks = (raw: unknown): GoalSubtask[] | null => {
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw)) return null;
    const normalized: GoalSubtask[] = [];
    for (const entry of raw) {
        const text = String((entry as any)?.text ?? '').trim();
        if (!text) continue;
        const id = String((entry as any)?.id ?? '').trim() || uuidv4();
        const done = Boolean((entry as any)?.done);
        normalized.push({ id, text, done });
    }
    return normalized;
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
    const title = normalizeGoalTitle(goal.title, goal.text) || '';
    const description = normalizeGoalDescription(goal.description);
    const category = normalizeGoalCategory(goal.category) || 'other';
    const priority = normalizeGoalPriority(goal.priority) || 'medium';
    const subtasks = normalizeGoalSubtasks(goal.subtasks) || [];
    return {
        ...goal,
        text: title,
        title,
        description,
        category,
        priority,
        subtasks,
        createdAt: createdAt.toISOString(),
        completedAt: completedAt ? completedAt.toISOString() : null,
        expiresAt: expiresAt.toISOString(),
        scheduledDate: goal.scheduled_date ? new Date(goal.scheduled_date).toISOString() : null,
        lifecycleStatus: (goal.lifecycle_status || 'active') as GoalLifecycleStatus,
    };
};

// isDailyCreationBlockedNow removed — users can create goals at any time.

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
    const { text, title, description, scheduledDate, category, priority, subtasks } = req.body;
    const type = normalizeGoalType(req.body?.type);
    const normalizedTitle = normalizeGoalTitle(title, text);
    const normalizedDescription = normalizeGoalDescription(description);
    const normalizedCategory = normalizeGoalCategory(category) || 'other';
    const normalizedPriority = normalizeGoalPriority(priority) || 'medium';
    const normalizedSubtasks = normalizeGoalSubtasks(subtasks) || [];

    if (!normalizedTitle || !type) {
        return res.status(400).json({ message: 'Title and type are required' });
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

        // (11 PM creation block removed — goals can be created at any time)

        const id = uuidv4();
        const userId = req.session.userId!;
        const createdAt = now;
        const expiresAt = calculateExpiryUTC(type, now, scheduledDateObj);

        const doc = {
            id,
            user_id: userId,
            text: normalizedTitle,
            title: normalizedTitle,
            description: normalizedDescription,
            category: normalizedCategory,
            priority: normalizedPriority,
            subtasks: normalizedSubtasks,
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
                text: normalizeGoalTitle(goal.title, goal.text) || '',
                title: normalizeGoalTitle(goal.title, goal.text) || '',
                description: normalizeGoalDescription(goal.description),
                category: normalizeGoalCategory(goal.category) || 'other',
                priority: normalizeGoalPriority(goal.priority) || 'medium',
                subtasks: normalizeGoalSubtasks(goal.subtasks) || [],
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
    const userId = req.session.userId!;
    const hasCompletedUpdate = typeof req.body?.completed === 'boolean';
    const hasTitleUpdate = req.body && ('title' in req.body || 'text' in req.body);
    const hasDescriptionUpdate = req.body && 'description' in req.body;
    const hasScheduleUpdate = req.body && 'scheduledDate' in req.body;
    const hasCategoryUpdate = req.body && 'category' in req.body;
    const hasPriorityUpdate = req.body && 'priority' in req.body;
    const hasSubtasksUpdate = req.body && 'subtasks' in req.body;
    const hasTypeUpdate = req.body && 'type' in req.body;
    const normalizedTitle = hasTitleUpdate ? normalizeGoalTitle(req.body?.title, req.body?.text) : null;
    const normalizedDescription = hasDescriptionUpdate ? normalizeGoalDescription(req.body?.description) : undefined;
    const normalizedType = hasTypeUpdate ? normalizeGoalType(req.body?.type) : null;

    if (
        !hasCompletedUpdate &&
        !hasTitleUpdate &&
        !hasDescriptionUpdate &&
        !hasScheduleUpdate &&
        !hasCategoryUpdate &&
        !hasPriorityUpdate &&
        !hasSubtasksUpdate &&
        !hasTypeUpdate
    ) {
        return res.status(400).json({ message: 'Nothing to update' });
    }

    if (hasTitleUpdate && !normalizedTitle) {
        return res.status(400).json({ message: 'Goal title cannot be empty' });
    }

    if (hasTypeUpdate && !normalizedType) {
        return res.status(400).json({ message: 'Invalid goal type' });
    }

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
        const updates: Record<string, any> = {};
        const { scheduledDate } = req.body;
        let scheduledDateObj: Date | null = null;

        if (hasScheduleUpdate) {
            const parsedScheduledDateKey = parseScheduledDateInput(scheduledDate);
            if (!parsedScheduledDateKey) {
                return res.status(400).json({ message: 'Invalid scheduled date' });
            }

            const todayISTDateKey = getISTDateKey(now);
            const maxAllowedISTDateKey = getISTDateKeyAfterDays(now, 7);

            if (parsedScheduledDateKey < todayISTDateKey) {
                return res.status(400).json({ message: 'Cannot schedule goals in the past' });
            }

            if (parsedScheduledDateKey > maxAllowedISTDateKey) {
                return res.status(400).json({ message: 'Cannot schedule goals more than 7 days ahead' });
            }

            scheduledDateObj = new Date(`${parsedScheduledDateKey}T00:00:00.000Z`);
            updates.scheduled_date = scheduledDateObj;
        }

        if (hasTitleUpdate && normalizedTitle) {
            updates.title = normalizedTitle;
            updates.text = normalizedTitle;
        }

        if (hasDescriptionUpdate) {
            updates.description = normalizedDescription ?? null;
        }

        if (hasCategoryUpdate) {
            updates.category = normalizeGoalCategory(req.body?.category) || 'other';
        }

        if (hasPriorityUpdate) {
            updates.priority = normalizeGoalPriority(req.body?.priority) || 'medium';
        }

        if (hasSubtasksUpdate) {
            const normalizedSubtasks = normalizeGoalSubtasks(req.body?.subtasks);
            if (!normalizedSubtasks) {
                return res.status(400).json({ message: 'Invalid subtasks' });
            }
            updates.subtasks = normalizedSubtasks;
        }

        const effectiveType = normalizedType || goalType;
        if (hasTypeUpdate && normalizedType) {
            updates.type = normalizedType;
        }

        if (hasScheduleUpdate || hasTypeUpdate) {
            const baseDate = scheduledDateObj
                ?? goal.scheduled_date
                ?? goal.scheduledDate
                ?? goal.created_at
                ?? goal.createdAt
                ?? now;
            const baseDateObj = baseDate instanceof Date ? baseDate : new Date(baseDate);
            updates.expires_at = calculateExpiryUTC(effectiveType, now, baseDateObj);
        }

        if (!hasCompletedUpdate) {
            await collections.goals().updateOne(
                { id, user_id: userId },
                { $set: updates }
            );
            return res.json({ message: 'Goal updated' });
        }

        const completed = Boolean(req.body.completed);
        const expiresAt = updates.expires_at instanceof Date ? updates.expires_at : getGoalExpiry(goal);

        if (completed && now.getTime() >= expiresAt.getTime()) {
            await collections.goals().updateOne(
                { id, user_id: userId },
                { $set: { lifecycle_status: 'missed', rollover_prompt_pending: true, missed_at: now } }
            );
            return res.status(400).json({ message: 'Goal expired. Continue it for tomorrow from missed goals.' });
        }

        const wasCompleted = Boolean(goal.completed);

        // Allow client to specify when the goal was completed (today or yesterday)
        let completedAt: Date | null = null;
        if (completed) {
            if (req.body.completedAt) {
                const parsed = new Date(req.body.completedAt);
                if (!Number.isFinite(parsed.getTime())) {
                    return res.status(400).json({ message: 'Invalid completedAt date' });
                }
                // Validate within last 2 days
                const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS);
                if (parsed < twoDaysAgo || parsed > now) {
                    return res.status(400).json({ message: 'completedAt must be within the last 2 days' });
                }
                completedAt = parsed;
            } else {
                completedAt = now;
            }
        }

        const lifecycleStatus: GoalLifecycleStatus = completed ? 'active' : (goal.lifecycle_status || 'active');
        updates.completed = completed;
        updates.completed_at = completedAt;
        updates.lifecycle_status = lifecycleStatus;
        updates.rollover_prompt_pending = false;

        await collections.goals().updateOne(
            { id, user_id: userId },
            { $set: updates }
        );

        if (completed && !wasCompleted) {
            await logGoalActivity(userId, id, effectiveType, 'COMPLETED', now);

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

        res.json({ message: 'Goal updated', completed, completedAt });
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

// Get previous goals (yesterday, last week, last month, or custom)
router.get('/previous-goals', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const period = (req.query.period as string) || 'daily';
        const days = req.query.days ? parseInt(req.query.days as string) : 1;
        const now = new Date();

        // Use Date objects for comparisons (scheduled_date is stored as Date)
        const todayStart = getStartOfISTDayUTC(now);

        let filter: any = { user_id: userId };
        let startDate: Date;

        if (period === 'weekly') {
            startDate = new Date(todayStart.getTime() - 7 * DAY_MS);
        } else if (period === 'monthly') {
            startDate = new Date(todayStart.getTime() - 30 * DAY_MS);
        } else if (period === 'custom') {
            startDate = new Date(todayStart.getTime() - days * DAY_MS);
        } else {
            // Daily
            startDate = new Date(todayStart.getTime() - DAY_MS);
        }

        filter.$or = [
            { scheduled_date: { $gte: startDate, $lt: todayStart } },
            {
                scheduled_date: { $exists: false },
                created_at: { $gte: startDate, $lt: todayStart }
            }
        ];

        const previousGoals = await collections.goals().find(filter).toArray();
        const normalized = previousGoals.map(normalizeGoalResponse);
        res.json(normalized);
    } catch (error) {
        console.error('Get previous goals error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Repeat plan: create copies of selected previous goals for today
router.post('/repeat-plan', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { goalIds } = req.body;

        if (!Array.isArray(goalIds) || goalIds.length === 0) {
            return res.status(400).json({ message: 'Please select at least one goal to repeat' });
        }

        if (goalIds.length > 50) {
            return res.status(400).json({ message: 'Cannot repeat more than 50 goals at once' });
        }

        // Fetch the source goals
        const sourceGoals = await collections.goals().find({
            id: { $in: goalIds },
            user_id: userId,
        }).toArray();

        if (sourceGoals.length === 0) {
            return res.status(404).json({ message: 'No matching goals found' });
        }

        const now = new Date();
        const todayKey = getISTDateKey(now);

        // Create new goal copies for today
        const newGoals = sourceGoals.map(goal => {
            const newId = uuidv4();
            const goalType = normalizeGoalType(goal.type) || 'daily';
            return {
                id: newId,
                user_id: userId,
                text: goal.text || goal.title || '',
                title: goal.title || goal.text || '',
                description: goal.description || '',
                category: normalizeGoalCategory(goal.category) || 'other',
                priority: normalizeGoalPriority(goal.priority) || 'medium',
                subtasks: normalizeGoalSubtasks(goal.subtasks) || [],
                type: goalType,
                completed: false,
                completed_at: null,
                scheduled_date: new Date(`${todayKey}T00:00:00.000Z`),
                created_at: now,
                updated_at: now,
                lifecycle_status: 'active' as GoalLifecycleStatus,
                rollover_prompt_pending: false,
                repeated_from: goal.id, // track origin
            };
        });

        if (newGoals.length > 0) {
            await collections.goals().insertMany(newGoals);

            // Log activities
            for (const goal of newGoals) {
                await logGoalActivity(userId, goal.id, goal.type as GoalType, 'CREATED', now);
            }
        }

        const normalized = newGoals.map(normalizeGoalResponse);
        res.json({ message: `${normalized.length} goal(s) repeated for today`, goals: normalized });
    } catch (error) {
        console.error('Repeat plan error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Repeat a single goal for a specific date
router.post('/:id/repeat', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;
        const { scheduledDate } = req.body;

        const sourceGoal = await collections.goals().findOne({ id, user_id: userId });
        if (!sourceGoal) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        const now = new Date();
        // Parse date - expect ISO string YYYY-MM-DD...
        const scheduledDateKey = scheduledDate ? scheduledDate.split('T')[0] : getISTDateKey(now);
        const scheduledDateObj = new Date(`${scheduledDateKey}T00:00:00.000Z`);

        const newId = uuidv4();
        const goalType = normalizeGoalType(sourceGoal.type) || 'daily';

        // Calculate expiry based on scheduled date
        let expiresAt = new Date(scheduledDateObj);
        expiresAt.setUTCHours(23, 59, 59, 999);
        // Adjust for IST if needed, but simple UTC end of day is usually fine for this logic
        // reusing logic from create goal would be better but this is sufficient for now

        const newGoal = {
            id: newId,
            user_id: userId,
            text: sourceGoal.title || sourceGoal.text || '',
            title: sourceGoal.title || sourceGoal.text || '',
            description: sourceGoal.description || '',
            category: normalizeGoalCategory(sourceGoal.category) || 'other',
            priority: normalizeGoalPriority(sourceGoal.priority) || 'medium',
            subtasks: normalizeGoalSubtasks(sourceGoal.subtasks) || [],
            type: goalType,
            completed: false,
            created_at: now,
            completed_at: null,
            expires_at: expiresAt,
            lifecycle_status: 'active' as GoalLifecycleStatus,
            rollover_prompt_pending: false,
            source_goal_id: sourceGoal.id,
            scheduled_date: scheduledDateObj,
            missed_at: null as Date | null,
            rolled_over_at: null as Date | null,
            abandoned_at: null as Date | null,
        };

        await collections.goals().insertOne(newGoal);
        await logGoalActivity(userId, newId, goalType, 'CREATED', now);

        res.status(201).json(normalizeGoalResponse(newGoal));
    } catch (error) {
        console.error('Repeat goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const goalRoutes = router;
