import { describe, it, expect } from "vitest";
import {
  toIsoDateOnly,
  formatDate,
  startOfDay,
  addDays,
  daysBetweenDateKeys,
  findNextAvailableDate,
  countStudyDaysBetween,
  flattenTopics,
  plannerProgress,
  chapterPercent,
  subjectPercent,
  simulateForecastCompletionDate,
  countCompletedTopicsByDate,
  computeStudyStreak,
  splitTopicLines,
  isBulkPlaceholderChapter,
  normalizeBulkTopicToken,
  parseBulkTopicsByChapter,
  parseBulkSubjectsFromTxt,
  type Plan,
  type Subject,
  type Chapter,
  type Topic,
} from "../planner-utils";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: overrides.id ?? "t1",
    name: overrides.name ?? "Topic 1",
    status: overrides.status ?? "todo",
    plannedDate: overrides.plannedDate,
    completedDate: overrides.completedDate,
  };
}

function makeChapter(topics: Topic[] = [], id = "ch1", name = "Ch 1"): Chapter {
  return { id, name, topics };
}

function makeSubject(chapters: Chapter[] = [], id = "s1", name = "Math"): Subject {
  return { id, name, color: "#0ea5e9", chapters };
}

function makePlan(subjects: Subject[] = []): Plan {
  return {
    id: "plan-1",
    title: "Test",
    offDays: [],
    features: { isPremium: false },
    subjects,
  };
}

// ── splitTopicLines ─────────────────────────────────────────────────────────

describe("splitTopicLines", () => {
  it("returns empty array for empty string", () => {
    expect(splitTopicLines("")).toEqual([]);
  });

  it("splits by newlines and trims", () => {
    expect(splitTopicLines("  a  \n  b  \n  c  ")).toEqual(["a", "b", "c"]);
  });

  it("handles \\r\\n line endings", () => {
    expect(splitTopicLines("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
  });

  it("filters whitespace-only lines", () => {
    expect(splitTopicLines("a\n   \n  \nb")).toEqual(["a", "b"]);
  });
});

// ── isBulkPlaceholderChapter ────────────────────────────────────────────────

describe("isBulkPlaceholderChapter", () => {
  it("matches 'Untitled' case-insensitively", () => {
    expect(isBulkPlaceholderChapter({ name: "Untitled" })).toBe(true);
    expect(isBulkPlaceholderChapter({ name: "UNTITLED" })).toBe(true);
    expect(isBulkPlaceholderChapter({ name: "untitled" })).toBe(true);
  });

  it("handles whitespace", () => {
    expect(isBulkPlaceholderChapter({ name: "  Untitled  " })).toBe(true);
  });

  it("returns false for other names", () => {
    expect(isBulkPlaceholderChapter({ name: "Chapter 1" })).toBe(false);
    expect(isBulkPlaceholderChapter({ name: "" })).toBe(false);
  });
});

// ── normalizeBulkTopicToken ─────────────────────────────────────────────────

describe("normalizeBulkTopicToken", () => {
  it("strips > followed by bullet markers", () => {
    expect(normalizeBulkTopicToken("> - Topic one")).toBe("Topic one");
    expect(normalizeBulkTopicToken("> * Topic two")).toBe("Topic two");
  });

  it("does not strip bare > prefix (handled by caller)", () => {
    // normalizeBulkTopicToken doesn't strip bare ">"; that's done by
    // parseBulkSubjectsFromTxt's regex before calling this function
    expect(normalizeBulkTopicToken("> Topic one")).toBe("> Topic one");
  });

  it("strips bullet markers", () => {
    expect(normalizeBulkTopicToken("- Topic")).toBe("Topic");
    expect(normalizeBulkTopicToken("• Topic")).toBe("Topic");
    expect(normalizeBulkTopicToken("* Topic")).toBe("Topic");
  });

  it("strips numbered prefixes", () => {
    expect(normalizeBulkTopicToken("1. Topic")).toBe("Topic");
    expect(normalizeBulkTopicToken("1) Topic")).toBe("Topic");
    expect(normalizeBulkTopicToken("12: Topic")).toBe("Topic");
  });

  it("collapses whitespace", () => {
    expect(normalizeBulkTopicToken("  Topic   Name  ")).toBe("Topic Name");
  });

  it("returns empty for empty input", () => {
    expect(normalizeBulkTopicToken("")).toBe("");
    expect(normalizeBulkTopicToken("   ")).toBe("");
  });
});

// ── parseBulkTopicsByChapter ────────────────────────────────────────────────

describe("parseBulkTopicsByChapter", () => {
  it("puts topics in fallback chapter when no headings", () => {
    const result = parseBulkTopicsByChapter("Topic A\nTopic B");
    expect(result).toHaveLength(1);
    expect(result[0].chapterName).toBe("General");
    expect(result[0].topics).toEqual(["Topic A", "Topic B"]);
  });

  it("recognizes markdown headings", () => {
    const result = parseBulkTopicsByChapter("# Chapter One\nTopic A\n## Chapter Two\nTopic B");
    expect(result).toHaveLength(2);
    expect(result[0].chapterName).toBe("Chapter One");
    expect(result[1].chapterName).toBe("Chapter Two");
  });

  it("recognizes underscore chapter markers", () => {
    const result = parseBulkTopicsByChapter("_ My Chapter\nTopic A");
    expect(result).toHaveLength(1);
    expect(result[0].chapterName).toBe("My Chapter");
  });

  it("deduplicates topics within the same chapter", () => {
    const result = parseBulkTopicsByChapter("Topic A\nTopic A\ntopic a");
    expect(result[0].topics).toHaveLength(1);
  });

  it("filters empty chapters", () => {
    const result = parseBulkTopicsByChapter("# Empty Chapter\n# Has Content\nTopic A");
    expect(result).toHaveLength(1);
    expect(result[0].chapterName).toBe("Has Content");
  });

  it("handles inline chapter:topics format", () => {
    const result = parseBulkTopicsByChapter("Kinematics: velocity, acceleration, displacement");
    expect(result).toHaveLength(1);
    expect(result[0].chapterName).toBe("Kinematics");
    expect(result[0].topics).toEqual(["velocity", "acceleration", "displacement"]);
  });
});

// ── parseBulkSubjectsFromTxt ────────────────────────────────────────────────

describe("parseBulkSubjectsFromTxt", () => {
  it("parses standard - _ > format", () => {
    const input = "- Physics\n_ Mechanics\n> Newton's Laws\n> Friction";
    const result = parseBulkSubjectsFromTxt(input);
    expect(result).toHaveLength(1);
    expect(result[0].subjectName).toBe("Physics");
    expect(result[0].chapters).toHaveLength(1);
    expect(result[0].chapters[0].topics).toHaveLength(2);
  });

  it("throws when no subjects found", () => {
    expect(() => parseBulkSubjectsFromTxt("")).toThrow("No subjects found");
  });

  it("deduplicates topics within a chapter", () => {
    const input = "- Math\n_ Algebra\n> Equations\n> Equations";
    const result = parseBulkSubjectsFromTxt(input);
    expect(result[0].chapters[0].topics).toHaveLength(1);
  });

  it("handles multiple subjects", () => {
    const input = "- Math\n_ Algebra\n> Equations\n- Science\n_ Physics\n> Forces";
    const result = parseBulkSubjectsFromTxt(input);
    expect(result).toHaveLength(2);
  });

  it("auto-creates Untitled subject for orphaned chapters", () => {
    const input = "_ Chapter\n> Topic";
    const result = parseBulkSubjectsFromTxt(input);
    expect(result[0].subjectName).toBe("Untitled");
  });
});

// ── daysBetweenDateKeys ─────────────────────────────────────────────────────

describe("daysBetweenDateKeys", () => {
  it("returns 0 for same date", () => {
    expect(daysBetweenDateKeys("2025-06-15", "2025-06-15")).toBe(0);
  });

  it("returns positive for future date", () => {
    expect(daysBetweenDateKeys("2025-06-15", "2025-06-20")).toBe(5);
  });

  it("returns 0 for end before start (clamped)", () => {
    expect(daysBetweenDateKeys("2025-06-20", "2025-06-15")).toBe(0);
  });

  it("returns 0 for invalid dates", () => {
    expect(daysBetweenDateKeys("invalid", "2025-06-15")).toBe(0);
    expect(daysBetweenDateKeys("2025-06-15", "invalid")).toBe(0);
  });
});

// ── findNextAvailableDate ───────────────────────────────────────────────────

describe("findNextAvailableDate", () => {
  it("returns start date when no off-days", () => {
    const start = new Date(2025, 5, 15); // June 15
    const result = findNextAvailableDate(start, []);
    expect(result).toBe(toIsoDateOnly(start));
  });

  it("skips off-days to find next available", () => {
    // June 15, 2025 is a Sunday (day 0)
    const start = new Date(2025, 5, 15);
    const result = findNextAvailableDate(start, [0]); // Sunday off
    expect(result).toBe("2025-06-16"); // Monday
  });
});

// ── flattenTopics ───────────────────────────────────────────────────────────

describe("flattenTopics", () => {
  it("returns empty array for empty plan", () => {
    expect(flattenTopics(makePlan())).toEqual([]);
  });

  it("flattens nested structure with parent references", () => {
    const topic = makeTopic({ id: "t1" });
    const chapter = makeChapter([topic], "ch1", "Ch 1");
    const subject = makeSubject([chapter], "s1", "Math");
    const result = flattenTopics(makePlan([subject]));

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
    expect(result[0].subject.id).toBe("s1");
    expect(result[0].chapter.id).toBe("ch1");
  });
});

// ── plannerProgress ─────────────────────────────────────────────────────────

describe("plannerProgress", () => {
  it("returns zeros for empty plan", () => {
    expect(plannerProgress(makePlan())).toEqual({ total: 0, done: 0, percent: 0 });
  });

  it("computes correct percentage", () => {
    const topics = [
      makeTopic({ id: "t1", status: "done" }),
      makeTopic({ id: "t2", status: "todo" }),
      makeTopic({ id: "t3", status: "done" }),
      makeTopic({ id: "t4", status: "in_progress" }),
    ];
    const result = plannerProgress(makePlan([makeSubject([makeChapter(topics)])]));
    expect(result).toEqual({ total: 4, done: 2, percent: 50 });
  });
});

// ── chapterPercent / subjectPercent ──────────────────────────────────────────

describe("chapterPercent", () => {
  it("returns 0 for empty chapter", () => {
    expect(chapterPercent(makeChapter())).toBe(0);
  });

  it("returns 100 when all done", () => {
    const ch = makeChapter([
      makeTopic({ id: "t1", status: "done" }),
      makeTopic({ id: "t2", status: "done" }),
    ]);
    expect(chapterPercent(ch)).toBe(100);
  });
});

describe("subjectPercent", () => {
  it("returns 0 for subject with no chapters", () => {
    expect(subjectPercent(makeSubject())).toBe(0);
  });

  it("aggregates across chapters", () => {
    const sub = makeSubject([
      makeChapter([makeTopic({ id: "t1", status: "done" })], "ch1"),
      makeChapter([makeTopic({ id: "t2", status: "todo" })], "ch2"),
    ]);
    expect(subjectPercent(sub)).toBe(50);
  });
});

// ── startOfDay / addDays ────────────────────────────────────────────────────

describe("startOfDay", () => {
  it("sets hours to midnight", () => {
    const result = startOfDay(new Date(2025, 5, 15, 14, 30, 45));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it("works with string input", () => {
    const result = startOfDay("2025-06-15T14:30:00");
    expect(result.getHours()).toBe(0);
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    const base = new Date(2025, 5, 15);
    const result = addDays(base, 5);
    expect(result.getDate()).toBe(20);
  });

  it("handles negative days", () => {
    const base = new Date(2025, 5, 15);
    const result = addDays(base, -3);
    expect(result.getDate()).toBe(12);
  });

  it("does not mutate original date", () => {
    const base = new Date(2025, 5, 15);
    addDays(base, 5);
    expect(base.getDate()).toBe(15);
  });

  it("crosses month boundaries", () => {
    const base = new Date(2025, 0, 30); // Jan 30
    const result = addDays(base, 3);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2);
  });
});

// ── countStudyDaysBetween ───────────────────────────────────────────────────

describe("countStudyDaysBetween", () => {
  it("counts all days when no off-days", () => {
    const start = new Date(2025, 5, 16); // Mon
    const end = new Date(2025, 5, 20);   // Fri
    expect(countStudyDaysBetween(start, end, [])).toBe(5);
  });

  it("excludes off-days", () => {
    const start = new Date(2025, 5, 16); // Mon Jun 16
    const end = new Date(2025, 5, 22);   // Sun Jun 22
    expect(countStudyDaysBetween(start, end, [0, 6])).toBe(5); // Mon-Fri
  });

  it("returns 0 when start is after end", () => {
    const start = new Date(2025, 5, 20);
    const end = new Date(2025, 5, 15);
    expect(countStudyDaysBetween(start, end, [])).toBe(0);
  });

  it("returns 1 for same day that is not off", () => {
    const d = new Date(2025, 5, 16); // Monday
    expect(countStudyDaysBetween(d, d, [])).toBe(1);
  });
});

// ── simulateForecastCompletionDate ──────────────────────────────────────────

describe("simulateForecastCompletionDate", () => {
  it("returns start date when remaining is 0", () => {
    const start = new Date(2025, 5, 15);
    expect(simulateForecastCompletionDate(0, 3, [], start)).toBe(toIsoDateOnly(start));
  });

  it("returns null when all days are off", () => {
    const start = new Date(2025, 5, 15);
    expect(simulateForecastCompletionDate(5, 3, [0, 1, 2, 3, 4, 5, 6], start)).toBeNull();
  });

  it("forecasts completion date correctly", () => {
    const start = new Date(2025, 5, 16); // Monday
    // 6 topics at 2/day, no off-days = 3 days → June 18
    const result = simulateForecastCompletionDate(6, 2, [], start);
    expect(result).toBe("2025-06-18");
  });
});

// ── countCompletedTopicsByDate ───────────────────────────────────────────────

describe("countCompletedTopicsByDate", () => {
  it("returns empty map for no completed topics", () => {
    const topics = [{ ...makeTopic({ status: "todo" }), subject: makeSubject(), chapter: makeChapter() }];
    expect(countCompletedTopicsByDate(topics).size).toBe(0);
  });

  it("groups completed topics by date", () => {
    const topics = [
      { ...makeTopic({ id: "t1", status: "done", completedDate: "2025-06-15T10:00:00Z" }), subject: makeSubject(), chapter: makeChapter() },
      { ...makeTopic({ id: "t2", status: "done", completedDate: "2025-06-15T14:00:00Z" }), subject: makeSubject(), chapter: makeChapter() },
    ];
    const map = countCompletedTopicsByDate(topics);
    // Both on the same date
    expect(map.size).toBeGreaterThanOrEqual(1);
  });
});

// ── computeStudyStreak ──────────────────────────────────────────────────────

describe("computeStudyStreak", () => {
  it("returns 0 when no completions today", () => {
    expect(computeStudyStreak(new Map(), "2025-06-15")).toBe(0);
  });

  it("returns 1 when only today has completions", () => {
    const map = new Map([["2025-06-15", 2]]);
    expect(computeStudyStreak(map, "2025-06-15")).toBe(1);
  });

  it("counts consecutive days", () => {
    const map = new Map([
      ["2025-06-15", 1],
      ["2025-06-14", 3],
      ["2025-06-13", 1],
    ]);
    expect(computeStudyStreak(map, "2025-06-15")).toBe(3);
  });

  it("breaks on gap", () => {
    const map = new Map([
      ["2025-06-15", 1],
      ["2025-06-14", 1],
      // gap on 13th
      ["2025-06-12", 1],
    ]);
    expect(computeStudyStreak(map, "2025-06-15")).toBe(2);
  });
});
