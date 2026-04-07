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

const findActiveSession = async (userId: string) => {
    return collections.ekagraModeSessions()
        .findOne({ user_id: userId, status: "active" }, { sort: { updated_at: -1 } });
};

const pauseActiveSession = async (userId: string, exceptId?: string) => {
    const filter: Record<string, any> = { user_id: userId, status: "active" };
    if (exceptId) {
        filter.id = { $ne: exceptId };
    }
    await collections.ekagraModeSessions().updateMany(
        filter,
        {
            $set: {
                status: "paused",
                is_running: false,
                updated_at: new Date(),
            },
        },
    );
};

router.get("/", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const openSessions = await collections.ekagraModeSessions()
            .find({ user_id: userId, status: { $in: ["active", "paused"] } })
            .sort({ updated_at: -1 })
            .limit(LIST_LIMIT)
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray();

        const recentClosed = await collections.ekagraModeSessions()
            .find({ user_id: userId, status: { $in: ["completed", "ended_early", "discarded"] } })
            .sort({ updated_at: -1 })
            .limit(RECENT_CLOSED_LIMIT)
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray();

        const sessions = [...openSessions, ...recentClosed].map(normalizeSessionResponse);
        res.json({ sessions });
    } catch (error) {
        console.error("Get Ekagra sessions error:", error);
        res.status(500).json({ message: "Failed to fetch Ekagra sessions" });
    }
});

router.get("/active", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const activeSession = await findActiveSession(userId);
        res.json({ session: activeSession ? normalizeSessionResponse(activeSession) : null });
    } catch (error) {
        console.error("Get active Ekagra session error:", error);
        res.status(500).json({ message: "Failed to fetch active Ekagra session" });
    }
});

router.get("/analytics", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const docs = await collections.ekagraModeSessions()
            .find(
                {
                    user_id: userId,
                    status: { $in: ["completed", "ended_early"] },
                },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        mode: 1,
                        status: 1,
                        goal_title: 1,
                        session_title: 1,
                        session_type: 1,
                        total_seconds: 1,
                        remaining_seconds: 1,
                        pause_count: 1,
                        session_started_at: 1,
                        ended_at: 1,
                        completed_at: 1,
                        updated_at: 1,
                        created_at: 1,
                    },
                },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray();

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
        let endedEarlySessions = 0;

        const recentRows: Array<{
            id: string;
            startedAt: string | null;
            endedAt: string | null;
            durationMinutes: number;
            actualMinutes: number;
            completed: boolean;
            status: "completed";
            taskText: string | null;
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
            pauseCount: number;
            sortTs: number;
        }> = [];

        for (const doc of docs) {
            const status = normalizeStatus(doc?.status);
            if (!status) continue;

            const mode = normalizeMode(doc?.mode);
            const sessionType = toSessionType(mode);
            const durationMinutes = toDurationMinutes(doc);
            const endedAt = getSessionTimestamp(doc, ["ended_at", "completed_at", "updated_at", "created_at"]);
            if (!endedAt) continue;

            const actualSeconds = toActualSeconds(doc);
            const actualMinutes = toActualMinutes(doc);
            const isClosedStatus = status === "completed" || status === "ended_early";

            const startedAt = getSessionTimestamp(doc, ["session_started_at", "created_at"]);
            const localDayKey = toLocalDayKey(endedAt);

            if (sessionType === "focus") {
                if (durationMinutes > 0) {
                    timerUsageCount += 1;
                    plannedFocusMinutesTotal += durationMinutes;
                    focusDurationUsageMap.set(durationMinutes, (focusDurationUsageMap.get(durationMinutes) || 0) + 1);
                    if (durationMinutes >= 60) {
                        longDurationSessionCount += 1;
                    }
                }

                if (isClosedStatus && actualSeconds > 0) {
                    totalFocusMinutes += actualMinutes;
                    // Legacy ended_early sessions are treated as completed in new model.
                    completedSessions += 1;
                    completedFocusDaySet.add(localDayKey);

                    const hourBucket = getLocalHourBucket(endedAt);
                    if (hourBucket >= 0 && hourBucket <= 23) {
                        hourlyDistribution[hourBucket] += actualMinutes;
                    }

                    const taskLabel = normalizeTaskLabel(doc?.session_title || doc?.goal_title) || "Unlabeled";
                    const taskEntry = topTaskMap.get(taskLabel) || { label: taskLabel, minutes: 0, count: 0 };
                    taskEntry.minutes += actualMinutes;
                    taskEntry.count += 1;
                    topTaskMap.set(taskLabel, taskEntry);

                    if (last7DayKeySet.has(localDayKey)) {
                        const weekdayIndex = getLocalWeekdayIndex(endedAt);
                        weeklyData[weekdayIndex] += actualMinutes;
                    }
                }
            } else {
                if (durationMinutes > 0) {
                    breakSessionsCount += 1;
                    if (sessionType === "short_break") shortBreakSessionsCount += 1;
                    if (sessionType === "long_break") longBreakSessionsCount += 1;
                }
                if (actualMinutes > 0) {
                    totalBreakMinutes += actualMinutes;
                    if (last7DayKeySet.has(localDayKey)) {
                        const weekdayIndex = getLocalWeekdayIndex(endedAt);
                        weeklyBreaks[weekdayIndex] += actualMinutes;
                    }
                }
            }

            if (durationMinutes > 0) {
                const usageKey = `${sessionType}:${durationMinutes}`;
                const usageEntry = durationUsageMap.get(usageKey)
                    || { durationMinutes, count: 0, sessionType };
                usageEntry.count += 1;
                durationUsageMap.set(usageKey, usageEntry);
            }

            if (isClosedStatus && actualSeconds > 0) {
                recentRows.push({
                    id: String(doc?.id || ""),
                    startedAt: startedAt ? startedAt.toISOString() : null,
                    endedAt: endedAt.toISOString(),
                    durationMinutes,
                    actualMinutes,
                    completed: status === "completed",
                    status: "completed",
                    taskText: normalizeTaskLabel(doc?.session_title || doc?.goal_title) || null,
                    pauseCount: Math.max(0, Number(doc?.pause_count || 0)),
                    sessionType,
                    sortTs: getSessionSortTimestamp(doc),
                });

                if (sessionType === "focus") {
                    focusSessionRows.push({
                        id: String(doc?.id || ""),
                        startedAt: startedAt ? startedAt.toISOString() : null,
                        endedAt: endedAt.toISOString(),
                        durationMinutes,
                        actualMinutes,
                        status: "completed",
                        rawStatus: status,
                        taskText: normalizeTaskLabel(doc?.session_title || doc?.goal_title) || null,
                        pauseCount: Math.max(0, Number(doc?.pause_count || 0)),
                        sortTs: getSessionSortTimestamp(doc),
                    });
                }
            }
        }

        totalSessions = timerUsageCount;

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

router.post("/activate", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const goalId = String(req.body?.goalId || "").trim();
        const goalTitle = String(req.body?.goalTitle || "").trim();
        const sessionTitleRaw = String(req.body?.sessionTitle || "").trim();
        const sessionTypeRaw = normalizeSessionType(req.body?.sessionType);
        const overrideActive = Boolean(req.body?.overrideActive);
        const importedFromGoal = Boolean(req.body?.importedFromGoal);
        const source = importedFromGoal ? "imported" : normalizeSource(req.body?.source);
        const isNamedSession = sessionTypeRaw === "named" || !goalId;

        if (isNamedSession && !sessionTitleRaw) {
            return res.status(400).json({ message: "sessionTitle is required for named sessions" });
        }
        if (!isNamedSession && !goalId) {
            return res.status(400).json({ message: "goalId is required" });
        }

        let goal: any = null;
        if (!isNamedSession) {
            goal = await collections.goals().findOne({ id: goalId, user_id: userId });
            if (!goal) {
                return res.status(404).json({ message: "Goal not found or unauthorized" });
            }
            const goalSource = String(goal.source || "").toLowerCase();
            const linkedFocusEnabled = Boolean(goal.linked_focus_enabled ?? goal.linkedFocusEnabled);
            if (goalSource !== "ekagra" && !linkedFocusEnabled) {
                return res.status(409).json({ message: "Only Ekagra goals can be activated in Ekagra sessions" });
            }
        }

        const activeSession = await findActiveSession(userId);
        if (activeSession && String(activeSession.goal_id) !== goalId && !overrideActive) {
            return res.status(409).json({
                message: "An Ekagra session is already active",
                code: "ACTIVE_SESSION_CONFLICT",
                activeSession: normalizeSessionResponse(activeSession),
            });
        }

        if (activeSession && String(activeSession.goal_id) !== goalId && overrideActive) {
            await pauseActiveSession(userId);
        }

        const existingOpen = !isNamedSession
            ? await collections.ekagraModeSessions().findOne(
                { user_id: userId, goal_id: goalId, status: { $in: ["active", "paused"] } },
                { sort: { updated_at: -1 } },
            )
            : null;
        const now = new Date();

        if (existingOpen) {
            await collections.ekagraModeSessions().updateOne(
                { id: existingOpen.id, user_id: userId },
                {
                    $set: {
                        status: "active",
                        goal_title: goalTitle || String(goal.title || goal.text || ""),
                        source,
                        imported_from_goal: importedFromGoal,
                        updated_at: now,
                    },
                },
            );
            const updated = await collections.ekagraModeSessions().findOne({ id: existingOpen.id, user_id: userId });
            return res.json({ session: normalizeSessionResponse(updated) });
        }

        const sessionId = uuidv4();
        const namedGoalId = isNamedSession ? `named:${sessionId}` : goalId;
        const sessionTitle = isNamedSession ? sessionTitleRaw : "";
        const effectiveGoalTitle = isNamedSession
            ? sessionTitle
            : goalTitle || String(goal?.title || goal?.text || "");

        const totalSeconds = clampPositiveSeconds(req.body?.totalSeconds, 25 * 60);
        const remainingSeconds = clampRemainingSeconds(req.body?.remainingSeconds, totalSeconds, totalSeconds);
        const mode = normalizeMode(req.body?.mode);
        const isRunning = Boolean(req.body?.isRunning);
        const startedAt = parseIso(req.body?.sessionStartedAt);

        const doc = {
            id: sessionId,
            user_id: userId,
            goal_id: namedGoalId,
            goal_title: effectiveGoalTitle,
            session_type: isNamedSession ? "named" : "goal",
            session_title: sessionTitle || null,
            source,
            status: "active" as EkagraSessionStatus,
            mode,
            total_seconds: totalSeconds,
            remaining_seconds: remainingSeconds,
            is_running: isRunning,
            imported_from_goal: importedFromGoal,
            pause_count: 0,
            session_started_at: startedAt,
            created_at: now,
            updated_at: now,
            completed_at: null,
            ended_at: null,
            discarded_at: null,
        };

        try {
            await collections.ekagraModeSessions().insertOne(doc);
            return res.status(201).json({ session: normalizeSessionResponse(doc) });
        } catch (insertError: any) {
            if (insertError?.code === 11000) {
                const collided = await collections.ekagraModeSessions().findOne(
                    { user_id: userId, goal_id: goalId, status: { $in: ["active", "paused"] } },
                    { sort: { updated_at: -1 } },
                );
                if (collided) {
                    await pauseActiveSession(userId, String(collided.id || ""));
                    await collections.ekagraModeSessions().updateOne(
                        { id: collided.id, user_id: userId },
                        {
                            $set: {
                                status: "active",
                                goal_title: goalTitle || String(goal.title || goal.text || ""),
                                source,
                                imported_from_goal: importedFromGoal,
                                updated_at: now,
                            },
                        },
                    );
                    const resumed = await collections.ekagraModeSessions().findOne({ id: collided.id, user_id: userId });
                    if (resumed) {
                        return res.json({ session: normalizeSessionResponse(resumed) });
                    }
                }
            }
            throw insertError;
        }
    } catch (error) {
        console.error("Activate Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to activate Ekagra session" });
    }
});

router.patch("/:id", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;
        const session = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        if (!session) {
            return res.status(404).json({ message: "Ekagra session not found" });
        }

        const updates: Record<string, any> = {};
        const hasMode = req.body && "mode" in req.body;
        const hasTotalSeconds = req.body && "totalSeconds" in req.body;
        const hasRemainingSeconds = req.body && "remainingSeconds" in req.body;
        const hasIsRunning = req.body && "isRunning" in req.body;
        const hasSessionStartedAt = req.body && "sessionStartedAt" in req.body;
        const hasStatus = req.body && "status" in req.body;
        const hasGoalTitle = req.body && "goalTitle" in req.body;
        const hasSource = req.body && "source" in req.body;
        const hasImportedFromGoal = req.body && "importedFromGoal" in req.body;

        if (hasMode) updates.mode = normalizeMode(req.body.mode);
        const existingTotalSeconds = clampPositiveSeconds(session.total_seconds, 25 * 60);
        if (hasTotalSeconds) {
            updates.total_seconds = clampPositiveSeconds(req.body.totalSeconds, existingTotalSeconds);
        }
        if (hasRemainingSeconds) {
            updates.remaining_seconds = clampRemainingSeconds(
                req.body.remainingSeconds,
                clampRemainingSeconds(session.remaining_seconds, existingTotalSeconds, existingTotalSeconds),
                hasTotalSeconds ? updates.total_seconds : existingTotalSeconds,
            );
        }
        if (hasIsRunning) updates.is_running = Boolean(req.body.isRunning);
        if (hasSessionStartedAt) updates.session_started_at = parseIso(req.body.sessionStartedAt);
        if (hasGoalTitle) updates.goal_title = String(req.body.goalTitle || "").trim() || session.goal_title;
        if (hasSource) updates.source = normalizeSource(req.body.source);
        if (hasImportedFromGoal) updates.imported_from_goal = Boolean(req.body.importedFromGoal);

        if (hasStatus) {
            const status = normalizeStatus(req.body.status);
            if (!status) {
                return res.status(400).json({ message: "Invalid status" });
            }
            updates.status = status;
            if (status === "completed") {
                updates.completed_at = new Date();
                updates.ended_at = new Date();
                updates.is_running = false;
                updates.remaining_seconds = 0;
            }
            if (status === "ended_early") {
                updates.ended_at = new Date();
                updates.is_running = false;
            }
            if (status === "discarded") {
                updates.discarded_at = new Date();
                updates.is_running = false;
            }
            if (status === "paused") {
                updates.is_running = false;
            }
            if (status === "active") {
                await pauseActiveSession(userId, id);
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        updates.updated_at = new Date();

        // Build the MongoDB update document: always $set, optionally $inc for pause_count
        const updateDoc: Record<string, any> = { $set: updates };
        if (hasStatus && normalizeStatus(req.body.status) === "paused") {
            updateDoc.$inc = { pause_count: 1 };
        }

        await collections.ekagraModeSessions().updateOne(
            { id, user_id: userId },
            updateDoc,
        );
        const updated = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        return res.json({ session: normalizeSessionResponse(updated) });
    } catch (error) {
        console.error("Update Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to update Ekagra session" });
    }
});

router.post("/:id/complete", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;
        const session = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        if (!session) {
            return res.status(404).json({ message: "Ekagra session not found" });
        }

        const plannedTotalSeconds = clampPositiveSeconds(session.total_seconds, 25 * 60);
        const sessionRemainingSeconds = clampRemainingSeconds(session.remaining_seconds, plannedTotalSeconds, plannedTotalSeconds);
        const payloadElapsedSeconds = Number(req.body?.elapsedSeconds);
        const payloadRemainingSeconds = Number(req.body?.remainingSeconds);

        let elapsedSeconds = Math.max(0, plannedTotalSeconds - sessionRemainingSeconds);
        if (Number.isFinite(payloadElapsedSeconds)) {
            elapsedSeconds = Math.max(0, Math.round(payloadElapsedSeconds));
        } else if (Number.isFinite(payloadRemainingSeconds)) {
            elapsedSeconds = Math.max(0, plannedTotalSeconds - Math.max(0, Math.round(payloadRemainingSeconds)));
        }

        const status: EkagraSessionStatus = "completed";
        const normalizedElapsedSeconds = Math.max(0, Math.min(24 * 60 * 60, elapsedSeconds));
        const remainingSeconds = Math.max(0, plannedTotalSeconds - normalizedElapsedSeconds);
        const resolvedMode = normalizeMode(req.body?.mode ?? session.mode);
        const now = new Date();
        const updates = {
            status,
            mode: resolvedMode,
            total_seconds: plannedTotalSeconds,
            remaining_seconds: remainingSeconds,
            is_running: false,
            session_started_at: parseIso(req.body?.sessionStartedAt) || session.session_started_at || null,
            updated_at: now,
            completed_at: now,
            ended_at: now,
        };

        await collections.ekagraModeSessions().updateOne({ id, user_id: userId }, { $set: updates });

        // Ensure linked Ekagra goal is marked complete whenever session ends via complete endpoint.
        const goalId = String(session.goal_id || "").trim();
        if (resolvedMode === "Timer" && goalId && !goalId.startsWith("named:")) {
            await collections.goals().updateOne(
                { id: goalId, user_id: userId },
                {
                    $set: {
                        completed: true,
                        completed_at: now,
                        status_value: "completed",
                        lifecycle_status: "active",
                        updated_at: now,
                    },
                },
            );
        }

        const updated = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        return res.json({ session: normalizeSessionResponse(updated) });
    } catch (error) {
        console.error("Complete Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to complete Ekagra session" });
    }
});

router.post("/:id/discard", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;
        const session = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        if (!session) {
            return res.status(404).json({ message: "Ekagra session not found" });
        }

        const now = new Date();

        const updates: Record<string, any> = {
            status: "discarded",
            is_running: false,
            ended_at: null,
            completed_at: null,
            discarded_at: now,
            updated_at: now,
        };

        await collections.ekagraModeSessions().updateOne({ id, user_id: userId }, { $set: updates });
        const updated = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        return res.json({ session: normalizeSessionResponse(updated) });
    } catch (error) {
        console.error("Discard Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to discard Ekagra session" });
    }
});

router.delete("/:id", requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { id } = req.params;

        const existing = await collections.ekagraModeSessions().findOne({ id, user_id: userId });
        if (!existing) {
            return res.status(404).json({ message: "Ekagra session not found" });
        }

        await collections.ekagraModeSessions().deleteOne({ id, user_id: userId });
        return res.json({ ok: true, deletedId: id });
    } catch (error) {
        console.error("Delete Ekagra session error:", error);
        return res.status(500).json({ message: "Failed to delete Ekagra session" });
    }
});

export const ekagraSessionRoutes = router;
