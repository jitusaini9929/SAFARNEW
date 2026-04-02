import React, { useMemo, useState } from "react";
import { CheckCircle, Clock, History, XCircle, Coffee, Sparkles, Target } from "lucide-react";
import { EkagraModeSession } from "@shared/api";

interface FocusHistoryPanelProps {
    sessions: EkagraModeSession[];
}

/* ─── date helpers ──────────────────────────────────── */

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getDateGroupLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

const toDateMillis = (value: unknown) => {
    const parsed = new Date(String(value || ""));
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
};

const formatMinutes = (minutes: number) =>
    minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;

/* ─── session helpers ───────────────────────────────── */

type HistoryStatus = "completed" | "ended_early" | "break";

interface HistoryRow {
    id: string;
    title: string;
    dateTime: Date;
    actualMinutes: number;
    status: HistoryStatus;
    linkedGoalTitle: string | null;
    sessionType: "focus" | "short_break" | "long_break";
    pauseCount: number;
    importedFromGoal: boolean;
}

const getSessionEndDate = (session: EkagraModeSession): Date => {
    const candidates = [
        session.completedAt || session.completed_at,
        session.endedAt || session.ended_at,
        session.discardedAt || session.discarded_at,
        session.updatedAt || session.updated_at,
    ];
    for (const c of candidates) {
        const ms = toDateMillis(c);
        if (ms > 0) return new Date(ms);
    }
    return new Date();
};

const getActualMinutes = (session: EkagraModeSession): number => {
    const total = Number(session.totalSeconds ?? session.total_seconds ?? 0);
    const remaining = Number(session.remainingSeconds ?? session.remaining_seconds ?? 0);
    return Math.max(0, Math.round((Math.max(total, 0) - Math.max(remaining, 0)) / 60));
};

const getSessionType = (session: EkagraModeSession): "focus" | "short_break" | "long_break" => {
    const mode = String(session.mode || "").toLowerCase();
    if (mode === "short") return "short_break";
    if (mode === "long") return "long_break";
    return "focus";
};

const normalizeHistoryStatus = (session: EkagraModeSession): HistoryStatus | null => {
    const raw = String(session.status || "").toLowerCase();
    const sType = getSessionType(session);

    if (raw === "completed") return sType !== "focus" ? "break" : "completed";
    if (raw === "ended_early") return "ended_early";
    if (raw === "discarded") return "ended_early";
    return null;
};

const toHistoryRow = (session: EkagraModeSession): HistoryRow | null => {
    const status = normalizeHistoryStatus(session);
    if (!status) return null;

    const title = String(session.goalTitle || session.goal_title || "").trim() || "Unlabeled";
    const imported = Boolean(session.importedFromGoal || session.imported_from_goal);

    return {
        id: session.id,
        title,
        dateTime: getSessionEndDate(session),
        actualMinutes: getActualMinutes(session),
        status,
        linkedGoalTitle: imported ? title : null,
        sessionType: getSessionType(session),
        pauseCount: Number(session.pauseCount ?? session.pause_count ?? 0),
        importedFromGoal: imported,
    };
};

/* ─── status chip ───────────────────────────────────── */

const StatusChip: React.FC<{ status: HistoryStatus }> = ({ status }) => {
    const config = {
        completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-300/60" },
        ended_early: { label: "Ended early", icon: XCircle, color: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-300/60" },
        break: { label: "Break", icon: Coffee, color: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-300/60" },
    }[status];

    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
};

/* ─── filter helpers ────────────────────────────────── */

type HistoryFilter = "today" | "week" | "all";

const isInFilter = (when: Date, filter: HistoryFilter): boolean => {
    if (filter === "all") return true;
    const now = new Date();
    if (filter === "today") return getLocalDateKey(when) === getLocalDateKey(now);
    const dayMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - when.getTime() <= dayMs;
};

/* ─── main component ────────────────────────────────── */

export const TaskHistoryPanel: React.FC<FocusHistoryPanelProps> = ({ sessions }) => {
    const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");

    /* Build session-based history rows */
    const allRows = useMemo(
        () =>
            sessions
                .map(toHistoryRow)
                .filter((row): row is HistoryRow => row !== null)
                .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime()),
        [sessions],
    );

    const filteredRows = useMemo(
        () => allRows.filter((row) => isInFilter(row.dateTime, historyFilter)),
        [allRows, historyFilter],
    );

    /* ─── today summary metrics ─────────────────── */
    const todayKey = getLocalDateKey(new Date());

    const todayRows = useMemo(
        () => allRows.filter((row) => getLocalDateKey(row.dateTime) === todayKey),
        [allRows, todayKey],
    );

    const todayFocusMinutes = todayRows
        .filter((r) => r.sessionType === "focus")
        .reduce((sum, r) => sum + r.actualMinutes, 0);

    const todayFocusSessions = todayRows.filter((r) => r.sessionType === "focus").length;

    const todayCompletedFocus = todayRows.filter((r) => r.sessionType === "focus" && r.status === "completed");
    const avgCompletedSession = todayCompletedFocus.length > 0
        ? Math.round(todayCompletedFocus.reduce((sum, r) => sum + r.actualMinutes, 0) / todayCompletedFocus.length)
        : 0;

    /* ─── yesterday comparison for insight ──────── */
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);

    const yesterdayFocusMinutes = allRows
        .filter((r) => r.sessionType === "focus" && getLocalDateKey(r.dateTime) === yesterdayKey)
        .reduce((sum, r) => sum + r.actualMinutes, 0);

    const focusDelta = todayFocusMinutes - yesterdayFocusMinutes;
    const insightText = todayFocusMinutes === 0 && yesterdayFocusMinutes === 0
        ? "Start a focus session to build your history."
        : focusDelta > 0
            ? `${focusDelta}m more focused than yesterday — great momentum!`
            : focusDelta < 0
                ? `${Math.abs(focusDelta)}m less than yesterday. Keep pushing!`
                : "Matching yesterday's consistency. Solid effort.";

    /* ─── grouped by day ────────────────────────── */
    const groupedRows = useMemo(() => {
        const groups: Record<string, HistoryRow[]> = {};
        for (const row of filteredRows) {
            const label = getDateGroupLabel(row.dateTime);
            if (!groups[label]) groups[label] = [];
            groups[label].push(row);
        }
        return groups;
    }, [filteredRows]);

    return (
        <div className="space-y-4">
            {/* ─── Today's Progress Summary ───────── */}
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-4">
                <div>
                    <h3 className="text-base font-bold text-foreground">Today's Progress</h3>
                    <p className="text-xs text-muted-foreground mt-1">Derived from your completed focus sessions.</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-center">
                        <div className="text-2xl font-extrabold text-foreground">{formatMinutes(todayFocusMinutes)}</div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Focused</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-center">
                        <div className="text-2xl font-extrabold text-foreground">{todayFocusSessions}</div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Sessions</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-center">
                        <div className="text-2xl font-extrabold text-foreground">{avgCompletedSession}m</div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Session</div>
                    </div>
                </div>

                <div className="rounded-xl border border-emerald-300/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    {insightText}
                </div>
            </div>

            {/* ─── Filter Tabs ────────────────────── */}
            <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-lg border border-border/60 bg-background/70 p-1">
                    {(["today", "week", "all"] as HistoryFilter[]).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setHistoryFilter(f)}
                            className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors ${
                                historyFilter === f
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {f === "today" ? "Today" : f === "week" ? "7 Days" : "All"}
                        </button>
                    ))}
                </div>
                <span className="text-[11px] text-muted-foreground">{filteredRows.length} sessions</span>
            </div>

            {/* ─── Session History Timeline ────────── */}
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Session History</h3>
            </div>

            {Object.entries(groupedRows).map(([dateGroup, rows]) => (
                <div key={dateGroup} className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-md py-1.5 z-10 border-b border-border/50 uppercase tracking-wide">
                        {dateGroup}
                    </h4>
                    {rows.map((row) => (
                        <div key={row.id} className="relative pl-5">
                            <div className="absolute left-1 top-1 h-full w-px bg-border/70" />
                            <div className={`absolute left-0 top-2 h-2.5 w-2.5 rounded-full ${
                                row.status === "completed" ? "bg-emerald-500" :
                                row.status === "break" ? "bg-blue-400" : "bg-amber-500"
                            }`} />
                            <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-foreground truncate">
                                            {row.sessionType === "focus" ? row.title : row.sessionType === "short_break" ? "Short Break" : "Long Break"}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {row.actualMinutes}m
                                            </span>
                                            <span>•</span>
                                            <span>{row.dateTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                            {row.pauseCount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{row.pauseCount} {row.pauseCount === 1 ? "pause" : "pauses"}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <StatusChip status={row.status} />
                                </div>
                                {row.importedFromGoal && row.linkedGoalTitle && (
                                    <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                        <Target className="w-3 h-3" />
                                        Linked to goal
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            {/* ─── Empty States ────────────────────── */}
            {allRows.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">No focus history yet.</p>
                    <p className="text-xs opacity-70 mt-1">Complete a focus session to see it here.</p>
                </div>
            )}
            {allRows.length > 0 && filteredRows.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">No sessions in this time range.</p>
                    <p className="text-xs opacity-70 mt-1">Try switching to "All".</p>
                </div>
            )}
        </div>
    );
};

/* Re-export for backward compatibility */
export type HistoryTask = {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
    importedFromGoal?: boolean;
};
