import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { EkagraModeSession } from "@shared/api";
import { TaskHistoryPanel } from "@/components/focus/sidebar/TaskHistoryPanel";
import { SessionOverlay } from "@/components/focus/sidebar/SessionOverlay";
import { dataService } from "@/utils/dataService";

interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
    importedFromGoal?: boolean;
}

interface TasksSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    sessions?: EkagraModeSession[];
    activeSessionId?: string | null;
    liveSessionPreview?: EkagraModeSession | null;
    onResumeSession?: (sessionId: string) => Promise<void> | void;
    onDiscardSession?: (sessionId: string) => Promise<void> | void;
    onDeleteSession?: (sessionId: string) => Promise<void> | void;
    onPauseLiveSession?: () => Promise<void> | void;
    onCompleteLiveSession?: () => Promise<void> | void;
    onSwitchLiveSession?: () => Promise<void> | void;
    onCreateSession?: (title: string) => Promise<void> | void;
    sessionOverlayTrigger?: number;
}

const TasksSidebar: React.FC<TasksSidebarProps> = ({
    isOpen,
    onClose,
    sessions = [],
    activeSessionId = null,
    liveSessionPreview = null,
    onResumeSession,
    onDiscardSession,
    onDeleteSession,
    onPauseLiveSession,
    onCompleteLiveSession,
    onSwitchLiveSession,
    onCreateSession,
    sessionOverlayTrigger = 0,
}) => {
    const [showSessionOverlay, setShowSessionOverlay] = useState(false);
    const [localSessions, setLocalSessions] = useState<EkagraModeSession[]>([]);
    const [localActiveSessionId, setLocalActiveSessionId] = useState<string | null>(null);
    const [optimisticHiddenSessionIds, setOptimisticHiddenSessionIds] = useState<string[]>([]);

    const hasExternalSessionController = Boolean(
        onResumeSession || onDiscardSession || onPauseLiveSession || onCompleteLiveSession || onSwitchLiveSession,
    );
    const shouldUseLocalFetch = !hasExternalSessionController && sessions.length === 0;

    const mergedSessions = shouldUseLocalFetch ? localSessions : sessions;
    const hiddenSessionIdSet = useMemo(() => new Set(optimisticHiddenSessionIds), [optimisticHiddenSessionIds]);
    const visibleMergedSessions = useMemo(
        () => mergedSessions.filter((session) => !hiddenSessionIdSet.has(session.id)),
        [hiddenSessionIdSet, mergedSessions],
    );
    const mergedActiveSessionId = shouldUseLocalFetch ? localActiveSessionId : activeSessionId;

    const hasServerActiveSession = visibleMergedSessions.some(
        (session) => String(session.status || "").toLowerCase() === "active",
    );
    const shouldInjectLivePreview = Boolean(
        liveSessionPreview &&
        !hasServerActiveSession &&
        ["active", "paused"].includes(String(liveSessionPreview.status || "").toLowerCase()),
    );
    const displaySessions = shouldInjectLivePreview
        ? [liveSessionPreview!, ...visibleMergedSessions.filter((session) => session.id !== liveSessionPreview!.id)]
        : visibleMergedSessions;
    const effectiveActiveSessionId =
        mergedActiveSessionId ||
        (shouldInjectLivePreview && String(liveSessionPreview?.status || "").toLowerCase() === "active"
            ? liveSessionPreview?.id || null
            : null);

    const isSyntheticLiveSession = (sessionId: string) =>
        Boolean(
            liveSessionPreview &&
            liveSessionPreview.id === sessionId &&
            !visibleMergedSessions.some((session) => session.id === sessionId),
        );

    const refreshLocalSessions = async () => {
        try {
            const [all, active] = await Promise.all([
                dataService.getEkagraSessions({ forceFresh: true }),
                dataService.getActiveEkagraSession({ forceFresh: true }),
            ]);
            setLocalSessions(all);
            setLocalActiveSessionId(active?.id || null);
        } catch {
            // Keep UI resilient on network failures.
        }
    };

    useEffect(() => {
        if ((!isOpen && !showSessionOverlay) || !shouldUseLocalFetch) return;

        const isVisible = () =>
            typeof document === "undefined" || document.visibilityState === "visible";

        const poll = () => {
            if (!isVisible()) return;
            if (!isOpen && !showSessionOverlay) return;
            void refreshLocalSessions();
        };

        poll();

        const onVisibilityChange = () => {
            if (isVisible() && (isOpen || showSessionOverlay)) {
                void refreshLocalSessions();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        const id = window.setInterval(() => {
            poll();
        }, 20000);

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.clearInterval(id);
        };
    }, [isOpen, shouldUseLocalFetch, showSessionOverlay]);

    useEffect(() => {
        if (sessionOverlayTrigger > 0) {
            setShowSessionOverlay(true);
        }
    }, [sessionOverlayTrigger]);

    useEffect(() => {
        if (optimisticHiddenSessionIds.length === 0) return;
        setOptimisticHiddenSessionIds((prev) => {
            const next = prev.filter((id) => {
                const session = mergedSessions.find((item) => item.id === id);
                if (!session) return false;
                const status = String(session.status || "").toLowerCase();
                return status === "active" || status === "paused";
            });
            if (next.length === prev.length && next.every((id, index) => id === prev[index])) return prev;
            return next;
        });
    }, [mergedSessions, optimisticHiddenSessionIds.length]);

    const hideSessionOptimistically = (sessionId: string) => {
        setOptimisticHiddenSessionIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
    };

    const restoreHiddenSession = (sessionId: string) => {
        setOptimisticHiddenSessionIds((prev) => prev.filter((id) => id !== sessionId));
    };

    const defaultResume = async (sessionId: string) => {
        const target = displaySessions.find((session) => session.id === sessionId);
        if (!target) return;

        await dataService.updateEkagraSession(target.id, {
            status: "active",
            mode: "Timer",
            totalSeconds: Number(target.totalSeconds ?? target.total_seconds ?? 25 * 60),
            remainingSeconds: Number(target.remainingSeconds ?? target.remaining_seconds ?? 25 * 60),
            isRunning: true,
            sessionStartedAt: target.sessionStartedAt || target.session_started_at || null,
            goalTitle: String(target.goalTitle || target.goal_title || ""),
            importedFromGoal: Boolean(target.importedFromGoal || target.imported_from_goal),
        });

        await refreshLocalSessions();
    };

    const handleResume = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) {
            await onSwitchLiveSession?.();
            return;
        }
        if (onResumeSession) {
            await onResumeSession(sessionId);
            return;
        }
        await defaultResume(sessionId);
    };

    const handleDiscard = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) return;
        if (onDiscardSession) {
            await onDiscardSession(sessionId);
            return;
        }
        await dataService.discardEkagraSession(sessionId);
        await refreshLocalSessions();
    };

    const handleDelete = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) return;
        if (onDeleteSession) {
            await onDeleteSession(sessionId);
            return;
        }
        await dataService.deleteEkagraSession(sessionId);
        await refreshLocalSessions();
    };

    const handlePause = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) {
            await onPauseLiveSession?.();
            return;
        }

        const session = displaySessions.find((item) => item.id === sessionId);
        const isActiveSession =
            sessionId === effectiveActiveSessionId ||
            String(session?.status || "").toLowerCase() === "active";

        if (onPauseLiveSession && isActiveSession) {
            await onPauseLiveSession();
            return;
        }

        await dataService.updateEkagraSession(sessionId, { status: "paused", isRunning: false });
        await refreshLocalSessions();
    };

    const handleComplete = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) {
            await onCompleteLiveSession?.();
            return;
        }

        const session = displaySessions.find((item) => item.id === sessionId);
        const isActiveSession =
            sessionId === effectiveActiveSessionId ||
            String(session?.status || "").toLowerCase() === "active";

        hideSessionOptimistically(sessionId);

        if (onCompleteLiveSession && isActiveSession) {
            try {
                await onCompleteLiveSession();
            } catch (error) {
                restoreHiddenSession(sessionId);
                console.error("Complete live Ekagra session error:", error);
            }
            return;
        }

        const sessionTotalSeconds = Number(session?.totalSeconds ?? session?.total_seconds ?? 0) || 1500;
        const sessionRemainingSeconds = Math.max(
            0,
            Number(session?.remainingSeconds ?? session?.remaining_seconds ?? 0) || 0,
        );
        const elapsedSeconds = Math.max(0, sessionTotalSeconds - sessionRemainingSeconds);

        try {
            await dataService.completeEkagraSession(sessionId, {
                mode: session?.mode || "Timer",
                elapsedSeconds,
                remainingSeconds: sessionRemainingSeconds,
                sessionStartedAt: session?.sessionStartedAt || session?.session_started_at || null,
            });
            await refreshLocalSessions();
        } catch (error) {
            restoreHiddenSession(sessionId);
            console.error("Complete Ekagra session error:", error);
        }
    };

    const historyRefreshKey = useMemo(
        () => `${displaySessions.map((session) => session.id).join("|")}:${effectiveActiveSessionId ?? ""}`,
        [displaySessions, effectiveActiveSessionId],
    );

    return (
        <>
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[65]"
                        onClick={onClose}
                    />
                    <div className="fixed inset-y-0 right-0 w-[min(22rem,100vw)] max-w-full bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[70] p-4 sm:p-6 pr-[max(1rem,env(safe-area-inset-right))] flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold font-['Poppins']">Focus History</h2>
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                            <TaskHistoryPanel isOpen={isOpen} refreshKey={historyRefreshKey} />
                        </div>
                    </div>
                </>
            )}

            <SessionOverlay
                open={showSessionOverlay}
                onClose={() => setShowSessionOverlay(false)}
                sessions={displaySessions}
                activeSessionId={effectiveActiveSessionId}
                onCreateSession={async (title) => {
                    await onCreateSession?.(title);
                    setShowSessionOverlay(false);
                }}
                onSwitchSession={handleResume}
                onPauseSession={handlePause}
                onCompleteSession={handleComplete}
                onDiscardSession={handleDiscard}
                onDeleteSession={handleDelete}
            />
        </>
    );
};

export default TasksSidebar;
export type { Task };
