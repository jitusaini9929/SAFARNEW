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
    onPauseLiveSession?: () => Promise<void> | void;
    onCompleteLiveSession?: () => Promise<void> | void;
    onSwitchLiveSession?: () => Promise<void> | void;
    onCreateSession?: (title: string) => Promise<void> | void;
    sessionOverlayTrigger?: number;
}

const TasksSidebar: React.FC<TasksSidebarProps> = ({
    isOpen,
    onClose,
    onTasksChange: _onTasksChange,
    tasks: _tasks,
    sessions = [],
    activeSessionId = null,
    liveSessionPreview = null,
    onResumeSession,
    onDiscardSession,
    onPauseLiveSession,
    onCompleteLiveSession,
    onSwitchLiveSession,
    onCreateSession,
    sessionOverlayTrigger = 0,
}) => {
    const [showSessionOverlay, setShowSessionOverlay] = useState(false);
    const [localSessions, setLocalSessions] = useState<EkagraModeSession[]>([]);
    const [localActiveSessionId, setLocalActiveSessionId] = useState<string | null>(null);

    const hasExternalSessionController = Boolean(
        onResumeSession || onDiscardSession || onPauseLiveSession || onCompleteLiveSession || onSwitchLiveSession,
    );
    const shouldUseLocalFetch = !hasExternalSessionController && sessions.length === 0;

    const mergedSessions = shouldUseLocalFetch ? localSessions : sessions;
    const mergedActiveSessionId = shouldUseLocalFetch ? localActiveSessionId : activeSessionId;
    const hasServerActiveSession = mergedSessions.some(
        (session) => String(session.status || "").toLowerCase() === "active",
    );
    const shouldInjectLivePreview = Boolean(
        liveSessionPreview &&
        !hasServerActiveSession &&
        (String(liveSessionPreview.status || "").toLowerCase() === "active" ||
            String(liveSessionPreview.status || "").toLowerCase() === "paused"),
    );
    const displaySessions = shouldInjectLivePreview
        ? [liveSessionPreview!, ...mergedSessions.filter((session) => session.id !== liveSessionPreview!.id)]
        : mergedSessions;
    const effectiveActiveSessionId =
        mergedActiveSessionId ||
        (shouldInjectLivePreview && String(liveSessionPreview?.status || "").toLowerCase() === "active"
            ? liveSessionPreview?.id || null
            : null);

    const isSyntheticLiveSession = (sessionId: string) =>
        Boolean(
            liveSessionPreview &&
            liveSessionPreview.id === sessionId &&
            !mergedSessions.some((session) => session.id === sessionId),
        );

    const refreshLocalSessions = async () => {
        try {
            const [all, active] = await Promise.all([
                dataService.getEkagraSessions(),
                dataService.getActiveEkagraSession(),
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
        const session = displaySessions.find((item) => item.id === sessionId);
        const status = String(session?.status || "").toLowerCase();
        if (status === "completed" || status === "discarded" || status === "ended_early") {
            await dataService.deleteEkagraSession(sessionId);
        } else {
            await dataService.discardEkagraSession(sessionId);
        }
        await refreshLocalSessions();
    };

    const handlePause = async (sessionId: string) => {
        if (isSyntheticLiveSession(sessionId)) {
            await onPauseLiveSession?.();
            return;
        }

        if (onPauseLiveSession && sessionId === effectiveActiveSessionId) {
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
        await dataService.completeEkagraSession(sessionId, {
            mode: session?.mode || "Timer",
            totalSeconds: Number(session?.totalSeconds ?? session?.total_seconds ?? 0) || 1500,
            sessionStartedAt: session?.sessionStartedAt || session?.session_started_at || null,
        });
        await refreshLocalSessions();
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
                onCreateSession={async (title) => {
                    await onCreateSession?.(title);
                    setShowSessionOverlay(false);
                }}
                onSwitchSession={handleResume}
                onPauseSession={handlePause}
                onCompleteSession={handleComplete}
                onDiscardSession={handleDiscard}
            />
        </>
    );
};

export default TasksSidebar;
export type { Task };
