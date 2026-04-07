import React, { useMemo } from "react";
import { History } from "lucide-react";
import { EkagraModeSession } from "@shared/api";

interface FocusHistoryPanelProps {
    sessions: EkagraModeSession[];
}

interface TodayHistoryItem {
    id: string;
    title: string;
    sessionTime: string;
    sessionTimestamp: number;
    plannedMinutes: number;
    actualMinutes: number;
}

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toDateMillis = (value: unknown) => {
    const parsed = new Date(String(value || ""));
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
};

const getSessionEndDate = (session: EkagraModeSession): Date => {
    const candidates = [
        session.completedAt || session.completed_at,
        session.endedAt || session.ended_at,
        session.createdAt || session.created_at,
    ];
    for (const candidate of candidates) {
        const millis = toDateMillis(candidate);
        if (millis > 0) return new Date(millis);
    }
    return new Date();
};

const getActualMinutes = (session: EkagraModeSession): number => {
    const total = Number(session.totalSeconds ?? session.total_seconds ?? 0);
    const remaining = Number(session.remainingSeconds ?? session.remaining_seconds ?? 0);
    return Math.max(0, Math.round((Math.max(total, 0) - Math.max(remaining, 0)) / 60));
};

const getPlannedMinutes = (session: EkagraModeSession): number => {
    const total = Number(session.totalSeconds ?? session.total_seconds ?? 0);
    return Math.max(0, Math.round(Math.max(total, 0) / 60));
};

const getSessionTitle = (session: EkagraModeSession, fallback: string) =>
    String(
        session.sessionTitle
        || session.session_title
        || session.goalTitle
        || session.goal_title
        || fallback,
    ).trim() || fallback;

const formatMinutes = (minutes: number) =>
    minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;

const formatSessionTime = (date: Date) =>
    date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });

const renderHistorySection = (
    title: string,
    subtitle: string,
    emptyText: string,
    rows: TodayHistoryItem[],
    tone: "blue" | "violet",
) => {
    const panelTone = tone === "violet"
        ? "border-violet-300/60 bg-violet-500/10"
        : "border-blue-300/60 bg-blue-500/10";
    const rowTone = tone === "violet"
        ? "border-violet-200/70 text-violet-700 dark:text-violet-300"
        : "border-blue-200/70 text-blue-700 dark:text-blue-300";

    return (
        <div className={`rounded-xl border p-3 ${panelTone}`}>
            <div className="mb-2">
                <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            </div>

            <div className="space-y-2">
                {rows.length > 0 ? (
                    rows.map((row) => (
                        <div
                            key={row.id}
                            className="rounded-lg border bg-background/80 px-3 py-2 space-y-1"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-foreground truncate">{row.title}</span>
                                <span className={`text-xs font-semibold shrink-0 ${rowTone}`}>
                                    {row.sessionTime}
                                </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                Planned {formatMinutes(row.plannedMinutes)} • Actual {formatMinutes(row.actualMinutes)}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-lg border border-dashed bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                        {emptyText}
                    </div>
                )}
            </div>
        </div>
    );
};

export const TaskHistoryPanel: React.FC<FocusHistoryPanelProps> = ({ sessions }) => {
    const todayKey = getLocalDateKey(new Date());

    const todayFocusSessions = useMemo(
        () =>
            sessions.filter((session) => {
                const status = String(session.status || "").toLowerCase();
                const mode = String(session.mode || "").toLowerCase();
                if (mode === "short" || mode === "long") return false;
                if (status !== "completed" && status !== "ended_early") return false;
                return getLocalDateKey(getSessionEndDate(session)) === todayKey;
            }),
        [sessions, todayKey],
    );

    const todayTotalFocusMinutes = useMemo(
        () => todayFocusSessions.reduce((sum, session) => sum + getActualMinutes(session), 0),
        [todayFocusSessions],
    );

    const linkedGoals = useMemo(
        () =>
            todayFocusSessions
                .filter((session) => Boolean(session.importedFromGoal || session.imported_from_goal))
                .map((session) => ({
                    id: session.id,
                    title: getSessionTitle(session, "Untitled goal"),
                    sessionTime: formatSessionTime(getSessionEndDate(session)),
                    sessionTimestamp: getSessionEndDate(session).getTime(),
                    plannedMinutes: getPlannedMinutes(session),
                    actualMinutes: getActualMinutes(session),
                }))
                .sort((a, b) => b.sessionTimestamp - a.sessionTimestamp),
        [todayFocusSessions],
    );

    const unlinkedGoals = useMemo(
        () =>
            todayFocusSessions
                .filter((session) => !Boolean(session.importedFromGoal || session.imported_from_goal))
                .map((session) => ({
                    id: session.id,
                    title: getSessionTitle(session, "Untitled session"),
                    sessionTime: formatSessionTime(getSessionEndDate(session)),
                    sessionTimestamp: getSessionEndDate(session).getTime(),
                    plannedMinutes: getPlannedMinutes(session),
                    actualMinutes: getActualMinutes(session),
                }))
                .sort((a, b) => b.sessionTimestamp - a.sessionTimestamp),
        [todayFocusSessions],
    );

    if (todayFocusSessions.length === 0) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                    <History className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No focus sessions today.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-4">
            <div>
                <h3 className="text-base font-bold text-foreground">Today's Focus</h3>
                <p className="text-xs text-muted-foreground mt-1">Today only.</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-center">
                <div className="text-2xl font-extrabold text-foreground">{formatMinutes(todayTotalFocusMinutes)}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Focus Time</div>
            </div>

            {renderHistorySection(
                "Linked Goals",
                "Today's linked goals with time set.",
                "No linked goals today.",
                linkedGoals,
                "violet",
            )}

            {renderHistorySection(
                "Unlinked Goals",
                "Today's unlinked goals with time set.",
                "No unlinked goals today.",
                unlinkedGoals,
                "blue",
            )}
        </div>
    );
};

export type HistoryTask = {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
    importedFromGoal?: boolean;
};
