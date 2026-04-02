import { EkagraModeSession } from "@shared/api";
import { dataService } from "@/utils/dataService";

/**
 * Session rules:
 * - Only one Ekagra session can be active at a time.
 * - Open sessions are only "active" or "paused".
 * - Imported goal activation can conflict with an already active session.
 * - Conflict modal decides:
 *   - No: revert imported goal back to manual.
 *   - Yes: pause current active session, activate imported goal session.
 * - Completed/discarded sessions leave the open-session list.
 * - Refresh should restore timer snapshot from persisted session state.
 */

export type EkagraOpenStatus = "active" | "paused";

export const OPEN_EKAGRA_STATUSES = new Set<EkagraOpenStatus>(["active", "paused"]);

const toStatus = (session: EkagraModeSession) =>
    String(session.status || "").trim().toLowerCase();

export const getSessionGoalId = (session: EkagraModeSession) =>
    String(session.goalId || session.goal_id || "");

export const getSessionGoalTitle = (session: EkagraModeSession) =>
    String(session.goalTitle || session.goal_title || "");

export const isImportedSession = (session: EkagraModeSession) =>
    Boolean(session.importedFromGoal || session.imported_from_goal);

export const getOpenSessions = (sessions: EkagraModeSession[]) =>
    sessions.filter((session) => OPEN_EKAGRA_STATUSES.has(toStatus(session) as EkagraOpenStatus));

export const getActiveSession = (sessions: EkagraModeSession[]) =>
    sessions.find((session) => toStatus(session) === "active") || null;

export const resolveSessionSelection = (
    sessions: EkagraModeSession[],
    previousSessionId?: string | null,
) => {
    const active = getActiveSession(sessions);
    if (active?.id) {
        return { sessionId: active.id, session: active };
    }

    if (previousSessionId) {
        const same = sessions.find((session) => session.id === previousSessionId) || null;
        if (same) {
            return { sessionId: same.id, session: same };
        }
    }

    const paused = sessions.find((session) => toStatus(session) === "paused") || null;
    return { sessionId: paused?.id || null, session: paused };
};

export const canActivateSession = (activeSession: EkagraModeSession | null, goalId: string) =>
    !activeSession || getSessionGoalId(activeSession) === goalId;

export const listSessions = async () => {
    const sessions = await dataService.getEkagraSessions();
    return sessions;
};

export const getCurrentActiveSession = async () => {
    return dataService.getActiveEkagraSession();
};

export const activateSession = async (params: {
    goalId: string;
    goalTitle?: string | null;
    importedFromGoal?: boolean;
    overrideActive?: boolean;
}) => {
    return dataService.activateEkagraSession({
        goalId: params.goalId,
        goalTitle: params.goalTitle || undefined,
        source: params.importedFromGoal ? "imported" : "manual",
        importedFromGoal: Boolean(params.importedFromGoal),
        overrideActive: Boolean(params.overrideActive),
    });
};

export const pauseSession = async (
    sessionId: string,
    snapshot: {
        mode: "Timer" | "short" | "long";
        totalSeconds: number;
        remainingSeconds: number;
        isRunning: boolean;
        sessionStartedAt?: string | null;
        associatedGoalTitle?: string | null;
    },
) => {
    return dataService.updateEkagraSession(sessionId, {
        status: "paused",
        mode: snapshot.mode,
        totalSeconds: snapshot.totalSeconds,
        remainingSeconds: Math.max(1, snapshot.remainingSeconds),
        isRunning: false,
        sessionStartedAt: snapshot.sessionStartedAt || null,
        goalTitle: snapshot.associatedGoalTitle || undefined,
    });
};

export const syncSessionSnapshot = async (
    sessionId: string,
    snapshot: {
        mode: "Timer" | "short" | "long";
        totalSeconds: number;
        remainingSeconds: number;
        isRunning: boolean;
        sessionStartedAt?: string | null;
        associatedGoalTitle?: string | null;
    },
    options?: { status?: "active" | "paused" | "completed" | "discarded" },
) => {
    return dataService.updateEkagraSession(sessionId, {
        status: options?.status,
        mode: snapshot.mode,
        totalSeconds: snapshot.totalSeconds,
        remainingSeconds: Math.max(1, snapshot.remainingSeconds),
        isRunning: snapshot.isRunning,
        sessionStartedAt: snapshot.sessionStartedAt || null,
        goalTitle: snapshot.associatedGoalTitle || undefined,
    });
};

export const completeSession = async (
    sessionId: string,
    snapshot: {
        mode: "Timer" | "short" | "long";
        totalSeconds: number;
        sessionStartedAt?: string | null;
    },
) => {
    return dataService.completeEkagraSession(sessionId, {
        mode: snapshot.mode,
        totalSeconds: snapshot.totalSeconds,
        sessionStartedAt: snapshot.sessionStartedAt || null,
    });
};

export const discardSession = async (sessionId: string) => {
    return dataService.discardEkagraSession(sessionId);
};

export const revertImportedGoal = async (goalId: string) => {
    return dataService.revertImportedGoalFromEkagra(goalId);
};

