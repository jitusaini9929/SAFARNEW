import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, ListChecks } from "lucide-react";
import { ekagraAnalyticsService } from "@/services/ekagraAnalyticsService";
import { EkagraAnalyticsFocusSession, EkagraAnalyticsStats, EkagraTimerDurationUsage } from "@shared/api";

type FocusAnalyticsProps = {
    onBack?: () => void;
};

type AnalyticsTab = "overview" | "sessions";

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

export default function FocusAnalytics({ onBack }: FocusAnalyticsProps) {
    const navigate = useNavigate();
    const [stats, setStats] = useState<EkagraAnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

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
            if (isVisible()) {
                void load();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        const interval = window.setInterval(() => {
            poll();
        }, 5 * 60 * 1000);

        return () => {
            mounted = false;
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.clearInterval(interval);
        };
    }, []);

    const handleBack = () => {
        if (onBack) {
            onBack();
            return;
        }
        navigate("/study");
    };

    const usageChart = useMemo(() => buildUsageChart(stats?.timerDurationUsage || []), [stats?.timerDurationUsage]);
    const focusSessions = useMemo(() => stats?.focusSessions || [], [stats?.focusSessions]);

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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
                <header className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="h-10 w-10 rounded-lg border border-border/60 bg-card flex items-center justify-center"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold">Timer Analytics</h1>
                        <p className="text-sm text-muted-foreground">Focused metrics and session history from Ekagra timer sessions</p>
                    </div>
                </header>

                <section className="inline-flex rounded-xl border border-border/60 bg-card p-1">
                    {([
                        { id: "overview" as AnalyticsTab, label: "Overview" },
                        { id: "sessions" as AnalyticsTab, label: "Sessions" },
                    ]).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`h-9 px-3 rounded-lg text-sm font-semibold transition-colors ${
                                activeTab === tab.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </section>

                {activeTab === "overview" && (
                    <>
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <MetricCard label="Time spent on timer" value={formatMinutesLabel(stats?.totalFocusMinutes)} />
                            <MetricCard
                                label="Breaks taken"
                                value={String(toWholeMinutes(stats?.breakSessionsCount))}
                                sub={`Short ${toWholeMinutes(stats?.shortBreakSessionsCount)} | Long ${toWholeMinutes(stats?.longBreakSessionsCount)}`}
                            />
                            <MetricCard label="Long duration timer uses" value={String(toWholeMinutes(stats?.longDurationSessionCount))} sub="60 minutes or longer" />
                            <MetricCard label="Average timer duration" value={formatMinutesLabel(stats?.averageTimerMinutes)} />
                            <MetricCard
                                label="Most used timer duration"
                                value={stats?.mostUsedTimerDurationMinutes ? `${toWholeMinutes(stats.mostUsedTimerDurationMinutes)}m` : "-"}
                            />
                            <MetricCard
                                label="Total sessions"
                                value={`${toWholeMinutes(stats?.totalSessions)}`}
                                sub={`${toWholeMinutes(stats?.completedSessions)} completed`}
                            />
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card p-5">
                            <h2 className="text-base font-bold text-foreground">Timer Duration Usage</h2>
                            <p className="text-xs text-muted-foreground mt-1">Includes focus timers and both break types.</p>

                            {usageChart.total <= 0 ? (
                                <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                                    No timer duration usage yet.
                                </div>
                            ) : (
                                <div className="mt-4 flex flex-col md:flex-row md:items-center gap-5">
                                    <div className="relative h-44 w-44 shrink-0 rounded-full border border-border/60" style={{ background: chartGradient }}>
                                        <div className="absolute inset-7 rounded-full border border-border/70 bg-background/95 flex flex-col items-center justify-center text-center">
                                            <span className="text-xl font-black">{usageChart.total}</span>
                                            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Timers set</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        {usageChart.slices.map((slice) => (
                                            <div key={slice.id} className="flex items-center justify-between gap-3 text-sm">
                                                <div className="inline-flex items-center gap-2 min-w-0">
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

                {activeTab === "sessions" && (
                    <section className="rounded-2xl border border-border/60 bg-card p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-bold text-foreground inline-flex items-center gap-2">
                                <ListChecks className="w-4 h-4" />
                                Focus Sessions
                            </h2>
                            <span className="text-xs text-muted-foreground">{focusSessions.length} sessions</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">All closed focus sessions are listed here.</p>

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
                                                <p className="text-sm font-semibold truncate text-foreground">{session.taskText || "Unlabeled task"}</p>
                                                <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1.5 flex-wrap">
                                                    <span className="inline-flex items-center gap-1">
                                                        <CalendarClock className="w-3.5 h-3.5" />
                                                        {formatSessionDateTime(session.endedAt)}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Planned {toWholeMinutes(session.durationMinutes)}m</span>
                                                    <span>•</span>
                                                    <span>Actual {toWholeMinutes(session.actualMinutes)}m</span>
                                                    {session.pauseCount > 0 && (
                                                        <>
                                                            <span>•</span>
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
        </div>
    );
}
