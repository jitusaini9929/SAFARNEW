import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { EkagraModeSession } from '@shared/api';
import { TaskHistoryPanel } from '@/components/focus/sidebar/TaskHistoryPanel';
import { SessionOverlay } from '@/components/focus/sidebar/SessionOverlay';
import { dataService } from '@/utils/dataService';

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
    tasks: Task[];
    onTasksChange: (tasks: Task[]) => void;
    sessions?: EkagraModeSession[];
    activeSessionId?: string | null;
    liveSessionPreview?: EkagraModeSession | null;
    onResumeSession?: (sessionId: string) => Promise<void> | void;
    onDiscardSession?: (sessionId: string) => Promise<void> | void;
    onDeleteSession?: (sessionId: string) => Promise<void> | void;
    onCompleteSessionGoal?: (goalId: string, completedAt: string, sessionStatus: string) => Promise<void> | void;
    onPauseLiveSession?: () => Promise<void> | void;
    onCompleteLiveSession?: () => Promise<void> | void;
    onSwitchLiveSession?: () => Promise<void> | void;
    onSelectPlannedSessionGoal?: (goalId: string, goalTitle: string) => Promise<void> | void;
    onCreateSession?: (title: string) => Promise<void> | void;
    sessionOverlayTrigger?: number;
}

const TasksSidebar: React.FC<TasksSidebarProps> = ({
    isOpen,
    onClose,
    onTasksChange: _onTasksChange,
    tasks,
    sessions = [],
    activeSessionId = null,
    liveSessionPreview = null,
    onResumeSession,
    onDiscardSession,
    onDeleteSession,
    onCompleteSessionGoal,
    onPauseLiveSession,
    onCompleteLiveSession,
    onSwitchLiveSession,
    onSelectPlannedSessionGoal,
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
    const hiddenSessionIdSet = useMemo(
        () => new Set(optimisticHiddenSessionIds),
        [optimisticHiddenSessionIds],
    );
    const visibleMergedSessions = useMemo(
        () => mergedSessions.filter((session) => !hiddenSessionIdSet.has(session.id)),
        [hiddenSessionIdSet, mergedSessions],
    );
    const mergedActiveSessionId = shouldUseLocalFetch ? localActiveSessionId : activeSessionId;
    const openSessionGoalIds = useMemo(() => {
        const ids = new Set<string>();
        for (const session of visibleMergedSessions) {
            const status = String(session.status || "").toLowerCase();
            if (status !== "active" && status !== "paused") continue;
            const goalId = String(session.goalId || session.goal_id || "").trim();
            if (goalId) ids.add(goalId);
        }
        return ids;
    }, [visibleMergedSessions]);

    const pendingImportedGoals = useMemo(
        () => tasks.filter((task) => Boolean(task.importedFromGoal) && !task.completed),
        [tasks],
    );

    const plannedImportedSessions = useMemo<EkagraModeSession[]>(() => {
        return pendingImportedGoals
            .filter((task) => !openSessionGoalIds.has(task.id))
            .map((task) => {
                const timestamp = task.createdAt || new Date().toISOString();
                return {
                    id: `planned-imported-${task.id}`,
                    userId: "planned",
                    goalId: task.id,
                    goalTitle: task.text,
                    source: "imported",
                    status: "paused",
                    mode: "Timer",
                    totalSeconds: 25 * 60,
                    remainingSeconds: 25 * 60,
                    isRunning: false,
                    importedFromGoal: true,
                    pauseCount: 0,
                    sessionStartedAt: null,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    completedAt: null,
                    endedAt: null,
                    discardedAt: null,
                    user_id: "planned",
                    goal_id: task.id,
                    goal_title: task.text,
                    total_seconds: 25 * 60,
                    remaining_seconds: 25 * 60,
                    is_running: false,
                    imported_from_goal: true,
                    pause_count: 0,
                    session_started_at: null,
                    created_at: timestamp,
                    updated_at: timestamp,
                    completed_at: null,
                    ended_at: null,
                    discarded_at: null,
                };
            });
    }, [openSessionGoalIds, pendingImportedGoals]);

    const baseSessions = useMemo(
        () => [...visibleMergedSessions, ...plannedImportedSessions],
        [visibleMergedSessions, plannedImportedSessions],
    );

    const hasServerActiveSession = visibleMergedSessions.some(
        (session) => String(session.status || "").toLowerCase() === "active",
    );
    const shouldInjectLivePreview = Boolean(
        liveSessionPreview &&
        !hasServerActiveSession &&
        (String(liveSessionPreview.status || "").toLowerCase() === "active" ||
            String(liveSessionPreview.status || "").toLowerCase() === "paused"),
    );
    const displaySessions = shouldInjectLivePreview
        ? [liveSessionPreview!, ...baseSessions.filter((session) => session.id !== liveSessionPreview!.id)]
        : baseSessions;
    const effectiveActiveSessionId =
        mergedActiveSessionId ||
        (shouldInjectLivePreview && String(liveSessionPreview?.status || "").toLowerCase() === "active"
            ? liveSessionPreview?.id || null
            : null);

    const isSyntheticLiveSession = (sessionId: string) =>
        Boolean(
            liveSessionPreview &&
            liveSessionPreview.id === sessionId &&
            !baseSessions.some((session) => session.id === sessionId),
        );

    const isSyntheticImportedSession = (sessionId: string) =>
        plannedImportedSessions.some((session) => session.id === sessionId);

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
        await dataService.activateEkagraSession({
            goalId: String(target.goalId || target.goal_id || ""),
            goalTitle: String(target.goalTitle || target.goal_title || ""),
            importedFromGoal: Boolean(target.importedFromGoal || target.imported_from_goal),
            overrideActive: true,
        });
        await refreshLocalSessions();
    };

    const handleResume = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) {
            await onSwitchLiveSession?.();
            return;
        }
        if (isSyntheticImportedSession(sessionId)) {
            const planned = plannedImportedSessions.find((session) => session.id === sessionId);
            if (!planned) return;
            const goalId = String(planned.goalId || planned.goal_id || "").trim();
            const goalTitle = String(planned.goalTitle || planned.goal_title || "").trim();
            if (!goalId || !goalTitle) return;
            await onSelectPlannedSessionGoal?.(goalId, goalTitle);
            return;
        }
        if (onResumeSession) {
            await onResumeSession(sessionId);
            return;
        }
        await defaultResume(sessionId);
    };

    const handleDiscard = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId) || isSyntheticImportedSession(sessionId)) return;
        if (onDiscardSession) {
            await onDiscardSession(sessionId);
            return;
        }
        const session = displaySessions.find((item) => item.id === sessionId);
        const status = String(session?.status || "").toLowerCase();
        if (status === "completed" || status === "discarded" || status === "ended_early") {
            await dataService.deleteEkagraSession(sessionId);
        } else {
            await dataService.discardEkagraSession(sessionId);
        }
        await refreshLocalSessions();
    };

    const handleDelete = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) return;
        if (onDeleteSession) {
            await onDeleteSession(sessionId);
            return;
        }
        if (isSyntheticImportedSession(sessionId)) return;
        await dataService.deleteEkagraSession(sessionId);
        await refreshLocalSessions();
    };

    const handlePause = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) {
            await onPauseLiveSession?.();
            return;
        }
        if (isSyntheticImportedSession(sessionId)) return;

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
        if (isSyntheticImportedSession(sessionId)) return;
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
        const sessionRemainingSeconds = Math.max(0, Number(session?.remainingSeconds ?? session?.remaining_seconds ?? 0) || 0);
        const elapsedSeconds = Math.max(0, sessionTotalSeconds - sessionRemainingSeconds);

        try {
            const completedSession = await dataService.completeEkagraSession(sessionId, {
                mode: session?.mode || "Timer",
                elapsedSeconds,
                remainingSeconds: sessionRemainingSeconds,
                sessionStartedAt: session?.sessionStartedAt || session?.session_started_at || null,
            });
            if (session?.mode === "Timer") {
                const goalId = String(session?.goalId || session?.goal_id || "").trim();
                if (goalId) {
                    const completedAt = new Date().toISOString();
                    await onCompleteSessionGoal?.(goalId, completedAt, String(completedSession?.status || ""));
                }
            }
            await refreshLocalSessions();
        } catch (error) {
            restoreHiddenSession(sessionId);
            console.error("Complete Ekagra session error:", error);
        }
    };

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
                            {/* History panel now reads exclusively from session records */}
                            <TaskHistoryPanel sessions={displaySessions} />
                        </div>
                    </div>
                </>
            )}

            <SessionOverlay
                open={showSessionOverlay}
                onClose={() => setShowSessionOverlay(false)}
                sessions={displaySessions}
                activeSessionId={effectiveActiveSessionId}
                importedQueueCount={pendingImportedGoals.length}
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
