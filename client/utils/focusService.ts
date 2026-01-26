export interface FocusSession {
    id: string;
    userId: string;
    durationMinutes: number;
    breakMinutes: number;
    completed: boolean;
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

const STORAGE_KEY = 'nistha_focus_sessions';

export const focusService = {
    // Mimics the POST / logic
    logSession: async (session: Omit<FocusSession, 'id' | 'userId' | 'completedAt'>): Promise<{ success: boolean; id: string }> => {
        try {
            const sessions: FocusSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            const newSession: FocusSession = {
                id: Date.now().toString(),
                userId: 'current-user', // Mock user ID
                ...session,
                completedAt: new Date().toISOString()
            };

            sessions.push(newSession);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));

            return { success: true, id: newSession.id };
        } catch (error) {
            console.error('Log focus session error:', error);
            throw error;
        }
    },

    // Mimics the GET /stats logic
    getStats: async (): Promise<FocusStats> => {
        try {
            const sessions: FocusSession[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            // 1. Totals
            const totalFocusMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
            const totalBreakMinutes = sessions.reduce((acc, s) => acc + (s.breakMinutes || 0), 0);
            const totalSessions = sessions.length;
            const completedSessions = sessions.filter(s => s.completed).length;

            // 2. Weekly Data (Last 7 Days)
            // Backend used: completed_at >= datetime('now', '-7 days')
            // And grouped by day of week.
            const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            sessions.forEach(session => {
                if (!session.completedAt) return;
                const date = new Date(session.completedAt);

                if (date >= sevenDaysAgo && session.completed) {
                    // Convert JS getDay() (0=Sun, 1=Mon) to (0=Mon, ... 6=Sun)
                    let dayIndex = date.getDay() - 1;
                    if (dayIndex === -1) dayIndex = 6; // Sunday

                    weeklyData[dayIndex] += (session.durationMinutes || 0);
                }
            });

            // 3. Focus Streak
            // Logic: Consecutive days with completed sessions
            const completedDates = sessions
                .filter(s => s.completed)
                .map(s => {
                    const d = new Date(s.completedAt);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime();
                })
                .sort((a, b) => b - a); // Descending

            // Deduplicate dates
            const uniqueDates = [...new Set(completedDates)];

            let focusStreak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTime = today.getTime();
            const yesterdayTime = todayTime - 86400000;

            // Check if we have a session today or yesterday to start the streak
            // The logic provided says: "if sessionDate matches expectedDate... else if focusStreak==0 and sessionDate matches yesterday..."

            // Let's implement simpler loop:
            let currentDateCheck = todayTime;

            // If no session today, check if there was one yesterday to keep streak alive?
            // User code: 
            // expectedDate = today - streak.
            // if match -> streak++
            // else if streak==0 and match yesterday -> streak++ (this handles "didn't do it today yet but did yesterday")

            for (const sessionTime of uniqueDates) {
                const expectedDate = new Date(today);
                expectedDate.setDate(expectedDate.getDate() - focusStreak);
                const expectedTime = new Date(expectedDate.setHours(0, 0, 0, 0)).getTime();

                if (sessionTime === expectedTime) {
                    focusStreak++;
                } else if (focusStreak === 0 && sessionTime === expectedTime - 86400000) {
                    // Streak starts from yesterday
                    focusStreak++;
                } else {
                    // Gap found
                    break;
                }
            }

            // 4. Goals (Mock for now or fetch if we had goal service)
            // Reusing typical dummy data or 0 if not connected to goal system
            const goalsSet = 5;
            const goalsCompleted = 3;

            return {
                totalFocusMinutes,
                totalBreakMinutes,
                totalSessions,
                completedSessions,
                weeklyData,
                focusStreak,
                goalsSet,
                goalsCompleted,
                dailyGoalMinutes: 240,
                dailyGoalProgress: Math.min(100, Math.round((totalFocusMinutes / 240) * 100))
            };

        } catch (error) {
            console.error('Get focus stats error:', error);
            throw error;
        }
    }
};
