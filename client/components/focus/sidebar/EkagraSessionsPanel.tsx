import React, { useMemo, useState } from "react";
import { Clock3, PauseCircle, Play } from "lucide-react";
import { EkagraModeSession } from "@shared/api";
import { SessionOverlay } from "@/components/focus/sidebar/SessionOverlay";

interface EkagraSessionsPanelProps {
    sessions: EkagraModeSession[];
    activeSessionId?: string | null;
    onResumeSession?: (sessionId: string) => Promise<void> | void;
    onPauseSession?: (sessionId: string) => Promise<void> | void;
    onCompleteSession?: (sessionId: string) => Promise<void> | void;
    onDiscardSession?: (sessionId: string) => Promise<void> | void;
}

const toDateMillis = (value: unknown) => {
    const parsed = new Date(String(value || ""));
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
};

const getSessionGoalTitle = (session: EkagraModeSession) => {
    const title = String(
        session.sessionTitle || session.session_title || session.goalTitle || session.goal_title || "",
    ).trim();
    return title || "Untitled task";
};

const isImportedSession = (session: EkagraModeSession) =>
    Boolean(session.importedFromGoal || session.imported_from_goal);

export const EkagraSessionsPanel: React.FC<EkagraSessionsPanelProps> = ({
    sessions,
    activeSessionId = null,
    onResumeSession,
    onPauseSession,
    onCompleteSession,
    onDiscardSession,
}) => {
    const [sessionActionId, setSessionActionId] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);

    const openSessions = useMemo(
        () =>
            sessions
                .filter((session) => {
                    const status = String(session.status || "").toLowerCase();
                    return status === "active" || status === "paused";
                })
                .sort((a, b) => {
                    const aActive = a.id === activeSessionId || String(a.status || "").toLowerCase() === "active" ? 1 : 0;
                    const bActive = b.id === activeSessionId || String(b.status || "").toLowerCase() === "active" ? 1 : 0;
                    if (aActive !== bActive) return bActive - aActive;
                    return toDateMillis(b.updatedAt || b.updated_at) - toDateMillis(a.updatedAt || a.updated_at);
                }),
        [sessions, activeSessionId],
    );

    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">Live Sessions</h3>
                    <button
                        type="button"
                        onClick={() => setShowOverlay(true)}
                        className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                    >
                        Open Overlay
                    </button>
                </div>

                {openSessions.length === 0 && (
                    <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                        No active or paused Ekagra sessions right now.
                    </div>
                )}

                {openSessions.map((session) => {
                    const sessionId = String(session.id || "");
                    const sessionStatus = String(session.status || "").toLowerCase();
                    const isActive = sessionId === activeSessionId || sessionStatus === "active";
                    const isActionLoading = sessionActionId === sessionId;
                    const totalSeconds = Number(session.totalSeconds || session.total_seconds || 0);
                    const remainingSeconds = Number(session.remainingSeconds || session.remaining_seconds || 0);
                    const safeTotal = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
                    const safeRemaining = Number.isFinite(remainingSeconds) && remainingSeconds >= 0 ? remainingSeconds : 0;
                    const elapsedMinutes = Math.max(0, Math.round((safeTotal - safeRemaining) / 60));
                    const leftMinutes = Math.max(0, Math.round(safeRemaining / 60));

                    return (
                        <div key={sessionId} className="rounded-xl border border-border/60 bg-card/80 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold truncate">{getSessionGoalTitle(session)}</div>
                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock3 className="w-3.5 h-3.5" />
                                            {`${leftMinutes}m left`}
                                        </span>
                                        <span>{`Elapsed ${elapsedMinutes}m`}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {isImportedSession(session) && (
                                        <span className="inline-flex items-center rounded-full border border-emerald-300/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                            Imported from Goals
                                        </span>
                                    )}
                                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted px-2 py-0.5 text-[10px] font-semibold">
                                        {isActive ? "Active" : "Paused"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!onResumeSession || !sessionId || isActionLoading || isActive) return;
                                        setSessionActionId(sessionId);
                                        try {
                                            await onResumeSession(sessionId);
                                        } finally {
                                            setSessionActionId(null);
                                        }
                                    }}
                                    disabled={!onResumeSession || !sessionId || isActionLoading || isActive}
                                    className="h-8 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                >
                                    {isActive ? <PauseCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    {isActive ? "Current" : "Switch"}
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!onDiscardSession || !sessionId || isActionLoading) return;
                                        setSessionActionId(sessionId);
                                        try {
                                            await onDiscardSession(sessionId);
                                        } finally {
                                            setSessionActionId(null);
                                        }
                                    }}
                                    disabled={!onDiscardSession || !sessionId || isActionLoading}
                                    className="h-8 px-3 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Discard
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <SessionOverlay
                open={showOverlay}
                onClose={() => setShowOverlay(false)}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSwitchSession={onResumeSession}
                onPauseSession={onPauseSession}
                onCompleteSession={onCompleteSession}
                onDiscardSession={onDiscardSession}
            />
        </>
    );
};
