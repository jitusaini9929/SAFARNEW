import { describe, it, expect } from "vitest";
import {
  toIsoDateOnly,
  clampOffDays,
  rollupProgress,
  buildCalendarMap,
  findTopicLocation,
  updateTopicInPlan,
  autoDistributeTopics,
  createPlanFromTemplate,
  type StudyPlan,
  type StudySubject,
  type StudyChapter,
  type StudyTopic,
} from "../plan.model";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTopic(overrides: Partial<StudyTopic> = {}): StudyTopic {
  return {
    id: overrides.id ?? "topic-1",
    name: overrides.name ?? "Topic 1",
    status: overrides.status ?? "todo",
    plannedDate: overrides.plannedDate,
    completedDate: overrides.completedDate,
    notes: overrides.notes,
  };
}

function makeChapter(overrides: Partial<StudyChapter> & { topics?: StudyTopic[] } = {}): StudyChapter {
  return {
    id: overrides.id ?? "ch-1",
    name: overrides.name ?? "Chapter 1",
    topics: overrides.topics ?? [],
  };
}

function makeSubject(overrides: Partial<StudySubject> & { chapters?: StudyChapter[] } = {}): StudySubject {
  return {
    id: overrides.id ?? "sub-1",
    name: overrides.name ?? "Math",
    color: overrides.color ?? "#0ea5e9",
    chapters: overrides.chapters ?? [],
  };
}

function makePlan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return {
    id: overrides.id ?? "plan-1",
    userId: overrides.userId ?? "user-1",
    title: overrides.title ?? "Test Plan",
    examDate: overrides.examDate,
    dailyGoal: overrides.dailyGoal ?? 3,
    offDays: overrides.offDays ?? [],
    subjects: overrides.subjects ?? [],
    features: overrides.features ?? { isPremium: false },
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2025-01-01T00:00:00.000Z",
  };
}

// ── toIsoDateOnly ───────────────────────────────────────────────────────────

describe("toIsoDateOnly", () => {
  it("converts a Date object to YYYY-MM-DD", () => {
    const d = new Date(2025, 5, 15); // June 15 2025 local
    expect(toIsoDateOnly(d)).toBe("2025-06-15");
  });

  it("converts an ISO string to YYYY-MM-DD", () => {
    expect(toIsoDateOnly("2025-03-10T14:30:00.000Z")).toMatch(/^2025-03-1\d$/);
  });

  it("returns empty string for invalid input", () => {
    expect(toIsoDateOnly("not-a-date")).toBe("");
  });

  it("handles YYYY-MM-DD string input", () => {
    // When parsed as Date, "2025-01-15" is interpreted as UTC midnight
    const result = toIsoDateOnly("2025-01-15");
    expect(result).toMatch(/^2025-01-1[45]$/); // may be 14 or 15 depending on TZ
  });
});

// ── clampOffDays ────────────────────────────────────────────────────────────

describe("clampOffDays", () => {
  it("returns empty array for undefined", () => {
    expect(clampOffDays(undefined)).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(clampOffDays("hello" as unknown as number[])).toEqual([]);
  });

  it("filters out-of-range values", () => {
    expect(clampOffDays([-1, 0, 3, 6, 7, 99])).toEqual([0, 3, 6]);
  });

  it("removes duplicates", () => {
    const result = clampOffDays([1, 2, 2, 3, 3, 3]);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });

  it("filters floats", () => {
    expect(clampOffDays([3.5, 2.1])).toEqual([]);
  });

  it("filters NaN", () => {
    expect(clampOffDays([NaN, 0])).toEqual([0]);
  });

  it("returns empty for empty array", () => {
    expect(clampOffDays([])).toEqual([]);
  });
});

// ── rollupProgress ──────────────────────────────────────────────────────────

describe("rollupProgress", () => {
  it("returns all zeros for plan with no subjects", () => {
    const result = rollupProgress(makePlan());
    expect(result.totalTopics).toBe(0);
    expect(result.doneTopics).toBe(0);
    expect(result.completionPercent).toBe(0);
  });

  it("computes 100% when all topics are done", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({
              topics: [
                makeTopic({ id: "t1", status: "done" }),
                makeTopic({ id: "t2", status: "done" }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = rollupProgress(plan);
    expect(result.totalTopics).toBe(2);
    expect(result.doneTopics).toBe(2);
    expect(result.completionPercent).toBe(100);
  });

  it("computes 0% when no topics are done", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({
              topics: [
                makeTopic({ id: "t1", status: "todo" }),
                makeTopic({ id: "t2", status: "in_progress" }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = rollupProgress(plan);
    expect(result.completionPercent).toBe(0);
    expect(result.inProgressTopics).toBe(1);
  });

  it("counts revision_needed topics", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({
              topics: [
                makeTopic({ id: "t1", status: "revision_needed" }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = rollupProgress(plan);
    expect(result.revisionTopics).toBe(1);
  });

  it("provides per-subject breakdown", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          id: "s1",
          name: "Math",
          chapters: [
            makeChapter({
              topics: [
                makeTopic({ id: "t1", status: "done" }),
                makeTopic({ id: "t2", status: "todo" }),
              ],
            }),
          ],
        }),
        makeSubject({
          id: "s2",
          name: "Science",
          chapters: [
            makeChapter({
              id: "ch-2",
              topics: [
                makeTopic({ id: "t3", status: "done" }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = rollupProgress(plan);
    expect(result.bySubject).toHaveLength(2);
    expect(result.bySubject[0].completionPercent).toBe(50);
    expect(result.bySubject[1].completionPercent).toBe(100);
  });
});

// ── buildCalendarMap ────────────────────────────────────────────────────────

describe("buildCalendarMap", () => {
  it("returns empty object for plan with no topics", () => {
    const result = buildCalendarMap(makePlan());
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("skips topics without plannedDate", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({
              topics: [makeTopic({ plannedDate: undefined })],
            }),
          ],
        }),
      ],
    });
    expect(Object.keys(buildCalendarMap(plan))).toHaveLength(0);
  });

  it("groups multiple topics on the same date", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({
              topics: [
                makeTopic({ id: "t1", plannedDate: "2025-06-15" }),
                makeTopic({ id: "t2", plannedDate: "2025-06-15" }),
              ],
            }),
          ],
        }),
      ],
    });
    const result = buildCalendarMap(plan);
    const keys = Object.keys(result);
    expect(keys).toHaveLength(1);
    expect(result[keys[0]]).toHaveLength(2);
  });
});

// ── findTopicLocation ───────────────────────────────────────────────────────

describe("findTopicLocation", () => {
  it("returns null for empty plan", () => {
    expect(findTopicLocation(makePlan(), "t1")).toBeNull();
  });

  it("returns null for non-existent topic", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({ topics: [makeTopic({ id: "t1" })] }),
          ],
        }),
      ],
    });
    expect(findTopicLocation(plan, "nonexistent")).toBeNull();
  });

  it("finds a topic and returns its location", () => {
    const plan = makePlan({
      subjects: [
        makeSubject({
          id: "s1",
          chapters: [
            makeChapter({
              id: "ch1",
              topics: [makeTopic({ id: "t1" })],
            }),
          ],
        }),
      ],
    });
    const loc = findTopicLocation(plan, "t1");
    expect(loc).toEqual({ subjectId: "s1", chapterId: "ch1", topicId: "t1" });
  });
});

// ── updateTopicInPlan ───────────────────────────────────────────────────────

describe("updateTopicInPlan", () => {
  it("returns false for non-existent topic", () => {
    const plan = makePlan();
    expect(updateTopicInPlan(plan, "nonexistent", { name: "New" })).toBe(false);
  });

  it("updates topic name", () => {
    const topic = makeTopic({ id: "t1", name: "Old" });
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics: [topic] })],
        }),
      ],
    });
    expect(updateTopicInPlan(plan, "t1", { name: "New Name" })).toBe(true);
    expect(topic.name).toBe("New Name");
  });

  it("ignores empty name after trim", () => {
    const topic = makeTopic({ id: "t1", name: "Original" });
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics: [topic] })],
        }),
      ],
    });
    updateTopicInPlan(plan, "t1", { name: "   " });
    expect(topic.name).toBe("Original");
  });

  it("sets completedDate when status becomes done", () => {
    const topic = makeTopic({ id: "t1", status: "todo" });
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics: [topic] })],
        }),
      ],
    });
    updateTopicInPlan(plan, "t1", { status: "done" });
    expect(topic.status).toBe("done");
    expect(topic.completedDate).toBeDefined();
  });

  it("clears completedDate when status changes from done", () => {
    const topic = makeTopic({ id: "t1", status: "done", completedDate: "2025-01-01T00:00:00Z" });
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics: [topic] })],
        }),
      ],
    });
    updateTopicInPlan(plan, "t1", { status: "todo" });
    expect(topic.completedDate).toBeUndefined();
  });

  it("clears plannedDate when given falsy value", () => {
    const topic = makeTopic({ id: "t1", plannedDate: "2025-06-15" });
    const plan = makePlan({
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics: [topic] })],
        }),
      ],
    });
    updateTopicInPlan(plan, "t1", { plannedDate: "" });
    expect(topic.plannedDate).toBeUndefined();
  });
});

// ── autoDistributeTopics ────────────────────────────────────────────────────

describe("autoDistributeTopics", () => {
  it("returns {0,0} when no examDate is set", () => {
    const plan = makePlan({ examDate: undefined });
    expect(autoDistributeTopics(plan)).toEqual({ assigned: 0, skipped: 0 });
  });

  it("returns {0,0} when all topics are done", () => {
    const plan = makePlan({
      examDate: "2025-12-31T00:00:00Z",
      subjects: [
        makeSubject({
          chapters: [
            makeChapter({
              topics: [
                makeTopic({ id: "t1", status: "done" }),
              ],
            }),
          ],
        }),
      ],
    });
    expect(autoDistributeTopics(plan, { fromDate: "2025-06-01" })).toEqual({ assigned: 0, skipped: 0 });
  });

  it("distributes topics across available days", () => {
    const topics = Array.from({ length: 6 }, (_, i) =>
      makeTopic({ id: `t${i}`, name: `Topic ${i}`, status: "todo" })
    );
    const plan = makePlan({
      examDate: "2025-06-30T00:00:00Z",
      dailyGoal: 2,
      offDays: [],
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics })],
        }),
      ],
    });

    const result = autoDistributeTopics(plan, { fromDate: "2025-06-01", lockExistingDates: false });
    expect(result.assigned).toBe(6);
    expect(result.skipped).toBe(0);

    // All topics should now have plannedDate set
    for (const topic of topics) {
      expect(topic.plannedDate).toBeDefined();
    }
  });

  it("respects offDays", () => {
    const topics = [
      makeTopic({ id: "t1", status: "todo" }),
      makeTopic({ id: "t2", status: "todo" }),
    ];
    const plan = makePlan({
      examDate: "2025-06-30T00:00:00Z",
      dailyGoal: 1,
      offDays: [0, 6], // Sun, Sat off
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics })],
        }),
      ],
    });

    autoDistributeTopics(plan, { fromDate: "2025-06-01", lockExistingDates: false });

    // Verify no topic is planned on a weekend
    for (const topic of topics) {
      if (topic.plannedDate) {
        const day = new Date(topic.plannedDate + "T00:00:00").getDay();
        expect([0, 6]).not.toContain(day);
      }
    }
  });

  it("preserves locked existing dates", () => {
    const topics = [
      makeTopic({ id: "t1", status: "todo", plannedDate: "2025-06-05" }),
      makeTopic({ id: "t2", status: "todo" }),
    ];
    const plan = makePlan({
      examDate: "2025-06-30T00:00:00Z",
      dailyGoal: 3,
      subjects: [
        makeSubject({
          chapters: [makeChapter({ topics })],
        }),
      ],
    });

    autoDistributeTopics(plan, { fromDate: "2025-06-01", lockExistingDates: true });
    expect(topics[0].plannedDate).toBe("2025-06-05"); // preserved
    expect(topics[1].plannedDate).toBeDefined(); // assigned
  });
});

// ── createPlanFromTemplate ──────────────────────────────────────────────────

describe("createPlanFromTemplate", () => {
  const mockTemplate = {
    id: "test-template",
    name: "Test Exam",
    examBody: "Test Body",
    category: "competitive",
    description: "A test template",
    estimatedTopics: 5,
    recommendedDailyGoal: 2,
    tags: ["test"],
    subjects: [
      {
        name: "Subject A",
        color: "#ff0000",
        chapters: [
          { name: "Ch 1", topics: ["Topic 1", "Topic 2"] },
        ],
      },
    ],
  };

  it("creates a plan with correct structure", () => {
    const { plan } = createPlanFromTemplate({
      userId: "user-1",
      template: mockTemplate,
      isPremium: true,
    });

    expect(plan.userId).toBe("user-1");
    expect(plan.title).toBe("Test Exam");
    expect(plan.subjects).toHaveLength(1);
    expect(plan.subjects[0].chapters).toHaveLength(1);
    expect(plan.subjects[0].chapters[0].topics).toHaveLength(2);
  });

  it("uses provided title over template name", () => {
    const { plan } = createPlanFromTemplate({
      userId: "user-1",
      template: mockTemplate,
      title: "My Custom Title",
      isPremium: false,
    });
    expect(plan.title).toBe("My Custom Title");
  });

  it("clamps offDays", () => {
    const { plan } = createPlanFromTemplate({
      userId: "user-1",
      template: mockTemplate,
      offDays: [-1, 0, 7, 3, 3],
      isPremium: false,
    });
    expect(plan.offDays).toEqual([0, 3]);
  });

  it("generates unique IDs for all entities", () => {
    const { plan } = createPlanFromTemplate({
      userId: "user-1",
      template: mockTemplate,
      isPremium: false,
    });

    expect(plan.id).toBeDefined();
    expect(plan.subjects[0].id).toBeDefined();
    expect(plan.subjects[0].chapters[0].id).toBeDefined();
    expect(plan.subjects[0].chapters[0].topics[0].id).toBeDefined();

    // All IDs should be unique
    const ids = [
      plan.id,
      plan.subjects[0].id,
      plan.subjects[0].chapters[0].id,
      plan.subjects[0].chapters[0].topics[0].id,
      plan.subjects[0].chapters[0].topics[1].id,
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
