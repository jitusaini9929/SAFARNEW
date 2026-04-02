import { useEffect, useRef } from "react";

type SyncStatus = "active" | "paused" | "completed" | "discarded";

interface RuntimeSnapshot {
    mode: "Timer" | "short" | "long";
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
    sessionStartedAt?: string | null;
    associatedGoalTitle?: string | null;
}

interface UseEkagraTimerSyncParams {
    enabled: boolean;
    activeSessionId: string | null;
    isRunning: boolean;
    mode: "Timer" | "short" | "long";
    totalSeconds: number;
    remainingSeconds: number;
    getRuntimeSnapshot: () => RuntimeSnapshot;
    syncSession: (options?: { status?: SyncStatus; force?: boolean }) => Promise<void> | void;
    apiBaseUrl?: string;
}

export const useEkagraTimerSync = ({
    enabled,
    activeSessionId,
    isRunning,
    mode,
    totalSeconds,
    remainingSeconds,
    getRuntimeSnapshot,
    syncSession,
    apiBaseUrl = "/api",
}: UseEkagraTimerSyncParams) => {
    const debounceTimerRef = useRef<number | null>(null);
    const lastRunningRef = useRef<boolean>(isRunning);

    useEffect(() => {
        if (!enabled || !activeSessionId) {
            lastRunningRef.current = isRunning;
            return;
        }

        if (lastRunningRef.current !== isRunning) {
            void syncSession({ status: isRunning ? "active" : "paused", force: true });
            lastRunningRef.current = isRunning;
        }
    }, [enabled, activeSessionId, isRunning, syncSession]);

    useEffect(() => {
        if (!enabled || !activeSessionId || !isRunning) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void syncSession({ status: "active", force: true });
        }, 15000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [enabled, activeSessionId, isRunning, syncSession]);

    useEffect(() => {
        if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (!enabled || !activeSessionId || isRunning) {
            return;
        }

        debounceTimerRef.current = window.setTimeout(() => {
            void syncSession({ status: "paused", force: true });
            debounceTimerRef.current = null;
        }, 800);

        return () => {
            if (debounceTimerRef.current !== null) {
                window.clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [enabled, activeSessionId, isRunning, mode, totalSeconds, remainingSeconds, syncSession]);

    useEffect(() => {
        if (!enabled || !activeSessionId) return;

        const freezeOnLeave = () => {
            const snapshot = getRuntimeSnapshot();
            const payload = {
                status: "paused",
                mode: snapshot.mode,
                totalSeconds: snapshot.totalSeconds,
                remainingSeconds: Math.max(1, snapshot.remainingSeconds),
                isRunning: false,
                sessionStartedAt: snapshot.sessionStartedAt || null,
                goalTitle: snapshot.associatedGoalTitle || undefined,
            };

            void fetch(`${apiBaseUrl}/ekagra-sessions/${encodeURIComponent(activeSessionId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                keepalive: true,
                body: JSON.stringify(payload),
            }).catch(() => {
                // Ignore unload delivery errors.
            });
        };

        window.addEventListener("pagehide", freezeOnLeave);
        window.addEventListener("beforeunload", freezeOnLeave);
        return () => {
            window.removeEventListener("pagehide", freezeOnLeave);
            window.removeEventListener("beforeunload", freezeOnLeave);
        };
    }, [enabled, activeSessionId, getRuntimeSnapshot, apiBaseUrl]);
};

