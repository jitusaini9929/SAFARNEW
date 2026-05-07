import { lazy, Suspense, useMemo } from "react";
import { BarChart3, CheckCircle2, Clock, Target, TrendingUp } from "lucide-react";
import { Goal } from "@shared/api";
import ChartErrorBoundary from "@/components/charts/ChartErrorBoundary";
import {
  DAY_MS,
  UIGoal,
  clampPercent,
  getGoalAnchorDateKey,
  getGoalProgressPercent,
  getStatusBucket,
  isGoalCompleted,
  normalizeGoalKind,
  normalizeGoalUnitType,
} from "@/utils/goalUtils";
import { dateKeyToUtcDate, diffISTDays, formatISTDate, getISTDateKey } from "@/utils/dateUtils";

const StreaksConsistencyChart = lazy(() => import("@/components/charts/StreaksConsistencyChart"));

type GoalInsightsPanelProps = {
  goals: Goal[] | UIGoal[];
};

const titleize = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const MetricCard = ({ label, value, sub, tone = "text-foreground" }: { label: string; value: string; sub?: string; tone?: string }) => (
  <div className="rounded-3xl border bg-card p-6 shadow-sm">
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className={`text-4xl font-black ${tone}`}>{value}</p>
    {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
  </div>
);

export function GoalInsightsPanel({ goals }: GoalInsightsPanelProps) {
  const todayKey = getISTDateKey(new Date());
  const standardGoals = useMemo(() => (goals as UIGoal[]).filter((goal) => goal.source !== "ekagra"), [goals]);
  const activeGoals = useMemo(() => standardGoals.filter((goal) => getGoalAnchorDateKey(goal) <= todayKey), [standardGoals, todayKey]);
  const completedGoals = useMemo(() => activeGoals.filter((goal) => isGoalCompleted(goal)), [activeGoals]);
  const completionRate = activeGoals.length > 0 ? Math.round((completedGoals.length / activeGoals.length) * 100) : 0;
  const averageProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, goal) => sum + getGoalProgressPercent(goal), 0) / activeGoals.length)
    : 0;

  const sevenDaySeries = useMemo(() => {
    const base = dateKeyToUtcDate(todayKey);
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(base.getTime() - (6 - i) * DAY_MS);
      const dayKey = getISTDateKey(dayDate);
      const dayGoals = standardGoals.filter((goal) => getGoalAnchorDateKey(goal) === dayKey);
      const completed = dayGoals.filter((goal) => getStatusBucket(goal) === "completed").length;
      const avgProgress = dayGoals.length > 0
        ? Math.round(dayGoals.reduce((sum, goal) => sum + getGoalProgressPercent(goal), 0) / dayGoals.length)
        : 0;
      return {
        dayKey,
        dayLabel: formatISTDate(dayDate, { weekday: "short" }),
        total: dayGoals.length,
        completed,
        avgProgress,
      };
    });
  }, [standardGoals, todayKey]);

  const consistencyDays = sevenDaySeries.filter((entry) => entry.completed > 0).length;
  const currentCompletionStreak = useMemo(() => {
    let streak = 0;
    for (let i = sevenDaySeries.length - 1; i >= 0; i -= 1) {
      if (sevenDaySeries[i].completed > 0) streak += 1;
      else break;
    }
    return streak;
  }, [sevenDaySeries]);

  const consistencyTrendData = useMemo(
    () =>
      sevenDaySeries.map((entry) => ({
        day: entry.dayLabel,
        score: entry.total > 0 ? clampPercent(Math.round((entry.completed / entry.total) * 100)) : 0,
      })),
    [sevenDaySeries],
  );

  const statusBreakdown = useMemo(() => {
    const counts = { completed: 0, partial: 0, open: 0, missed: 0, cancelled: 0 };
    for (const goal of activeGoals) counts[getStatusBucket(goal)] += 1;
    return counts;
  }, [activeGoals]);

  const kindBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const goal of standardGoals) {
      const key = normalizeGoalKind(goal);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [standardGoals]);

  const unitBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const goal of standardGoals) {
      const key = normalizeGoalUnitType(goal);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [standardGoals]);

  const rolloverGoals = activeGoals.filter((goal) => diffISTDays(getGoalAnchorDateKey(goal), todayKey) < 0 && !isGoalCompleted(goal)).length;
  const goalsWithSavedFocus = standardGoals.filter((goal) => {
    const timerMinutes = Number((goal as any).timerStudiedMinutes ?? (goal as any).timer_studied_minutes ?? 0);
    const sessionCount = Number((goal as any).linkedFocusSessionCount ?? (goal as any).linked_focus_session_count ?? 0);
    return timerMinutes > 0 || sessionCount > 0;
  }).length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Completion Rate"
          value={`${completionRate}%`}
          sub={`${completedGoals.length} of ${activeGoals.length} active goals completed`}
          tone="text-emerald-500"
        />
        <MetricCard
          label="Average Progress"
          value={`${averageProgress}%`}
          sub="Progress across active manual goals"
          tone="text-blue-500"
        />
        <MetricCard
          label="Consistency"
          value={`${consistencyDays}/7`}
          sub="Days with at least one completed goal"
          tone="text-violet-500"
        />
        <MetricCard
          label="Current Streak"
          value={`${currentCompletionStreak}d`}
          sub="Consecutive completion days"
          tone="text-amber-500"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-[32px] border bg-card p-8 shadow-sm lg:col-span-7">
          <div className="mb-6">
            <h3 className="flex items-center gap-3 text-xl font-black">
              <TrendingUp size={24} className="text-emerald-500" /> Goal Consistency Trend
            </h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">Goal completion over the last 7 days.</p>
          </div>
          <div className="h-[250px] w-full">
            <ChartErrorBoundary>
              <Suspense fallback={<div className="h-full w-full" />}>
                <StreaksConsistencyChart data={consistencyTrendData} />
              </Suspense>
            </ChartErrorBoundary>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-[32px] border bg-card p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <Target className="h-4 w-4 text-primary" /> Goal Status
            </h3>
            <div className="space-y-3">
              {Object.entries(statusBreakdown).map(([key, count]) => (
                <div key={key} className="rounded-2xl border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                    <span>{titleize(key)}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-emerald-500" style={{ width: `${activeGoals.length ? (count / activeGoals.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rollover Goals</p>
              <p className="mt-2 text-2xl font-black text-rose-500">{rolloverGoals}</p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Worked With Ekagra</p>
              <p className="mt-2 text-2xl font-black text-amber-500">{goalsWithSavedFocus}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border bg-card p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <BarChart3 className="h-4 w-4 text-teal-500" /> Goal Type Performance
          </h3>
          <div className="space-y-3">
            {Object.entries(kindBreakdown).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3 text-sm">
                <span className="font-medium">{titleize(key)}</span>
                <span className="font-black text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border bg-card p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <Clock className="h-4 w-4 text-primary" /> Goal Progress Sources
          </h3>
          <div className="space-y-3">
            {Object.entries(unitBreakdown).map(([key, count]) => (
              <div key={key} className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3 text-sm">
                <span className="font-medium">{titleize(key)}</span>
                <span className="font-black text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {standardGoals.length === 0 && (
        <div className="rounded-[32px] border border-dashed bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Create goals to unlock goal insights.</p>
        </div>
      )}
    </div>
  );
}
