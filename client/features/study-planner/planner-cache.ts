import { Plan, CalendarItem } from "./plan.model";

/**
 * Handles read-only offline caching for the Study Planner.
 * Data is scoped by userId to prevent leaks.
 */

/**
 * Handles read-only offline caching for the Study Planner.
 * Data is scoped by userId to prevent leaks.
 */

export const getUserId = (): string | null => {
  try {
    const raw = localStorage.getItem("safar.cached_user");
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.id) return user.id;
      if (user && user._id) return user._id;
    }
  } catch {
    // ignore
  }
  return null;
};

const getCacheKey = (planId: string, type: "plan" | "calendar" | "analytics" | "meta") => {
  const userId = getUserId();
  if (!userId) throw new Error("Missing authenticated user, cache disabled");
  return `studyPlanner:${userId}:${planId}:${type}`;
};

export const plannerCache = {
  /** Save plan to cache */
  savePlan(plan: Plan) {
    if (!plan || !plan.id) return;
    try {
      localStorage.setItem(getCacheKey(plan.id, "plan"), JSON.stringify(plan));
      this.updateMeta(plan.id);
    } catch (e) {
      console.warn("Failed to cache plan", e);
    }
  },

  /** Load plan from cache */
  loadPlan(planId: string): Plan | null {
    try {
      const data = localStorage.getItem(getCacheKey(planId, "plan"));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /** Save calendar to cache */
  saveCalendar(planId: string, calendar: Record<string, CalendarItem[]>) {
    try {
      localStorage.setItem(getCacheKey(planId, "calendar"), JSON.stringify(calendar));
    } catch (e) {
      console.warn("Failed to cache calendar", e);
    }
  },

  /** Load calendar from cache */
  loadCalendar(planId: string): Record<string, CalendarItem[]> | null {
    try {
      const data = localStorage.getItem(getCacheKey(planId, "calendar"));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /** Save analytics to cache */
  saveAnalytics(planId: string, analyticsData: any) {
    try {
      localStorage.setItem(getCacheKey(planId, "analytics"), JSON.stringify(analyticsData));
    } catch (e) {
      console.warn("Failed to cache analytics", e);
    }
  },

  /** Load analytics from cache */
  loadAnalytics(planId: string): any | null {
    try {
      const data = localStorage.getItem(getCacheKey(planId, "analytics"));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /** Update last synced timestamp */
  updateMeta(planId: string) {
    try {
      localStorage.setItem(
        getCacheKey(planId, "meta"),
        JSON.stringify({ lastSyncedAt: new Date().toISOString() })
      );
    } catch (e) {
      console.warn("Failed to cache meta", e);
    }
  },

  /** Get last synced timestamp */
  getLastSyncedAt(planId: string): Date | null {
    try {
      const data = localStorage.getItem(getCacheKey(planId, "meta"));
      if (!data) return null;
      const parsed = JSON.parse(data);
      return parsed.lastSyncedAt ? new Date(parsed.lastSyncedAt) : null;
    } catch {
      return null;
    }
  },

  /** Clear cache for a specific user plan */
  clearCache(planId: string) {
    try {
      localStorage.removeItem(getCacheKey(planId, "plan"));
      localStorage.removeItem(getCacheKey(planId, "calendar"));
      localStorage.removeItem(getCacheKey(planId, "analytics"));
      localStorage.removeItem(getCacheKey(planId, "meta"));
    } catch {
      // ignore
    }
  }
};
