/**
 * plan.routes.conflict.test.ts
 *
 * Integration tests for the optimistic locking (409 CONFLICT) behavior
 * on plan mutation routes.
 *
 * Strategy: We mock getDb() to return a fake collection that simulates
 * MongoDB behavior, then mount the router on a minimal Express app
 * and send real HTTP requests through it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express, { type Express } from "express";

// â”€â”€ Mock getDb BEFORE importing routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const mockPlanUpdateOne = vi.fn();
const mockPlanFindOne = vi.fn();
const mockPlanDeleteOne = vi.fn();
const mockPlanInsertOne = vi.fn();
const mockPlanFindOneAndUpdate = vi.fn();

const mockUserFindOne = vi.fn();

vi.mock("../../../../server/db", () => ({
  getDb: () => ({
    collection: (name: string) => {
      if (name === "study_plans") {
        return {
          findOne: mockPlanFindOne,
          updateOne: mockPlanUpdateOne,
          deleteOne: mockPlanDeleteOne,
          insertOne: mockPlanInsertOne,
          findOneAndUpdate: mockPlanFindOneAndUpdate,
          find: () => ({ sort: () => ({ toArray: () => Promise.resolve([]) }) }),
        };
      }
      // users collection (for canUsePremiumPlanner)
      return {
        findOne: mockUserFindOne,
        updateOne: vi.fn(),
        deleteOne: vi.fn(),
        insertOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
      };
    },
  }),
}));

// Mock requireAuth to pass through with a test user
vi.mock("../../../../server/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: "test-user-123", email: "test@example.com" };
    next();
  },
}));

// Mock plan.events (fire-and-forget, not important for conflict tests)
vi.mock("../plan.events", () => ({
  logPlannerEvent: vi.fn(),
}));

// Mock exam-templates
vi.mock("../exam-templates/index", () => ({
  getAvailableTemplates: vi.fn().mockReturnValue([]),
  getTemplateById: vi.fn().mockReturnValue(null),
}));

// â”€â”€ Now import the router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Dynamic import because mocks must be set up first
const { default: planRouter } = await import("../plan.routes");

// â”€â”€ Test helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/plans", planRouter);
  return app;
}

function makeMockPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-abc",
    userId: "test-user-123",
    title: "Test Plan",
    examDate: "2025-12-31T00:00:00Z",
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
              {
                id: "topic-1",
                name: "Newton's Laws",
                status: "todo",
                plannedDate: "2025-06-15T00:00:00Z",
              },
              {
                id: "topic-2",
                name: "Friction",
                status: "todo",
              },
            ],
          },
        ],
      },
    ],
    updatedAt: "2025-06-01T00:00:00.000Z",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Helper: sends an HTTP request through the Express app without supertest.
 * Uses Node's built-in http module to avoid adding a dependency.
 */
async function request(
  app: Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const http = require("http");
    const server = http.createServer(app);

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}${path}`;
      const payload = body ? JSON.stringify(body) : undefined;

      const options: any = {
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      };

      const req = http.request(url, options, (res: any) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          server.close();
          try {
            resolve({
              status: res.statusCode,
              body: data ? JSON.parse(data) : {},
            });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });

      req.on("error", (err: Error) => {
        server.close();
        reject(err);
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("Optimistic Locking â€” 409 CONFLICT", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  // â”€â”€ POST /:planId/subjects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("POST /:planId/subjects (add subject)", () => {
    it("returns 409 when plan was modified concurrently", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(app, "POST", "/api/plans/plan-abc/subjects", {
        name: "Chemistry",
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("succeeds when plan version matches", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      const res = await request(app, "POST", "/api/plans/plan-abc/subjects", {
        name: "Chemistry",
      });

      expect(res.status).toBe(201);
    });
  });

  // â”€â”€ PATCH /:planId/subjects/:subjectId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("PATCH /:planId/subjects/:subjectId (rename subject)", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "PATCH",
        "/api/plans/plan-abc/subjects/sub-1",
        { name: "Applied Physics" },
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ DELETE /:planId/subjects/:subjectId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("DELETE /:planId/subjects/:subjectId (delete subject)", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "DELETE",
        "/api/plans/plan-abc/subjects/sub-1",
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ POST /:planId/subjects/:subjectId/chapters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("POST /:planId/subjects/:subjectId/chapters (add chapter)", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "POST",
        "/api/plans/plan-abc/subjects/sub-1/chapters",
        { name: "Optics" },
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ PATCH /:planId/subjects/:subjectId/chapters/:chapterId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("PATCH /:planId/subjects/:subjectId/chapters/:chapterId (rename chapter)", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "PATCH",
        "/api/plans/plan-abc/subjects/sub-1/chapters/ch-1",
        { name: "Advanced Mechanics" },
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ DELETE /:planId/subjects/:subjectId/chapters/:chapterId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("DELETE /:planId/subjects/:subjectId/chapters/:chapterId (delete chapter)", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "DELETE",
        "/api/plans/plan-abc/subjects/sub-1/chapters/ch-1",
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ POST /:planId/subjects/:subjectId/chapters/:chapterId/topics â”€â”€â”€â”€â”€â”€â”€â”€

  describe("POST /:planId/subjects/:subjectId/chapters/:chapterId/topics (add topic)", () => {
    it("returns 409 on concurrent modification", async () => {
      // canUsePremiumPlanner calls usersCollection().findOne()
      mockUserFindOne.mockResolvedValueOnce({ email: "test@example.com", is_premium: true });
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "POST",
        "/api/plans/plan-abc/subjects/sub-1/chapters/ch-1/topics",
        { name: "Projectile Motion" },
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ PATCH /:planId/topics/:topicId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("PATCH /:planId/topics/:topicId (update topic)", () => {
    it("returns 409 when plan was modified between read and write", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "PATCH",
        "/api/plans/plan-abc/topics/topic-1",
        { status: "done" },
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("succeeds on matching version", async () => {
      mockPlanFindOne.mockResolvedValueOnce(JSON.parse(JSON.stringify(makeMockPlan())));
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      const res = await request(
        app,
        "PATCH",
        "/api/plans/plan-abc/topics/topic-1",
        { status: "done" },
      );

      expect(res.status).toBe(200);
      expect(res.body.subjects).toBeDefined();
    });
  });

  // â”€â”€ DELETE /:planId/topics/:topicId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("DELETE /:planId/topics/:topicId (delete topic)", () => {
    it("returns 409 on concurrent modification", async () => {
      // Deep-clone because route mutates plan.subjects in-place
      mockPlanFindOne.mockResolvedValueOnce(JSON.parse(JSON.stringify(makeMockPlan())));
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "DELETE",
        "/api/plans/plan-abc/topics/topic-1",
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // ── POST /:planId/auto-distribute ────────────────────────────────────────────────

  describe("POST /:planId/auto-distribute", () => {
    it("returns 409 on concurrent modification", async () => {
      // canUsePremiumPlanner calls usersCollection().findOne()
      mockUserFindOne.mockResolvedValueOnce({ email: "test@example.com", is_premium: true });
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan({ features: { isPremium: true } }));
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "POST",
        "/api/plans/plan-abc/auto-distribute",
        {},
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ POST /:planId/upgrade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("POST /:planId/upgrade", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "POST",
        "/api/plans/plan-abc/upgrade",
        {},
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ POST /:planId/syllabus-ai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("POST /:planId/syllabus-ai (AI syllabus apply)", () => {
    it("returns 409 on concurrent modification", async () => {
      mockPlanFindOne.mockResolvedValueOnce(makeMockPlan());
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const res = await request(
        app,
        "POST",
        "/api/plans/plan-abc/syllabus-ai",
        {
          aiPreview: {
            subjects: [
              {
                name: "Chemistry",
                chapters: [
                  { name: "Organic", topics: ["Alkanes", "Alkenes"] },
                ],
              },
            ],
          },
        },
      );

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  // â”€â”€ Verify updateOne filter includes updatedAt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("updateOne filter includes previousUpdatedAt", () => {
    it("passes the original updatedAt value in the MongoDB filter", async () => {
      const plan = makeMockPlan({ updatedAt: "2025-06-01T00:00:00.000Z" });
      mockPlanFindOne.mockResolvedValueOnce(plan);
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      await request(app, "PATCH", "/api/plans/plan-abc/topics/topic-1", {
        status: "done",
      });

      // Verify the filter passed to updateOne includes the original updatedAt
      const filterArg = mockPlanUpdateOne.mock.calls[0][0];
      expect(filterArg).toMatchObject({
        id: "plan-abc",
        userId: "test-user-123",
        updatedAt: "2025-06-01T00:00:00.000Z",
      });
    });

    it("sets a NEW updatedAt value in $set (different from the filter)", async () => {
      const plan = makeMockPlan({ updatedAt: "2025-06-01T00:00:00.000Z" });
      mockPlanFindOne.mockResolvedValueOnce(plan);
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      await request(app, "PATCH", "/api/plans/plan-abc/topics/topic-1", {
        name: "Renamed Topic",
      });

      const updateArg = mockPlanUpdateOne.mock.calls[0][1];
      const newUpdatedAt = updateArg.$set.updatedAt;
      expect(newUpdatedAt).toBeDefined();
      // The new timestamp must differ from the original
      expect(newUpdatedAt).not.toBe("2025-06-01T00:00:00.000Z");
    });
  });

  // â”€â”€ Simulate actual concurrent conflict scenario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe("Concurrent modification simulation", () => {
    it("first writer succeeds, second writer gets 409", async () => {
      const plan = makeMockPlan({ updatedAt: "2025-06-01T00:00:00.000Z" });

      // First writer: findOne returns plan, updateOne succeeds
      mockPlanFindOne.mockResolvedValueOnce(JSON.parse(JSON.stringify(plan)));
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });

      const first = await request(
        app,
        "PATCH",
        "/api/plans/plan-abc/topics/topic-1",
        { status: "done" },
      );
      expect(first.status).toBe(200);

      // Second writer: findOne returns SAME stale plan (updatedAt hasn't changed in their read)
      // But updateOne returns matchedCount=0 because first writer already changed updatedAt
      mockPlanFindOne.mockResolvedValueOnce(JSON.parse(JSON.stringify(plan)));
      mockPlanUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const second = await request(
        app,
        "PATCH",
        "/api/plans/plan-abc/topics/topic-2",
        { status: "in_progress" },
      );
      expect(second.status).toBe(409);
      expect(second.body.code).toBe("CONFLICT");
      expect(second.body.message).toContain("refresh");
    });
  });
});
