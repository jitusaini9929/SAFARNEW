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
                    _id: { $dayOfWeek: '$completed_at' },
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

        // Calculate focus streak (consecutive days with completed sessions)
        const distinctDays = await collections.focusSessions().aggregate([
            { $match: { user_id: userId, completed: true } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$completed_at' }
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

        res.json({
            totalFocusMinutes: totals.total_focus_minutes || 0,
            totalBreakMinutes: totals.total_break_minutes || 0,
            totalSessions: totals.total_sessions || 0,
            completedSessions: totals.completed_sessions || 0,
            weeklyData,
            focusStreak,
            goalsSet: goals.total_goals || 0,
            goalsCompleted: goals.completed_goals || 0,
            dailyGoalMinutes: 240,
            dailyGoalProgress: Math.min(100, Math.round(((totals.total_focus_minutes || 0) / 240) * 100))
        });
    } catch (error) {
        console.error('Get focus stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const focusSessionRoutes = router;
