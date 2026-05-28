/**
 * planner-api.test.ts
 *
 * Tests for the mutatePlan rollback wrapper and PlannerApiError.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PlannerApiError,
  mutatePlan,
  type MutatePlanOptions,
} from "../planner-api";
import type { StudyPlan as Plan } from "../plan.model";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makePlan(overrides?: Partial<Plan>): Plan {
  return {
    id: "plan-1",
    userId: "user-1",
    title: "Test Plan",
    examDate: "2025-12-31",
    dailyGoal: 3,
    offDays: [],
    features: { isPremium: true },
    subjects: [
      {
        id: "sub-1",
        name: "Physics",
        color: "#6750A4",
        chapters: [
          {
            id: "ch-1",
            name: "Mechanics",
            topics: [
              { id: "t-1", name: "Newton's Laws", status: "todo" },
              { id: "t-2", name: "Friction", status: "done" },
            ],
          },
        ],
      },
    ],
    updatedAt: "2025-06-01T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  } as Plan;
}

function makeMocks() {
  return {
    setPlan: vi.fn(),
    setCalendar: vi.fn(),
    showToast: vi.fn(),
    setError: vi.fn(),
    fetchPlan: vi.fn().mockResolvedValue(undefined),
  };
}

// ── PlannerApiError ─────────────────────────────────────────────────────────

describe("PlannerApiError", () => {
  it("sets isConflict for 409 + CONFLICT code", () => {
    const err = new PlannerApiError(409, "conflict", "CONFLICT");
    expect(err.isConflict).toBe(true);
    expect(err.status).toBe(409);
    expect(err.message).toBe("conflict");
  });

  it("isConflict is false for non-409 status", () => {
    const err = new PlannerApiError(500, "server error");
    expect(err.isConflict).toBe(false);
  });

  it("isConflict is false for 409 without CONFLICT code", () => {
    const err = new PlannerApiError(409, "some 409", "OTHER");
    expect(err.isConflict).toBe(false);
  });

  it("extends Error", () => {
    const err = new PlannerApiError(400, "bad request");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PlannerApiError");
  });
});

// ── plannerRequest Retry Logic ────────────────────────────────────────────────
import { apiFetch } from "@/utils/apiFetch";
import { plannerRequest } from "../planner-api";

vi.mock("@/utils/apiFetch", () => ({
  apiFetch: vi.fn(),
}));

describe("plannerRequest Retry Logic (Policy Aware)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET (safe) retries on 500 then succeeds", async () => {
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Internal Server Error" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

    const result = await plannerRequest("/api/test", undefined, "safe", 3, 0);

    expect(result).toEqual({ success: true });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it("GET (safe) retries on network failure then succeeds", async () => {
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

    const result = await plannerRequest("/api/test", undefined, "safe", 3, 0);

    expect(result).toEqual({ success: true });
    expect(mockApiFetch).toHaveBeenCalledTimes(3);
  });

  it("409 Conflict does not retry (fails fast)", async () => {
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: "Conflict" }),
    } as Response);

    await expect(
      plannerRequest("/api/test", undefined, "safe", 3, 0),
    ).rejects.toThrow("Conflict");

    expect(mockApiFetch).toHaveBeenCalledTimes(1); // Fails immediately
  });

  it("403 Forbidden does not retry (fails fast)", async () => {
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ message: "Forbidden" }),
    } as Response);

    await expect(
      plannerRequest("/api/test", undefined, "safe", 3, 0),
    ).rejects.toThrow("Forbidden");

    expect(mockApiFetch).toHaveBeenCalledTimes(1); // Fails immediately
  });

  it("Unsafe POST does not retry by default (policy: none)", async () => {
    const mockApiFetch = vi.mocked(apiFetch);
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: "Internal Server Error" }),
    } as Response);

    // Using default policy (none)
    await expect(
      plannerRequest("/api/test", { method: "POST" }),
    ).rejects.toThrow("Internal Server Error");

    expect(mockApiFetch).toHaveBeenCalledTimes(1); // No retries
  });
});



// ── mutatePlan ──────────────────────────────────────────────────────────────

describe("mutatePlan", () => {
  let plan: Plan;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    plan = makePlan();
    mocks = makeMocks();
  });

  // ── Success path ──────────────────────────────────────────────────────

  describe("success path", () => {
    it("calls setPlan with server response on success", async () => {
      const serverPlan = makePlan({ title: "Updated" });

      const result = await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.resolve(serverPlan),
      });

      expect(result).toBe(true);
      // Last call to setPlan should be the server plan
      const lastCall = mocks.setPlan.mock.calls[mocks.setPlan.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({ title: "Updated" });
    });

    it("clears error on success", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.resolve(makePlan()),
      });

      expect(mocks.setError).toHaveBeenCalledWith("");
    });

    it("shows success toast when successMessage is provided", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.resolve(makePlan()),
        successMessage: "Subject added!",
      });

      expect(mocks.showToast).toHaveBeenCalledWith("Subject added!", "success");
    });

    it("does not show toast when no successMessage", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.resolve(makePlan()),
      });

      expect(mocks.showToast).not.toHaveBeenCalled();
    });

    it("returns true on success", async () => {
      const result = await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.resolve(makePlan()),
      });

      expect(result).toBe(true);
    });
  });

  // ── Optimistic update ─────────────────────────────────────────────────

  describe("optimistic update", () => {
    it("applies optimistic update to plan before API call", async () => {
      let planDuringRequest: Plan | null = null;

      await mutatePlan({
        plan,
        ...mocks,
        optimistic: (draft) => {
          draft.title = "Optimistic Title";
        },
        request: () => {
          // Capture what setPlan was called with during the optimistic phase
          planDuringRequest = mocks.setPlan.mock.calls[0]?.[0] ?? null;
          return Promise.resolve(makePlan({ title: "Server Title" }));
        },
      });

      // Optimistic update should have been applied
      expect(planDuringRequest).not.toBeNull();
      expect((planDuringRequest as any).title).toBe("Optimistic Title");

      // Final state should be server truth
      const lastCall = mocks.setPlan.mock.calls[mocks.setPlan.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({ title: "Server Title" });
    });

    it("does not mutate the original plan object", async () => {
      const originalTitle = plan.title;

      await mutatePlan({
        plan,
        ...mocks,
        optimistic: (draft) => {
          draft.title = "Changed";
        },
        request: () => Promise.resolve(makePlan()),
      });

      expect(plan.title).toBe(originalTitle);
    });

    it("works with optimistic returning a new plan", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        optimistic: (draft) => {
          return { ...draft, title: "Returned" };
        },
        request: () => Promise.resolve(makePlan()),
      });

      const firstSetPlanCall = mocks.setPlan.mock.calls[0][0];
      expect(firstSetPlanCall.title).toBe("Returned");
    });
  });

  // ── Error rollback ────────────────────────────────────────────────────

  describe("error rollback", () => {
    it("rolls back to snapshot on API failure", async () => {
      const result = await mutatePlan({
        plan,
        ...mocks,
        optimistic: (draft) => {
          draft.title = "Optimistic";
        },
        request: () => Promise.reject(new Error("Network error")),
        errorFallback: "Failed to update",
      });

      expect(result).toBe(false);

      // Last setPlan call should be the snapshot (rollback)
      const lastCall = mocks.setPlan.mock.calls[mocks.setPlan.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({ title: plan.title });
    });

    it("shows error toast on failure", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(new Error("Something broke")),
      });

      expect(mocks.showToast).toHaveBeenCalledWith("Something broke", "error");
    });

    it("sets error state on failure", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(new Error("Bad thing")),
      });

      expect(mocks.setError).toHaveBeenCalledWith("Bad thing");
    });

    it("uses errorFallback when error has no message", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(new Error("")),
        errorFallback: "Custom fallback",
      });

      expect(mocks.showToast).toHaveBeenCalledWith("Custom fallback", "error");
    });
  });

  // ── 409 CONFLICT handling ─────────────────────────────────────────────

  describe("409 CONFLICT handling", () => {
    it("shows info toast and refetches on conflict", async () => {
      const conflictError = new PlannerApiError(409, "conflict", "CONFLICT");

      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(conflictError),
      });

      // Should show info toast (not error)
      expect(mocks.showToast).toHaveBeenCalledWith(
        expect.stringContaining("updated elsewhere"),
        "info",
      );

      // Should refetch
      expect(mocks.fetchPlan).toHaveBeenCalled();
    });

    it("rolls back state before refetching on conflict", async () => {
      const conflictError = new PlannerApiError(409, "conflict", "CONFLICT");

      await mutatePlan({
        plan,
        ...mocks,
        optimistic: (draft) => {
          draft.title = "Optimistic";
        },
        request: () => Promise.reject(conflictError),
      });

      // First setPlan: optimistic update
      // Second setPlan: rollback to snapshot
      // Then fetchPlan is called (which may call setPlan again internally)
      const rollbackCall = mocks.setPlan.mock.calls[1];
      expect(rollbackCall[0]).toMatchObject({ title: plan.title });
    });

    it("still returns false on conflict", async () => {
      const conflictError = new PlannerApiError(409, "conflict", "CONFLICT");

      const result = await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(conflictError),
      });

      expect(result).toBe(false);
    });

    it("handles fetchPlan failure gracefully after conflict", async () => {
      const conflictError = new PlannerApiError(409, "conflict", "CONFLICT");
      mocks.fetchPlan.mockRejectedValueOnce(new Error("Network down"));

      // Should not throw
      const result = await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(conflictError),
      });

      expect(result).toBe(false);
      // Rollback should still have happened
      const rollbackCall = mocks.setPlan.mock.calls[mocks.setPlan.mock.calls.length - 1];
      expect(rollbackCall[0]).toMatchObject({ title: plan.title });
    });
  });

  // ── extractPlan ───────────────────────────────────────────────────────

  describe("extractPlan", () => {
    it("uses custom extractPlan to get plan from response", async () => {
      const response = { success: true, plan: makePlan({ title: "From Response" }) };

      await mutatePlan<typeof response>({
        plan,
        ...mocks,
        request: () => Promise.resolve(response),
        extractPlan: (r) => r.plan,
      });

      const lastCall = mocks.setPlan.mock.calls[mocks.setPlan.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject({ title: "From Response" });
    });
  });

  // ── Null plan handling ────────────────────────────────────────────────

  describe("null plan handling", () => {
    it("handles null plan gracefully", async () => {
      const result = await mutatePlan({
        plan: null,
        ...mocks,
        request: () => Promise.resolve(makePlan()),
      });

      expect(result).toBe(true);
    });

    it("skips optimistic update when plan is null", async () => {
      await mutatePlan({
        plan: null,
        ...mocks,
        optimistic: (draft) => {
          draft.title = "Should not run";
        },
        request: () => Promise.resolve(makePlan()),
      });

      // setPlan should only be called once (with server plan), not twice (optimistic + server)
      expect(mocks.setPlan).toHaveBeenCalledTimes(1);
    });

    it("rolls back to null on failure when plan was null", async () => {
      await mutatePlan({
        plan: null,
        ...mocks,
        request: () => Promise.reject(new Error("fail")),
      });

      const lastCall = mocks.setPlan.mock.calls[mocks.setPlan.mock.calls.length - 1];
      expect(lastCall[0]).toBeNull();
    });
  });

  // ── refreshCalendar ───────────────────────────────────────────────────

  describe("refreshCalendar option", () => {
    it("does not refresh calendar when refreshCalendar is false", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.resolve(makePlan()),
        refreshCalendar: false,
      });

      // setCalendar should not be called
      expect(mocks.setCalendar).not.toHaveBeenCalled();
    });
  });

  // ── Error message normalization ───────────────────────────────────────

  describe("error message normalization", () => {
    it("normalizes daily goal limit messages", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(new Error("Daily goal limit reached for 2025-06-15")),
      });

      expect(mocks.showToast).toHaveBeenCalledWith(
        expect.stringContaining("Daily goal limit reached"),
        "error",
      );
    });

    it("normalizes abort/timeout messages", async () => {
      await mutatePlan({
        plan,
        ...mocks,
        request: () => Promise.reject(new Error("The signal is aborted without reason")),
      });

      expect(mocks.showToast).toHaveBeenCalledWith(
        expect.stringContaining("timed out"),
        "error",
      );
    });
  });
});
