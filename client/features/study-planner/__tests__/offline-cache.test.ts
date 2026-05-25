import { describe, it, expect, beforeEach, vi } from "vitest";
import { plannerCache, getUserId } from "../planner-cache";
import { mutatePlan } from "../planner-api";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

describe("Offline Cache (plannerCache)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("getUserId defaults to null if no auth info", () => {
    expect(getUserId()).toBeNull();
  });

  it("getUserId extracts user id from safar.cached_user", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user123" }));
    expect(getUserId()).toBe("user123");
  });

  it("cache is keyed by userId and planId", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user99" }));
    const plan = { id: "plan1", title: "Test Plan" } as any;
    plannerCache.savePlan(plan);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "studyPlanner:user99:plan1:plan",
      JSON.stringify(plan)
    );
  });

  it("missing userId does not write cache", () => {
    // getUserId returns null
    const plan = { id: "plan1", title: "Test Plan" } as any;
    plannerCache.savePlan(plan);
    // setItem should NOT have been called with the plan data
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
      expect.stringContaining("plan1:plan"),
      expect.any(String)
    );
  });

  it("missing userId does not read cache", () => {
    // Setup a cache item manually
    localStorageMock.setItem("studyPlanner:user99:plan1:plan", JSON.stringify({ id: "plan1" }));
    
    // getUserId returns null because safar.cached_user is missing
    const loaded = plannerCache.loadPlan("plan1");
    expect(loaded).toBeNull();
  });

  it("localStorage quota/setItem failure is handled safely", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user99" }));
    
    // Mock setItem to throw a quota error
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });
    
    // Should not throw, should handle safely
    expect(() => {
      plannerCache.savePlan({ id: "plan1", title: "Test" } as any);
    }).not.toThrow();
  });

  it("one user's cache cannot be read using another user's userId", () => {
    // Write cache as userA
    localStorageMock.setItem("studyPlanner:userA:plan1:plan", JSON.stringify({ id: "plan1", title: "User A Plan" }));
    
    // Login as userB
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "userB" }));
    
    // Attempt to load plan1
    const loaded = plannerCache.loadPlan("plan1");
    // Should be null because the cache key looks for userB
    expect(loaded).toBeNull();
  });

  it("network success (savePlan/saveCalendar) writes cache", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user99" }));
    const plan = { id: "plan1" } as any;
    plannerCache.savePlan(plan);
    expect(localStorageMock.getItem("studyPlanner:user99:plan1:plan")).toBeTruthy();
    
    const calendar = { "2023-01-01": [] };
    plannerCache.saveCalendar("plan1", calendar);
    expect(localStorageMock.getItem("studyPlanner:user99:plan1:calendar")).toBeTruthy();
  });

  it("network failure reads cache correctly", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user99" }));
    const plan = { id: "plan2", title: "Cached Plan" } as any;
    plannerCache.savePlan(plan);
    
    const loaded = plannerCache.loadPlan("plan2");
    expect(loaded?.title).toBe("Cached Plan");
  });

  it("corrupted cache is ignored safely", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user99" }));
    localStorageMock.setItem("studyPlanner:user99:plan3:plan", "invalid json {");
    const loaded = plannerCache.loadPlan("plan3");
    expect(loaded).toBeNull();
  });

  it("clearCache removes only specific user plan data", () => {
    localStorageMock.setItem("safar.cached_user", JSON.stringify({ id: "user99" }));
    plannerCache.savePlan({ id: "plan1" } as any);
    plannerCache.savePlan({ id: "plan2" } as any);
    
    plannerCache.clearCache("plan1");
    expect(plannerCache.loadPlan("plan1")).toBeNull();
    // plan2 should still exist
    expect(plannerCache.loadPlan("plan2")).toBeTruthy();
  });
});

describe("mutatePlan Offline Guard", () => {
  it("cached offline mode disables mutations (aborts mutatePlan)", async () => {
    const showToast = vi.fn();
    const request = vi.fn();
    const setPlan = vi.fn();
    
    const result = await mutatePlan({
      isOffline: true,
      plan: { id: "p1" } as any,
      setPlan,
      setCalendar: vi.fn(),
      showToast,
      setError: vi.fn(),
      fetchPlan: vi.fn(),
      request,
    });

    expect(result).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "You're offline. Reconnect to edit your planner.",
      "error"
    );
  });
});
