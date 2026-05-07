import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, ListChecks } from "lucide-react";
import { ekagraAnalyticsService } from "@/services/ekagraAnalyticsService";
import { EkagraAnalyticsStats, EkagraTimerDurationUsage } from "@shared/api";

type FocusAnalyticsPanelProps = {
  view?: "focus" | "sessions";
  showTabs?: boolean;
};

const CHART_COLORS = ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#14b8a6", "#7c3aed", "#ea580c", "#0891b2"];

const toWholeMinutes = (value: number | null | undefined) => Math.max(0, Math.round(Number(value || 0)));

const formatMinutesLabel = (value: number | null | undefined) => {
  const minutes = toWholeMinutes(value);
  if (minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const usageLabel = (entry: EkagraTimerDurationUsage) => {
  const duration = `${toWholeMinutes(entry.durationMinutes)}m`;
  if (entry.sessionType === "short_break") return `Short break ${duration}`;
  if (entry.sessionType === "long_break") return `Long break ${duration}`;
  return `Focus ${duration}`;
};

const buildUsageChart = (usage: EkagraTimerDurationUsage[]) => {
  const rows = usage
    .map((entry) => ({
      ...entry,
      count: Math.max(0, Number(entry.count || 0)),
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const slices = rows.map((row, index) => ({
    id: `${row.sessionType}-${row.durationMinutes}-${index}`,
    label: usageLabel(row),
    count: row.count,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return { total, slices };
};

const formatSessionDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "-";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const MetricCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
    {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
  </div>
);

export function FocusAnalyticsPanel({ view = "focus", showTabs = false }: FocusAnalyticsPanelProps) {
  const [stats, setStats] = useState<EkagraAnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"focus" | "sessions">(view);

  useEffect(() => {
    setActiveView(view);
  }, [view]);

  useEffect(() => {
    let mounted = true;
    const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";

    const load = async () => {
      const result = await ekagraAnalyticsService.getEkagraAnalytics();
      if (!mounted) return;
      setStats(result);
      setLoading(false);
    };

    const poll = () => {
      if (!isVisible()) return;
      void load();
    };

    poll();

    const onVisibilityChange = () => {
      if (isVisible()) void load();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(poll, 5 * 60 * 1000);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, []);

  const usageChart = useMemo(() => buildUsageChart(stats?.timerDurationUsage || []), [stats?.timerDurationUsage]);
  const focusSessions = useMemo(() => stats?.focusSessions || [], [stats?.focusSessions]);
  const linkedSessionCount = useMemo(
    () => focusSessions.filter((session) => Boolean(session.associatedGoalId)).length,
    [focusSessions],
  );
  const freeFocusSessionCount = useMemo(
    () => focusSessions.filter((session) => !session.associatedGoalId).length,
    [focusSessions],
  );

  const chartGradient = useMemo(() => {
    if (usageChart.total <= 0 || usageChart.slices.length === 0) return "";
    let start = 0;
    const pieces = usageChart.slices.map((slice) => {
      const percent = (slice.count / usageChart.total) * 100;
      const end = start + percent;
      const segment = `${slice.color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${pieces.join(", ")})`;
  }, [usageChart]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">
        Loading focus insights...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTabs && (
        <section className="inline-flex rounded-xl border border-border/60 bg-card p-1">
          {[
            { id: "focus" as const, label: "Focus" },
            { id: "sessions" as const, label: "Session History" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`h-9 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors ${
                activeView === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>
      )}

      {activeView === "focus" && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total focus time" value={formatMinutesLabel(stats?.totalFocusMinutes)} />
            <MetricCard label="Average session length" value={formatMinutesLabel(stats?.averageTimerMinutes)} />
            <MetricCard
              label="Breaks taken"
              value={String(toWholeMinutes(stats?.breakSessionsCount))}
              sub={`Short ${toWholeMinutes(stats?.shortBreakSessionsCount)} | Long ${toWholeMinutes(stats?.longBreakSessionsCount)}`}
            />
            <MetricCard
              label="Total sessions"
              value={`${toWholeMinutes(stats?.totalSessions)}`}
              sub={`${toWholeMinutes(stats?.completedSessions)} completed`}
            />
            <MetricCard
              label="Goal-linked focus"
              value={`${linkedSessionCount}`}
              sub="Sessions attached to goals"
            />
            <MetricCard
              label="Free focus"
              value={`${freeFocusSessionCount}`}
              sub="Saved sessions without a goal"
            />
            <MetricCard
              label="Long sessions"
              value={String(toWholeMinutes(stats?.longDurationSessionCount))}
              sub="60 minutes or longer"
            />
            <MetricCard
              label="Most used duration"
              value={stats?.mostUsedTimerDurationMinutes ? `${toWholeMinutes(stats.mostUsedTimerDurationMinutes)}m` : "-"}
            />
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="text-base font-bold text-foreground">Timer Duration Usage</h2>
            <p className="mt-1 text-xs text-muted-foreground">Includes focus timers and both break types.</p>

            {usageChart.total <= 0 ? (
              <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                No timer duration usage yet.
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
                <div className="relative h-44 w-44 shrink-0 rounded-full border border-border/60" style={{ background: chartGradient }}>
                  <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full border border-border/70 bg-background/95 text-center">
                    <span className="text-xl font-black">{usageChart.total}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Timers set</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  {usageChart.slices.map((slice) => (
                    <div key={slice.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="inline-flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span className="truncate text-muted-foreground">{slice.label}</span>
                      </div>
                      <span className="font-semibold text-foreground">{slice.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {activeView === "sessions" && (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-foreground">
              <ListChecks className="h-4 w-4" />
              Session History
            </h2>
            <span className="text-xs text-muted-foreground">{focusSessions.length} sessions</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">All closed focus sessions are listed here.</p>

          {focusSessions.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
              No focus sessions available yet.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {focusSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{session.taskText || "Unlabeled task"}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          session.associatedGoalId
                            ? "border border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                            : "border border-blue-300/60 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        }`}>
                          {session.associatedGoalId ? "Goal Focus" : "Free Focus"}
                        </span>
                      </div>
                      <div className="mt-1 inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatSessionDateTime(session.endedAt)}
                        </span>
                        <span>|</span>
                        <span>Planned {toWholeMinutes(session.durationMinutes)}m</span>
                        <span>|</span>
                        <span>Actual {toWholeMinutes(session.actualMinutes)}m</span>
                        {session.pauseCount > 0 && (
                          <>
                            <span>|</span>
                            <span>{session.pauseCount} pauses</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
