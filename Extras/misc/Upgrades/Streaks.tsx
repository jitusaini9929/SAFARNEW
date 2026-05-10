import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { TourPrompt } from "@/components/guided-tour";
import { streaksTour } from "@/components/guided-tour/tourSteps";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Flame, Heart, ArrowRight, TrendingUp } from "lucide-react";

// ─────────────────────────────────────────────
// DATE HELPERS
// All date comparisons use local YYYY-MM-DD strings
// to avoid timezone-related off-by-one bugs.
// ─────────────────────────────────────────────

const IST_TIME_ZONE = "Asia/Kolkata";

/** Returns "YYYY-MM-DD" in IST for any Date */
const toISTDateStr = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const getISTWeekday = (dateStr: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
  }).format(new Date(`${dateStr}T00:00:00.000Z`));

const shiftISTDateStr = (dateStr: string, days: number): string => {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return toISTDateStr(base);
};

/**
 * Extracts "YYYY-MM-DD" (IST) from a timestamp string.
 * Handles ISO strings, space-separated datetimes, and bare dates.
 * Returns null if the timestamp is falsy or unparseable.
 */
const extractDateStr = (timestamp: string | undefined | null): string | null => {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (!isNaN(parsed.getTime())) return toISTDateStr(parsed);
  const match = timestamp.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

// ─────────────────────────────────────────────
// CONSISTENCY CHART LOGIC
//
// For each of the last 7 days we want:
//   score = (goals completed that day / goals scheduled that day) * 100
//
// "Scheduled that day" uses `scheduledDate` (the date the user
// intended to work on the goal), NOT `createdAt` (the date the
// record was inserted into the DB).
//
// For today we use the same rule: scheduledDate === today.
// This means if you create a goal for tomorrow it won't inflate today.
// ─────────────────────────────────────────────

interface ConsistencyPoint {
  day: string;
  date: string;
  scheduled: number;
  completed: number;
  score: number;
}

const buildConsistencyData = (goals: any[]): ConsistencyPoint[] => {
  const todayStr = toISTDateStr(new Date());
  const result: ConsistencyPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const dateStr = shiftISTDateStr(todayStr, -i);
    const dayLabel = getISTWeekday(dateStr);

    // Goals the user explicitly scheduled for this day
    const scheduledOnDay = goals.filter((g: any) => {
      const sd = g.scheduledDate || g.scheduled_date;
      return extractDateStr(sd) === dateStr;
    });

    const total = scheduledOnDay.length;
    const done = scheduledOnDay.filter((g: any) => g.completed).length;
    const score = total > 0 ? Math.round((done / total) * 100) : 0;

    result.push({ day: dayLabel, date: dateStr, scheduled: total, completed: done, score });
  }

  return result;
};

// ─────────────────────────────────────────────
// CALENDAR LOGIC
//
// For each day in the selected month we check if the user had
// ANY activity: goals scheduled, journal entries, mood check-ins,
// or a login. If any activity exists → checkmark (active).
//
// Future days are rendered as empty (no state).
// Today gets a special highlight ring.
// ─────────────────────────────────────────────

interface CalendarDay {
  date: Date | null; // null = padding slot before month starts
  dateStr: string;
  isToday: boolean;
  isFuture: boolean;
  isActive: boolean;
}

const buildCalendar = (
  targetDate: Date,
  goalsData: any[],
  journalData: any[],
  moodsData: any[],
  loginData: any[]
): CalendarDay[] => {
  const todayStr = toISTDateStr(new Date());

  const month = targetDate.getMonth();
  const year = targetDate.getFullYear();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: CalendarDay[] = [];

  // Padding: Sunday-start grid (getDay() === 0 for Sunday)
  const startPadding = firstDay.getDay();
  for (let i = 0; i < startPadding; i++) {
    days.push({ date: null, dateStr: "", isToday: false, isFuture: false, isActive: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = toISTDateStr(date);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr && !isToday;

    let isActive = false;

    if (!isFuture) {
      const hasGoal = goalsData.some((g: any) => {
        const sd = g.scheduledDate || g.scheduled_date;
        return extractDateStr(sd) === dateStr;
      });
      const hasJournal = journalData.some((j: any) =>
        extractDateStr(j.timestamp || j.createdAt || j.created_at) === dateStr
      );
      const hasMood = moodsData.some((m: any) =>
        extractDateStr(m.timestamp || m.createdAt || m.created_at) === dateStr
      );
      const hasLogin = loginData.some((l: any) =>
        extractDateStr(l.timestamp) === dateStr
      );

      isActive = hasGoal || hasJournal || hasMood || hasLogin;
    }

    days.push({ date, dateStr, isToday, isFuture, isActive });
  }

  return days;
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function Streaks() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);

  // Streak numbers — from dataService.getStreaks(), the correct source
  const [streakData, setStreakData] = useState<{
    loginStreak: number;
    checkInStreak: number;
    goalCompletionStreak: number;
  }>({ loginStreak: 0, checkInStreak: 0, goalCompletionStreak: 0 });

  // Raw data for chart + calendar
  const [goalsData, setGoalsData] = useState<any[]>([]);
  const [moodsData, setMoodsData] = useState<any[]>([]);
  const [journalData, setJournalData] = useState<any[]>([]);
  const [loginData, setLoginData] = useState<any[]>([]);

  // Which month the calendar is showing
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 1. Auth check
        const authResponse = await authService.getCurrentUser();
        if (!authResponse?.user) {
          navigate("/login");
          return;
        }
        setUser(authResponse.user);

        // 2. Streaks — always use dataService, not authResponse.streaks
        //    (authResponse.streaks can lag behind; dataService.getStreaks()
        //    hits the dedicated endpoint with fresh data)
        try {
          const streaks = await dataService.getStreaks();
          setStreakData({
            loginStreak: streaks.loginStreak ?? 0,
            checkInStreak: streaks.checkInStreak ?? 0,
            goalCompletionStreak: streaks.goalCompletionStreak ?? 0,
          });
        } catch (e) {
          console.error("Failed to fetch streaks:", e);
        }

        // 3. Fetch all data in parallel — calendar + chart both need it
        const [goals, moods, journal, logins] = await Promise.allSettled([
          dataService.getGoals(),
          dataService.getMoods(),
          dataService.getJournalEntries(),
          authService.getLoginHistory(),
        ]);

        if (goals.status === "fulfilled") setGoalsData(goals.value ?? []);
        if (moods.status === "fulfilled") setMoodsData(moods.value ?? []);
        if (journal.status === "fulfilled") setJournalData(journal.value ?? []);
        if (logins.status === "fulfilled") setLoginData(logins.value ?? []);

        if (goals.status === "rejected") {
          console.error("Failed to fetch goals:", goals.reason);
        }
      } catch {
        navigate("/login");
      }
    };

    fetchAll();
  }, [navigate]);

  // ── Derived: Consistency chart data ──────────────────────────────────
  // Recalculated only when goalsData changes
  const consistencyData = useMemo(
    () => buildConsistencyData(goalsData),
    [goalsData]
  );

  // ── Derived: Calendar days ────────────────────────────────────────────
  // Recalculated when the viewed month or any data changes
  const calendarDays = useMemo(
    () => buildCalendar(calendarMonth, goalsData, journalData, moodsData, loginData),
    [calendarMonth, goalsData, journalData, moodsData, loginData]
  );

  // ── Derived: Check-In streak progress bar (capped at meaningful milestones)
  // Shows progress toward the next milestone: 7, 14, 30, 60, 100
  const checkInMilestone = [7, 14, 30, 60, 100].find(
    (m) => streakData.checkInStreak < m
  ) ?? 100;
  const checkInProgress = Math.min(
    (streakData.checkInStreak / checkInMilestone) * 100,
    100
  );

  if (!user) return null;

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 bg-background font-['Inter'] text-foreground p-6 md:p-8 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-['Outfit'] font-bold text-foreground flex items-center gap-2">
              <span>🔥</span> Keep the fire burning!
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              Consistency is key to building sustainable habits. Monitor your progress below.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* ── Check-In Streak Card ─────────────────────────────────── */}
            <div
              data-tour="streak-cards"
              className="group relative overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between h-48 bg-primary/20 shadow-xl border border-primary/30 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Heart className="w-24 h-24 text-primary transform rotate-12" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 bg-primary/30 rounded-lg backdrop-blur-sm">
                    <Heart className="w-4 h-4 text-primary" />
                  </span>
                  <h3 className="text-primary font-medium text-sm">Check-In Streak</h3>
                </div>
                <div className="mt-4">
                  <span className="font-['Outfit'] font-bold text-5xl text-foreground">
                    {streakData.checkInStreak}
                  </span>
                  <span className="text-primary text-lg ml-1">days</span>
                </div>
              </div>

              <div className="relative z-10 mt-auto">
                <div
                  className="flex items-center gap-2 text-primary text-sm font-medium cursor-pointer"
                  onClick={() => navigate("/nishtha/check-in")}
                >
                  {streakData.checkInStreak === 0
                    ? "Start your streak today!"
                    : `Next milestone: ${checkInMilestone} days`}
                  <ArrowRight className="w-4 h-4" />
                </div>
                {/* Progress bar toward next milestone — dynamic, not hardcoded */}
                <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${checkInProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ── Login Streak Card ────────────────────────────────────── */}
            <div className="group relative overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between h-48 bg-secondary/20 shadow-xl border border-secondary/30 hover:-translate-y-1 transition-transform duration-200">
              <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Flame className="w-32 h-32 text-secondary" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 bg-secondary/30 rounded-lg backdrop-blur-sm">
                    <Flame className="w-4 h-4 text-secondary" />
                  </span>
                  <h3 className="text-secondary font-medium text-sm">Login Streak</h3>
                </div>
                <div className="mt-4">
                  <span className="font-['Outfit'] font-bold text-5xl text-foreground">
                    {streakData.loginStreak}
                  </span>
                  <span className="text-secondary text-lg ml-1">days</span>
                </div>
              </div>

              <div className="relative z-10 mt-auto">
                <div className="flex items-center gap-2 text-secondary text-xs py-1 px-2 bg-secondary/10 rounded-lg w-fit backdrop-blur-md">
                  <span className="text-lg">✨</span>
                  {streakData.loginStreak >= 7
                    ? "Amazing! Keep it up!"
                    : "Show up every day!"}
                </div>
              </div>
            </div>

            {/* ── Activity Calendar ────────────────────────────────────── */}
            <div
              data-tour="activity-calendar"
              id="calendar-view"
              className="md:col-span-2 rounded-[1.5rem] bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white p-5 shadow-xl dark:shadow-2xl border border-slate-200 dark:border-gray-800 font-sans transition-colors duration-300"
            >
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCalendarMonth(new Date())}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  <span>Today</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCalendarMonth((prev) => {
                        const d = new Date(prev);
                        d.setMonth(d.getMonth() - 1);
                        return d;
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent min-w-[100px] text-center">
                    {calendarMonth.toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() =>
                      setCalendarMonth((prev) => {
                        const d = new Date(prev);
                        d.setMonth(d.getMonth() + 1);
                        return d;
                      })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                  {calendarMonth.getFullYear()}
                </span>
              </div>

              {/* Day-of-week headers — matches Sunday-first grid */}
              <div className="grid grid-cols-7 gap-3 text-center mb-3">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span
                    key={i}
                    className="text-xs font-bold text-slate-400 dark:text-gray-500"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-3">
                {calendarDays.map((day, idx) => {
                  // Padding slot
                  if (!day.date) return <div key={idx} className="w-9 h-9" />;

                  // Future day — greyed out, no state
                  if (day.isFuture) {
                    return (
                      <div key={idx} className="flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center opacity-20">
                          <span className="text-xs text-slate-400 dark:text-gray-600">
                            {day.date.getDate()}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="flex items-center justify-center">
                      <div
                        className={[
                          "w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-sm transition-all",
                          day.isToday
                            ? "ring-2 ring-offset-1 ring-emerald-400 dark:ring-emerald-500"
                            : "",
                          day.isActive
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                            : "border-slate-200 dark:border-gray-700",
                        ].join(" ")}
                      >
                        <svg
                          className={`w-4 h-4 ${
                            day.isActive
                              ? "text-emerald-600 dark:text-emerald-500"
                              : "text-slate-200 dark:text-gray-700"
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-500 inline-block" />
                  Active day
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-slate-200 dark:border-gray-700 inline-block" />
                  No activity
                </span>
              </div>
            </div>

            {/* ── Goal Consistency Chart ───────────────────────────────── */}
            <div
              data-tour="consistency-chart"
              className="md:col-span-3 glass-high rounded-[1.5rem] p-6 md:p-8 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-['Outfit'] font-semibold text-lg text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Goal Consistency Trend
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    % of scheduled goals completed each day (last 7 days)
                  </p>
                </div>
              </div>

              {/* Empty state — avoids a flat zero line when there's genuinely no data */}
              {consistencyData.every((d) => d.scheduled === 0) ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No scheduled goals found for the last 7 days. Start adding goals with a scheduled date!
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={consistencyData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="day"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as ConsistencyPoint;
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-bold text-foreground">{d.day}</p>
                              {d.scheduled === 0 ? (
                                <p className="text-sm text-muted-foreground">No goals scheduled</p>
                              ) : (
                                <>
                                  <p className="text-sm text-muted-foreground">
                                    {d.completed}/{d.scheduled} goals completed
                                  </p>
                                  <p className="text-lg font-bold text-primary">{d.score}%</p>
                                </>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(var(--secondary))" }}
                        fill="url(#colorScore)"
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      <TourPrompt tour={streaksTour} featureName="Streaks" />
    </NishthaLayout>
  );
}
