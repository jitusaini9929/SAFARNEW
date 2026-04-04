import { EkagraAnalyticsStats } from "@shared/api";
import { dataService } from "@/utils/dataService";

const emptyEkagraAnalyticsStats = (): EkagraAnalyticsStats => ({
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

export const ekagraAnalyticsService = {
    async getEkagraAnalytics(): Promise<EkagraAnalyticsStats> {
        try {
            return await dataService.getEkagraAnalytics();
        } catch (error) {
            console.error("Get Ekagra analytics error:", error);
            return emptyEkagraAnalyticsStats();
        }
    },
};
