import { API_BASE, apiFetch } from "@/utils/apiFetch";

export interface LegacyFocusSessionLog {
    id: string;
    userId: string;
    plannedDurationMinutes: number;
    actualDurationMinutes: number;
    breakMinutes: number;
    completed: boolean;
    associatedGoalId?: string;
    interrupted?: boolean;
    preStudyMood?: string;
    postStudyMood?: string;
    moodScore?: number;
    startedAt: string;
    completedAt: string;
}

// Backward-compatible alias; new code should prefer LegacyFocusSessionLog.
export type FocusSession = LegacyFocusSessionLog;

export interface LegacyFocusStats {
    totalFocusMinutes: number;
    totalBreakMinutes: number;
    totalSessions: number;
    completedSessions: number;
    endedEarlySessions: number;
    weeklyData: number[]; // Mon-Sun
    weeklyBreaks: number[]; // Mon-Sun
    focusStreak: number;
    goalsSet: number;
    goalsCompleted: number;
    hourlyDistribution: number[]; // 24 hours
    recentSessions: Array<{
        id: string;
        startedAt: string;
        durationMinutes: number;
        actualMinutes: number;
        completed: boolean;
        taskText: string | null;
        pauseCount?: number;
    }>;
}

// Backward-compatible alias; new code should prefer LegacyFocusStats.
export type FocusStats = LegacyFocusStats;

type FocusSessionPayload = Omit<FocusSession, "id" | "userId">;

type QueuedFocusSession = {
    queueId: string;
    attempts: number;
    lastAttemptAt: number | null;
    session: FocusSessionPayload;
};

type LogSessionResult =
    | { success: true; id: string; queued: false }
    | { success: false; queued: true };

const FOCUS_API_BASE = `${API_BASE}/focus-sessions`;
const FOCUS_SESSION_QUEUE_KEY = "focus_failed_session_queue_v1";
const MAX_QUEUE_LENGTH = 5;
const MAX_RETRY_ATTEMPTS = 3;

function canUseStorage() {
    return typeof window !== "undefined";
}

function buildQueueId(session: FocusSessionPayload) {
    return [
        session.startedAt,
        session.completedAt,
        session.associatedGoalId || "",
        session.actualDurationMinutes,
        session.plannedDurationMinutes,
    ].join("|");
}

function readQueue(): QueuedFocusSession[] {
    if (!canUseStorage()) return [];

    try {
        const raw = window.localStorage.getItem(FOCUS_SESSION_QUEUE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeQueue(queue: QueuedFocusSession[]) {
    if (!canUseStorage()) return;

    try {
        if (queue.length === 0) {
            window.localStorage.removeItem(FOCUS_SESSION_QUEUE_KEY);
            return;
        }

        window.localStorage.setItem(FOCUS_SESSION_QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // Ignore storage failures.
    }
}

function queueSessionForRetry(session: FocusSessionPayload) {
    const queueId = buildQueueId(session);
    const nextQueue = readQueue()
        .filter((item) => item.queueId !== queueId)
        .concat({
            queueId,
            attempts: 0,
            lastAttemptAt: null,
            session,
        })
        .slice(-MAX_QUEUE_LENGTH);

    writeQueue(nextQueue);
}

async function postSession(session: FocusSessionPayload): Promise<{ success: true; id: string }> {
    const response = await apiFetch(FOCUS_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            plannedDurationMinutes: session.plannedDurationMinutes,
            actualDurationMinutes: session.actualDurationMinutes,
            breakMinutes: session.breakMinutes,
            completed: session.completed,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            associatedGoalId: session.associatedGoalId || null,
            interrupted: session.interrupted || false,
            preStudyMood: session.preStudyMood || null,
            postStudyMood: session.postStudyMood || null,
            moodScore: session.moodScore ?? null,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to log session");
    }

    const data = await response.json();
    return { success: true, id: data.id };
}

export const focusService = {
    async logSession(session: FocusSessionPayload): Promise<LogSessionResult> {
        try {
            const result = await postSession(session);
            return { ...result, queued: false };
        } catch (error) {
            console.error("Log focus session error:", error);
            queueSessionForRetry(session);
            return { success: false, queued: true };
        }
    },

    async flushQueuedSessions(): Promise<{ flushed: number; remaining: number }> {
        const queue = readQueue();
        if (!queue.length) {
            return { flushed: 0, remaining: 0 };
        }

        const [nextItem, ...rest] = queue;
        if (!nextItem || nextItem.attempts >= MAX_RETRY_ATTEMPTS) {
            const trimmed = rest.filter((item) => item.attempts < MAX_RETRY_ATTEMPTS);
            writeQueue(trimmed);
            return { flushed: 0, remaining: trimmed.length };
        }

        try {
            await postSession(nextItem.session);
            writeQueue(rest);
            return { flushed: 1, remaining: rest.length };
        } catch (error) {
            console.error("Retry queued focus session error:", error);
            const failedItem: QueuedFocusSession = {
                ...nextItem,
                attempts: nextItem.attempts + 1,
                lastAttemptAt: Date.now(),
            };
            const nextQueue = [
                ...(failedItem.attempts >= MAX_RETRY_ATTEMPTS ? [] : [failedItem]),
                ...rest,
            ];
            writeQueue(nextQueue);
            return { flushed: 0, remaining: nextQueue.length };
        }
    },

    getQueuedSessionCount(): number {
        return readQueue().length;
    },

    // Get stats from the backend
    async getStats(): Promise<FocusStats> {
        try {
            const response = await apiFetch(`${FOCUS_API_BASE}/stats`, {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch stats");
            }

            const data = await response.json();

            return {
                totalFocusMinutes: data.totalFocusMinutes || 0,
                totalBreakMinutes: data.totalBreakMinutes || 0,
                totalSessions: data.totalSessions || 0,
                completedSessions: data.completedSessions || 0,
                endedEarlySessions: data.endedEarlySessions || 0,
                weeklyData: data.weeklyData || [0, 0, 0, 0, 0, 0, 0],
                weeklyBreaks: data.weeklyBreaks || [0, 0, 0, 0, 0, 0, 0],
                focusStreak: data.focusStreak || 0,
                goalsSet: data.goalsSet || 0,
                goalsCompleted: data.goalsCompleted || 0,
                hourlyDistribution: data.hourlyDistribution || Array.from({ length: 24 }, () => 0),
                recentSessions: data.recentSessions || [],
            };
        } catch (error) {
            console.error("Get focus stats error:", error);
            return {
                totalFocusMinutes: 0,
                totalBreakMinutes: 0,
                totalSessions: 0,
                completedSessions: 0,
                endedEarlySessions: 0,
                weeklyData: [0, 0, 0, 0, 0, 0, 0],
                weeklyBreaks: [0, 0, 0, 0, 0, 0, 0],
                focusStreak: 0,
                goalsSet: 0,
                goalsCompleted: 0,
                hourlyDistribution: Array.from({ length: 24 }, () => 0),
                recentSessions: [],
            };
        }
    },

    async getGoalFocusTime(goalId: string): Promise<{ totalMinutes: number; sessionCount: number }> {
        try {
            const response = await apiFetch(`${FOCUS_API_BASE}/by-goal/${encodeURIComponent(goalId)}`, {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch goal focus time");
            }

            return await response.json();
        } catch (error) {
            console.error("Get goal focus time error:", error);
            return { totalMinutes: 0, sessionCount: 0 };
        }
    },

    async getGoalsFocusTimes(
        goalIds: string[],
        options?: { dayKey?: string },
    ): Promise<Record<string, { totalMinutes: number; sessionCount: number }>> {
        if (!goalIds.length) return {};

        try {
            const response = await apiFetch(`${FOCUS_API_BASE}/by-goals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ goalIds, ...(options?.dayKey ? { dayKey: options.dayKey } : {}) }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch goals focus times");
            }

            return await response.json();
        } catch (error) {
            console.error("Get goals focus times error:", error);
            return {};
        }
    },

};
