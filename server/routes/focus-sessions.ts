import { Router, Request } from 'express';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();

// Log a completed focus session
router.post('/', requireAuth, async (req: Request, res) => {
    try {
        const {
            durationMinutes,
            breakMinutes,
            completed,
            associatedGoalId,
            interrupted,
            preStudyMood,
            postStudyMood,
            moodScore,
        } = req.body;
        const id = uuid();
        const now = new Date();
        const dateKey = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const completedBool = completed ? true : false;
        const interruptedBool = interrupted ? true : false;

        await collections.focusSessions().insertOne({
            id,
            user_id: req.session.userId,
            duration_minutes: durationMinutes,
            break_minutes: breakMinutes || 0,
            completed: completedBool,
            associated_goal_id: associatedGoalId || null,
            interrupted: interruptedBool,
            started_at: now,
            completed_at: now,
        });

        await collections.focusSessionLogs().insertOne({
            id: uuid(),
            user_id: req.session.userId,
            duration_minutes: durationMinutes,
            associated_goal_id: associatedGoalId || null,
            interrupted: interruptedBool,
            completed: completedBool,
            timestamp: now,
            date_key: dateKey,
            created_at: new Date(),
        });

        if (preStudyMood || postStudyMood || moodScore !== undefined) {
            await collections.moodSnapshots().insertOne({
                id: uuid(),
                user_id: req.session.userId,
                mood_score: Number.isFinite(Number(moodScore)) ? Number(moodScore) : null,
                pre_study_mood: preStudyMood || null,
                post_study_mood: postStudyMood || null,
                timestamp: now,
                date_key: dateKey,
                source: 'focus_session',
                created_at: new Date(),
            });
        }

        res.json({ success: true, id });
    } catch (error) {
        console.error('Log focus session error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get aggregated stats for current user
router.get('/stats', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;

        // Total focus time (completed sessions only)
        const totalPipeline = [
            { $match: { user_id: userId } },
            {
                $group: {
                    _id: null,
                    total_focus_minutes: { $sum: '$duration_minutes' },
                    total_break_minutes: { $sum: '$break_minutes' },
                    total_sessions: { $sum: 1 },
                    completed_sessions: {
                        $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
                    }
                }
            }
        ];
        const totalResult = await collections.focusSessions().aggregate(totalPipeline).toArray();
        const totals = totalResult[0] || { total_focus_minutes: 0, total_break_minutes: 0, total_sessions: 0, completed_sessions: 0 };

        // Weekly data (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weeklyPipeline = [
            {
                $match: {
                    user_id: userId,
                    completed: true,
                    completed_at: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: { date: '$completed_at', timezone: '+05:30' } },
                    minutes: { $sum: '$duration_minutes' }
                }
            }
        ];
        const weeklyResult = await collections.focusSessions().aggregate(weeklyPipeline).toArray();

        // Convert to array indexed by day (0=Mon, ..., 6=Sun)
        const weeklyData = [0, 0, 0, 0, 0, 0, 0];
        for (const row of weeklyResult) {
            // MongoDB $dayOfWeek: 1=Sun, 2=Mon, ..., 7=Sat
            const mongoDay = row._id as number;
            const ourDay = mongoDay === 1 ? 6 : mongoDay - 2;
            weeklyData[ourDay] = row.minutes;
        }

        const weeklyBreakPipeline = [
            {
                $match: {
                    user_id: userId,
                    completed: true,
                    completed_at: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: { date: '$completed_at', timezone: '+05:30' } },
                    minutes: { $sum: '$break_minutes' }
                }
            }
        ];
        const weeklyBreakResult = await collections.focusSessions().aggregate(weeklyBreakPipeline).toArray();
        const weeklyBreaks = [0, 0, 0, 0, 0, 0, 0];
        for (const row of weeklyBreakResult) {
            const mongoDay = row._id as number;
            const ourDay = mongoDay === 1 ? 6 : mongoDay - 2;
            weeklyBreaks[ourDay] = row.minutes;
        }

        // Calculate focus streak (consecutive days with completed sessions)
        const distinctDays = await collections.focusSessions().aggregate([
            { $match: { user_id: userId, completed: true } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$completed_at', timezone: '+05:30' }
                    }
                }
            },
            { $sort: { _id: -1 } }
        ]).toArray();

        let focusStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const row of distinctDays) {
            const sessionDate = new Date(row._id);
            sessionDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - focusStreak);

            if (sessionDate.getTime() === expectedDate.getTime()) {
                focusStreak++;
            } else if (focusStreak === 0 && sessionDate.getTime() === expectedDate.getTime() - 86400000) {
                focusStreak++;
            } else {
                break;
            }
        }

        // Goals stats
        const goalsPipeline = [
            { $match: { user_id: userId } },
            {
                $group: {
                    _id: null,
                    total_goals: { $sum: 1 },
                    completed_goals: {
                        $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
                    }
                }
            }
        ];
        const goalsResult = await collections.goals().aggregate(goalsPipeline).toArray();
        const goals = goalsResult[0] || { total_goals: 0, completed_goals: 0 };

        const hourlyPipeline = [
            { $match: { user_id: userId, completed: true } },
            {
                $group: {
                    _id: { $hour: { date: '$completed_at', timezone: '+05:30' } },
                    minutes: { $sum: '$duration_minutes' }
                }
            }
        ];
        const hourlyResult = await collections.focusSessions().aggregate(hourlyPipeline).toArray();
        const hourlyDistribution = Array.from({ length: 24 }, () => 0);
        for (const row of hourlyResult) {
            const hour = row._id as number;
            if (hour >= 0 && hour <= 23) hourlyDistribution[hour] = row.minutes;
        }

        const recentSessionsRaw = await collections.focusSessions()
            .find({ user_id: userId })
            .sort({ completed_at: -1 })
            .limit(6)
            .toArray();
        const recentSessions = recentSessionsRaw.map((session) => ({
            id: session.id,
            startedAt: session.started_at,
            durationMinutes: session.duration_minutes || 0,
            actualMinutes: session.duration_minutes || 0,
            completed: Boolean(session.completed),
            taskText: null,
        }));

        res.json({
            totalFocusMinutes: (() => {
                // DEBUG: Analytics
                console.log(`[FocusStats] User: ${userId}`, {
                    totals, weeklyData, weeklyBreaks, focusStreak, goals
                });
                return totals.total_focus_minutes || 0;
            })(),
            totalBreakMinutes: totals.total_break_minutes || 0,
            totalSessions: totals.total_sessions || 0,
            completedSessions: totals.completed_sessions || 0,
            weeklyData,
            weeklyBreaks,
            focusStreak,
            goalsSet: goals.total_goals || 0,
            goalsCompleted: goals.completed_goals || 0,
            dailyGoalMinutes: 240,
            dailyGoalProgress: Math.min(100, Math.round(((totals.total_focus_minutes || 0) / 240) * 100)),
            hourlyDistribution,
            recentSessions,
        });
    } catch (error) {
        console.error('Get focus stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get total focus time for a specific goal
router.get('/by-goal/:goalId', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { goalId } = req.params;

        if (!goalId || typeof goalId !== 'string') {
            return res.status(400).json({ message: 'Goal ID is required' });
        }

        const pipeline = [
            { $match: { user_id: userId, associated_goal_id: goalId } },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: '$duration_minutes' },
                    sessionCount: { $sum: 1 },
                },
            },
        ];

        const result = await collections.focusSessions().aggregate(pipeline).toArray();
        const data = result[0] || { totalMinutes: 0, sessionCount: 0 };

        res.json({
            totalMinutes: data.totalMinutes || 0,
            sessionCount: data.sessionCount || 0,
        });
    } catch (error) {
        console.error('Get focus time by goal error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get total focus time for multiple goals at once
router.post('/by-goals', requireAuth, async (req: Request, res) => {
    try {
        const userId = req.session.userId!;
        const { goalIds } = req.body;

        if (!Array.isArray(goalIds) || goalIds.length === 0) {
            return res.json({});
        }

        // Cap at 100 to prevent abuse
        const ids = goalIds.slice(0, 100).filter((id: unknown) => typeof id === 'string' && id.length > 0);

        if (ids.length === 0) {
            return res.json({});
        }

        const pipeline = [
            { $match: { user_id: userId, associated_goal_id: { $in: ids } } },
            {
                $group: {
                    _id: '$associated_goal_id',
                    totalMinutes: { $sum: '$duration_minutes' },
                    sessionCount: { $sum: 1 },
                },
            },
        ];

        const results = await collections.focusSessions().aggregate(pipeline).toArray();
        const map: Record<string, { totalMinutes: number; sessionCount: number }> = {};
        for (const row of results) {
            map[row._id] = {
                totalMinutes: row.totalMinutes || 0,
                sessionCount: row.sessionCount || 0,
            };
        }

        res.json(map);
    } catch (error) {
        console.error('Get focus time by goals error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const focusSessionRoutes = router;
