import { Router, Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";
import { CACHE_CONTROL, QUERY_TIMEOUT_MS } from "../utils/queryDefaults";

const router = Router();

type EkagraSessionSource = "manual" | "imported" | "goal_created" | "goal_continue" | "carry_forward";
type EkagraSessionStatus = "active" | "paused" | "completed" | "ended_early" | "discarded";
type EkagraTimerMode = "Timer" | "short" | "long";
type EkagraSessionType = "goal" | "named";

const LIST_LIMIT = 40;
const RECENT_CLOSED_LIMIT = 50;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_CLOSED_STATUSES = ["completed", "ended_early"] as const;

type AnalyticsClosedStatus = (typeof ANALYTICS_CLOSED_STATUSES)[number];
type AnalyticsSessionType = "focus" | "short_break" | "long_break";

const normalizeMode = (raw: unknown): EkagraTimerMode => {
    const value = String(raw || "").trim();
    if (value === "short" || value === "long") return value;
    return "Timer";
};

const normalizeSource = (raw: unknown): EkagraSessionSource => {
    const value = String(raw || "").trim().toLowerCase();
    if (value === "imported") return "imported";
    if (value === "goal_created") return "goal_created";
    if (value === "goal_continue") return "goal_continue";
    if (value === "carry_forward") return "carry_forward";
    return "manual";
};

const normalizeStatus = (raw: unknown): EkagraSessionStatus | null => {
    const value = String(raw || "").trim().toLowerCase();
    if (value === "active" || value === "paused" || value === "completed" || value === "ended_early" || value === "discarded") {
        return value;
    }
    return null;
};

const normalizeSessionType = (raw: unknown): EkagraSessionType => {
    const value = String(raw || "").trim().toLowerCase();
    if (value === "named") return "named";
    return "goal";
};

const clampPositiveSeconds = (raw: unknown, fallback: number) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.min(24 * 60 * 60, Math.round(value)));
};

const clampRemainingSeconds = (raw: unknown, fallback: number, maxSeconds: number) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return Math.max(0, Math.min(maxSeconds, Math.round(fallback)));
    return Math.max(0, Math.min(maxSeconds, Math.round(value)));
};

const parseIso = (raw: unknown): Date | null => {
    if (!raw) return null;
    const parsed = new Date(String(raw));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const toLocalDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);

const toLocalDayKey = (date: Date) => toLocalDate(date).toISOString().split("T")[0];

const getLocalWeekdayIndex = (date: Date) => {
    const day = toLocalDate(date).getUTCDay();
    return day === 0 ? 6 : day - 1;
};

const getLocalHourBucket = (date: Date) => toLocalDate(date).getUTCHours();

const getRecentLocalDayKeys = (count: number) => {
    const start = toLocalDate(new Date());
    start.setUTCHours(0, 0, 0, 0);
    const keys: string[] = [];
    for (let i = 0; i < count; i += 1) {
        const day = new Date(start.getTime() - i * DAY_MS);
        keys.push(day.toISOString().split("T")[0]);
    }
    return keys;
};

const parseIsoDate = (raw: unknown) => {
    if (!raw) return null;
    const parsed = new Date(String(raw));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const getSessionTimestamp = (doc: any, keys: string[]) => {
    for (const key of keys) {
        const parsed = parseIsoDate(doc?.[key]);
        if (parsed) return parsed;
    }
    return null;
};

const getSessionSortTimestamp = (doc: any) => {
    const ts = getSessionTimestamp(doc, ["ended_at", "completed_at", "updated_at", "created_at"]);
    return ts ? ts.getTime() : 0;
};

const toActualMinutes = (doc: any) => {
    const totalSeconds = Number(doc?.total_seconds || 0);
    const remainingSeconds = Number(doc?.remaining_seconds || 0);
    if (!Number.isFinite(totalSeconds) || !Number.isFinite(remainingSeconds)) return 0;
    return Math.max(0, Math.round((totalSeconds - remainingSeconds) / 60));
};

const toActualSeconds = (doc: any) => {
    const totalSeconds = Number(doc?.total_seconds || 0);
    const remainingSeconds = Number(doc?.remaining_seconds || 0);
    if (!Number.isFinite(totalSeconds) || !Number.isFinite(remainingSeconds)) return 0;
    return Math.max(0, Math.round(totalSeconds - remainingSeconds));
};

const toDurationMinutes = (doc: any) => {
    const totalSeconds = Number(doc?.total_seconds || 0);
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
    return Math.max(0, Math.round(totalSeconds / 60));
};

const toSessionType = (mode: EkagraTimerMode): AnalyticsSessionType => {
    if (mode === "short") return "short_break";
    if (mode === "long") return "long_break";
    return "focus";
};

const normalizeTaskLabel = (raw: unknown) => {
    const value = String(raw || "").replace(/\s+/g, " ").trim();
    return value;
};

const getSessionGoalId = (doc: any) => String(doc?.goal_id || doc?.goalId || "").trim();

const isNamedSessionRecord = (doc: any) => {
    const goalId = getSessionGoalId(doc);
    const sessionType = normalizeSessionType(doc?.session_type ?? doc?.sessionType);
    return sessionType === "named" || goalId.startsWith("named:");
};

const normalizeAnalyticsSessionType = (raw: unknown, fallbackMode?: unknown): AnalyticsSessionType => {
    const value = String(raw || "").trim().toLowerCase();
    if (value === "short_break") return "short_break";
    if (value === "long_break") return "long_break";
    if (value === "focus") return "focus";
    return toSessionType(normalizeMode(fallbackMode));
};

const getAssociatedGoalId = (doc: any) => {
    const value = String(doc?.associated_goal_id || "").trim();
    return value || null;
};

const getAnalyticsStartedAt = (doc: any) =>
    getSessionTimestamp(doc, ["started_at", "session_started_at", "created_at"]);

const getAnalyticsEndedAt = (doc: any) =>
    getSessionTimestamp(doc, ["completed_at", "ended_at", "updated_at", "created_at"]);

const getAnalyticsActualMinutes = (doc: any, sessionType: AnalyticsSessionType) => {
    if (sessionType === "focus") {
        return Math.max(0, Math.round(Number(doc?.actual_duration_minutes ?? doc?.duration_minutes ?? 0)));
    }
    return Math.max(0, Math.round(Number(doc?.break_minutes ?? 0)));
};

const getAnalyticsPlannedMinutes = (doc: any, sessionType: AnalyticsSessionType) => {
    const planned = Number(doc?.planned_duration_minutes);
    if (Number.isFinite(planned) && planned >= 0) {
        return Math.round(planned);
    }
    const fallback = sessionType === "focus"
        ? Number(doc?.actual_duration_minutes ?? doc?.duration_minutes ?? 0)
        : Number(doc?.break_minutes ?? 0);
    return Math.max(0, Math.round(Number.isFinite(fallback) ? fallback : 0));
};

const getAnalyticsPauseCount = (doc: any) => Math.max(0, Math.round(Number(doc?.pause_count ?? 0)));

const getAnalyticsTaskTitle = (doc: any, linkedGoalTitleMap?: Map<string, string | null>) => {
    const associatedGoalId = getAssociatedGoalId(doc);
    const linkedGoalTitle = associatedGoalId && linkedGoalTitleMap ? linkedGoalTitleMap.get(associatedGoalId) : null;
    return normalizeTaskLabel(doc?.task_title || doc?.session_title || doc?.goal_title || linkedGoalTitle) || null;
};

const getAnalyticsSortTimestamp = (doc: any) => {
    const endedAt = getAnalyticsEndedAt(doc);
    return endedAt ? endedAt.getTime() : 0;
};

const upsertFocusLogFromEkagraSession = async (
    userId: string,
    session: any,
    options: {
        mode: EkagraTimerMode;
        plannedTotalSeconds: number;
        elapsedSeconds: number;
        completedAt: Date;
        sessionStartedAt: Date | null;
    },
) => {
    const sourceSessionId = String(session?.id || "").trim();
    if (!sourceSessionId) return;

    const existing = await collections.focusSessions().findOne(
        { user_id: userId, source_session_id: sourceSessionId },
        { projection: { id: 1 } },
    );
    if (existing?.id) return existing.id;

    const sessionType = toSessionType(options.mode);
    const plannedMinutes = Math.max(0, Math.round(options.plannedTotalSeconds / 60));
    const elapsedMinutes = Math.max(0, Math.round(options.elapsedSeconds / 60));
    const isNamedSession = isNamedSessionRecord(session);
    const associatedGoalId = !isNamedSession ? getSessionGoalId(session) || null : null;
    const taskTitle = normalizeTaskLabel(session?.session_title || session?.goal_title) || null;
    const startedAt = options.sessionStartedAt
        || parseIso(session?.session_started_at)
        || parseIso(session?.created_at)
        || options.completedAt;

    const focusMinutes = sessionType === "focus" ? elapsedMinutes : 0;
    const breakMinutes = sessionType === "focus" ? 0 : elapsedMinutes;
    const logId = uuidv4();
    const dateKey = toLocalDayKey(options.completedAt);

    await collections.focusSessions().insertOne({
        id: logId,
        user_id: userId,
        duration_minutes: focusMinutes,
        actual_duration_minutes: focusMinutes,
        planned_duration_minutes: plannedMinutes,
        break_minutes: breakMinutes,
        completed: true,
        associated_goal_id: associatedGoalId,
        interrupted: false,
        started_at: startedAt,
        completed_at: options.completedAt,
        pause_count: getAnalyticsPauseCount(session),
        task_title: taskTitle,
        session_type: sessionType,
        timer_mode: options.mode,
        source_session_id: sourceSessionId,
        session_domain: "ekagra",
        created_at: options.completedAt,
    });

    await collections.focusSessionLogs().insertOne({
        id: uuidv4(),
        user_id: userId,
        duration_minutes: focusMinutes,
        associated_goal_id: associatedGoalId,
        interrupted: false,
        completed: true,
        timestamp: options.completedAt,
        date_key: dateKey,
        created_at: options.completedAt,
        pause_count: getAnalyticsPauseCount(session),
        task_title: taskTitle,
        session_type: sessionType,
        timer_mode: options.mode,
        source_session_id: sourceSessionId,
        session_domain: "ekagra",
    });

    return logId;
};

const normalizeSessionResponse = (doc: any) => {
    const createdAt = doc?.created_at instanceof Date ? doc.created_at : new Date(doc?.created_at || Date.now());
    const updatedAt = doc?.updated_at instanceof Date ? doc.updated_at : new Date(doc?.updated_at || Date.now());
    const completedAt = doc?.completed_at ? new Date(doc.completed_at) : null;
    const endedAt = doc?.ended_at ? new Date(doc.ended_at) : null;
    const discardedAt = doc?.discarded_at ? new Date(doc.discarded_at) : null;
    const sessionStartedAt = doc?.session_started_at ? new Date(doc.session_started_at) : null;
    const pauseCount = Number(doc?.pause_count || 0);

    const sessionType = normalizeSessionType(doc?.session_type);
    const sessionTitle = String(doc?.session_title || doc?.goal_title || "").trim();

    return {
        id: String(doc?.id || ""),
        userId: String(doc?.user_id || ""),
        goalId: String(doc?.goal_id || ""),
        goalTitle: String(doc?.goal_title || ""),
        sessionType,
        sessionTitle,
        source: normalizeSource(doc?.source),
        status: normalizeStatus(doc?.status) || "paused",
        mode: normalizeMode(doc?.mode),
        totalSeconds: clampPositiveSeconds(doc?.total_seconds, 25 * 60),
        remainingSeconds: clampRemainingSeconds(doc?.remaining_seconds, 25 * 60, clampPositiveSeconds(doc?.total_seconds, 25 * 60)),
        isRunning: Boolean(doc?.is_running),
        importedFromGoal: Boolean(doc?.imported_from_goal),
        pauseCount,
        sessionStartedAt: sessionStartedAt && Number.isFinite(sessionStartedAt.getTime()) ? sessionStartedAt.toISOString() : null,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
        completedAt: completedAt && Number.isFinite(completedAt.getTime()) ? completedAt.toISOString() : null,
        endedAt: endedAt && Number.isFinite(endedAt.getTime()) ? endedAt.toISOString() : null,
        discardedAt: discardedAt && Number.isFinite(discardedAt.getTime()) ? discardedAt.toISOString() : null,
        user_id: String(doc?.user_id || ""),
        goal_id: String(doc?.goal_id || ""),
        goal_title: String(doc?.goal_title || ""),
        total_seconds: clampPositiveSeconds(doc?.total_seconds, 25 * 60),
        remaining_seconds: clampRemainingSeconds(doc?.remaining_seconds, 25 * 60, clampPositiveSeconds(doc?.total_seconds, 25 * 60)),
        is_running: Boolean(doc?.is_running),
        imported_from_goal: Boolean(doc?.imported_from_goal),
        pause_count: pauseCount,
        session_started_at: sessionStartedAt && Number.isFinite(sessionStartedAt.getTime()) ? sessionStartedAt.toISOString() : null,
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
        completed_at: completedAt && Number.isFinite(completedAt.getTime()) ? completedAt.toISOString() : null,
        ended_at: endedAt && Number.isFinite(endedAt.getTime()) ? endedAt.toISOString() : null,
        discarded_at: discardedAt && Number.isFinite(discardedAt.getTime()) ? discardedAt.toISOString() : null,
        session_type: sessionType,
        session_title: sessionTitle || null,
    };
};

// GET /active — DEPRECATED stub (client-side mocked to null)
router.get("/active", requireAuth, async (_req: Request, res) => {
    res.json({ session: null });
});



router.get("/analytics", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const docs = await collections.focusSessions()
            .find(
                { user_id: userId },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        associated_goal_id: 1,
                        task_title: 1,
                        session_type: 1,
                        timer_mode: 1,
                        planned_duration_minutes: 1,
                        duration_minutes: 1,
                        actual_duration_minutes: 1,
                        break_minutes: 1,
                        pause_count: 1,
                        started_at: 1,
                        completed_at: 1,
                        created_at: 1,
                    },
                },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray();

        const linkedGoalIds = Array.from(new Set(
            docs
                .map((doc) => getAssociatedGoalId(doc))
                .filter((goalId): goalId is string => Boolean(goalId)),
        ));
        const linkedGoals = linkedGoalIds.length > 0
            ? await collections.goals()
                .find(
                    { user_id: userId, id: { $in: linkedGoalIds } },
                    { projection: { id: 1, title: 1, text: 1 } },
                )
                .maxTimeMS(QUERY_TIMEOUT_MS)
                .toArray()
            : [];
        const linkedGoalTitleMap = new Map<string, string | null>(
            linkedGoals.map((goal) => [String(goal.id || ""), normalizeTaskLabel(goal.title || goal.text) || null]),
        );

        const weeklyData = [0, 0, 0, 0, 0, 0, 0];
        const weeklyBreaks = [0, 0, 0, 0, 0, 0, 0];
        const hourlyDistribution = Array.from({ length: 24 }, () => 0);
        const last7DayKeySet = new Set(getRecentLocalDayKeys(7));
        const completedFocusDaySet = new Set<string>();
        const topTaskMap = new Map<string, { label: string; minutes: number; count: number }>();
        const durationUsageMap = new Map<string, { durationMinutes: number; count: number; sessionType: AnalyticsSessionType }>();
        const focusDurationUsageMap = new Map<number, number>();
        let plannedFocusMinutesTotal = 0;
        let timerUsageCount = 0;
        let breakSessionsCount = 0;
        let shortBreakSessionsCount = 0;
        let longBreakSessionsCount = 0;
        let longDurationSessionCount = 0;

        let totalFocusMinutes = 0;
        let totalBreakMinutes = 0;
        let totalSessions = 0;
        let completedSessions = 0;
        const endedEarlySessions = 0;

        const recentRows: Array<{
            id: string;
            startedAt: string | null;
            endedAt: string | null;
            durationMinutes: number;
            actualMinutes: number;
            completed: boolean;
            status: "completed";
            taskText: string | null;
            associatedGoalId: string | null;
            pauseCount: number;
            sessionType: AnalyticsSessionType;
            sortTs: number;
        }> = [];
        const focusSessionRows: Array<{
            id: string;
            startedAt: string | null;
            endedAt: string | null;
            durationMinutes: number;
            actualMinutes: number;
            status: "completed";
            rawStatus: AnalyticsClosedStatus;
            taskText: string | null;
            associatedGoalId: string | null;
            pauseCount: number;
            sortTs: number;
        }> = [];

        for (const doc of docs) {
            const sessionType = normalizeAnalyticsSessionType(doc?.session_type, doc?.timer_mode);
            const durationMinutes = getAnalyticsPlannedMinutes(doc, sessionType);
            const actualMinutes = getAnalyticsActualMinutes(doc, sessionType);
            const endedAt = getAnalyticsEndedAt(doc);
            if (!endedAt) continue;
            const startedAt = getAnalyticsStartedAt(doc);
            const localDayKey = toLocalDayKey(endedAt);
            const associatedGoalId = getAssociatedGoalId(doc);
            const taskLabel = getAnalyticsTaskTitle(doc, linkedGoalTitleMap);
            const pauseCount = getAnalyticsPauseCount(doc);

            if (sessionType === "focus") {
                timerUsageCount += 1;
                totalSessions += 1;
                completedSessions += 1;
                completedFocusDaySet.add(localDayKey);
                plannedFocusMinutesTotal += durationMinutes;
                focusDurationUsageMap.set(durationMinutes, (focusDurationUsageMap.get(durationMinutes) || 0) + 1);
                if (durationMinutes >= 60) {
                    longDurationSessionCount += 1;
                }

                totalFocusMinutes += actualMinutes;
                if (actualMinutes > 0) {
                    const hourBucket = getLocalHourBucket(endedAt);
                    if (hourBucket >= 0 && hourBucket <= 23) {
                        hourlyDistribution[hourBucket] += actualMinutes;
                    }
                }

                const taskEntry = topTaskMap.get(taskLabel || "Unlabeled") || {
                    label: taskLabel || "Unlabeled",
                    minutes: 0,
                    count: 0,
                };
                taskEntry.minutes += actualMinutes;
                taskEntry.count += 1;
                topTaskMap.set(taskEntry.label, taskEntry);

                if (last7DayKeySet.has(localDayKey)) {
                    const weekdayIndex = getLocalWeekdayIndex(endedAt);
                    weeklyData[weekdayIndex] += actualMinutes;
                }
            } else {
                breakSessionsCount += 1;
                if (sessionType === "short_break") shortBreakSessionsCount += 1;
                if (sessionType === "long_break") longBreakSessionsCount += 1;
                totalBreakMinutes += actualMinutes;
                if (last7DayKeySet.has(localDayKey)) {
                    const weekdayIndex = getLocalWeekdayIndex(endedAt);
                    weeklyBreaks[weekdayIndex] += actualMinutes;
                }
            }

            const usageKey = `${sessionType}:${durationMinutes}`;
            const usageEntry = durationUsageMap.get(usageKey)
                || { durationMinutes, count: 0, sessionType };
            usageEntry.count += 1;
            durationUsageMap.set(usageKey, usageEntry);

            recentRows.push({
                id: String(doc?.id || ""),
                startedAt: startedAt ? startedAt.toISOString() : null,
                endedAt: endedAt.toISOString(),
                durationMinutes,
                actualMinutes,
                completed: true,
                status: "completed",
                taskText: taskLabel,
                associatedGoalId,
                pauseCount,
                sessionType,
                sortTs: getAnalyticsSortTimestamp(doc),
            });

            if (sessionType === "focus") {
                focusSessionRows.push({
                    id: String(doc?.id || ""),
                    startedAt: startedAt ? startedAt.toISOString() : null,
                    endedAt: endedAt.toISOString(),
                    durationMinutes,
                    actualMinutes,
                    status: "completed",
                    rawStatus: "completed",
                    taskText: taskLabel,
                    associatedGoalId,
                    pauseCount,
                    sortTs: getAnalyticsSortTimestamp(doc),
                });
            }
        }

        let focusStreak = 0;
        const maxStreakWindow = 3650;
        for (const dayKey of getRecentLocalDayKeys(maxStreakWindow)) {
            if (!completedFocusDaySet.has(dayKey)) break;
            focusStreak += 1;
        }

        recentRows.sort((a, b) => b.sortTs - a.sortTs);
        const recentSessions = recentRows.slice(0, 20).map(({ sortTs, ...row }) => row);
        focusSessionRows.sort((a, b) => b.sortTs - a.sortTs);
        const focusSessions = focusSessionRows.map(({ sortTs, ...row }) => row);

        const topTasks = [...topTaskMap.values()]
            .sort((a, b) => {
                if (b.minutes !== a.minutes) return b.minutes - a.minutes;
                return b.count - a.count;
            })
            .slice(0, 10);

        const mostUsedTimerDurationMinutes = [...focusDurationUsageMap.entries()]
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return b[0] - a[0];
            })[0]?.[0] ?? null;

        const timerDurationUsage = [...durationUsageMap.values()]
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return b.durationMinutes - a.durationMinutes;
            });

        const payload = {
            totalFocusMinutes,
            totalBreakMinutes,
            timerUsageCount,
            breakSessionsCount,
            shortBreakSessionsCount,
            longBreakSessionsCount,
            longDurationSessionCount,
            averageTimerMinutes: timerUsageCount > 0 ? Math.round(plannedFocusMinutesTotal / timerUsageCount) : 0,
            mostUsedTimerDurationMinutes,
            totalSessions,
            completedSessions,
            endedEarlySessions,
            abandonedSessions: 0,
            weeklyData,
            weeklyBreaks,
            focusStreak,
            hourlyDistribution,
            recentSessions,
            focusSessions,
            topTasks,
            timerDurationUsage,
        };

        res.set("Cache-Control", CACHE_CONTROL.MEDIUM);
        return res.json(payload);
    } catch (error) {
        console.error("Get Ekagra analytics error:", error);
        return res.status(500).json({ message: "Failed to fetch Ekagra analytics" });
    }
});

router.post("/save", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const mode = String(req.body?.mode || "focus").trim();
        const startedAtRaw = parseIso(req.body?.startedAt);
        const endedAtRaw = parseIso(req.body?.endedAt);
        const plannedDurationMinutes = Math.max(0, Math.round(Number(req.body?.plannedDurationMinutes || 0)));
        const actualDurationMinutes = Math.max(0, Math.round(Number(req.body?.actualDurationMinutes || 0)));
        const completed = Boolean(req.body?.completed);
        const markGoalComplete = Boolean(req.body?.markGoalComplete);
        const goalId = String(req.body?.goalId || "").trim() || null;
        const goalTitle = String(req.body?.goalTitle || "").trim() || null;
        const taskTitle = String(req.body?.taskTitle || "").trim() || goalTitle || null;

        if (actualDurationMinutes <= 0 && !completed) {
            return res.status(400).json({ message: "Session has no recorded duration" });
        }

        const now = endedAtRaw || new Date();
        const startedAt = startedAtRaw || new Date(now.getTime() - actualDurationMinutes * 60 * 1000);
        const sessionType: AnalyticsSessionType = mode === "short" ? "short_break" : mode === "long" ? "long_break" : "focus";
        const focusMinutes = sessionType === "focus" ? actualDurationMinutes : 0;
        const breakMinutes = sessionType === "focus" ? 0 : actualDurationMinutes;
        const logId = uuidv4();
        const dateKey = toLocalDayKey(now);

        await collections.focusSessions().insertOne({
            id: logId,
            user_id: userId,
            duration_minutes: focusMinutes,
            actual_duration_minutes: focusMinutes,
            planned_duration_minutes: plannedDurationMinutes,
            break_minutes: breakMinutes,
            completed,
            associated_goal_id: goalId,
            interrupted: !completed,
            started_at: startedAt,
            completed_at: now,
            pause_count: 0,
            task_title: taskTitle,
            session_type: sessionType,
            timer_mode: normalizeMode(mode === "focus" ? "Timer" : mode),
            source_session_id: null,
            session_domain: "ekagra",
            created_at: now,
        });

        await collections.focusSessionLogs().insertOne({
            id: uuidv4(),
            user_id: userId,
            duration_minutes: focusMinutes,
            associated_goal_id: goalId,
            interrupted: !completed,
            completed,
            timestamp: now,
            date_key: dateKey,
            created_at: now,
            pause_count: 0,
            task_title: taskTitle,
            session_type: sessionType,
            timer_mode: normalizeMode(mode === "focus" ? "Timer" : mode),
            source_session_id: null,
            session_domain: "ekagra",
        });

        // Timer-linked goal progress is duration-aware. Binary/count goals are only
        // completed when the user explicitly chooses that action.
        if (completed && sessionType === "focus" && goalId && !goalId.startsWith("named:")) {
            const linkedGoal = await collections.goals().findOne(
                { id: goalId, user_id: userId },
                { projection: { unit_type: 1, target_value: 1, achieved_value: 1, completed: 1 } },
            );
            if (linkedGoal) {
                const goalUpdates: Record<string, unknown> = {
                    completed_via_focus: true,
                    lifecycle_status: "active",
                    updated_at: now,
                };
                const unitType = String(linkedGoal.unit_type || "").trim().toLowerCase();
                const targetValue = Number(linkedGoal.target_value);
                const achievedValue = Number(linkedGoal.achieved_value);

                if (unitType === "duration_minutes") {
                    const nextAchievedValue = Math.max(0, Number.isFinite(achievedValue) ? achievedValue : 0) + actualDurationMinutes;
                    goalUpdates.achieved_value = nextAchievedValue;
                    if (Number.isFinite(targetValue) && targetValue > 0 && nextAchievedValue >= targetValue) {
                        goalUpdates.completed = true;
                        goalUpdates.completed_at = now;
                        goalUpdates.status_value = "completed";
                    } else if (!linkedGoal.completed) {
                        goalUpdates.completed = false;
                        goalUpdates.completed_at = null;
                        goalUpdates.status_value = "in_progress";
                    }
                }

                if (markGoalComplete) {
                    goalUpdates.completed = true;
                    goalUpdates.completed_at = now;
                    goalUpdates.status_value = "completed";
                    if (unitType === "binary") {
                        goalUpdates.achieved_value = 1;
                    } else if (Number.isFinite(targetValue) && targetValue >= 0) {
                        goalUpdates.achieved_value = Math.max(targetValue, Number(goalUpdates.achieved_value ?? achievedValue) || 0);
                    }
                }

                await collections.goals().updateOne(
                    { id: goalId, user_id: userId },
                    { $set: goalUpdates },
                );
            }
        }

        return res.status(201).json({
            session: {
                id: logId,
                userId,
                mode,
                startedAt: startedAt.toISOString(),
                completedAt: now.toISOString(),
                plannedDurationMinutes,
                actualDurationMinutes,
                completed,
                goalId,
                goalTitle,
                taskTitle,
                sessionType,
            },
        });
    } catch (error) {
        console.error("Save Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to save Ekagra session" });
    }
});

router.delete("/:id", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;

        // Try deleting from focusSessions (analytics log) since that's where /save writes
        const focusResult = await collections.focusSessions().deleteOne({ id, user_id: userId });
        if (focusResult.deletedCount === 0) {
            // Fall back to legacy ekagraModeSessions collection
            const legacyResult = await collections.ekagraModeSessions().deleteOne({ id, user_id: userId });
            if (legacyResult.deletedCount === 0) {
                return res.status(404).json({ message: "Ekagra session not found" });
            }
        }

        // Also clean up any matching focusSessionLogs entry
        await collections.focusSessionLogs().deleteMany({ source_session_id: id, user_id: userId }).catch(() => {});

        return res.json({ ok: true, deletedId: id });
    } catch (error) {
        console.error("Delete Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to delete Ekagra session" });
    }
});

export const ekagraSessionRoutes = router;
