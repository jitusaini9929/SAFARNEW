// Forces rebuild
import { Router, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { endOfDay, endOfWeek } from 'date-fns';
import { collections, getDb } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTUAL_DURATION_EXPR = { $ifNull: ['$actual_duration_minutes', '$duration_minutes'] };

type GoalType = 'daily' | 'weekly';
type GoalEventType = 'CREATED' | 'COMPLETED' | 'ABANDONED' | 'ROLLED_OVER';
type GoalLifecycleStatus = 'active' | 'missed' | 'rolled_over' | 'abandoned';
type GoalCategory = 'academic' | 'health' | 'personal' | 'other';
type GoalPriority = 'high' | 'medium' | 'low';
type GoalSubtask = { id: string; text: string; done: boolean };
type GoalSource = 'manual' | 'ekagra';
type GoalKind = 'one_time' | 'today' | 'repeat';
type GoalUnitType = 'binary' | 'count' | 'duration_minutes' | 'checklist';
type GoalExecutionMode = 'manual' | 'timed' | 'hybrid';
type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'partial' | 'missed' | 'cancelled' | 'expired' | 'rolled_over';
type GoalCarryForwardMode = 'none' | 'remaining' | 'full' | 'ask';

const ALLOWED_CATEGORIES = new Set<GoalCategory>(['academic', 'health', 'personal', 'other']);
const ALLOWED_PRIORITIES = new Set<GoalPriority>(['high', 'medium', 'low']);
const ALLOWED_SOURCES = new Set<GoalSource>(['manual', 'ekagra']);
const ALLOWED_GOAL_KINDS = new Set<GoalKind>(['one_time', 'today', 'repeat']);
const ALLOWED_GOAL_UNITS = new Set<GoalUnitType>(['binary', 'count', 'duration_minutes', 'checklist']);
const ALLOWED_GOAL_EXECUTION_MODES = new Set<GoalExecutionMode>(['manual', 'timed', 'hybrid']);
const ALLOWED_GOAL_STATUSES = new Set<GoalStatus>(['not_started', 'in_progress', 'completed', 'partial', 'missed', 'cancelled', 'expired', 'rolled_over']);
const ALLOWED_CARRY_FORWARD_MODES = new Set<GoalCarryForwardMode>(['none', 'remaining', 'full', 'ask']);

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

const normalizeGoalSource = (raw: unknown): GoalSource | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_SOURCES.has(value as GoalSource)) return value as GoalSource;
    return null;
};

const normalizeGoalImportedFromGoal = (raw: unknown) => Boolean(raw);

const normalizeGoalKind = (raw: unknown): GoalKind | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_GOAL_KINDS.has(value as GoalKind)) return value as GoalKind;
    return null;
};

const normalizeGoalUnitType = (raw: unknown): GoalUnitType | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_GOAL_UNITS.has(value as GoalUnitType)) return value as GoalUnitType;
    return null;
};

const normalizeGoalExecutionMode = (raw: unknown): GoalExecutionMode | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_GOAL_EXECUTION_MODES.has(value as GoalExecutionMode)) return value as GoalExecutionMode;
    return null;
};

const normalizeGoalLinkedFocusEnabled = (raw: unknown): boolean | null => {
    if (raw === undefined) return null;
    return Boolean(raw);
};

const normalizeGoalPlannedFocusMinutes = (raw: unknown): number | null => {
    if (raw === undefined || raw === null || raw === '') return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return parsed >= 0 ? Math.round(parsed) : null;
};

const normalizeGoalStatus = (raw: unknown): GoalStatus | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_GOAL_STATUSES.has(value as GoalStatus)) return value as GoalStatus;
    return null;
};

const normalizeGoalCarryForwardMode = (raw: unknown): GoalCarryForwardMode | null => {
    const value = String(raw ?? '').trim().toLowerCase();
    if (ALLOWED_CARRY_FORWARD_MODES.has(value as GoalCarryForwardMode)) return value as GoalCarryForwardMode;
    return null;
};

const normalizeGoalTargetValue = (raw: unknown): number | null => {
    if (raw === undefined || raw === null || raw === '') return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return parsed >= 0 ? parsed : null;
};

const normalizeGoalAchievedValue = (raw: unknown): number | null => {
    if (raw === undefined || raw === null || raw === '') return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return parsed >= 0 ? parsed : null;
};

const getGoalKindFromRecord = (goal: any): GoalKind => {
    return normalizeGoalKind(goal.goal_kind ?? goal.goalKind) || 'today';
};

const getGoalUnitTypeFromRecord = (goal: any): GoalUnitType => {
    return normalizeGoalUnitType(goal.unit_type ?? goal.unitType) || 'binary';
};

const getGoalExecutionModeFromRecord = (goal: any): GoalExecutionMode => {
    const normalized = normalizeGoalExecutionMode(goal.execution_mode ?? goal.executionMode);
    if (normalized) return normalized;
    return getGoalUnitTypeFromRecord(goal) === 'duration_minutes' ? 'timed' : 'manual';
};

const getGoalLinkedFocusEnabledFromRecord = (goal: any): boolean => {
    const normalized = normalizeGoalLinkedFocusEnabled(goal.linked_focus_enabled ?? goal.linkedFocusEnabled);
    if (normalized !== null) return normalized;
    return getGoalUnitTypeFromRecord(goal) === 'duration_minutes';
};

const getGoalPlannedFocusMinutesFromRecord = (goal: any): number | null => {
    const normalized = normalizeGoalPlannedFocusMinutes(goal.planned_focus_minutes ?? goal.plannedFocusMinutes);
    if (normalized !== null) return normalized;
    return getGoalUnitTypeFromRecord(goal) === 'duration_minutes'
        ? getGoalTargetValueFromRecord(goal)
        : null;
};

const getGoalTargetValueFromRecord = (goal: any): number | null => {
    const value = normalizeGoalTargetValue(goal.target_value ?? goal.targetValue);
    return value === null ? null : value;
};

const getGoalAchievedValueFromRecord = (goal: any): number => {
    const normalized = normalizeGoalAchievedValue(goal.achieved_value ?? goal.achievedValue);
    if (normalized !== null) return normalized;
    return Boolean(goal.completed || goal.completed_at) ? 1 : 0;
};

const getGoalStatusFromRecord = (goal: any): GoalStatus => {
    const normalized = normalizeGoalStatus(goal.status_value ?? goal.status);
    if (normalized) return normalized;
    if (goal.completed || goal.completed_at) return 'completed';
    if ((goal.lifecycle_status || '').toLowerCase() === 'missed') return 'missed';
    return 'not_started';
};

const getGoalCarryForwardModeFromRecord = (goal: any): GoalCarryForwardMode => {
    return normalizeGoalCarryForwardMode(goal.carry_forward_mode ?? goal.carryForwardMode) || 'none';
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
    const startedAt = goal.started_at ? new Date(goal.started_at) : null;
    const expiresAt = getGoalExpiry(goal);
    const title = normalizeGoalTitle(goal.title, goal.text) || '';
    const description = normalizeGoalDescription(goal.description);
    const category = normalizeGoalCategory(goal.category) || 'other';
    const priority = normalizeGoalPriority(goal.priority) || 'medium';
    const source = normalizeGoalSource(goal.source) || 'manual';
    const importedFromGoal = normalizeGoalImportedFromGoal(goal.imported_from_goal ?? goal.importedFromGoal);
    const goalKind = getGoalKindFromRecord(goal);
    const unitType = getGoalUnitTypeFromRecord(goal);
    const executionMode = getGoalExecutionModeFromRecord(goal);
    const linkedFocusEnabled = getGoalLinkedFocusEnabledFromRecord(goal);
    const plannedFocusMinutes = getGoalPlannedFocusMinutesFromRecord(goal);
    const targetValue = getGoalTargetValueFromRecord(goal);
    const achievedValue = getGoalAchievedValueFromRecord(goal);
    const status = getGoalStatusFromRecord(goal);
    const carryForwardMode = getGoalCarryForwardModeFromRecord(goal);
    const subtasks = normalizeGoalSubtasks(goal.subtasks) || [];
    return {
        ...goal,
        text: title,
        title,
        description,
        category,
        priority,
        source,
        importedFromGoal,
        goalKind,
        unitType,
        executionMode,
        linkedFocusEnabled,
        plannedFocusMinutes,
        targetValue,
        achievedValue,
        status,
        carryForwardMode,
        subtasks,
        createdAt: createdAt.toISOString(),
        completedAt: completedAt ? completedAt.toISOString() : null,
        startedAt: startedAt ? startedAt.toISOString() : null,
        expiresAt: expiresAt.toISOString(),
        scheduledDate: goal.scheduled_date ? new Date(goal.scheduled_date).toISOString() : null,
        lifecycleStatus: (goal.lifecycle_status || 'active') as GoalLifecycleStatus,
        imported_from_goal: importedFromGoal,
        goal_kind: goalKind,
        unit_type: unitType,
        execution_mode: executionMode,
        linked_focus_enabled: linkedFocusEnabled,
        planned_focus_minutes: plannedFocusMinutes,
        target_value: targetValue,
        achieved_value: achievedValue,
        status_value: status,
        carry_forward_mode: carryForwardMode,
    };
};

const migrateLegacyEkagraTasks = async (userId: string) => {
    const legacyTasks = await getGoalLegacyTasks(userId);
    if (legacyTasks.length === 0) return;

    const existingGoals = await collections.goals().find(
        { user_id: userId, source: 'ekagra' },
        { projection: { id: 1, title: 1, text: 1, created_at: 1 } },
    ).toArray();
    const existingIds = new Set(existingGoals.map((goal: any) => String(goal.id)));

    const migratedGoals = legacyTasks
        .map((task: any, index: number) => {
            const legacyId = typeof task.id === 'string' && task.id.trim() ? task.id.trim() : uuidv4();
            if (existingIds.has(legacyId)) return null;

            const title = normalizeGoalTitle(task.title, task.text);
            if (!title) return null;

            const createdAt = task.created_at instanceof Date ? task.created_at : new Date(task.created_at || Date.now());
            const completedAt = task.completed_at ? new Date(task.completed_at) : null;
            const safeCreatedAt = Number.isFinite(createdAt.getTime()) ? createdAt : new Date();
            const safeCompletedAt = completedAt && Number.isFinite(completedAt.getTime()) ? completedAt : null;
            const scheduledDate = new Date(`${getISTDateKey(safeCreatedAt)}T00:00:00.000Z`);
            const completed = Boolean(task.completed);

            return {
                id: legacyId,
                user_id: userId,
                text: title,
                title,
                description: normalizeGoalDescription(task.description),
                category: 'other' as GoalCategory,
                priority: 'medium' as GoalPriority,
                source: 'ekagra' as GoalSource,
                subtasks: [],
                type: 'daily' as GoalType,
                completed,
                created_at: safeCreatedAt,
                completed_at: completed ? safeCompletedAt || safeCreatedAt : null,
                started_at: safeCreatedAt,
                expires_at: calculateExpiryUTC('daily', safeCreatedAt, scheduledDate),
                lifecycle_status: 'active' as GoalLifecycleStatus,
                rollover_prompt_pending: false,
                imported_from_goal: false,
                goal_kind: 'today' as GoalKind,
                unit_type: 'binary' as GoalUnitType,
                execution_mode: 'manual' as GoalExecutionMode,
                linked_focus_enabled: false,
                planned_focus_minutes: null as number | null,
                target_value: null as number | null,
                achieved_value: completed ? 1 : 0,
                status_value: completed ? 'completed' as GoalStatus : 'not_started' as GoalStatus,
                carry_forward_mode: 'none' as GoalCarryForwardMode,
                source_goal_id: null as string | null,
                scheduled_date: scheduledDate,
                missed_at: null as Date | null,
                rolled_over_at: null as Date | null,
                abandoned_at: null as Date | null,
                updated_at: new Date(safeCreatedAt.getTime() + index),
            };
        })
        .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal));

    if (migratedGoals.length > 0) {
        await collections.goals().insertMany(migratedGoals);
        for (const goal of migratedGoals) {
            await logGoalActivity(userId, goal.id, 'daily', 'CREATED', goal.created_at);
            if (goal.completed && goal.completed_at) {
                await logGoalActivity(userId, goal.id, 'daily', 'COMPLETED', goal.completed_at);
            }
        }
    }

    await dropGoalLegacyTasks(userId);
};

const getGoalLegacyTasks = async (userId: string) => {
    return await getDb().collection('focus_tasks')
        .find({ user_id: userId })
        .sort({ position: 1, created_at: 1 })
        .toArray();
};

const dropGoalLegacyTasks = async (userId: string) => {
    await getDb().collection('focus_tasks').deleteMany({ user_id: userId });
};

const normalizeGoalIdsInput = (raw: unknown) => {
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(
        raw
            .slice(0, 100)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .map((id) => id.trim()),
    ));
};

const aggregateFocusSummary = async (userId: string, goalIds: string[], dayKey?: string | null) => {
    if (goalIds.length === 0) {
        return {
            allTime: {} as Record<string, { totalMinutes: number; sessionCount: number }>,
            forDay: {} as Record<string, { totalMinutes: number; sessionCount: number }>,
        };
    }

    const buildMap = (rows: any[]) => {
        const summary: Record<string, { totalMinutes: number; sessionCount: number }> = {};
        for (const row of rows) {
            if (typeof row?._id !== 'string') continue;
            summary[row._id] = {
                totalMinutes: row.totalMinutes || 0,
                sessionCount: row.sessionCount || 0,
            };
        }
        return summary;
    };

    const baseMatch = {
        user_id: userId,
        associated_goal_id: { $in: goalIds },
    };

    const allTimePipeline = [
        { $match: baseMatch },
        {
            $group: {
                _id: '$associated_goal_id',
                totalMinutes: { $sum: ACTUAL_DURATION_EXPR },
                sessionCount: { $sum: 1 },
            },
        },
    ];

    const forDayPipeline = typeof dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)
        ? [
            {
                $match: {
                    ...baseMatch,
                    completed: true,
                    $expr: {
                        $eq: [
                            { $dateToString: { format: '%Y-%m-%d', date: '$completed_at', timezone: '+05:30' } },
                            dayKey,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$associated_goal_id',
                    totalMinutes: { $sum: ACTUAL_DURATION_EXPR },
                    sessionCount: { $sum: 1 },
                },
            },
        ]
        : null;

    const [allTimeRows, forDayRows] = await Promise.all([
        collections.focusSessions().aggregate(allTimePipeline).toArray(),
        forDayPipeline ? collections.focusSessions().aggregate(forDayPipeline).toArray() : Promise.resolve([]),
    ]);

    return {
        allTime: buildMap(allTimeRows),
        forDay: buildMap(forDayRows),
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
        await migrateLegacyEkagraTasks(userId);
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
        await migrateLegacyEkagraTasks(userId);
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

router.post('/focus-summary', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const goalIds = normalizeGoalIdsInput(req.body?.goalIds);
        const dayKey = typeof req.body?.dayKey === 'string' ? req.body.dayKey.trim() : null;

        if (goalIds.length === 0) {
            return res.json({ allTime: {}, forDay: {} });
        }

        const ownedGoals = await collections.goals()
            .find(
                { user_id: userId, id: { $in: goalIds } },
                { projection: { id: 1 } },
            )
            .toArray();
        const ownedGoalIds = ownedGoals
            .map((goal) => String(goal.id || '').trim())
            .filter((id) => id.length > 0);

        if (ownedGoalIds.length === 0) {
            return res.json({ allTime: {}, forDay: {} });
        }

        const summary = await aggregateFocusSummary(userId, ownedGoalIds, dayKey);
        return res.json(summary);
    } catch (error) {
        console.error('Get goal focus summary error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/:id/transfer-to-ekagra', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const goal = await collections.goals().findOne({ id, user_id: userId });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        const currentSource = normalizeGoalSource(goal.source) || 'manual';
        if (currentSource === 'ekagra') {
            return res.json({
                message: 'Goal already linked to Ekagra',
                goal: normalizeGoalResponse(goal),
            });
        }

        const lifecycleStatus = String(goal.lifecycle_status || 'active').toLowerCase();
        const isArchivedState = lifecycleStatus === 'abandoned' || lifecycleStatus === 'rolled_over';
        const isCompleted = Boolean(goal.completed || goal.completed_at);
        if (isCompleted || isArchivedState) {
            return res.status(409).json({ message: 'Completed or archived goals cannot be transferred to Ekagra' });
        }

        const updates: Record<string, unknown> = {
            source: 'ekagra',
            imported_from_goal: true,
        };
        if (lifecycleStatus === 'missed') {
            updates.lifecycle_status = 'active';
            updates.rollover_prompt_pending = false;
        }

        await collections.goals().updateOne(
            { id, user_id: userId },
            {
                $set: updates,
            },
        );

        const updatedGoal = await collections.goals().findOne({ id, user_id: userId });
        if (!updatedGoal) {
            return res.status(500).json({ message: 'Failed to transfer goal to Ekagra' });
        }

        return res.json({
            message: 'Goal transferred to Ekagra',
            goal: normalizeGoalResponse(updatedGoal),
        });
    } catch (error) {
        console.error('Transfer goal to Ekagra error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/:id/revert-from-ekagra-import', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const goal = await collections.goals().findOne({ id, user_id: userId });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }

        const currentSource = normalizeGoalSource(goal.source) || 'manual';
        const importedFromGoal = normalizeGoalImportedFromGoal(goal.imported_from_goal);
        if (currentSource !== 'ekagra' || !importedFromGoal) {
            return res.status(409).json({ message: 'Goal is not an imported Ekagra goal' });
        }

        if (goal.completed) {
            return res.status(409).json({ message: 'Completed imported goals cannot be reverted' });
        }

        await collections.goals().updateOne(
            { id, user_id: userId },
            {
                $set: {
                    source: 'manual',
                    imported_from_goal: false,
                },
            },
        );

        const updatedGoal = await collections.goals().findOne({ id, user_id: userId });
        if (!updatedGoal) {
            return res.status(500).json({ message: 'Failed to revert imported goal' });
        }

        return res.json({
            message: 'Imported goal reverted to manual',
            goal: normalizeGoalResponse(updatedGoal),
        });
    } catch (error) {
        console.error('Revert imported goal error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Create goal
router.post('/', requireAuth, async (req: Request, res) => {
    const {
        text,
        title,
        description,
        scheduledDate,
        category,
        priority,
        subtasks,
        startedAt,
        source,
        goalKind,
        unitType,
        executionMode,
        linkedFocusEnabled,
        plannedFocusMinutes,
        targetValue,
        achievedValue,
        status,
        carryForwardMode,
    } = req.body;
    const type: GoalType = 'daily';
    const normalizedTitle = normalizeGoalTitle(title, text);
    const normalizedDescription = normalizeGoalDescription(description);
    const normalizedCategory = normalizeGoalCategory(category) || 'other';
    const normalizedPriority = normalizeGoalPriority(priority) || 'medium';
    const normalizedSource = normalizeGoalSource(source) || 'manual';
    const normalizedGoalKind = normalizeGoalKind(goalKind) || 'today';
    const normalizedUnitType = normalizeGoalUnitType(unitType) || 'binary';
    const normalizedExecutionMode = normalizeGoalExecutionMode(executionMode)
        || (normalizedUnitType === 'duration_minutes' ? 'timed' : 'manual');
    const normalizedLinkedFocusEnabled = normalizeGoalLinkedFocusEnabled(linkedFocusEnabled)
        ?? (normalizedUnitType === 'duration_minutes');
    const normalizedPlannedFocusMinutes = normalizeGoalPlannedFocusMinutes(plannedFocusMinutes)
        ?? (normalizedUnitType === 'duration_minutes' ? normalizeGoalTargetValue(targetValue) : null);
    const normalizedTargetValue = normalizeGoalTargetValue(targetValue);
    const normalizedAchievedValue = normalizeGoalAchievedValue(achievedValue);
    const normalizedStatus = normalizeGoalStatus(status);
    const normalizedCarryForwardMode = normalizeGoalCarryForwardMode(carryForwardMode) || (normalizedGoalKind === 'repeat' ? 'ask' : 'none');
    const normalizedSubtasks = normalizeGoalSubtasks(subtasks) || [];

    if (!normalizedTitle) {
        return res.status(400).json({ message: 'Title is required' });
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
        const effectiveStatus: GoalStatus = normalizedStatus || 'not_started';
        const isCompletedByStatus = effectiveStatus === 'completed';
        const effectiveAchievedValue = normalizedAchievedValue
            ?? (isCompletedByStatus && normalizedUnitType === 'binary' ? 1 : 0);

        // Parse optional startedAt — must be a valid ISO timestamp
        let startedAtDate: Date | null = null;
        if (startedAt) {
            const parsed = new Date(startedAt);
            startedAtDate = Number.isFinite(parsed.getTime()) ? parsed : null;
        }

        const doc = {
            id,
            user_id: userId,
            text: normalizedTitle,
            title: normalizedTitle,
            description: normalizedDescription,
            category: normalizedCategory,
            priority: normalizedPriority,
            source: normalizedSource,
            subtasks: normalizedSubtasks,
            type,
            completed: isCompletedByStatus,
            created_at: createdAt,
            completed_at: isCompletedByStatus ? createdAt : null,
            started_at: startedAtDate,
            expires_at: expiresAt,
            lifecycle_status: 'active' as GoalLifecycleStatus,
            rollover_prompt_pending: false,
            imported_from_goal: false,
            goal_kind: normalizedGoalKind,
            unit_type: normalizedUnitType,
            execution_mode: normalizedExecutionMode,
            linked_focus_enabled: normalizedLinkedFocusEnabled,
            planned_focus_minutes: normalizedPlannedFocusMinutes,
            target_value: normalizedTargetValue,
            achieved_value: effectiveAchievedValue,
            status_value: effectiveStatus,
            carry_forward_mode: normalizedCarryForwardMode,
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

        const goalType: GoalType = 'daily';
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
                source: normalizeGoalSource(goal.source) || 'manual',
                subtasks: normalizeGoalSubtasks(goal.subtasks) || [],
                type: goalType,
                completed: false,
                created_at: now,
                completed_at: null,
                expires_at: expiresAt,
                lifecycle_status: 'active' as GoalLifecycleStatus,
                rollover_prompt_pending: false,
                imported_from_goal: normalizeGoalImportedFromGoal(goal.imported_from_goal),
                goal_kind: getGoalKindFromRecord(goal),
                unit_type: getGoalUnitTypeFromRecord(goal),
                execution_mode: getGoalExecutionModeFromRecord(goal),
                linked_focus_enabled: getGoalLinkedFocusEnabledFromRecord(goal),
                planned_focus_minutes: getGoalPlannedFocusMinutesFromRecord(goal),
                target_value: getGoalTargetValueFromRecord(goal),
                achieved_value: 0,
                status_value: 'not_started' as GoalStatus,
                carry_forward_mode: getGoalCarryForwardModeFromRecord(goal),
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
    const hasStartedAtUpdate = req.body && 'startedAt' in req.body;
    const hasGoalKindUpdate = req.body && 'goalKind' in req.body;
    const hasUnitTypeUpdate = req.body && 'unitType' in req.body;
    const hasExecutionModeUpdate = req.body && 'executionMode' in req.body;
    const hasLinkedFocusEnabledUpdate = req.body && 'linkedFocusEnabled' in req.body;
    const hasPlannedFocusMinutesUpdate = req.body && 'plannedFocusMinutes' in req.body;
    const hasTargetValueUpdate = req.body && 'targetValue' in req.body;
    const hasAchievedValueUpdate = req.body && 'achievedValue' in req.body;
    const hasStatusUpdate = req.body && 'status' in req.body;
    const hasCarryForwardModeUpdate = req.body && 'carryForwardMode' in req.body;
    const normalizedTitle = hasTitleUpdate ? normalizeGoalTitle(req.body?.title, req.body?.text) : null;
    const normalizedDescription = hasDescriptionUpdate ? normalizeGoalDescription(req.body?.description) : undefined;
    const normalizedType = hasTypeUpdate ? normalizeGoalType(req.body?.type) : null;
    const normalizedGoalKind = hasGoalKindUpdate ? normalizeGoalKind(req.body?.goalKind) : null;
    const normalizedUnitType = hasUnitTypeUpdate ? normalizeGoalUnitType(req.body?.unitType) : null;
    const normalizedExecutionMode = hasExecutionModeUpdate ? normalizeGoalExecutionMode(req.body?.executionMode) : null;
    const normalizedLinkedFocusEnabled = hasLinkedFocusEnabledUpdate ? normalizeGoalLinkedFocusEnabled(req.body?.linkedFocusEnabled) : null;
    const normalizedPlannedFocusMinutes = hasPlannedFocusMinutesUpdate ? normalizeGoalPlannedFocusMinutes(req.body?.plannedFocusMinutes) : null;
    const normalizedTargetValue = hasTargetValueUpdate ? normalizeGoalTargetValue(req.body?.targetValue) : null;
    const normalizedAchievedValue = hasAchievedValueUpdate ? normalizeGoalAchievedValue(req.body?.achievedValue) : null;
    const normalizedStatus = hasStatusUpdate ? normalizeGoalStatus(req.body?.status) : null;
    const normalizedCarryForwardMode = hasCarryForwardModeUpdate ? normalizeGoalCarryForwardMode(req.body?.carryForwardMode) : null;

    if (
        !hasCompletedUpdate &&
        !hasTitleUpdate &&
        !hasDescriptionUpdate &&
        !hasScheduleUpdate &&
        !hasCategoryUpdate &&
        !hasPriorityUpdate &&
        !hasSubtasksUpdate &&
        !hasTypeUpdate &&
        !hasStartedAtUpdate &&
        !hasGoalKindUpdate &&
        !hasUnitTypeUpdate &&
        !hasExecutionModeUpdate &&
        !hasLinkedFocusEnabledUpdate &&
        !hasPlannedFocusMinutesUpdate &&
        !hasTargetValueUpdate &&
        !hasAchievedValueUpdate &&
        !hasStatusUpdate &&
        !hasCarryForwardModeUpdate
    ) {
        return res.status(400).json({ message: 'Nothing to update' });
    }

    if (hasTitleUpdate && !normalizedTitle) {
        return res.status(400).json({ message: 'Goal title cannot be empty' });
    }

    if (hasTypeUpdate && (!normalizedType || normalizedType !== 'daily')) {
        return res.status(400).json({ message: 'Only daily goals are supported' });
    }

    if (hasGoalKindUpdate && !normalizedGoalKind) {
        return res.status(400).json({ message: 'Invalid goal kind' });
    }

    if (hasUnitTypeUpdate && !normalizedUnitType) {
        return res.status(400).json({ message: 'Invalid goal unit type' });
    }

    if (hasExecutionModeUpdate && !normalizedExecutionMode) {
        return res.status(400).json({ message: 'Invalid execution mode' });
    }

    if (hasPlannedFocusMinutesUpdate && req.body?.plannedFocusMinutes !== null && normalizedPlannedFocusMinutes === null) {
        return res.status(400).json({ message: 'Invalid planned focus minutes' });
    }

    if (hasTargetValueUpdate && req.body?.targetValue !== null && normalizedTargetValue === null) {
        return res.status(400).json({ message: 'Invalid target value' });
    }

    if (hasAchievedValueUpdate && normalizedAchievedValue === null) {
        return res.status(400).json({ message: 'Invalid achieved value' });
    }

    if (hasStatusUpdate && !normalizedStatus) {
        return res.status(400).json({ message: 'Invalid goal status' });
    }

    if (hasCarryForwardModeUpdate && !normalizedCarryForwardMode) {
        return res.status(400).json({ message: 'Invalid carry forward mode' });
    }

    try {
        await syncExpiredGoalsToMissed(userId);

        const goal = await collections.goals().findOne({ id, user_id: userId });
        if (!goal) {
            return res.status(404).json({ message: 'Goal not found or unauthorized' });
        }



        const goalType: GoalType = 'daily';
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

        if (hasStartedAtUpdate) {
            const rawStartedAt = req.body.startedAt;
            if (rawStartedAt === null) {
                updates.started_at = null;
            } else {
                const parsed = new Date(rawStartedAt);
                updates.started_at = Number.isFinite(parsed.getTime()) ? parsed : null;
            }
        }

        if (hasGoalKindUpdate && normalizedGoalKind) {
            updates.goal_kind = normalizedGoalKind;
        }

        if (hasUnitTypeUpdate && normalizedUnitType) {
            updates.unit_type = normalizedUnitType;
        }

        if (hasExecutionModeUpdate && normalizedExecutionMode) {
            updates.execution_mode = normalizedExecutionMode;
        }

        if (hasLinkedFocusEnabledUpdate && normalizedLinkedFocusEnabled !== null) {
            updates.linked_focus_enabled = normalizedLinkedFocusEnabled;
        }

        if (hasPlannedFocusMinutesUpdate) {
            updates.planned_focus_minutes = normalizedPlannedFocusMinutes;
        }

        if (hasTargetValueUpdate) {
            updates.target_value = normalizedTargetValue;
        }

        if (hasAchievedValueUpdate && normalizedAchievedValue !== null) {
            updates.achieved_value = normalizedAchievedValue;
        }

        if (hasStatusUpdate && normalizedStatus) {
            updates.status_value = normalizedStatus;
            if (normalizedStatus === 'completed') {
                updates.completed = true;
                updates.completed_at = new Date();
            } else if (goal.completed) {
                updates.completed = false;
                updates.completed_at = null;
            }
        }

        if (hasCarryForwardModeUpdate && normalizedCarryForwardMode) {
            updates.carry_forward_mode = normalizedCarryForwardMode;
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



        const wasCompleted = Boolean(goal.completed);

        // Allow client to specify when the goal was completed (fallback to now if invalid/out of range)
        let completedAt: Date | null = null;
        if (completed) {
            if (req.body.completedAt) {
                const parsed = new Date(req.body.completedAt);
                if (!Number.isFinite(parsed.getTime())) {
                    completedAt = now;
                } else {
                    // Accept client timestamp only if it is reasonably recent; otherwise fallback to now.
                    const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS);
                    completedAt = (parsed < twoDaysAgo || parsed > now) ? now : parsed;
                }
            } else {
                completedAt = now;
            }
        }

        const lifecycleStatus: GoalLifecycleStatus = completed ? 'active' : (goal.lifecycle_status || 'active');
        updates.completed = completed;
        updates.completed_at = completedAt;
        updates.lifecycle_status = lifecycleStatus;
        updates.rollover_prompt_pending = false;
        if (completed) {
            const existingTarget = getGoalTargetValueFromRecord(goal);
            updates.status_value = 'completed';
            if (existingTarget !== null) {
                updates.achieved_value = Math.max(Number(existingTarget) || 0, getGoalAchievedValueFromRecord(goal));
            } else if (getGoalUnitTypeFromRecord(goal) === 'binary') {
                updates.achieved_value = 1;
            }
        }

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
                const yesterdayKey = getISTDateKeyAfterDays(now, -1);

                let lastCompletionKey: string | null = null;
                if (currentStreak?.last_goal_completion_date) {
                    lastCompletionKey = getISTDateKey(new Date(currentStreak.last_goal_completion_date));
                } else {
                    const lastGoal = await collections.goals()
                        .find({ user_id: userId, completed: true, completed_at: { $lt: startOfDay } })
                        .sort({ completed_at: -1 })
                        .limit(1)
                        .toArray();
                    if (lastGoal[0]?.completed_at) {
                        lastCompletionKey = getISTDateKey(new Date(lastGoal[0].completed_at));
                    }
                }

                let nextStreak = 1;
                if (lastCompletionKey === yesterdayKey) {
                    const base = currentStreak?.goal_completion_streak || 0;
                    nextStreak = Math.max(base + 1, 1);
                }

                await collections.streaks().updateOne(
                    { user_id: userId },
                    {
                        $set: {
                            goal_completion_streak: nextStreak,
                            last_goal_completion_date: now,
                            last_active_date: now,
                        },
                        $setOnInsert: {
                            id: uuidv4(),
                            user_id: userId,
                            login_streak: 0,
                            check_in_streak: 0,
                        },
                    },
                    { upsert: true }
                );
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
        await migrateLegacyEkagraTasks(userId);
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
                source: normalizeGoalSource(goal.source) || 'manual',
                subtasks: normalizeGoalSubtasks(goal.subtasks) || [],
                type: goalType,
                completed: false,
                completed_at: null,
                scheduled_date: new Date(`${todayKey}T00:00:00.000Z`),
                created_at: now,
                updated_at: now,
                lifecycle_status: 'active' as GoalLifecycleStatus,
                rollover_prompt_pending: false,
                imported_from_goal: normalizeGoalImportedFromGoal(goal.imported_from_goal),
                goal_kind: getGoalKindFromRecord(goal),
                unit_type: getGoalUnitTypeFromRecord(goal),
                execution_mode: getGoalExecutionModeFromRecord(goal),
                linked_focus_enabled: getGoalLinkedFocusEnabledFromRecord(goal),
                planned_focus_minutes: getGoalPlannedFocusMinutesFromRecord(goal),
                target_value: getGoalTargetValueFromRecord(goal),
                achieved_value: 0,
                status_value: 'not_started' as GoalStatus,
                carry_forward_mode: getGoalCarryForwardModeFromRecord(goal),
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
        const goalType: GoalType = 'daily';

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
            source: normalizeGoalSource(sourceGoal.source) || 'manual',
            subtasks: normalizeGoalSubtasks(sourceGoal.subtasks) || [],
            type: goalType,
            completed: false,
            created_at: now,
            completed_at: null,
            expires_at: expiresAt,
            lifecycle_status: 'active' as GoalLifecycleStatus,
            rollover_prompt_pending: false,
            imported_from_goal: normalizeGoalImportedFromGoal(sourceGoal.imported_from_goal),
            goal_kind: getGoalKindFromRecord(sourceGoal),
            unit_type: getGoalUnitTypeFromRecord(sourceGoal),
            execution_mode: getGoalExecutionModeFromRecord(sourceGoal),
            linked_focus_enabled: getGoalLinkedFocusEnabledFromRecord(sourceGoal),
            planned_focus_minutes: getGoalPlannedFocusMinutesFromRecord(sourceGoal),
            target_value: getGoalTargetValueFromRecord(sourceGoal),
            achieved_value: 0,
            status_value: 'not_started' as GoalStatus,
            carry_forward_mode: getGoalCarryForwardModeFromRecord(sourceGoal),
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
