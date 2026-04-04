import React, { useMemo } from "react";
import { Pause, Play, X, Square, Timer, Coffee, Sofa, Trash2 } from "lucide-react";
import { EkagraModeSession } from "@shared/api";

interface SessionOverlayProps {
    open: boolean;
    onClose: () => void;
    sessions: EkagraModeSession[];
    activeSessionId?: string | null;
    importedQueueCount?: number;
    onCreateSession?: (title: string) => Promise<void> | void;
    onSwitchSession?: (sessionId: string) => Promise<void> | void;
    onPauseSession?: (sessionId: string) => Promise<void> | void;
    onCompleteSession?: (sessionId: string) => Promise<void> | void;
    onDiscardSession?: (sessionId: string) => Promise<void> | void;
    onDeleteSession?: (sessionId: string) => Promise<void> | void;
}

/* ─── helpers ───────────────────────────────────────── */

const toMs = (value: unknown) => {
    const parsed = new Date(String(value || ""));
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
};

const formatAgo = (value: unknown) => {
    const ms = toMs(value);
    if (!ms) return "just now";
    const diffMin = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const hours = Math.round(diffMin / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};

const getTitle = (session: EkagraModeSession) =>
    String(session.goalTitle || session.goal_title || "").trim() || "Unlabeled";

const getRemainingSeconds = (session: EkagraModeSession) =>
    Number(session.remainingSeconds ?? session.remaining_seconds ?? 0);

const getTotalSeconds = (session: EkagraModeSession) =>
    Number(session.totalSeconds ?? session.total_seconds ?? 0);

const getElapsedMinutes = (session: EkagraModeSession) =>
    Math.max(0, Math.round((getTotalSeconds(session) - getRemainingSeconds(session)) / 60));

const getModeLabel = (session: EkagraModeSession): string => {
    const mode = String(session.mode || "").toLowerCase();
    if (mode === "short") return "Short break";
    if (mode === "long") return "Long break";
    return "Focus";
};

const getModeIcon = (session: EkagraModeSession) => {
    const mode = String(session.mode || "").toLowerCase();
    if (mode === "short") return Coffee;
    if (mode === "long") return Sofa;
    return Timer;
};

const isPlannedImportedSession = (session: EkagraModeSession) =>
    Boolean(session.importedFromGoal || session.imported_from_goal) &&
    String(session.id || "").startsWith("planned-imported-");

/* ─── component ─────────────────────────────────────── */

export const SessionOverlay: React.FC<SessionOverlayProps> = ({
    open,
    onClose,
    sessions,
    activeSessionId = null,
    importedQueueCount = 0,
    onSwitchSession,
    onPauseSession,
    onCompleteSession,
    onDiscardSession,
    onDeleteSession,
}) => {
    /* Separate into current (active) and saved (paused) */
    const { current, saved } = useMemo(() => {
        const sorted = [...sessions].sort(
            (a, b) => toMs(b.updatedAt || b.updated_at) - toMs(a.updatedAt || a.updated_at),
        );

        const activeSessions = sorted.filter((s) => String(s.status || "").toLowerCase() === "active");
        const pausedSessions = sorted.filter((s) => String(s.status || "").toLowerCase() === "paused");

        const currentSession =
            sorted.find((s) => s.id === activeSessionId) ||
            activeSessions[0] ||
            null;

        return {
            current: currentSession,
            saved: pausedSessions,
        };
    }, [sessions, activeSessionId]);

    if (!open) return null;

    const isEmpty = !current && saved.length === 0;

    return (
        <>
            <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[81] p-4 sm:p-6 flex items-center justify-center">
                <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
                    {/* ─── Header ─────────────────────── */}
                    <div className="flex items-center justify-between gap-3 p-5 pb-0">
                        <div>
                            <h2 className="text-xl font-extrabold text-foreground">Focus Sessions</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Manage running, paused, or queued sessions.</p>
                            {importedQueueCount > 0 && (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                                    {importedQueueCount} queued goal{importedQueueCount > 1 ? "s" : ""}
                                </p>
                            )}
                        </div>
                        <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg border border-border/60 bg-background flex items-center justify-center hover:bg-muted transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ─── Content ────────────────────── */}
                    <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">

                        {/* ─── Current Session ───────── */}
                        <section className="space-y-2">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Running Now</h3>
                            {current ? (
                                <CurrentSessionCard
                                    session={current}
                                    onPause={onPauseSession}
                                    onEnd={onCompleteSession}
                                    onDelete={onDeleteSession}
                                />
                            ) : (
                                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                                    No active session running.
                                </div>
                            )}
                        </section>

                        {/* ─── Saved for Later ───────── */}
                        <section className="space-y-2">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Paused</h3>
                            {saved.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                                    No paused or queued sessions.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {saved.map((session) => (
                                        <SavedSessionCard
                                            key={session.id}
                                            session={session}
                                            onResume={onSwitchSession}
                                            onEnd={onCompleteSession}
                                            onDelete={onDeleteSession}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* ─── Empty State ────────────── */}
                        {isEmpty && (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Timer className="w-12 h-12 mb-4 opacity-15" />
                                <p className="text-sm font-medium">No running or paused sessions.</p>
                                <p className="text-xs opacity-70 mt-1">Start a timer to create one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

/* ─── Current Session Card ──────────────────────────── */

const CurrentSessionCard: React.FC<{
    session: EkagraModeSession;
    onPause?: (id: string) => Promise<void> | void;
    onEnd?: (id: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
}> = ({ session, onPause, onEnd, onDelete }) => {
    const ModeIcon = getModeIcon(session);

    return (
        <div className="rounded-2xl border-2 border-green-500/40 bg-green-500/5 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-base font-bold text-foreground truncate">{getTitle(session)}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            <ModeIcon className="w-3.5 h-3.5" />
                            {getModeLabel(session)}
                        </span>
                        <span>•</span>
                        <span>{getElapsedMinutes(session)}m spent</span>
                    </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-300">
                    Running
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
                <button
                    type="button"
                    onClick={() => onPause?.(session.id)}
                    disabled={!onPause}
                    className="flex-1 h-10 rounded-lg bg-amber-500 text-white font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                >
                    <Pause className="w-4 h-4" />
                    Pause
                </button>
                <button
                    type="button"
                    onClick={() => onEnd?.(session.id)}
                    disabled={!onEnd}
                    className="flex-1 h-10 rounded-lg border border-rose-300/70 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-500/30 font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                >
                    <Square className="w-3.5 h-3.5" />
                    End Session
                </button>
                <button
                    type="button"
                    onClick={() => onDelete?.(session.id)}
                    disabled={!onDelete}
                    className="h-10 px-3 rounded-lg border border-border/60 bg-background text-foreground text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5 hover:bg-muted transition-colors"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                </button>
            </div>
        </div>
    );
};

/* ─── Saved Session Card ────────────────────────────── */

const SavedSessionCard: React.FC<{
    session: EkagraModeSession;
    onResume?: (id: string) => Promise<void> | void;
    onEnd?: (id: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
}> = ({ session, onResume, onEnd, onDelete }) => {
    const ModeIcon = getModeIcon(session);
    const plannedImported = isPlannedImportedSession(session);

    return (
        <div className="rounded-xl border border-amber-500/40 bg-card/80 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{getTitle(session)}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                            <ModeIcon className="w-3 h-3" />
                            {getModeLabel(session)}
                        </span>
                        {plannedImported ? (
                            <span>Ready to start</span>
                        ) : (
                            <>
                                <span>{getElapsedMinutes(session)}m spent</span>
                                <span>•</span>
                                <span>{formatAgo(session.updatedAt || session.updated_at)}</span>
                            </>
                        )}
                    </div>
                </div>
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                        plannedImported
                            ? "border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                            : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }`}
                >
                    {plannedImported ? "Queue" : "Paused"}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onResume?.(session.id)}
                    disabled={!onResume}
                    className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                    <Play className="w-3.5 h-3.5" />
                    {plannedImported ? "Start" : "Resume"}
                </button>
                {!plannedImported && (
                    <button
                        type="button"
                        onClick={() => onEnd?.(session.id)}
                        disabled={!onEnd}
                        className="h-8 px-4 rounded-md border border-rose-300/60 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 text-xs font-semibold disabled:opacity-50 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                    >
                        <Square className="w-3 h-3 mr-1 inline" />
                        End Session
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onDelete?.(session.id)}
                    disabled={!onDelete}
                    className="h-8 px-3 rounded-md border border-border/60 bg-background text-foreground text-xs font-semibold disabled:opacity-50 hover:bg-muted transition-colors inline-flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" />
                    {plannedImported ? "Remove" : "Delete"}
                </button>
            </div>
        </div>
    );
};
