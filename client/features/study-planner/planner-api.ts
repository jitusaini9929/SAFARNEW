/**
 * planner-api.ts
 *
 * Phase 4+5: Mutation wrapper with rollback support, and extracted API service.
 *
 * This module provides:
 *   1. `PlannerApiError` — typed error with HTTP status + conflict detection
 *   2. `mutatePlan`      — rollback-safe mutation wrapper
 *   3. API service functions (extracted from inline fetches in StudyPlanner.tsx)
 *
 * Usage inside StudyPlanner.tsx:
 *
 *   await mutatePlan({
 *     plan, setPlan, setCalendar, showToast, fetchPlan,
 *     optimistic: (draft) => { draft.subjects.push(newSubject); },
 *     request:    () => plannerApi.addSubject(planId, name, color),
 *   });
 */

import { apiFetch, type ApiFetchOptions } from "@/utils/apiFetch";

// ── Types ────────────────────────────────────────────────────────────────────

/** Re-use the Plan type from planner-utils — the type the UI component uses */
import type { Plan } from "./planner-utils";

export interface CalendarItem {
  topicId: string;
  topicName: string;
  subjectName: string;
  subjectColor: string;
  chapterName: string;
  status: string;
  plannedDate: string;
}

// ── API Error ────────────────────────────────────────────────────────────────

export class PlannerApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly isConflict: boolean;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "PlannerApiError";
    this.status = status;
    this.code = code;
    this.isConflict = status === 409 && code === "CONFLICT";
  }
}

// ── Low-level request ────────────────────────────────────────────────────────

const BASE = "/api/plans";

export type RetryPolicy = "safe" | "none" | "idempotent-only";

/**
 * Wait for a specific number of milliseconds.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * plannerRequest with typed error that preserves HTTP status.
 * Drop-in replacement for the existing plannerRequest in StudyPlanner.tsx.
 * Includes automatic retry with exponential backoff for transient failures (5xx, 429, network errors).
 */
export async function plannerRequest<T>(
  url: string,
  init?: ApiFetchOptions,
  retryPolicy: RetryPolicy = "none",
  retries = 3,
  backoffMs = 1000,
): Promise<T> {
  let attempt = 0;

  // If policy is 'none', we don't retry at all
  const actualRetries = retryPolicy === "none" ? 0 : retries;

  while (attempt <= actualRetries) {
    try {
      const response = await apiFetch(url, init);

      if (!response.ok) {
        // If it's a transient error (5xx or 429) and we have retries left, throw to trigger retry
        if (
          (response.status >= 500 || response.status === 429) &&
          attempt < actualRetries
        ) {
          throw new Error(`Transient HTTP error: ${response.status}`);
        }

        let message = "Planner request failed";
        let code: string | undefined;
        try {
          const payload = await response.json();
          message = payload?.message || payload?.error || message;
          code = payload?.code;
        } catch {
          // ignore json parse failure
        }
        throw new PlannerApiError(response.status, message, code);
      }

      return response.json() as Promise<T>;
    } catch (err: unknown) {
      // If it's a PlannerApiError, it means we caught a non-transient HTTP error (e.g., 400, 403, 409)
      if (err instanceof PlannerApiError) {
        throw err;
      }

      // If we've exhausted retries, throw the error
      if (attempt >= actualRetries) {
        throw err;
      }

      // Otherwise, wait and retry
      attempt++;
      await delay(backoffMs * Math.pow(2, attempt - 1));
    }
  }

  throw new Error("Unreachable");
}

// ── mutatePlan wrapper ───────────────────────────────────────────────────────

export interface MutatePlanOptions<T = Plan> {
  /** Current plan state (snapshot source) */
  plan: Plan | null;

  /** React state setter for plan (compatible with React.Dispatch<SetStateAction>) */
  setPlan: (plan: Plan | null) => void;

  /** React state setter for calendar (compatible with React.Dispatch<SetStateAction>) */
  setCalendar: (cal: Record<string, any[]>) => void;

  /** Toast function from the component */
  showToast: (msg: string, type: "success" | "error" | "info") => void;

  /** Error state setter */
  setError: (msg: string) => void;

  /** Function to refetch plan + calendar from server */
  fetchPlan: () => Promise<void>;

  /**
   * Optional optimistic update applied to a deep-cloned plan BEFORE the
   * API call. If the API call fails, the snapshot is restored.
   * Return the mutated draft (or void to use in-place mutation).
   */
  optimistic?: (draft: Plan) => Plan | void;

  /**
   * The actual API call. Must return the server-confirmed plan.
   * If the response also includes calendar data, return it as `calendar`.
   */
  request: () => Promise<T>;

  /**
   * Extract the plan from the API response.
   * Default: assumes response IS the plan (identity function).
   */
  extractPlan?: (response: T) => Plan;

  /**
   * If true, automatically refresh the calendar after a successful mutation.
   * Default: true.
   */
  refreshCalendar?: boolean;

  /** Fallback error message if the API error is empty */
  errorFallback?: string;

  /** Success toast message (optional) */
  successMessage?: string;

  /** If true, immediately aborts mutation and shows an offline error */
  isOffline?: boolean;
}

/**
 * Rollback-safe mutation wrapper.
 *
 * Flow:
 *  1. Check if offline (abort and show error if true)
 *  2. Snapshot current plan state (deep clone)
 *  3. Apply optimistic update (if provided)
 *  4. Execute API request
 *  5. On success: setPlan(serverPlan), optionally refresh calendar
 *  6. On conflict (409): restore snapshot, refetch from server, show conflict toast
 *  7. On other error: restore snapshot, show error toast
 *
 * Returns true on success, false on failure.
 */
export async function mutatePlan<T = Plan>(
  opts: MutatePlanOptions<T>,
): Promise<boolean> {
  const {
    plan,
    setPlan,
    setCalendar,
    showToast,
    setError,
    fetchPlan,
    optimistic,
    request,
    extractPlan = (r: T) => r as unknown as Plan,
    refreshCalendar = true,
    errorFallback = "Planner action failed",
    successMessage,
    isOffline,
  } = opts;

  if (isOffline) {
    showToast("You're offline. Reconnect to edit your planner.", "error");
    return false;
  }

  // ── 1. Snapshot ────────────────────────────────────────────────────────
  const snapshot = plan ? JSON.parse(JSON.stringify(plan)) as Plan : null;

  // ── 2. Optimistic update ──────────────────────────────────────────────
  if (optimistic && plan) {
    const draft = JSON.parse(JSON.stringify(plan)) as Plan;
    const result = optimistic(draft);
    const optimisticPlan = (typeof result === 'object' && result !== null) ? result : draft;
    setPlan(optimisticPlan as Plan);
  }

  // ── 3. API request ────────────────────────────────────────────────────
  try {
    const response = await request();
    const serverPlan = extractPlan(response);

    // ── 4. Success: apply server truth ──────────────────────────────────
    setPlan(serverPlan);
    setError("");

    if (refreshCalendar && serverPlan?.id) {
      try {
        const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
          `${BASE}/${serverPlan.id}/calendar`,
        );
        setCalendar(calendarData || {});
      } catch {
        // Calendar refresh failure is non-critical
      }
    }

    if (successMessage) {
      showToast(successMessage, "success");
    }

    return true;
  } catch (err: unknown) {
    // ── 5/6. Failure: rollback ──────────────────────────────────────────
    setPlan(snapshot);

    if (err instanceof PlannerApiError && err.isConflict) {
      // ── 409 CONFLICT: refetch server state ──────────────────────────
      showToast(
        "This plan was updated elsewhere. Refreshing to latest version.",
        "info",
      );
      try {
        await fetchPlan();
      } catch {
        // If refetch also fails, at least we rolled back to the snapshot
      }
      return false;
    }

    // ── Other errors ──────────────────────────────────────────────────
    const message = err instanceof Error ? err.message : String(err);
    const normalized = normalizePlannerMessage(message, errorFallback);
    setError(normalized);
    showToast(normalized, "error");
    return false;
  }
}

/**
 * Normalize planner error messages for user-friendliness.
 * Mirrors the inline `normalizePlannerActionMessage` from StudyPlanner.tsx.
 */
function normalizePlannerMessage(
  rawMessage: string,
  fallback: string,
): string {
  const message = rawMessage || fallback;
  if (/daily\s*goal|limit\s*reached|max\s*tasks?|capacity/i.test(message)) {
    return "Daily goal limit reached for that day. Choose another date or raise your daily goal.";
  }
  if (/abort|aborted|signal is aborted without reason/i.test(message)) {
    return "Request timed out while processing the planner action. Please try again.";
  }
  return message;
}

// ── API Service (extracted calls) ────────────────────────────────────────────

export const plannerApi = {
  /** Fetch a single plan by ID */
  getPlan(planId: string): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}`, undefined, "safe");
  },

  /** Fetch calendar for a plan */
  getCalendar(planId: string): Promise<Record<string, CalendarItem[]>> {
    return plannerRequest<Record<string, CalendarItem[]>>(
      `${BASE}/${planId}/calendar`,
      undefined,
      "safe",
    );
  },

  /** Add a subject to a plan */
  addSubject(
    planId: string,
    name: string,
    color: string,
  ): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}/subjects`, {
      method: "POST",
      body: JSON.stringify({ name, color }),
    }, "none");
  },

  /** Rename a subject */
  renameSubject(
    planId: string,
    subjectId: string,
    name: string,
  ): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}/subjects/${subjectId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }, "idempotent-only");
  },

  /** Delete a subject */
  deleteSubject(planId: string, subjectId: string): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}/subjects/${subjectId}`, {
      method: "DELETE",
    }, "idempotent-only");
  },

  /** Add a chapter to a subject */
  addChapter(
    planId: string,
    subjectId: string,
    name: string,
  ): Promise<Plan> {
    return plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
      "none"
    );
  },

  /** Rename a chapter */
  renameChapter(
    planId: string,
    subjectId: string,
    chapterId: string,
    name: string,
  ): Promise<Plan> {
    return plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name }),
      },
      "idempotent-only"
    );
  },

  /** Delete a chapter */
  deleteChapter(
    planId: string,
    subjectId: string,
    chapterId: string,
  ): Promise<Plan> {
    return plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}`,
      {
        method: "DELETE",
      },
      "idempotent-only"
    );
  },

  /** Add multiple topics to a chapter */
  addTopic(
    planId: string,
    subjectId: string,
    chapterId: string,
    topics: { name: string; plannedDate?: string }[],
  ): Promise<Plan> {
    return plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/bulk-topics`,
      {
        method: "POST",
        body: JSON.stringify({ topics }),
      },
      "none"
    );
  },

  /** Update a topic (status, name, plannedDate, notes) */
  patchTopic(
    planId: string,
    topicId: string,
    patch: Record<string, unknown>,
  ): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }, "idempotent-only");
  },

  /** Delete a topic */
  deleteTopic(planId: string, topicId: string): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}/topics/${topicId}`, {
      method: "DELETE",
    }, "idempotent-only");
  },

  /** Auto-distribute topics across calendar */
  autoDistribute(
    planId: string,
    options?: {
      fromDate?: string;
      lockExistingDates?: boolean;
      includeRevisionNeeded?: boolean;
      overloadMode?: "strict" | "flex";
    },
  ): Promise<{ message: string; assigned: number; skipped: number; plan: Plan }> {
    return plannerRequest(`${BASE}/${planId}/auto-distribute`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    }, "none");
  },

  /** Apply AI syllabus preview */
  applySyllabusAi(
    planId: string,
    aiPreview: { subjects: any[] },
  ): Promise<{ success: boolean; plan: Plan }> {
    return plannerRequest(`${BASE}/${planId}/syllabus-ai`, {
      method: "POST",
      body: JSON.stringify({ aiPreview }),
    }, "none");
  },

  /** Import syllabus subjects/chapters/topics */
  importSyllabus(
    planId: string,
    payload: {
      subjects: {
        name: string;
        chapters: { name: string; topics: Array<string | { name: string }> }[];
      }[];
      mode?: "replace" | "merge";
    },
  ): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}/import-syllabus`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, "none");
  },

  /** Upgrade plan to premium */
  upgradePlan(planId: string): Promise<{ message: string; plan: Plan }> {
    return plannerRequest(`${BASE}/${planId}/upgrade`, {
      method: "POST",
      body: JSON.stringify({}),
    }, "none");
  },

  /** Delete a plan */
  deletePlan(planId: string): Promise<{ ok: boolean }> {
    return plannerRequest(`${BASE}/${planId}`, {
      method: "DELETE",
    }, "idempotent-only");
  },

  /** Update plan settings (title, examDate, dailyGoal, offDays) */
  patchPlanSettings(
    planId: string,
    patch: Record<string, unknown>,
  ): Promise<Plan> {
    return plannerRequest<Plan>(`${BASE}/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }, "idempotent-only");
  },

  /** Daily check-in */
  checkin(planId: string): Promise<{ ok: boolean; message: string }> {
    return plannerRequest(`${BASE}/${planId}/checkin`, {
      method: "POST",
      body: JSON.stringify({}),
    }, "none");
  },
};
