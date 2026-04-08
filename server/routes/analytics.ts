import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";
import { QUERY_TIMEOUT_MS } from "../utils/queryDefaults";

const router = Router();

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_VERSION = 2;

const toISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET_MS);

const toISTDateKey = (date: Date) => toISTDate(date).toISOString().split("T")[0];

const getISTHour = (date: Date) => toISTDate(date).getUTCHours();

const parseDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getPositiveNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const moodToScore = (value: unknown) => {
    const mood = String(value || "").trim().toLowerCase();
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

const getMoodScore = (row: any) => {
    const direct = Number(row?.mood_score);
    if (Number.isFinite(direct) && direct > 0) return direct;
    return moodToScore(row?.post_study_mood) || moodToScore(row?.pre_study_mood);
};

const getGoalAnchorDate = (goal: any) =>
    parseDate(goal?.scheduled_date)
    || parseDate(goal?.scheduledDate)
    || parseDate(goal?.created_at)
    || parseDate(goal?.createdAt);

const getGoalCompletedDate = (goal: any) =>
    parseDate(goal?.completed_at)
    || parseDate(goal?.completedAt);

const isManualGoal = (goal: any) => String(goal?.source || "manual").trim().toLowerCase() !== "ekagra";

const getActualFocusMinutes = (row: any) => {
    const actual = Number(row?.actual_duration_minutes);
    if (Number.isFinite(actual) && actual >= 0) return Math.round(actual);
    const duration = Number(row?.duration_minutes);
    return Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : 0;
};

const getMonthWindow = (monthInput?: string) => {
    let year: number;
    let monthIndex: number;

    if (monthInput && /^\d{4}-\d{2}$/.test(monthInput)) {
        const [yearStr, monthStr] = monthInput.split("-");
        year = Number(yearStr);
        monthIndex = Number(monthStr) - 1;
    } else {
        const now = toISTDate(new Date());
        year = now.getUTCFullYear();
        monthIndex = now.getUTCMonth();
    }

    const nowIST = toISTDate(new Date());
    const isCurrentMonth = year === nowIST.getUTCFullYear() && monthIndex === nowIST.getUTCMonth();
    const startIST = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const endIST = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const evaluationDay = isCurrentMonth ? nowIST.getUTCDate() : endIST.getUTCDate();
    const evaluationEndIST = new Date(Date.UTC(year, monthIndex, evaluationDay, 23, 59, 59, 999));

    return {
        monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
        startUTC: new Date(startIST.getTime() - IST_OFFSET_MS),
        endUTC: new Date(endIST.getTime() - IST_OFFSET_MS),
        evaluationEndUTC: new Date(evaluationEndIST.getTime() - IST_OFFSET_MS),
        daysInMonth: endIST.getUTCDate(),
        evaluationDays: evaluationDay,
        year,
        monthIndex,
    };
};

async function generateMonthlyReport(userId: string, monthInput?: string) {
    const {
        monthKey,
        startUTC,
        evaluationEndUTC,
        endUTC,
        daysInMonth,
        evaluationDays,
        year,
        monthIndex,
    } = getMonthWindow(monthInput);

    const [loginRows, moodSnapshots, journalRows, goals, focusRows] = await Promise.all([
        collections.loginHistory()
            .find(
                { user_id: userId, timestamp: { $gte: startUTC, $lte: evaluationEndUTC } },
                { projection: { _id: 0, timestamp: 1 } },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray(),
        collections.moodSnapshots()
            .find(
                { user_id: userId, timestamp: { $gte: startUTC, $lte: evaluationEndUTC } },
                { projection: { _id: 0, timestamp: 1, mood_score: 1, pre_study_mood: 1, post_study_mood: 1 } },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray(),
        collections.journal()
            .find(
                { user_id: userId, timestamp: { $gte: startUTC, $lte: evaluationEndUTC } },
                { projection: { _id: 0, timestamp: 1 } },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray(),
        collections.goals()
            .find(
                {
                    user_id: userId,
                    source: { $ne: "ekagra" },
                    $or: [
                        { scheduled_date: { $gte: startUTC, $lte: evaluationEndUTC } },
                        { created_at: { $gte: startUTC, $lte: evaluationEndUTC } },
                        { completed_at: { $gte: startUTC, $lte: evaluationEndUTC } },
                    ],
                },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        title: 1,
                        text: 1,
                        source: 1,
                        scheduled_date: 1,
                        created_at: 1,
                        completed_at: 1,
                        completed: 1,
                        status_value: 1,
                    },
                },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray(),
        collections.focusSessions()
            .find(
                {
                    user_id: userId,
                    completed: true,
                    session_type: "focus",
                    completed_at: { $gte: startUTC, $lte: evaluationEndUTC },
                },
                {
                    projection: {
                        _id: 0,
                        id: 1,
                        completed_at: 1,
                        started_at: 1,
                        duration_minutes: 1,
                        actual_duration_minutes: 1,
                        associated_goal_id: 1,
                        task_title: 1,
                    },
                },
            )
            .maxTimeMS(QUERY_TIMEOUT_MS)
            .toArray(),
    ]);

    const dayStats = new Map<string, {
        logins: number;
        moodCount: number;
        moodScoreTotal: number;
        journalCount: number;
        goalsPlanned: number;
        goalsCompleted: number;
        focusMinutes: number;
        focusSessions: number;
    }>();

    const ensureDayStat = (dayKey: string) => {
        if (!dayStats.has(dayKey)) {
            dayStats.set(dayKey, {
                logins: 0,
                moodCount: 0,
                moodScoreTotal: 0,
                journalCount: 0,
                goalsPlanned: 0,
                goalsCompleted: 0,
                focusMinutes: 0,
                focusSessions: 0,
            });
        }
        return dayStats.get(dayKey)!;
    };

    for (let day = 1; day <= daysInMonth; day += 1) {
        const key = `${monthKey}-${String(day).padStart(2, "0")}`;
        ensureDayStat(key);
    }

    const loginDaySet = new Set<string>();
    for (const row of loginRows) {
        const ts = parseDate((row as any)?.timestamp);
        if (!ts) continue;
        const dayKey = toISTDateKey(ts);
        if (!dayKey.startsWith(monthKey)) continue;
        loginDaySet.add(dayKey);
        ensureDayStat(dayKey).logins += 1;
    }

    const journalDaySet = new Set<string>();
    for (const row of journalRows) {
        const ts = parseDate((row as any)?.timestamp);
        if (!ts) continue;
        const dayKey = toISTDateKey(ts);
        if (!dayKey.startsWith(monthKey)) continue;
        journalDaySet.add(dayKey);
        ensureDayStat(dayKey).journalCount += 1;
    }

    const moodDaySet = new Set<string>();
    for (const row of moodSnapshots) {
        const ts = parseDate((row as any)?.timestamp);
        if (!ts) continue;
        const dayKey = toISTDateKey(ts);
        if (!dayKey.startsWith(monthKey)) continue;
        const score = getMoodScore(row);
        const day = ensureDayStat(dayKey);
        moodDaySet.add(dayKey);
        if (score !== null) {
            day.moodCount += 1;
            day.moodScoreTotal += score;
        }
    }

    const evaluationEndKey = `${monthKey}-${String(evaluationDays).padStart(2, "0")}`;
    const weekdayGoalStats = new Map<string, { planned: number; completed: number }>();

    let goalsCreated = 0;
    let goalsCompleted = 0;
    for (const goal of goals) {
        if (!isManualGoal(goal)) continue;

        const anchorDate = getGoalAnchorDate(goal);
        const completedDate = getGoalCompletedDate(goal);
        const anchorKey = anchorDate ? toISTDateKey(anchorDate) : null;
        const completedKey = completedDate ? toISTDateKey(completedDate) : null;

        if (anchorKey && anchorKey >= `${monthKey}-01` && anchorKey <= evaluationEndKey) {
            goalsCreated += 1;
            ensureDayStat(anchorKey).goalsPlanned += 1;

            const weekday = toISTDate(anchorDate!).toLocaleDateString("en-IN", { weekday: "long" });
            const existing = weekdayGoalStats.get(weekday) || { planned: 0, completed: 0 };
            existing.planned += 1;
            if (completedKey && completedKey.startsWith(monthKey)) {
                existing.completed += 1;
            }
            weekdayGoalStats.set(weekday, existing);
        }

        if (completedKey && completedKey.startsWith(monthKey)) {
            goalsCompleted += 1;
            ensureDayStat(completedKey).goalsCompleted += 1;
        }
    }

    let totalFocusMinutes = 0;
    const focusDaySet = new Set<string>();
    const focusHourMap = new Map<number, number>();

    for (const row of focusRows) {
        const completedAt = parseDate((row as any)?.completed_at);
        if (!completedAt) continue;
        const dayKey = toISTDateKey(completedAt);
        if (!dayKey.startsWith(monthKey)) continue;
        const actualMinutes = getActualFocusMinutes(row);
        totalFocusMinutes += actualMinutes;
        focusDaySet.add(dayKey);
        focusHourMap.set(getISTHour(completedAt), (focusHourMap.get(getISTHour(completedAt)) || 0) + 1);

        const day = ensureDayStat(dayKey);
        day.focusMinutes += actualMinutes;
        day.focusSessions += 1;
    }

    const consistentDays = [...dayStats.entries()].filter(([, day]) => (
        day.moodCount > 0
        || day.journalCount > 0
        || day.goalsCompleted > 0
        || day.focusMinutes > 0
    )).length;

    const completionRate = goalsCreated > 0 ? clampPercent((goalsCompleted / goalsCreated) * 100) : 0;
    const consistencyScore = evaluationDays > 0 ? clampPercent((consistentDays / evaluationDays) * 100) : 0;
    const focusDays = focusDaySet.size;
    const focusDepth = focusDays > 0 ? Math.round(totalFocusMinutes / focusDays) : 0;
    const reflectionDays = new Set([...journalDaySet, ...moodDaySet]).size;

    const powerHourStart = focusHourMap.size > 0
        ? [...focusHourMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null;
    const powerHourText = powerHourStart === null
        ? "Complete a few Ekagra sessions to discover your strongest study hour."
        : `Your best focus window is around ${powerHourStart}:00 to ${(powerHourStart + 1) % 24}:00 IST.`;

    let highMoodCompletionTotal = 0;
    let highMoodCompletionDays = 0;
    let lowMoodCompletionTotal = 0;
    let lowMoodCompletionDays = 0;
    let highMoodFocusTotal = 0;
    let highMoodFocusDays = 0;
    let lowMoodFocusTotal = 0;
    let lowMoodFocusDays = 0;

    for (const [, day] of dayStats) {
        if (day.moodCount === 0) continue;
        const moodAverage = day.moodScoreTotal / day.moodCount;
        const completionForDay = day.goalsPlanned > 0 ? (day.goalsCompleted / day.goalsPlanned) * 100 : null;
        if (moodAverage >= 4) {
            if (completionForDay !== null) {
                highMoodCompletionTotal += completionForDay;
                highMoodCompletionDays += 1;
            }
            highMoodFocusTotal += day.focusMinutes;
            highMoodFocusDays += 1;
        } else if (moodAverage <= 2) {
            if (completionForDay !== null) {
                lowMoodCompletionTotal += completionForDay;
                lowMoodCompletionDays += 1;
            }
            lowMoodFocusTotal += day.focusMinutes;
            lowMoodFocusDays += 1;
        }
    }

    const highMoodCompletionAverage = highMoodCompletionDays > 0 ? Math.round(highMoodCompletionTotal / highMoodCompletionDays) : null;
    const lowMoodCompletionAverage = lowMoodCompletionDays > 0 ? Math.round(lowMoodCompletionTotal / lowMoodCompletionDays) : null;
    const highMoodFocusAverage = highMoodFocusDays > 0 ? Math.round(highMoodFocusTotal / highMoodFocusDays) : null;
    const lowMoodFocusAverage = lowMoodFocusDays > 0 ? Math.round(lowMoodFocusTotal / lowMoodFocusDays) : null;

    let moodConnectionText = "Log check-ins more often to unlock mood vs output insights.";
    if (highMoodCompletionAverage !== null && lowMoodCompletionAverage !== null) {
        const diff = highMoodCompletionAverage - lowMoodCompletionAverage;
        moodConnectionText = diff >= 0
            ? `On better-mood days, your manual goal completion is ${diff}% higher.`
            : `On low-mood days, your manual goal completion drops by ${Math.abs(diff)}%.`;
    } else if (highMoodFocusAverage !== null && lowMoodFocusAverage !== null) {
        const diff = highMoodFocusAverage - lowMoodFocusAverage;
        moodConnectionText = diff >= 0
            ? `On better-mood days, you focus for ${diff} more minutes on average.`
            : `On low-mood days, your focus time falls by ${Math.abs(diff)} minutes on average.`;
    }

    const weakestWeekday = [...weekdayGoalStats.entries()]
        .filter(([, value]) => value.planned > 0)
        .map(([day, value]) => ({
            day,
            rate: Math.round((value.completed / value.planned) * 100),
        }))
        .sort((a, b) => a.rate - b.rate)[0] || null;

    const weakestDayText = weakestWeekday
        ? `Your manual goals slip most on ${weakestWeekday.day}s (${weakestWeekday.rate}% done). Keep that day lighter.`
        : "Add a few more manual goals this month to identify your toughest day.";

    const focusSkill = focusDays > 0 ? clampPercent((focusDepth / 90) * 100) : 0;
    const reflectionScore = evaluationDays > 0 ? clampPercent((reflectionDays / evaluationDays) * 100) : 0;

    const heatmap = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
        const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;
        const entry = ensureDayStat(dayKey);
        const activityPoints =
            (entry.moodCount > 0 ? 1 : 0)
            + Math.min(2, entry.journalCount)
            + (entry.goalsCompleted * 2)
            + Math.round(entry.focusMinutes / 25);
        const intensity = activityPoints >= 8 ? 4 : activityPoints >= 5 ? 3 : activityPoints >= 2 ? 2 : activityPoints >= 1 ? 1 : 0;
        const date = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
        heatmap.push({
            date: dayKey,
            dayOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()],
            value: activityPoints,
            intensity,
        });
    }

    const report = {
        version: REPORT_VERSION,
        month: monthKey,
        generatedAt: new Date().toISOString(),
        executiveSummary: {
            consistencyScore,
            completionRate,
            focusDepth,
            daysLoggedIn: loginDaySet.size,
            daysInMonth,
            evaluationDays,
            consistentDays,
            goalsCreated,
            goalsCompleted,
            totalFocusMinutes,
            focusDays,
            reflectionDays,
            checkInDays: moodDaySet.size,
            journalDays: journalDaySet.size,
            consistencyMessage: `${consistentDays} of ${evaluationDays} days had meaningful activity.`,
            completionMessage: `${goalsCompleted} of ${goalsCreated} planned manual goals were completed.`,
            focusMessage: focusDays > 0
                ? `You averaged ${focusDepth} focused minutes on the days you used Ekagra.`
                : "No Ekagra focus sessions logged in this period.",
        },
        insights: {
            powerHour: {
                startHour: powerHourStart ?? -1,
                endHour: powerHourStart === null ? -1 : (powerHourStart + 1) % 24,
                message: powerHourText,
            },
            moodConnection: {
                anxiousAverageCompletion: lowMoodCompletionAverage,
                normalAverageCompletion: highMoodCompletionAverage,
                message: moodConnectionText,
            },
            sundayScaries: {
                weakestDay: weakestWeekday?.day || null,
                weakestDayCompletionRate: weakestWeekday?.rate || null,
                message: weakestDayText,
            },
        },
        radar: [
            { subject: "Consistency", score: consistencyScore, fullMark: 100 },
            { subject: "Completion", score: completionRate, fullMark: 100 },
            { subject: "Focus", score: focusSkill, fullMark: 100 },
            { subject: "Reflection", score: reflectionScore, fullMark: 100 },
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
        { upsert: true },
    );

    return report;
}

router.get("/monthly-report", requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId!;
        const monthInput = req.query.month ? String(req.query.month) : undefined;
        const { monthKey } = getMonthWindow(monthInput);

        const cached = await collections.monthlyReports().findOne(
            { user_id: userId, month: monthKey },
            { projection: { report_json: 1, updated_at: 1 } },
        );
        const cacheAgeMs = cached?.updated_at ? Date.now() - new Date(cached.updated_at).getTime() : Infinity;
        const cacheVersion = Number(cached?.report_json?.version || 0);

        if (cached?.report_json && cacheVersion === REPORT_VERSION && cacheAgeMs < 5 * 60 * 1000) {
            res.set("Cache-Control", "private, max-age=300");
            return res.json(cached.report_json);
        }

        const report = await generateMonthlyReport(userId, monthInput);
        res.set("Cache-Control", "private, max-age=300");
        return res.json(report);
    } catch (error) {
        console.error("Get monthly report error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/monthly-report/generate", requireAuth, async (req: any, res) => {
    try {
        const userId = req.session.userId!;
        const monthInput = req.body?.month ? String(req.body.month) : (req.query.month ? String(req.query.month) : undefined);
        const report = await generateMonthlyReport(userId, monthInput);
        return res.json(report);
    } catch (error) {
        console.error("Generate monthly report error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

export const analyticsRoutes = router;
