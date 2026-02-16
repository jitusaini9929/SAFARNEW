import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const toISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);

const toISTDateKey = (date: Date) => {
    return toISTDate(date).toISOString().split('T')[0];
};

const getMonthWindow = (monthInput?: string) => {
    let year: number;
    let monthIndex: number; // 0-based

    if (monthInput && /^\d{4}-\d{2}$/.test(monthInput)) {
        const [yearStr, monthStr] = monthInput.split('-');
        year = Number(yearStr);
        monthIndex = Number(monthStr) - 1;
    } else {
        const now = toISTDate(new Date());
        year = now.getUTCFullYear();
        monthIndex = now.getUTCMonth() - 1;
        if (monthIndex < 0) {
            monthIndex = 11;
            year -= 1;
        }
    }

    const startIST = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endIST = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const startUTC = new Date(startIST.getTime() - IST_OFFSET_MS);
    const endUTC = new Date(endIST.getTime() - IST_OFFSET_MS);
    const daysInMonth = endIST.getUTCDate();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    return { monthKey, year, monthIndex, startUTC, endUTC, daysInMonth };
};

const moodToScore = (value: unknown) => {
    const mood = String(value || '').trim().toLowerCase();
    const map: Record<string, number> = {
        peaceful: 5,
        happy: 5,
        motivated: 4,
        okay: 3,
        anxious: 2,
        frustrated: 2,
        overwhelmed: 1,
        low: 1,
        numb: 1,
    };
    return map[mood] || null;
};

async function generateMonthlyReport(userId: string, monthInput?: string) {
    const { monthKey, startUTC, endUTC, daysInMonth, year, monthIndex } = getMonthWindow(monthInput);

    const [loginRows, goalLogs, focusLogs, moodSnapshots] = await Promise.all([
        collections.loginHistory()
            .find({ user_id: userId, timestamp: { $gte: startUTC, $lte: endUTC } })
            .project({ _id: 0, timestamp: 1 })
            .toArray(),
        collections.goalActivityLogs()
            .find({ user_id: userId, timestamp: { $gte: startUTC, $lte: endUTC } })
            .project({ _id: 0, event_type: 1, goal_type: 1, timestamp: 1, day_of_week: 1, hour_of_day: 1 })
            .toArray(),
        collections.focusSessionLogs()
            .find({ user_id: userId, timestamp: { $gte: startUTC, $lte: endUTC } })
            .project({ _id: 0, duration_minutes: 1, timestamp: 1, interrupted: 1 })
            .toArray(),
        collections.moodSnapshots()
            .find({ user_id: userId, timestamp: { $gte: startUTC, $lte: endUTC } })
            .project({ _id: 0, mood_score: 1, pre_study_mood: 1, post_study_mood: 1, timestamp: 1 })
            .toArray(),
    ]);

    const loginDaySet = new Set(loginRows.map((row: any) => toISTDateKey(new Date(row.timestamp))));
    const daysLoggedIn = loginDaySet.size;
    const consistencyScore = daysInMonth > 0 ? Math.round((daysLoggedIn / daysInMonth) * 100) : 0;

    const createdLogs = goalLogs.filter((l: any) => l.event_type === 'CREATED');
    const completedLogs = goalLogs.filter((l: any) => l.event_type === 'COMPLETED');
    const weeklyCreated = createdLogs.filter((l: any) => l.goal_type === 'weekly').length;
    const weeklyCompleted = completedLogs.filter((l: any) => l.goal_type === 'weekly').length;
    const goalsCreated = createdLogs.length;
    const goalsCompleted = completedLogs.length;
    const completionRate = goalsCreated > 0 ? Math.round((goalsCompleted / goalsCreated) * 100) : 0;

    const totalFocusMinutes = focusLogs.reduce((sum: number, row: any) => sum + Number(row.duration_minutes || 0), 0);
    const daysActive = Math.max(daysLoggedIn, 1);
    const focusDepth = Math.round(totalFocusMinutes / daysActive);

    const completedHourMap = new Map<number, number>();
    completedLogs.forEach((row: any) => {
        const hour = Number(row.hour_of_day);
        completedHourMap.set(hour, (completedHourMap.get(hour) || 0) + 1);
    });

    let powerHourStart = 20;
    if (completedHourMap.size > 0) {
        powerHourStart = [...completedHourMap.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    const powerHourEnd = (powerHourStart + 2) % 24;
    const powerHourText = `You destroy tasks between ${powerHourStart}:00 and ${powerHourEnd}:00. Protect this time!`;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDay: Record<string, { created: number; completed: number }> = {};
    dayNames.forEach((d) => {
        byDay[d] = { created: 0, completed: 0 };
    });
    createdLogs.forEach((row: any) => {
        const day = row.day_of_week || dayNames[toISTDate(new Date(row.timestamp)).getUTCDay()];
        if (byDay[day]) byDay[day].created += 1;
    });
    completedLogs.forEach((row: any) => {
        const day = row.day_of_week || dayNames[toISTDate(new Date(row.timestamp)).getUTCDay()];
        if (byDay[day]) byDay[day].completed += 1;
    });
    const dayRates = dayNames
        .map((day) => ({
            day,
            rate: byDay[day].created > 0 ? Math.round((byDay[day].completed / byDay[day].created) * 100) : 0,
            created: byDay[day].created,
        }))
        .filter((row) => row.created > 0);
    const weakestDay = dayRates.length > 0 ? dayRates.sort((a, b) => a.rate - b.rate)[0] : null;
    const sundayScariesText = weakestDay
        ? `You often miss goals on ${weakestDay.day}s. Maybe plan lighter loads for that day.`
        : 'Not enough goal data to determine your tough day yet.';

    const dailyMoodStats = new Map<string, { scoreTotal: number; scoreCount: number; anxious: number }>();
    moodSnapshots.forEach((row: any) => {
        const dateKey = toISTDateKey(new Date(row.timestamp));
        const score =
            Number.isFinite(Number(row.mood_score)) && row.mood_score !== null
                ? Number(row.mood_score)
                : moodToScore(row.post_study_mood) || moodToScore(row.pre_study_mood);
        const anxiousHit =
            String(row.pre_study_mood || '').toLowerCase() === 'anxious' ||
            String(row.post_study_mood || '').toLowerCase() === 'anxious';
        const existing = dailyMoodStats.get(dateKey) || { scoreTotal: 0, scoreCount: 0, anxious: 0 };
        if (score !== null) {
            existing.scoreTotal += score;
            existing.scoreCount += 1;
        }
        if (anxiousHit) existing.anxious += 1;
        dailyMoodStats.set(dateKey, existing);
    });

    const dailyGoalStats = new Map<string, { created: number; completed: number }>();
    createdLogs.forEach((row: any) => {
        const key = toISTDateKey(new Date(row.timestamp));
        const existing = dailyGoalStats.get(key) || { created: 0, completed: 0 };
        existing.created += 1;
        dailyGoalStats.set(key, existing);
    });
    completedLogs.forEach((row: any) => {
        const key = toISTDateKey(new Date(row.timestamp));
        const existing = dailyGoalStats.get(key) || { created: 0, completed: 0 };
        existing.completed += 1;
        dailyGoalStats.set(key, existing);
    });

    let anxiousRateTotal = 0;
    let anxiousRateDays = 0;
    let normalRateTotal = 0;
    let normalRateDays = 0;
    dailyGoalStats.forEach((stats, dateKey) => {
        if (stats.created === 0) return;
        const rate = (stats.completed / stats.created) * 100;
        const mood = dailyMoodStats.get(dateKey);
        if (mood?.anxious) {
            anxiousRateTotal += rate;
            anxiousRateDays += 1;
        } else {
            normalRateTotal += rate;
            normalRateDays += 1;
        }
    });

    const anxiousAvg = anxiousRateDays > 0 ? anxiousRateTotal / anxiousRateDays : null;
    const normalAvg = normalRateDays > 0 ? normalRateTotal / normalRateDays : null;
    let moodConnectionText = 'Log more mood snapshots to unlock this insight.';
    if (anxiousAvg !== null && normalAvg !== null) {
        const drop = Math.max(0, Math.round(normalAvg - anxiousAvg));
        moodConnectionText = `When you feel anxious, your completion rate drops by ${drop}%. Try a 5-min breathing session first.`;
    }

    const completedBefore9 = completedLogs.filter((row: any) => Number(row.hour_of_day) < 9).length;
    const completedAfter22 = completedLogs.filter((row: any) => Number(row.hour_of_day) >= 22).length;

    const moodScores = moodSnapshots
        .map((row: any) => (Number.isFinite(Number(row.mood_score)) ? Number(row.mood_score) : moodToScore(row.post_study_mood) || moodToScore(row.pre_study_mood)))
        .filter((value: number | null): value is number => value !== null);
    const avgMoodScore = moodScores.length > 0 ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length : 3;

    const focusSkill = Math.min(100, Math.round((focusDepth / 60) * 100));
    const moodSkill = Math.min(100, Math.round((avgMoodScore / 5) * 100));

    const heatmapMap = new Map<string, { logins: number; goalsCompleted: number; focusMinutes: number }>();
    loginRows.forEach((row: any) => {
        const key = toISTDateKey(new Date(row.timestamp));
        const existing = heatmapMap.get(key) || { logins: 0, goalsCompleted: 0, focusMinutes: 0 };
        existing.logins += 1;
        heatmapMap.set(key, existing);
    });
    completedLogs.forEach((row: any) => {
        const key = toISTDateKey(new Date(row.timestamp));
        const existing = heatmapMap.get(key) || { logins: 0, goalsCompleted: 0, focusMinutes: 0 };
        existing.goalsCompleted += 1;
        heatmapMap.set(key, existing);
    });
    focusLogs.forEach((row: any) => {
        const key = toISTDateKey(new Date(row.timestamp));
        const existing = heatmapMap.get(key) || { logins: 0, goalsCompleted: 0, focusMinutes: 0 };
        existing.focusMinutes += Number(row.duration_minutes || 0);
        heatmapMap.set(key, existing);
    });

    const heatmap = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const istDate = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
        const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
        const activity = heatmapMap.get(dateKey) || { logins: 0, goalsCompleted: 0, focusMinutes: 0 };
        const activityPoints = activity.logins + activity.goalsCompleted * 2 + Math.round(activity.focusMinutes / 30);
        const intensity = activityPoints >= 8 ? 4 : activityPoints >= 5 ? 3 : activityPoints >= 2 ? 2 : activityPoints >= 1 ? 1 : 0;
        heatmap.push({
            date: dateKey,
            dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][istDate.getUTCDay()],
            value: activityPoints,
            intensity,
        });
    }

    const report = {
        month: monthKey,
        generatedAt: new Date().toISOString(),
        executiveSummary: {
            consistencyScore,
            completionRate,
            focusDepth,
            daysLoggedIn,
            daysInMonth,
            goalsCreated,
            goalsCompleted,
            totalFocusMinutes,
            consistencyMessage: `You showed up ${daysLoggedIn}/${daysInMonth} days.`,
            completionMessage: `You complete ${completionRate}% of what you plan.`,
            focusMessage: `Average ${focusDepth} mins/day active.`,
        },
        insights: {
            powerHour: {
                startHour: powerHourStart,
                endHour: powerHourEnd,
                message: powerHourText,
            },
            moodConnection: {
                anxiousAverageCompletion: anxiousAvg !== null ? Math.round(anxiousAvg) : null,
                normalAverageCompletion: normalAvg !== null ? Math.round(normalAvg) : null,
                message: moodConnectionText,
            },
            sundayScaries: {
                weakestDay: weakestDay?.day || null,
                weakestDayCompletionRate: weakestDay?.rate || null,
                message: sundayScariesText,
            },
        },
        badgeSummary: {
            theFinisher: weeklyCreated > 0 && weeklyCompleted >= weeklyCreated,
            earlyBird: completedBefore9 >= 5,
            nightOwl: completedAfter22 >= 10,
            metrics: {
                weeklyCreated,
                weeklyCompleted,
                completedBefore9,
                completedAfter22,
            },
        },
        radar: [
            { subject: 'Consistency', score: consistencyScore, fullMark: 100 },
            { subject: 'Focus', score: focusSkill, fullMark: 100 },
            { subject: 'Completion', score: completionRate, fullMark: 100 },
            { subject: 'Mood', score: moodSkill, fullMark: 100 },
        ],
        heatmap,
    };

    await collections.monthlyReports().updateOne(
        { user_id: userId, month: monthKey },
        {
            $set: {
                user_id: userId,
                month: monthKey,
                report_json: report,
                updated_at: new Date(),
            },
            $setOnInsert: {
                id: uuidv4(),
                created_at: new Date(),
            },
        },
        { upsert: true }
    );

    return report;
}

router.get('/monthly-report', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId!;
        const monthInput = req.query.month ? String(req.query.month) : undefined;
        const { monthKey } = getMonthWindow(monthInput);

        const report = await collections.monthlyReports().findOne(
            { user_id: userId, month: monthKey },
            { projection: { _id: 0, report_json: 1 } }
        );

        if (!report?.report_json) {
            return res.status(404).json({ message: 'Monthly report not generated yet for this month', month: monthKey });
        }

        res.json(report.report_json);
    } catch (error) {
        console.error('Get monthly report error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Generate and store report once, then fetch by GET.
router.post('/monthly-report/generate', requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId!;
        const monthInput = req.body?.month ? String(req.body.month) : (req.query.month ? String(req.query.month) : undefined);
        const report = await generateMonthlyReport(userId, monthInput);
        res.json(report);
    } catch (error) {
        console.error('Generate monthly report error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export const analyticsRoutes = router;
