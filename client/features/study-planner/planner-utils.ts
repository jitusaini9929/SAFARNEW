/**
 * planner-utils.ts
 *
 * Pure utility functions extracted from StudyPlanner.tsx for testability.
 * These were previously module-private functions in the monolithic component.
 * No behavior changes — only moved and exported.
 */

// Re-export toIsoDateOnly from plan.model so callers don't need two imports
export { toIsoDateOnly } from "./plan.model";
import { toIsoDateOnly } from "./plan.model";

// ── Types (mirrored from StudyPlanner.tsx local interfaces) ─────────────────

export type TopicStatus = "todo" | "in_progress" | "done" | "revision_needed";

export interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  weeklyTarget?: number;
  monthlyTarget?: number;
  chapters: Chapter[];
}

export interface Plan {
  id: string;
  title: string;
  examType?: string;
  examDate?: string;
  description?: string;
  dailyGoal?: number;
  offDays: number[];
  features: {
    isPremium: boolean;
    unlockedAt?: string;
  };
  subjects: Subject[];
  progress?: {
    totalTopics: number;
    doneTopics: number;
    completionPercent: number;
  };
}

// ── Bulk Import Types ───────────────────────────────────────────────────────

export interface BulkChapterGroup {
  chapterName: string;
  topics: string[];
}

export interface BulkSubjectGroup {
  subjectName: string;
  chapters: BulkChapterGroup[];
}

// ── Constants ───────────────────────────────────────────────────────────────

const BULK_IMPORT_PLACEHOLDER_NAME = "Untitled";

// ── Date Utilities ──────────────────────────────────────────────────────────

export function formatDate(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function startOfDay(input: Date | string): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function daysBetweenDateKeys(startKey: string, endKey: string): number {
  const start = new Date(startKey);
  const end = new Date(endKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function findNextAvailableDate(start: Date, offDays: number[]): string {
  const offDaysSet = new Set(offDays);
  const cursor = new Date(start);
  for (let i = 0; i < 366; i += 1) {
    if (!offDaysSet.has(cursor.getDay())) {
      return toIsoDateOnly(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return toIsoDateOnly(start);
}

export function dayDiff(dateStr?: string): number | null {
  if (!dateStr) return null;
  const examKey = toIsoDateOnly(dateStr);
  if (!examKey) return null;
  const todayKey = toIsoDateOnly(new Date());
  const parseLocalMidnight = (key: string) => {
    const [y, m, d] = key.split("-").map((x) => Number.parseInt(x, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
      return NaN;
    return new Date(y, m - 1, d).getTime();
  };
  const examMs = parseLocalMidnight(examKey);
  const todayMs = parseLocalMidnight(todayKey);
  if (Number.isNaN(examMs) || Number.isNaN(todayMs)) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((examMs - todayMs) / msPerDay);
}

export function countStudyDaysBetween(
  start: Date,
  end: Date,
  offDays: number[],
): number {
  const cursor = startOfDay(start);
  const endDate = startOfDay(end);
  const offDaySet = new Set(offDays);
  let count = 0;

  while (cursor.getTime() <= endDate.getTime()) {
    if (!offDaySet.has(cursor.getDay())) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}

// ── Plan Progress ───────────────────────────────────────────────────────────

export function flattenTopics(
  plan: Plan,
): Array<Topic & { subject: Subject; chapter: Chapter }> {
  const out: Array<Topic & { subject: Subject; chapter: Chapter }> = [];
  if (!plan || !plan.subjects) return out;
  for (const subject of plan.subjects) {
    if (!subject.chapters) continue;
    for (const chapter of subject.chapters) {
      if (!chapter.topics) continue;
      for (const topic of chapter.topics) {
        out.push({ ...topic, subject, chapter });
      }
    }
  }
  return out;
}

export function plannerProgress(plan: Plan) {
  let total = 0;
  let done = 0;
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      total += chapter.topics.length;
      done += chapter.topics.filter((t) => t.status === "done").length;
    }
  }
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function chapterPercent(chapter: Chapter) {
  if (!chapter.topics.length) return 0;
  return Math.round(
    (chapter.topics.filter((t) => t.status === "done").length /
      chapter.topics.length) *
      100,
  );
}

export function subjectPercent(subject: Subject) {
  let total = 0;
  let done = 0;
  for (const chapter of subject.chapters) {
    total += chapter.topics.length;
    done += chapter.topics.filter((t) => t.status === "done").length;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ── Forecast & Heatmap ──────────────────────────────────────────────────────

export function simulateForecastCompletionDate(
  remainingTopics: number,
  dailyGoal: number,
  offDays: number[],
  startDate: Date,
): string | null {
  if (remainingTopics <= 0) return toIsoDateOnly(startDate);

  const goal = Math.max(1, dailyGoal || 1);
  const offDaySet = new Set(offDays);
  const cursor = startOfDay(startDate);
  let topicsLeft = remainingTopics;

  for (let i = 0; i < 3660; i += 1) {
    if (!offDaySet.has(cursor.getDay())) {
      topicsLeft -= goal;
      if (topicsLeft <= 0) {
        return toIsoDateOnly(cursor);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

export function countCompletedTopicsByDate(
  topics: Array<Topic & { subject: Subject; chapter: Chapter }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!topics || !Array.isArray(topics)) return counts;
  for (const topic of topics) {
    if (topic.status !== "done" || !topic.completedDate) continue;
    const key = toIsoDateOnly(topic.completedDate);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}



export function computeStudyStreak(
  completedByDate: Map<string, number>,
  todayKey: string,
): number {
  let streak = 0;
  let cursor = startOfDay(todayKey);

  const todayIso = toIsoDateOnly(cursor);
  if ((completedByDate.get(todayIso) || 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // Grace period: if haven't studied today yet, check yesterday
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayIso = toIsoDateOnly(cursor);
    if ((completedByDate.get(yesterdayIso) || 0) > 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      return 0; // neither today nor yesterday -> broken
    }
  }

  while (true) {
    const key = toIsoDateOnly(cursor);
    if ((completedByDate.get(key) || 0) <= 0) {
      return streak;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
}

// ── Bulk Import Parsing ─────────────────────────────────────────────────────

export function splitTopicLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function isBulkPlaceholderChapter(chapter: Pick<Chapter, "name">): boolean {
  return (
    chapter.name.trim().toLowerCase() ===
    BULK_IMPORT_PLACEHOLDER_NAME.toLowerCase()
  );
}

export function normalizeBulkTopicToken(input: string): string {
  return input
    .replace(/^[>\s-]*[-*•]\s*/, "")
    .replace(/^[>\s]*\d+[\).:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBulkTopicsByChapter(
  input: string,
  fallbackChapter = "General",
): BulkChapterGroup[] {
  const groups: BulkChapterGroup[] = [];
  const chapterIndexByKey = new Map<string, number>();
  const topicSeenByChapter = new Map<string, Set<string>>();

  const ensureChapter = (name: string): number => {
    const normalizedName = name.trim() || fallbackChapter || "General";
    const key = normalizedName.toLowerCase();
    const existing = chapterIndexByKey.get(key);
    if (existing !== undefined) return existing;

    groups.push({ chapterName: normalizedName, topics: [] });
    const nextIndex = groups.length - 1;
    chapterIndexByKey.set(key, nextIndex);
    topicSeenByChapter.set(key, new Set<string>());
    return nextIndex;
  };

  let activeChapterIndex = ensureChapter(fallbackChapter || "General");

  const addTopicToActiveChapter = (topicName: string) => {
    const topic = normalizeBulkTopicToken(topicName);
    if (!topic) return;

    const chapterKey = groups[activeChapterIndex].chapterName.toLowerCase();
    const seen = topicSeenByChapter.get(chapterKey);
    if (!seen) return;

    const topicKey = topic.toLowerCase();
    if (seen.has(topicKey)) return;

    seen.add(topicKey);
    groups[activeChapterIndex].topics.push(topic);
  };

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const rawLine of lines) {
    const markdownHeading = rawLine.match(/^#{1,6}\s+(.+)$/);
    if (markdownHeading) {
      activeChapterIndex = ensureChapter(markdownHeading[1]);
      continue;
    }

    const underscoreChapter = rawLine.match(/^_+\s*(.+)$/);
    if (underscoreChapter) {
      activeChapterIndex = ensureChapter(underscoreChapter[1]);
      continue;
    }

    const bracketHeading = rawLine.match(/^\[(.+)\]$/);
    if (bracketHeading) {
      activeChapterIndex = ensureChapter(bracketHeading[1]);
      continue;
    }

    const chapterHeading = rawLine.match(
      /^(?:chapter|unit|module|section)\s*\d*(?:-|:|\.)?\s*(.+)$/i,
    );
    if (chapterHeading && chapterHeading[1]) {
      activeChapterIndex = ensureChapter(chapterHeading[1]);
      continue;
    }

    const headingWithColon = rawLine.match(/^([^:]{2,100})\s*:\s*$/);
    if (headingWithColon && !/^[-*•]/.test(rawLine)) {
      activeChapterIndex = ensureChapter(headingWithColon[1]);
      continue;
    }

    const inlineChapterTopics = rawLine.match(/^([^:]{2,80})\s*:\s*(.+)$/);
    if (
      inlineChapterTopics &&
      /[,;|]/.test(inlineChapterTopics[2]) &&
      !/^[-*•]/.test(rawLine)
    ) {
      activeChapterIndex = ensureChapter(inlineChapterTopics[1]);
      const inlineTopics = inlineChapterTopics[2]
        .split(/[,;|]/)
        .map((part) => normalizeBulkTopicToken(part))
        .filter(Boolean);
      for (const topic of inlineTopics) {
        addTopicToActiveChapter(topic);
      }
      continue;
    }

    addTopicToActiveChapter(rawLine);
  }

  return groups.filter((group) => group.topics.length > 0);
}

export function parseBulkSubjectsFromTxt(input: string): BulkSubjectGroup[] {
  const rawLines = input.split(/\r?\n/);
  const subjectIndexByKey = new Map<string, number>();
  const chapterIndexBySubjectKey = new Map<string, Map<string, number>>();
  const topicSeenByChapter = new Map<string, Set<string>>();
  const subjects: BulkSubjectGroup[] = [];

  const ensureSubject = (name: string, lineNumber: number) => {
    const normalizedName = name.trim() || BULK_IMPORT_PLACEHOLDER_NAME;

    const subjectKey = normalizedName.toLowerCase();
    const existing = subjectIndexByKey.get(subjectKey);
    if (existing !== undefined) return existing;

    subjects.push({ subjectName: normalizedName, chapters: [] });
    const nextIndex = subjects.length - 1;
    subjectIndexByKey.set(subjectKey, nextIndex);
    chapterIndexBySubjectKey.set(subjectKey, new Map<string, number>());
    return nextIndex;
  };

  const ensureChapter = (
    subjectIndex: number | null,
    name: string,
    lineNumber: number,
  ) => {
    if (subjectIndex === null) {
      throw new Error(
        `Line ${lineNumber}: add a subject with "-" before defining a chapter.`,
      );
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error(`Line ${lineNumber}: chapter name is missing after "_".`);
    }

    const subject = subjects[subjectIndex];
    const subjectKey = subject.subjectName.toLowerCase();
    const chapterMap = chapterIndexBySubjectKey.get(subjectKey);
    if (!chapterMap) {
      throw new Error(`Line ${lineNumber}: could not track chapter structure.`);
    }

    const chapterKey = normalizedName.toLowerCase();
    const existing = chapterMap.get(chapterKey);
    if (existing !== undefined) return existing;

    subject.chapters.push({ chapterName: normalizedName, topics: [] });
    const nextIndex = subject.chapters.length - 1;
    chapterMap.set(chapterKey, nextIndex);
    topicSeenByChapter.set(`${subjectKey}::${chapterKey}`, new Set<string>());
    return nextIndex;
  };

  const addTopicToChapter = (
    subjectIndex: number | null,
    chapterIndex: number | null,
    topicName: string,
    lineNumber: number,
  ) => {
    if (subjectIndex === null || chapterIndex === null) {
      throw new Error(
        `Line ${lineNumber}: add a chapter with "_" before listing topics.`,
      );
    }

    const topic = normalizeBulkTopicToken(topicName);
    if (!topic) {
      throw new Error(`Line ${lineNumber}: topic name cannot be empty.`);
    }

    const subject = subjects[subjectIndex];
    const chapter = subject.chapters[chapterIndex];
    const chapterKey = `${subject.subjectName.toLowerCase()}::${chapter.chapterName.toLowerCase()}`;
    const seen = topicSeenByChapter.get(chapterKey);
    if (!seen) {
      throw new Error(`Line ${lineNumber}: could not track topic structure.`);
    }

    const topicKey = topic.toLowerCase();
    if (seen.has(topicKey)) return;

    seen.add(topicKey);
    chapter.topics.push(topic);
  };

  let activeSubjectIndex: number | null = null;
  let activeChapterIndex: number | null = null;

  for (let index = 0; index < rawLines.length; index += 1) {
    const lineNumber = index + 1;
    const line = rawLines[index].trim();

    if (!line) continue;

    const subjectHeading = line.match(/^-\s*(.*)$/);
    if (subjectHeading) {
      activeSubjectIndex = ensureSubject(subjectHeading[1], lineNumber);
      activeChapterIndex = null;
      continue;
    }

    const chapterHeading = line.match(/^_\s*(.*)$/);
    if (chapterHeading) {
      if (activeSubjectIndex === null) {
        activeSubjectIndex = ensureSubject(
          BULK_IMPORT_PLACEHOLDER_NAME,
          lineNumber,
        );
      }
      activeChapterIndex = ensureChapter(
        activeSubjectIndex,
        chapterHeading[1] || BULK_IMPORT_PLACEHOLDER_NAME,
        lineNumber,
      );
      continue;
    }

    const topicHeading = line.match(/^>\s*(.*)$/);
    if (topicHeading) {
      if (activeSubjectIndex === null) {
        activeSubjectIndex = ensureSubject(
          BULK_IMPORT_PLACEHOLDER_NAME,
          lineNumber,
        );
      }
      if (activeChapterIndex === null) {
        activeChapterIndex = ensureChapter(
          activeSubjectIndex,
          BULK_IMPORT_PLACEHOLDER_NAME,
          lineNumber,
        );
      }
      addTopicToChapter(
        activeSubjectIndex,
        activeChapterIndex,
        topicHeading[1],
        lineNumber,
      );
      continue;
    }

    if (activeSubjectIndex === null) {
      activeSubjectIndex = ensureSubject(
        BULK_IMPORT_PLACEHOLDER_NAME,
        lineNumber,
      );
    }
    if (activeChapterIndex === null) {
      activeChapterIndex = ensureChapter(
        activeSubjectIndex,
        BULK_IMPORT_PLACEHOLDER_NAME,
        lineNumber,
      );
    }
    addTopicToChapter(activeSubjectIndex, activeChapterIndex, line, lineNumber);
  }

  if (subjects.length === 0) {
    throw new Error(
      'No subjects found. Start each subject with "-" in the imported .txt file.',
    );
  }

  for (const subject of subjects) {
    if (subject.chapters.length === 0) {
      throw new Error(
        `Subject "${subject.subjectName}" does not contain any chapters.`,
      );
    }

    for (const chapter of subject.chapters) {
      chapter.topics = chapter.topics.filter(Boolean);
    }
  }

  return subjects;
}
