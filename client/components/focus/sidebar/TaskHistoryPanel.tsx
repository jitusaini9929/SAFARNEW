import React, { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { EkagraAnalyticsFocusSession } from "@shared/api";
import { dataService } from "@/utils/dataService";

interface FocusHistoryPanelProps {
    isOpen: boolean;
    refreshKey?: string;
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

const getSessionEndDate = (session: EkagraAnalyticsFocusSession): Date => {
    const millis = toDateMillis(session.endedAt || session.startedAt);
    return millis > 0 ? new Date(millis) : new Date();
};

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
                                Planned {formatMinutes(row.plannedMinutes)} | Actual {formatMinutes(row.actualMinutes)}
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

export const TaskHistoryPanel: React.FC<FocusHistoryPanelProps> = ({ isOpen, refreshKey = "" }) => {
    const [focusSessions, setFocusSessions] = useState<EkagraAnalyticsFocusSession[]>([]);
    const [loading, setLoading] = useState(true);
    const todayKey = getLocalDateKey(new Date());

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        const isVisible = () => typeof document === "undefined" || document.visibilityState === "visible";

        const load = async () => {
            try {
                const stats = await dataService.getEkagraAnalytics({ forceFresh: true });
                if (cancelled) return;
                setFocusSessions(Array.isArray(stats.focusSessions) ? stats.focusSessions : []);
            } catch (error) {
                if (!cancelled) {
                    console.error("Load focus history error:", error);
                    setFocusSessions([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        const onVisibilityChange = () => {
            if (isVisible()) {
                void load();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        const intervalId = window.setInterval(() => {
            if (isVisible()) {
                void load();
            }
        }, 20000);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.clearInterval(intervalId);
        };
    }, [isOpen, refreshKey]);

    const todayFocusSessions = useMemo(
        () =>
            focusSessions.filter((session) => getLocalDateKey(getSessionEndDate(session)) === todayKey),
        [focusSessions, todayKey],
    );

    const todayTotalFocusMinutes = useMemo(
        () => todayFocusSessions.reduce((sum, session) => sum + Math.max(0, Number(session.actualMinutes || 0)), 0),
        [todayFocusSessions],
    );

    const linkedGoals = useMemo(
        () =>
            todayFocusSessions
                .filter((session) => Boolean(session.associatedGoalId))
                .map((session) => ({
                    id: session.id,
                    title: String(session.taskText || "Untitled goal").trim() || "Untitled goal",
                    sessionTime: formatSessionTime(getSessionEndDate(session)),
                    sessionTimestamp: getSessionEndDate(session).getTime(),
                    plannedMinutes: Math.max(0, Number(session.durationMinutes || 0)),
                    actualMinutes: Math.max(0, Number(session.actualMinutes || 0)),
                }))
                .sort((a, b) => b.sessionTimestamp - a.sessionTimestamp),
        [todayFocusSessions],
    );

    const unlinkedGoals = useMemo(
        () =>
            todayFocusSessions
                .filter((session) => !session.associatedGoalId)
                .map((session) => ({
                    id: session.id,
                    title: String(session.taskText || "Untitled session").trim() || "Untitled session",
                    sessionTime: formatSessionTime(getSessionEndDate(session)),
                    sessionTimestamp: getSessionEndDate(session).getTime(),
                    plannedMinutes: Math.max(0, Number(session.durationMinutes || 0)),
                    actualMinutes: Math.max(0, Number(session.actualMinutes || 0)),
                }))
                .sort((a, b) => b.sessionTimestamp - a.sessionTimestamp),
        [todayFocusSessions],
    );

    if (loading) {
        return (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-6">
                <div className="text-sm text-muted-foreground">Loading today&apos;s focus history...</div>
            </div>
        );
    }

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
                <h3 className="text-base font-bold text-foreground">Today&apos;s Focus</h3>
                <p className="text-xs text-muted-foreground mt-1">Today only.</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-center">
                <div className="text-2xl font-extrabold text-foreground">{formatMinutes(todayTotalFocusMinutes)}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Focus Time</div>
            </div>

            {renderHistorySection(
                "Linked Sessions",
                "Today's goal-linked focus sessions.",
                "No linked sessions today.",
                linkedGoals,
                "violet",
            )}

            {renderHistorySection(
                "Unlinked Sessions",
                "Named and timer-only focus sessions.",
                "No unlinked sessions today.",
                unlinkedGoals,
                "blue",
            )}
        </div>
    );
};
