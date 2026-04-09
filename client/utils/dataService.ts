import { apiFetch } from "@/utils/apiFetch";
import {
    MoodEntry,
    JournalEntry,
    Goal,
    GoalSubtask,
    MonthlyReport,
    EkagraModeSession,
    EkagraSessionSource,
    EkagraSessionStatus,
    EkagraTimerMode,
    EkagraAnalyticsStats,
    EkagraSessionType,
    GoalKind,
    GoalUnitType,
    GoalExecutionStatus,
    GoalCarryForwardMode,
} from "@shared/api";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export type GoalFocusSummaryMap = Record<string, { totalMinutes: number; sessionCount: number }>;
type EkagraSessionListResponse = { sessions?: EkagraModeSession[] };

const readCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightReads = new Map<string, Promise<unknown>>();

const EKAGRA_SESSIONS_CACHE_KEY = "ekagra:sessions";
const EKAGRA_ACTIVE_CACHE_KEY = "ekagra:active";
const EKAGRA_ANALYTICS_CACHE_KEY = "ekagra:analytics";

const withReadCache = async <T>(
    key: string,
    ttlMs: number,
    forceFresh: boolean,
    loader: () => Promise<T>,
): Promise<T> => {
    const now = Date.now();
    if (!forceFresh) {
        const cached = readCache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.value as T;
        }
    }

    const pending = inFlightReads.get(key);
    if (pending) {
        return pending as Promise<T>;
    }

    const request = loader()
        .then((value) => {
            readCache.set(key, { expiresAt: Date.now() + ttlMs, value });
            return value;
        })
        .finally(() => {
            inFlightReads.delete(key);
        });

    inFlightReads.set(key, request);
    return request;
};

const invalidateReadCache = (...keys: string[]) => {
    keys.forEach((key) => {
        readCache.delete(key);
        inFlightReads.delete(key);
    });
};

const invalidateEkagraReadCache = () => {
    invalidateReadCache(EKAGRA_SESSIONS_CACHE_KEY, EKAGRA_ACTIVE_CACHE_KEY, EKAGRA_ANALYTICS_CACHE_KEY);
};

const emptyEkagraAnalytics = (): EkagraAnalyticsStats => ({
    totalFocusMinutes: 0,
    totalBreakMinutes: 0,
    timerUsageCount: 0,
    breakSessionsCount: 0,
    shortBreakSessionsCount: 0,
    longBreakSessionsCount: 0,
    longDurationSessionCount: 0,
    averageTimerMinutes: 0,
    mostUsedTimerDurationMinutes: null,
    totalSessions: 0,
    completedSessions: 0,
    endedEarlySessions: 0,
    abandonedSessions: 0,
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    weeklyBreaks: [0, 0, 0, 0, 0, 0, 0],
    focusStreak: 0,
    hourlyDistribution: Array.from({ length: 24 }, () => 0),
    recentSessions: [],
    focusSessions: [],
    topTasks: [],
    timerDurationUsage: [],
});

async function getApiErrorMessage(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json();
        if (data?.message && typeof data.message === "string") return data.message;
    } catch {
        // Ignore JSON parse errors and use fallback
    }
    return fallback;
}

export const dataService = {
    // --- Moods ---
    async getMoods(): Promise<MoodEntry[]> {
        const res = await apiFetch(`${API_URL}/moods`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch moods");
        return res.json();
    },

    async addMood(mood: string, intensity: number, notes: string): Promise<MoodEntry> {
        const res = await apiFetch(`${API_URL}/moods`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mood, intensity, notes }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to add mood");
        return res.json();
    },

    // --- Journal ---
    async getJournalEntries(): Promise<JournalEntry[]> {
        const res = await apiFetch(`${API_URL}/journal`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch journal entries");
        return res.json();
    },

    async addJournalEntry(content: string, moodId?: string, tags?: string[]): Promise<JournalEntry> {
        const res = await apiFetch(`${API_URL}/journal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, moodId, tags }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to add journal entry");
        return res.json();
    },

    async deleteJournalEntry(id: string): Promise<void> {
        const res = await apiFetch(`${API_URL}/journal/${id}`, {
            method: "DELETE",
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to delete journal entry");
    },

    // --- Goals ---
    async getGoals(): Promise<Goal[]> {
        const res = await apiFetch(`${API_URL}/goals`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch goals");
        return res.json();
    },

    async getGoalFocusSummary(goalIds: string[], dayKey?: string): Promise<{ allTime: GoalFocusSummaryMap; forDay: GoalFocusSummaryMap }> {
        if (!goalIds.length) {
            return { allTime: {}, forDay: {} };
        }

        const res = await apiFetch(`${API_URL}/goals/focus-summary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goalIds, ...(dayKey ? { dayKey } : {}) }),
            credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch goal focus summary"));
        const data = await res.json();
        return {
            allTime: data?.allTime && typeof data.allTime === "object" ? data.allTime : {},
            forDay: data?.forDay && typeof data.forDay === "object" ? data.forDay : {},
        };
    },

    async getEkagraSessions(options?: { forceFresh?: boolean }): Promise<EkagraModeSession[]> {
        return withReadCache(EKAGRA_SESSIONS_CACHE_KEY, 8000, Boolean(options?.forceFresh), async () => {
            const res = await apiFetch(`${API_URL}/ekagra-sessions`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch Ekagra sessions"));
            const data = (await res.json()) as EkagraSessionListResponse;
            return Array.isArray(data?.sessions) ? data.sessions : [];
        });
    },

    async getActiveEkagraSession(options?: { forceFresh?: boolean }): Promise<EkagraModeSession | null> {
        return withReadCache(EKAGRA_ACTIVE_CACHE_KEY, 8000, Boolean(options?.forceFresh), async () => {
            const res = await apiFetch(`${API_URL}/ekagra-sessions/active`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch active Ekagra session"));
            const data = await res.json();
            return data?.session ? (data.session as EkagraModeSession) : null;
        });
    },

    async getEkagraAnalytics(options?: { forceFresh?: boolean }): Promise<EkagraAnalyticsStats> {
        return withReadCache(EKAGRA_ANALYTICS_CACHE_KEY, 15000, Boolean(options?.forceFresh), async () => {
            const res = await apiFetch(`${API_URL}/ekagra-sessions/analytics`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch Ekagra analytics"));
            const data = await res.json();

            const fallback = emptyEkagraAnalytics();
            return {
                totalFocusMinutes: Number(data?.totalFocusMinutes || 0),
                totalBreakMinutes: Number(data?.totalBreakMinutes || 0),
                timerUsageCount: Number(data?.timerUsageCount || 0),
                breakSessionsCount: Number(data?.breakSessionsCount || 0),
                shortBreakSessionsCount: Number(data?.shortBreakSessionsCount || 0),
                longBreakSessionsCount: Number(data?.longBreakSessionsCount || 0),
                longDurationSessionCount: Number(data?.longDurationSessionCount || 0),
                averageTimerMinutes: Number(data?.averageTimerMinutes || 0),
                mostUsedTimerDurationMinutes:
                    data?.mostUsedTimerDurationMinutes === null || data?.mostUsedTimerDurationMinutes === undefined
                        ? null
                        : Number(data?.mostUsedTimerDurationMinutes || 0),
                totalSessions: Number(data?.totalSessions || 0),
                completedSessions: Number(data?.completedSessions || 0),
                endedEarlySessions: Number(data?.endedEarlySessions || 0),
                abandonedSessions: Number(data?.abandonedSessions ?? data?.endedEarlySessions ?? 0),
                weeklyData: Array.isArray(data?.weeklyData) && data.weeklyData.length === 7 ? data.weeklyData : fallback.weeklyData,
                weeklyBreaks: Array.isArray(data?.weeklyBreaks) && data.weeklyBreaks.length === 7 ? data.weeklyBreaks : fallback.weeklyBreaks,
                focusStreak: Number(data?.focusStreak || 0),
                hourlyDistribution: Array.isArray(data?.hourlyDistribution) && data.hourlyDistribution.length === 24
                    ? data.hourlyDistribution
                    : fallback.hourlyDistribution,
                recentSessions: Array.isArray(data?.recentSessions) ? data.recentSessions : fallback.recentSessions,
                focusSessions: Array.isArray(data?.focusSessions) ? data.focusSessions : fallback.focusSessions,
                topTasks: Array.isArray(data?.topTasks) ? data.topTasks : fallback.topTasks,
                timerDurationUsage: Array.isArray(data?.timerDurationUsage) ? data.timerDurationUsage : fallback.timerDurationUsage,
            };
        });
    },

    async activateEkagraSession(payload: {
        goalId?: string;
        goalTitle?: string;
        sessionType?: EkagraSessionType;
        sessionTitle?: string;
        source?: EkagraSessionSource;
        importedFromGoal?: boolean;
        overrideActive?: boolean;
        mode?: EkagraTimerMode;
        totalSeconds?: number;
        remainingSeconds?: number;
        isRunning?: boolean;
        sessionStartedAt?: string | null;
    }): Promise<EkagraModeSession> {
        const res = await apiFetch(`${API_URL}/ekagra-sessions/activate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to activate Ekagra session"));
        const data = await res.json();
        if (!data?.session) throw new Error("Missing Ekagra session in activate response");
        invalidateEkagraReadCache();
        return data.session as EkagraModeSession;
    },

    async updateEkagraSession(
        sessionId: string,
        payload: {
            status?: EkagraSessionStatus;
            mode?: EkagraTimerMode;
            totalSeconds?: number;
            remainingSeconds?: number;
            isRunning?: boolean;
            sessionStartedAt?: string | null;
            goalTitle?: string;
            source?: EkagraSessionSource;
            importedFromGoal?: boolean;
        },
    ): Promise<EkagraModeSession> {
        const res = await apiFetch(`${API_URL}/ekagra-sessions/${encodeURIComponent(sessionId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to update Ekagra session"));
        const data = await res.json();
        if (!data?.session) throw new Error("Missing Ekagra session in update response");
        invalidateEkagraReadCache();
        return data.session as EkagraModeSession;
    },

    async completeEkagraSession(
        sessionId: string,
        payload?: {
            mode?: EkagraTimerMode;
            totalSeconds?: number;
            elapsedSeconds?: number;
            remainingSeconds?: number;
            sessionStartedAt?: string | null;
        },
    ): Promise<EkagraModeSession> {
        const res = await apiFetch(`${API_URL}/ekagra-sessions/${encodeURIComponent(sessionId)}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload || {}),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to complete Ekagra session"));
        const data = await res.json();
        if (!data?.session) throw new Error("Missing Ekagra session in complete response");
        invalidateEkagraReadCache();
        return data.session as EkagraModeSession;
    },

    async discardEkagraSession(sessionId: string): Promise<EkagraModeSession> {
        const res = await apiFetch(`${API_URL}/ekagra-sessions/${encodeURIComponent(sessionId)}/discard`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to discard Ekagra session"));
        const data = await res.json();
        if (!data?.session) throw new Error("Missing Ekagra session in discard response");
        invalidateEkagraReadCache();
        return data.session as EkagraModeSession;
    },

    async deleteEkagraSession(sessionId: string): Promise<void> {
        const res = await apiFetch(`${API_URL}/ekagra-sessions/${encodeURIComponent(sessionId)}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to delete Ekagra session"));
        invalidateEkagraReadCache();
    },

    async addGoal(payload: {
        title: string;
        scheduledDate?: string;
        description?: string;
        subtasks?: GoalSubtask[];
        startedAt?: string | null;
        source?: "manual" | "ekagra";
        goalKind?: GoalKind;
        unitType?: GoalUnitType;
        executionMode?: Goal["executionMode"];
        linkedFocusEnabled?: boolean;
        plannedFocusMinutes?: number | null;
        targetValue?: number | null;
        achievedValue?: number;
        status?: GoalExecutionStatus;
        carryForwardMode?: GoalCarryForwardMode;
    }): Promise<Goal> {
        const res = await apiFetch(`${API_URL}/goals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: payload.title,
                title: payload.title,
                description: payload.description,
                subtasks: payload.subtasks || [],
                type: "daily",
                scheduledDate: payload.scheduledDate,
                startedAt: payload.startedAt ?? null,
                source: payload.source ?? "manual",
                goalKind: payload.goalKind,
                unitType: payload.unitType,
                executionMode: payload.executionMode,
                linkedFocusEnabled: payload.linkedFocusEnabled,
                plannedFocusMinutes: payload.plannedFocusMinutes,
                targetValue: payload.targetValue,
                achievedValue: payload.achievedValue,
                status: payload.status,
                carryForwardMode: payload.carryForwardMode,
            }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to add goal"));
        return res.json();
    },

    async updateGoalStartTime(id: string, startedAt: string | null): Promise<void> {
        const res = await apiFetch(`${API_URL}/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ startedAt }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to update goal start time"));
    },

    async getGoalRolloverPrompts(): Promise<Goal[]> {
        const res = await apiFetch(`${API_URL}/goals/rollover-prompts`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch goal rollover prompts"));
        return res.json();
    },

    async respondToGoalRollover(goalId: string, action: "retry" | "archive"): Promise<{ message: string; goal?: Goal }> {
        const res = await apiFetch(`${API_URL}/goals/${goalId}/rollover-action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
            credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to process goal rollover action"));
        return res.json();
    },

    async updateGoal(id: string, completed: boolean, completedAt?: string, studiedMinutes?: number): Promise<void> {
        const res = await apiFetch(`${API_URL}/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed, ...(completedAt ? { completedAt } : {}), ...(studiedMinutes !== undefined ? { studiedMinutes } : {}) }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to update goal"));
    },

    async updateGoalDetails(
        id: string,
        payload: {
            title?: string;
            description?: string;
            subtasks?: GoalSubtask[];
            goalKind?: GoalKind;
            unitType?: GoalUnitType;
            executionMode?: Goal["executionMode"];
            linkedFocusEnabled?: boolean;
            plannedFocusMinutes?: number | null;
            targetValue?: number | null;
            achievedValue?: number;
            status?: GoalExecutionStatus;
            carryForwardMode?: GoalCarryForwardMode;
        }
    ): Promise<void> {
        const res = await apiFetch(`${API_URL}/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to update goal details"));
    },

    async rescheduleGoal(id: string, date: Date): Promise<void> {
        const res = await apiFetch(`${API_URL}/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scheduledDate: date.toISOString()
            }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to reschedule goal"));
    },

    async repeatGoal(id: string, date: Date): Promise<void> {
        const res = await apiFetch(`${API_URL}/goals/${id}/repeat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scheduledDate: date.toISOString()
            }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to repeat goal"));
    },

    async deleteGoal(id: string): Promise<void> {
        const res = await apiFetch(`${API_URL}/goals/${id}`, {
            method: "DELETE",
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to delete goal"));
    },

    async getPreviousGoals(period: "daily" | "weekly" | "monthly" | "custom" = "daily", customDays?: number): Promise<Goal[]> {
        let url = `${API_URL}/goals/previous-goals?period=${period}`;
        if (period === 'custom' && customDays) {
            url += `&days=${customDays}`;
        }
        const res = await apiFetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch previous goals"));
        return res.json();
    },

    async repeatPlan(goalIds: string[]): Promise<{ message: string; goals: Goal[] }> {
        const res = await apiFetch(`${API_URL}/goals/repeat-plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goalIds }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to repeat plan"));
        return res.json();
    },

    // --- Streaks ---
    async getStreaks(): Promise<{ loginStreak: number; checkInStreak: number; goalCompletionStreak: number; lastActiveDate: string | null }> {
        const res = await apiFetch(`${API_URL}/streaks`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch streaks");
        return res.json();
    },

    // --- Achievements ---
    async getAchievements(): Promise<{
        achievements: Array<{
            achievement_id: string;
            acquired_at: string;
            is_active: boolean;
            name: string;
            type: 'badge' | 'title';
            category: string;
            tier: number | null;
            display_priority: number;
        }>;
        counts: { badges: number; titles: number };
    }> {
        const res = await apiFetch(`${API_URL}/achievements`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch achievements");
        return res.json();
    },

    async getActiveTitle(): Promise<{ title: string | null; type?: string; selectedId?: string }> {
        const res = await apiFetch(`${API_URL}/achievements/active-title`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch active title");
        return res.json();
    },

    async getAllAchievements(): Promise<{
        achievements: Array<{
            id: string;
            name: string;
            description: string | null;
            type: 'badge' | 'title';
            category: string;
            rarity: string | null;
            tier: number | null;
            requirement: string;
            holderCount: number;
            earned: boolean;
            progress: number;
            currentValue: number;
            targetValue: number;
        }>;
    }> {
        const res = await apiFetch(`${API_URL}/achievements/all`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch all achievements");
        return res.json();
    },

    async getMonthlyReport(month?: string): Promise<MonthlyReport> {
        const suffix = month ? `?month=${encodeURIComponent(month)}` : "";
        const res = await apiFetch(`${API_URL}/analytics/monthly-report${suffix}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to fetch monthly report"));
        return res.json();
    },

    async generateMonthlyReport(month?: string): Promise<MonthlyReport> {
        const res = await apiFetch(`${API_URL}/analytics/monthly-report/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(month ? { month } : {}),
            credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to generate monthly report"));
        return res.json();
    },

    async selectAchievement(achievementId: string | null): Promise<{ message: string; selectedId: string | null; title?: string; type?: string }> {
        const res = await apiFetch(`${API_URL}/achievements/select`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ achievementId }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to select achievement");
        return res.json();
    },
};
