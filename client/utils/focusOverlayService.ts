import { apiFetch } from "@/utils/apiFetch";
export interface OverlayPosition {
  x: number;
  y: number;
}

export interface FocusOverlayState {
  sessionId: string;
  isRunning: boolean;
  totalActiveMs: number;
  longestContinuousMs: number;
  currentSectionId: string;
  currentSectionName: string;
  timerStartedAtMs: number;
  sectionDurationsMs: Record<string, number>;
  position: OverlayPosition;
  isCollapsed?: boolean;
  updatedAt: number;
}

export interface FocusOverlayChunk {
  sectionId: string;
  sectionName: string;
  startTime: string;
  endTime: string;
  durationMs: number;
}

export interface FocusOverlayStats {
  todayActiveMs: number;
  weekAvgMs: number;
  lifetimeActiveMs: number;
  topSectionName: string;
  streakDays: number;
}

const API_BASE = "/api/focus-overlay";

export const focusOverlayService = {
  async getState(): Promise<{ state: FocusOverlayState | null; stats: FocusOverlayStats | null }> {
    const response = await apiFetch(`${API_BASE}/state`, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch focus overlay state");
    }
    const data = await response.json();
    return {
      state: data?.state || null,
      stats: data?.stats || null,
    };
  },

  async saveState(state: FocusOverlayState): Promise<void> {
    await apiFetch(`${API_BASE}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ state }),
    });
  },

  async flush(payload: {
    sessionId: string;
    chunks: FocusOverlayChunk[];
    longestContinuousMs: number;
    totalActiveMs: number;
    isRunning: boolean;
  }): Promise<void> {
    await apiFetch(`${API_BASE}/flush`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  },
};

