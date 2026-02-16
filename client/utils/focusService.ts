export interface FocusSession {
    id: string;
    userId: string;
    durationMinutes: number;
    breakMinutes: number;
    completed: boolean;
    associatedGoalId?: string;
    interrupted?: boolean;
    preStudyMood?: string;
    postStudyMood?: string;
    moodScore?: number;
    completedAt: string; // ISO string
}

export interface FocusStats {
    totalFocusMinutes: number;
    totalBreakMinutes: number;
    totalSessions: number;
    completedSessions: number;
    weeklyData: number[]; // Mon-Sun
    focusStreak: number;
    goalsSet: number; // For now mock or fetch from goals
    goalsCompleted: number;
    dailyGoalMinutes: number;
    dailyGoalProgress: number;
}

const API_BASE = '/api/focus-sessions';

export const focusService = {
    // Log a focus session to the backend
    logSession: async (session: Omit<FocusSession, 'id' | 'userId' | 'completedAt'>): Promise<{ success: boolean; id: string }> => {
        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    durationMinutes: session.durationMinutes,
                    breakMinutes: session.breakMinutes,
                    completed: session.completed,
                    associatedGoalId: session.associatedGoalId || null,
                    interrupted: session.interrupted || false,
                    preStudyMood: session.preStudyMood || null,
                    postStudyMood: session.postStudyMood || null,
                    moodScore: session.moodScore ?? null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to log session');
            }

            const data = await response.json();
            return { success: true, id: data.id };
        } catch (error) {
            console.error('Log focus session error:', error);
            throw error;
        }
    },

    // Get stats from the backend
    getStats: async (): Promise<FocusStats> => {
        try {
            const response = await fetch(`${API_BASE}/stats`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();

            // Map backend response to FocusStats interface
            // Backend returns: totalFocusMinutes, totalBreakMinutes, totalSessions, completedSessions, weeklyData, focusStreak, goalsSet, goalsCompleted
            return {
                totalFocusMinutes: data.totalFocusMinutes || 0,
                totalBreakMinutes: data.totalBreakMinutes || 0,
                totalSessions: data.totalSessions || 0,
                completedSessions: data.completedSessions || 0,
                weeklyData: data.weeklyData || [0, 0, 0, 0, 0, 0, 0],
                focusStreak: data.focusStreak || 0,
                goalsSet: data.goalsSet || 0,
                goalsCompleted: data.goalsCompleted || 0,
                dailyGoalMinutes: 240, // 4 hours default daily goal
                dailyGoalProgress: Math.min(100, Math.round(((data.totalFocusMinutes || 0) / 240) * 100))
            };
        } catch (error) {
            console.error('Get focus stats error:', error);
            // Return empty stats on error
            return {
                totalFocusMinutes: 0,
                totalBreakMinutes: 0,
                totalSessions: 0,
                completedSessions: 0,
                weeklyData: [0, 0, 0, 0, 0, 0, 0],
                focusStreak: 0,
                goalsSet: 0,
                goalsCompleted: 0,
                dailyGoalMinutes: 240,
                dailyGoalProgress: 0
            };
        }
    }
};

