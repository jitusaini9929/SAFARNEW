import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE, apiFetch, getAccessToken, type ApiFetchOptions } from "../client/utils/apiFetch";
import PlannerSidebar from "../client/components/PlannerSidebar";
import LanguageToggle from "../client/components/LanguageToggle";
import ThemeToggle from "../client/components/ui/theme-toggle";
import { Switch } from "../client/components/ui/switch";
import { TourPrompt } from "../client/components/guided-tour";
import { studyPlannerTour } from "../client/components/guided-tour/tourSteps";
import { useGuidedTour } from "../client/contexts/GuidedTourContext";
import { PremiumEmoji } from "../client/components/PremiumEmoji";

type TopicStatus = "todo" | "in_progress" | "done" | "revision_needed";
type PlannerSection = "today" | "plan" | "syllabus" | "calendar" | "insights";
type PlannerView = PlannerSection | "kanban";
type SyllabusLayoutMode = "hierarchy" | "classic" | "org-chart";
type GuidedActionId =
  | "set_exam_date"
  | "add_topics"
  | "build_schedule"
  | "open_calendar";

type PlannerOnboardingState = {
  skipped: boolean;
  buildScheduleStepDone: boolean;
  calendarReviewStepDone: boolean;
  completed: boolean;
};

interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
}

interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

interface Subject {
  id: string;
  name: string;
  color: string;
  weeklyTarget?: number;
  monthlyTarget?: number;
  chapters: Chapter[];
}

interface Plan {
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

interface CalendarItem {
  topicId: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  subjectColor: string;
  status: TopicStatus;
}

type InsightTrackStatus = "on_track" | "needs_attention" | "at_risk";

interface PlannerInsightDay {
  date: string;
  plannedCount: number;
  doneCount: number;
  overdueCount: number;
  isOffDay: boolean;
}

interface PlannerInsightRecommendation {
  id: string;
  title: string;
  reason: string;
  ctaLabel: string;
  targetView: Exclude<PlannerSection, "insights">;
}

interface PlannerInsights {
  summary: {
    completionPercent: number;
    remainingTopics: number;
    daysUntilExam: number | null;
    availableStudyDays: number | null;
    requiredTopicsPerStudyDay: number | null;
    onTrackStatus: InsightTrackStatus;
    forecastCompletionDate: string | null;
    daysBuffer: number | null;
    scheduleCoveragePercent: number | null;
  };
  consistency: {
    studyStreak: number;
    activeDaysLast14: number;
    activeDaysLast30: number;
    bestStudyWeekday: string;
    heatmap: Array<{ date: string; count: number }>;
  };
  workload: {
    next14Days: PlannerInsightDay[];
    overloadDays: number;
    emptyStudyDays: number;
    busiestDay: PlannerInsightDay | null;
    busiestSubjectUpcoming: string | null;
  };
  coverage: {
    subjectRows: Array<{
      subjectId: string;
      subjectName: string;
      color: string;
      completionPercent: number;
      remainingTopics: number;
      overdueTopics: number;
      revisionTopics: number;
      scheduledTopics: number;
    }>;
    laggingChapters: Array<{
      subjectId: string;
      subjectName: string;
      chapterId: string;
      chapterName: string;
      remainingTopics: number;
      completionPercent: number;
      overdueTopics: number;
    }>;
  };
  backlog: {
    overdueTotal: number;
    overdueAgingBuckets: {
      days1to3: number;
      days4to7: number;
      days8Plus: number;
    };
    unplannedUnfinishedTopics: number;
    revisionNeededTopics: number;
    reviewDueSoon: number;
    reviewOverdue: number;
  };
  recommendations: PlannerInsightRecommendation[];
}

const BASE = "/api/plans";
const BEGINNER_MODE_STORAGE_KEY = "study-planner-beginner-mode";
const SYLLABUS_LAYOUT_MODE_STORAGE_KEY = "study-planner-syllabus-layout-mode";
const PLANNER_ONBOARDING_STORAGE_KEY = "study-planner-onboarding-v2";
const BULK_IMPORT_SUBJECT_PALETTE = [
  "#0ea5e9",
  "#9333ea",
  "#16a34a",
  "#ef4444",
  "#f59e0b",
  "#0f766e",
];
const BULK_IMPORT_REQUEST_TIMEOUT_MS = 20000;
const BULK_TXT_FORMAT_EXAMPLE = `- Subject Name
_ Chapter Name
> Topic one
> Topic two
_ Next Chapter
> First topic
> Second topic`;
const PLANNER_ONBOARDING_DEFAULT_STATE: PlannerOnboardingState = {
  skipped: false,
  buildScheduleStepDone: false,
  calendarReviewStepDone: false,
  completed: false,
};
const PLANNER_ONBOARDING_STEPS: GuidedActionId[] = [
  "set_exam_date",
  "add_topics",
  "build_schedule",
  "open_calendar",
];
const PLANNER_ONBOARDING_REQUIRED_VIEW: Record<GuidedActionId, PlannerSection> =
  {
    set_exam_date: "plan",
    add_topics: "syllabus",
    build_schedule: "plan",
    open_calendar: "calendar",
  };

const STUDY_PLANNER_TOUR_VIEW_BY_TARGET: Partial<
  Record<string, PlannerSection>
> = {
  "[data-tour='planner-quick-actions']": "today",
  "[data-tour='planner-metrics']": "today",
  "[data-tour='planner-today-tasks']": "today",
  "[data-tour='planner-upcoming']": "today",
  "[data-tour='planner-overdue']": "today",
  "[data-tour='planner-plan-basics']": "plan",
  "[data-tour='planner-plan-actions']": "plan",
  "[data-tour='planner-syllabus-setup']": "syllabus",
  "[data-tour='planner-subjects-area']": "syllabus",
  "[data-tour='planner-calendar-grid']": "calendar",
  "[data-tour='planner-day-panel']": "calendar",
};

function readPlannerOnboardingState(): PlannerOnboardingState {
  if (typeof window === "undefined") return PLANNER_ONBOARDING_DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(PLANNER_ONBOARDING_STORAGE_KEY);
    if (!raw) return PLANNER_ONBOARDING_DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      skipped: Boolean(parsed?.skipped),
      buildScheduleStepDone: Boolean(parsed?.buildScheduleStepDone),
      calendarReviewStepDone: Boolean(parsed?.calendarReviewStepDone),
      completed: Boolean(parsed?.completed),
    };
  } catch {
    return PLANNER_ONBOARDING_DEFAULT_STATE;
  }
}

function writePlannerOnboardingState(state: PlannerOnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PLANNER_ONBOARDING_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // ignore storage errors
  }
}

async function plannerRequest<T>(
  url: string,
  init?: ApiFetchOptions,
): Promise<T> {
  const response = await apiFetch(url, init);
  if (!response.ok) {
    let message = "Planner request failed";
    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

const STATUS_UI: Record<
  TopicStatus,
  {
    label: string;
    color: string;
    bg: string;
    darkColor?: string;
    darkBg?: string;
  }
> = {
  todo: {
    label: "Not Started",
    color: "#64748b",
    bg: "#f1f5f9",
    darkColor: "#94a3b8",
    darkBg: "#1e293b",
  },
  in_progress: {
    label: "In Progress",
    color: "#00b8d4",
    bg: "#e0f7fa",
    darkColor: "#00e5ff",
    darkBg: "#00363d",
  },
  done: {
    label: "Done",
    color: "#0284c7",
    bg: "#e0f2fe",
    darkColor: "#0ea5e9",
    darkBg: "#001f24",
  },
  revision_needed: {
    label: "Needs Revision",
    color: "#9333ea",
    bg: "#f3e8ff",
    darkColor: "#c180ff",
    darkBg: "#25005a",
  },
};

const EXAM_TYPE_OPTIONS = [
  "CGL",
  "CHSL",
  "GD",
  "MTS",
  "12th Boards",
  "NTPC",
  "JEE",
  "NEET",
  "UPSC",
  "CAT",
];

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  todo: "Your Study Queue. Topics you haven't started yet. Drag items here to prioritize your upcoming work.",
  in_progress:
    "Active Learning. Topics you are currently studying. Focus on these modules to stay on schedule.",
  done: "Study Archive. Successfully completed topics. Great progress! Your achievements are logged here.",
};

const PLANNER_PRESS_EASE = "motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]";
const PLANNER_PRESSABLE =
  `motion-safe:transition-[transform,box-shadow,background-color,border-color,color,opacity] motion-safe:duration-150 ${PLANNER_PRESS_EASE} motion-reduce:transition-colors active:scale-[0.97] active:translate-y-[1px] disabled:active:scale-100 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40`;
const PLANNER_TEXT_PRESSABLE =
  `motion-safe:transition-[transform,color,opacity] motion-safe:duration-150 ${PLANNER_PRESS_EASE} active:scale-[0.97] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30`;

function toIsoDateOnly(input: Date | string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function splitTopicLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

interface BulkChapterGroup {
  chapterName: string;
  topics: string[];
}

interface BulkSubjectGroup {
  subjectName: string;
  chapters: BulkChapterGroup[];
}

type BulkAddMode = "manual" | "txt-file";

function normalizeBulkTopicToken(input: string): string {
  return input
    .replace(/^[>\s-]*[-*•]\s*/, "")
    .replace(/^[>\s]*\d+[\).:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBulkTopicsByChapter(
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

function parseBulkSubjectsFromTxt(input: string): BulkSubjectGroup[] {
  const rawLines = input.split(/\r?\n/);
  const subjectIndexByKey = new Map<string, number>();
  const chapterIndexBySubjectKey = new Map<string, Map<string, number>>();
  const topicSeenByChapter = new Map<string, Set<string>>();
  const subjects: BulkSubjectGroup[] = [];

  const ensureSubject = (name: string, lineNumber: number) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error(`Line ${lineNumber}: subject name is missing after "-".`);
    }

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
      throw new Error(
        `Line ${lineNumber}: chapter name is missing after "_".`,
      );
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
      activeChapterIndex = ensureChapter(
        activeSubjectIndex,
        chapterHeading[1],
        lineNumber,
      );
      continue;
    }

    const topicHeading = line.match(/^>\s*(.*)$/);
    if (topicHeading) {
      addTopicToChapter(
        activeSubjectIndex,
        activeChapterIndex,
        topicHeading[1],
        lineNumber,
      );
      continue;
    }

    throw new Error(
      `Line ${lineNumber}: use "-" for subjects, "_" for chapters, and ">" for topics in imported .txt files.`,
    );
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
      if (chapter.topics.length === 0) {
        throw new Error(
          `Chapter "${chapter.chapterName}" in subject "${subject.subjectName}" does not contain any topics.`,
        );
      }
    }
  }

  return subjects;
}

function daysBetweenDateKeys(startKey: string, endKey: string): number {
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

function findNextAvailableDate(start: Date, offDays: number[]): string {
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

function dayDiff(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function flattenTopics(
  plan: Plan,
): Array<Topic & { subject: Subject; chapter: Chapter }> {
  const out: Array<Topic & { subject: Subject; chapter: Chapter }> = [];
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        out.push({ ...topic, subject, chapter });
      }
    }
  }
  return out;
}

function plannerProgress(plan: Plan) {
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

function chapterPercent(chapter: Chapter) {
  if (!chapter.topics.length) return 0;
  return Math.round(
    (chapter.topics.filter((t) => t.status === "done").length /
      chapter.topics.length) *
      100,
  );
}

function subjectPercent(subject: Subject) {
  let total = 0;
  let done = 0;
  for (const chapter of subject.chapters) {
    total += chapter.topics.length;
    done += chapter.topics.filter((t) => t.status === "done").length;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function startOfDay(input: Date | string): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function countStudyDaysBetween(
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

function simulateForecastCompletionDate(
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

function countCompletedTopicsByDate(
  topics: Array<Topic & { subject: Subject; chapter: Chapter }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const topic of topics) {
    if (topic.status !== "done" || !topic.completedDate) continue;
    const key = toIsoDateOnly(topic.completedDate);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function buildPlannerHeatmap(
  completedByDate: Map<string, number>,
  endDate: Date,
  length = 30,
): Array<{ date: string; count: number }> {
  const out: Array<{ date: string; count: number }> = [];
  const end = startOfDay(endDate);

  for (let offset = length - 1; offset >= 0; offset -= 1) {
    const date = addDays(end, -offset);
    const key = toIsoDateOnly(date);
    out.push({ date: key, count: completedByDate.get(key) || 0 });
  }

  return out;
}

function computeStudyStreak(
  completedByDate: Map<string, number>,
  todayKey: string,
): number {
  let streak = 0;
  let cursor = startOfDay(todayKey);

  while (true) {
    const key = toIsoDateOnly(cursor);
    if ((completedByDate.get(key) || 0) <= 0) {
      return streak;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
}

// ── Custom Date Picker Component ──────────────────────────────
function CustomDatePicker({
  value,
  onChange,
  isDarkMode,
  align,
  offDays = [],
  minDate,
}: {
  value: string;
  onChange: (val: string) => void;
  isDarkMode: boolean;
  align?: "top" | "bottom";
  offDays?: number[];
  minDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const alignment = align || "bottom";

  const parsed = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!pickerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerOutside);
    document.addEventListener("touchstart", handlePointerOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside);
      document.removeEventListener("touchstart", handlePointerOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const selectedKey = value || "";

  function pickDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  function prevMonth() {
    if (minDate) {
      const minD = new Date(minDate);
      if (!Number.isNaN(minD.getTime())) {
        if (viewYear === minD.getFullYear() && viewMonth <= minD.getMonth()) {
          return;
        }
      }
    }
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  const displayText = value
    ? `${new Date(value).getDate()} ${MONTHS[new Date(value).getMonth()]} ${new Date(value).getFullYear()}`
    : "Select date";

  const bg = isDarkMode ? "bg-[#1a1c1e]" : "bg-white";
  const border = isDarkMode ? "border-[#3a3d42]" : "border-[#d1d5db]";
  const text = isDarkMode ? "text-white" : "text-[#1a202c]";
  const muted = isDarkMode ? "text-[#9aa2ae]" : "text-[#64748b]";
  const hoverBg = isDarkMode ? "hover:bg-[#2a2d31]" : "hover:bg-[#f0f5ff]";
  const selectedBg = "bg-blue-600 text-white";

  return (
    <div ref={pickerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border ${bg} ${border} ${text} ${PLANNER_PRESSABLE}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        {displayText}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: alignment === "top" ? 8 : -8,
              scale: 0.96,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: alignment === "top" ? 8 : -8, scale: 0.96 }}
            className={`absolute ${alignment === "top" ? "bottom-full mb-2" : "top-full mt-2"} left-0 z-[120] w-[280px] rounded-2xl border shadow-2xl p-4 ${bg} ${border}`}
          >
            {/* Month/Year header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className={`p-1.5 rounded-lg ${hoverBg} ${text} ${PLANNER_PRESSABLE}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className={`text-sm font-bold ${text}`}>
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className={`p-1.5 rounded-lg ${hoverBg} ${text} ${PLANNER_PRESSABLE}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW.map((d) => (
                <div
                  key={d}
                  className={`text-center text-[12px] font-bold uppercase ${muted}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const mm = String(viewMonth + 1).padStart(2, "0");
                const dd = String(day).padStart(2, "0");
                const iso = `${viewYear}-${mm}-${dd}`;
                const isSelected = iso === selectedKey;
                const isTodayCell = iso === toIsoDateOnly(new Date());
                const dow = new Date(viewYear, viewMonth, day).getDay();
                const isRestDay = offDays?.includes(dow);
                const isBeforeMin = minDate ? iso < minDate : false;
                const isDisabled = isRestDay || isBeforeMin;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) pickDay(day);
                    }}
                    disabled={isDisabled}
                    className={`w-full aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative ${PLANNER_PRESSABLE}
                      ${isDisabled ? "opacity-30 cursor-not-allowed font-medium bg-[#f9fafb] dark:bg-[#151718]" : "font-bold hover:bg-[#f0f5ff] dark:hover:bg-[#2a2d31]"}
                      ${!isDisabled && isSelected ? selectedBg : ""}
                      ${!isDisabled && !isSelected && isTodayCell ? `ring-1 ring-blue-400 ${text}` : ""}
                      ${!isDisabled && !isSelected && !isTodayCell ? `${text}` : ""}
                    `}
                  >
                    <span>{day}</span>
                    {isRestDay && !isBeforeMin && (
                      <span className="text-[6px] uppercase font-black text-amber-500 absolute bottom-[2px]">
                        Off
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Year jump */}
            <div
              className="flex items-center gap-2 mt-3 pt-3 border-t"
              style={{ borderColor: isDarkMode ? "#3a3d42" : "#e5e7eb" }}
            >
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                className={`text-[12px] font-bold px-2 py-1 rounded ${hoverBg} ${muted} ${PLANNER_PRESSABLE}`}
              >
                &larr; Year
              </button>
              <span className={`flex-1 text-center text-sm font-bold ${muted}`}>
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className={`text-[12px] font-bold px-2 py-1 rounded ${hoverBg} ${muted} ${PLANNER_PRESSABLE}`}
              >
                Year &rarr;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CalendarView({
  monthDate,
  calendar,
  onPickDate,
  offDays,
  todayIso,
}: {
  monthDate: Date;
  calendar: Record<string, CalendarItem[]>;
  onPickDate: (iso: string) => void;
  offDays: number[];
  todayIso: string;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const firstDay = first.getDay(); // Sunday is 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const slots: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) slots.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) slots.push(d);

  const offDaySet = new Set(offDays);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-7 gap-4 px-2">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div
            key={day}
            className="text-center font-study-planner text-[12px] font-bold text-[#8b919e] dark:text-[#acabaa] tracking-[0.3em]"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3 md:gap-4 p-4 rounded-3xl bg-[#e6e7ee] dark:bg-[#131313] shadow-[inset_0_2px_4px_0_rgba(166,171,189,0.4),inset_0_-1px_1px_0_rgba(255,255,255,1)] dark:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.6),inset_0_-1px_1px_0_rgba(255,255,255,0.05)] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] dark:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:4px_4px]">
        {slots.map((value, idx) => {
          if (!value) {
            return (
              <div
                key={`empty-${idx}`}
                className="aspect-square rounded-2xl opacity-40 dark:opacity-20 border border-transparent flex items-start p-4 text-[#8b919e] dark:text-[#acabaa] font-study-planner text-lg italic"
              />
            );
          }

          const cellDate = new Date(year, month, value);
          const iso = toIsoDateOnly(cellDate);
          const items = calendar[iso] || [];
          const isToday = iso === todayIso;
          const plannedCount = items.length;
          const doneCount = items.filter(
            (item) => item.status === "done",
          ).length;
          const overdueCount = items.filter(
            (item) => item.status !== "done" && iso < todayIso,
          ).length;
          const isOffDay = offDaySet.has(cellDate.getDay());

          return (
            <motion.button
              whileHover={{ scale: 0.96 }}
              whileTap={{ scale: 0.94 }}
              key={iso}
              onClick={() => onPickDate(iso)}
              className={`aspect-square rounded-2xl shadow-lg relative group transition-colors text-left ${
                isToday
                  ? "bg-[#ffffff] dark:bg-[#252626] border-2 border-blue-500/50 dark:border-[#c3c7cd]/50 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_30px_-5px_rgba(195,199,205,0.2)]"
                  : "bg-[#f0f0f5] dark:bg-[#000000] border border-[#ffffff]/50 dark:border-[#484848]/10 hover:bg-[#ffffff] dark:hover:bg-[#1f2020]"
              }`}
            >
              {/* Inner container to clip overlapping items, but allow popover outside */}
              <div className="absolute inset-0 p-1.5 md:p-2.5 flex flex-col overflow-hidden rounded-2xl">
                <div className="flex justify-between items-start">
                  <span
                    className={`text-sm md:text-xl font-bold font-study-planner ${isToday ? "text-[#2d333b] dark:text-[#e7e5e5]" : "text-[#4b5563] dark:text-[#acabaa]"}`}
                  >
                    {value}
                  </span>

                  {isToday && (
                    <div className="mt-1 md:mt-1.5 mr-1 md:mr-1.5 z-10">
                      <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                      </span>
                    </div>
                  )}
                </div>

                {isOffDay && (
                  <div className="absolute top-1 right-1 text-[7px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Off
                  </div>
                )}

                {plannedCount > 0 && (
                  <div className="mt-auto flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-[#6b7280] dark:text-[#9ca3af]">
                    <span>{plannedCount}P</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {doneCount}D
                    </span>
                    {overdueCount > 0 && (
                      <span className="text-red-500 dark:text-red-400">
                        {overdueCount}O
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Hover Popover */}
              {items.length > 0 && (
                <div className="absolute left-[50%] -translate-x-[50%] bottom-[105%] w-[180%] min-w-[140px] max-w-[220px] z-[60] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-[#ffffff] dark:bg-[#1f2020] rounded-xl shadow-2xl border border-gray-200 dark:border-[#3b494c] p-2 md:p-3 flex-col gap-2 flex pointer-events-none">
                  <span className="text-[11px] md:text-[12px] font-bold text-[#4b5563] dark:text-[#acabaa] border-b border-gray-100 dark:border-[#3b494c] pb-1 mb-1 font-study-planner uppercase tracking-wider">
                    {value}{" "}
                    {monthDate.toLocaleString("default", { month: "short" })}
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto w-full custom-scrollbar">
                    {items.map((item) => (
                      <div
                        key={`popover-${item.topicId}`}
                        className="bg-blue-100/50 dark:bg-[#dae2fd]/10 border border-blue-200/50 dark:border-[#dae2fd]/20 p-1.5 md:p-2 rounded-md break-words whitespace-normal"
                      >
                        <span className="text-[8px] md:text-[11px] font-bold text-blue-700 dark:text-[#ccd4ee] uppercase block leading-tight">
                          {item.topicName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default function StudyPlanner({
  planId,
  initialView,
}: {
  planId: string;
  initialView?: PlannerSection;
}) {
  const navigate = useNavigate();
  const { isActive: isTourActive, currentTour, currentStep } = useGuidedTour();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [calendar, setCalendar] = useState<Record<string, CalendarItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const [view, setView] = useState<PlannerView>(initialView ?? "today");
  const [monthDate, setMonthDate] = useState(new Date());

  const [examType, setExamType] = useState("");
  const [examDateDraft, setExamDateDraft] = useState("");
  const [isExamDateEditorOpen, setIsExamDateEditorOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState<Record<string, string>>({});
  const [topicName, setTopicName] = useState<Record<string, string>>({});
  const [topicDate, setTopicDate] = useState<Record<string, string>>({});
  const [pickedDay, setPickedDay] = useState<string>("");
  const [planTitleDraft, setPlanTitleDraft] = useState("");
  const [dailyGoalDraft, setDailyGoalDraft] = useState(3);
  const [offDaysDraft, setOffDaysDraft] = useState<number[]>([]);
  const [includeRevisionNeeded, setIncludeRevisionNeeded] = useState(false);
  const [lockExistingDates, setLockExistingDates] = useState(true);
  const [syllabusQuery, setSyllabusQuery] = useState("");
  const [syllabusStatus, setSyllabusStatus] = useState<TopicStatus | "all">(
    "all",
  );
  const [syllabusSubject, setSyllabusSubject] = useState<string>("all");
  const [syllabusLayoutMode, setSyllabusLayoutMode] =
    useState<SyllabusLayoutMode>(() => {
      if (typeof window === "undefined") return "org-chart";
      const stored = window.localStorage.getItem(
        SYLLABUS_LAYOUT_MODE_STORAGE_KEY,
      );
      if (stored === "org-chart" || stored === "classic") return stored;
      // Migrate old or unknown persisted modes to org-chart for beginner-first flow.
      return "org-chart";
    });
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkAddMode, setBulkAddMode] = useState<BulkAddMode>("manual");
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [bulkSubjectName, setBulkSubjectName] = useState("");
  const [bulkChapterName, setBulkChapterName] = useState("");
  const [bulkTopicsText, setBulkTopicsText] = useState("");
  const [bulkAddError, setBulkAddError] = useState("");
  const [bulkImportedFileName, setBulkImportedFileName] = useState("");
  const [bulkTxtGuideOpen, setBulkTxtGuideOpen] = useState(false);
  const isTxtBulkMode = bulkAddMode === "txt-file";

  // ── Premium Upgrade Modal ──
  type PremiumModalReason =
    | "topic_limit"
    | "auto_schedule"
    | "bulk_add"
    | "reschedule"
    | "template"
    | null;
  const [premiumModalReason, setPremiumModalReason] =
    useState<PremiumModalReason>(null);
  const FREE_TOPIC_LIMIT = 30;

  function getTotalTopicCount(): number {
    if (!plan) return 0;
    let total = 0;
    for (const subject of plan.subjects) {
      for (const chapter of subject.chapters) {
        total += chapter.topics.length;
      }
    }
    return total;
  }
  const bulkImportInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    null,
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedChapterIds, setExpandedChapterIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedTodayTopicId, setExpandedTodayTopicId] = useState<
    string | null
  >(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [subjectRenameDraft, setSubjectRenameDraft] = useState<
    Record<string, string>
  >({});
  const [chapterRenameDraft, setChapterRenameDraft] = useState<
    Record<string, string>
  >({});
  const [topicRenameDraft, setTopicRenameDraft] = useState<
    Record<string, string>
  >({});
  const beginnerMode = false;
  const [showHeaderActions, setShowHeaderActions] = useState(false);
  const [showAdvancedCapacity, setShowAdvancedCapacity] = useState(false);
  const [showAdvancedPlanActions, setShowAdvancedPlanActions] = useState(false);
  const [isAutoDistributing, setIsAutoDistributing] = useState(false);
  const [plannerOnboardingState, setPlannerOnboardingState] =
    useState<PlannerOnboardingState>(() => readPlannerOnboardingState());
  // ── Move-date picker state ──
  const [moveDatePickerTopicId, setMoveDatePickerTopicId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!moveDatePickerTopicId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".move-date-dropdown-container")) {
        setMoveDatePickerTopicId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moveDatePickerTopicId]);
  // ── Template picker state ──
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<
    {
      id: string;
      name: string;
      examBody: string;
      category: string;
      description: string;
      estimatedTopics: number;
      recommendedDailyGoal: number;
      tags: string[];
    }[]
  >([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  // ── Off-day rebuild prompt ──
  const [showRebuildPrompt, setShowRebuildPrompt] = useState(false);
  // ── Exam type change prompt ──
  const [showExamTypeChangePrompt, setShowExamTypeChangePrompt] =
    useState(false);
  const [pendingExamType, setPendingExamType] = useState("");

  const summary = useMemo(
    () => (plan ? plannerProgress(plan) : { total: 0, done: 0, percent: 0 }),
    [plan],
  );
  const countdown = useMemo(() => dayDiff(plan?.examDate), [plan?.examDate]);
  const countdownLabel = useMemo(() => {
    if (countdown === null) return "Set Exam Date";
    if (Math.abs(countdown) > 9999) return "Invalid Date";
    if (countdown > 0) return `${countdown} Days Remaining`;
    if (countdown === 0) return "Exam is Today";
    return `${Math.abs(countdown)} Days Since Exam`;
  }, [countdown]);

  // ── Confirm Delete Modal state ──
  const [pendingDelete, setPendingDelete] = useState<{
    type: "subject" | "chapter" | "topic";
    id: string;
    parentId?: string;
    label: string;
  } | null>(null);

  // ── Toast Notification state ──
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [toastVisible, setToastVisible] = useState(false);

  function showToast(
    message: string,
    type: "success" | "error" | "info" = "info",
  ) {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  }

  function updatePlannerOnboardingState(
    patch: Partial<PlannerOnboardingState>,
  ) {
    setPlannerOnboardingState((prev) => {
      const next = { ...prev, ...patch };
      writePlannerOnboardingState(next);
      return next;
    });
  }

  function normalizePlannerActionMessage(
    rawMessage: unknown,
    fallback: string,
  ) {
    const message = String(rawMessage || fallback);
    if (/daily\s*goal|limit\s*reached|max\s*tasks?|capacity/i.test(message)) {
      return "Daily goal limit reached for that day. Choose another date or raise your daily goal.";
    }
    if (/abort|aborted|signal is aborted without reason/i.test(message)) {
      return "Request timed out while processing the planner action. Please try again.";
    }
    return message;
  }

  async function executePendingDelete() {
    if (!pendingDelete) return;
    const { type, id, parentId } = pendingDelete;
    setPendingDelete(null);
    try {
      if (id === "__clear_future__") {
        const didClear = await clearFutureDates();
        if (didClear) showToast("Future dates cleared.", "success");
      } else if (id === "__reset_plan__") {
        const didReset = await resetPlanTopics();
        if (didReset) showToast("Plan reset to start.", "success");
      } else if (type === "subject") await doDeleteSubject(id);
      else if (type === "chapter" && parentId)
        await doDeleteChapter(parentId, id);
      else if (type === "topic") await doDeleteTopic(id);
    } catch (err: any) {
      showToast(err?.message || "Delete failed", "error");
    }
  }

  async function fetchPlan(options?: { timeoutMs?: number }) {
    try {
      setLoading(true);
      const [planData, calendarData] = await Promise.all([
        plannerRequest<Plan>(`${BASE}/${planId}`, {
          timeoutMs: options?.timeoutMs,
        }),
        plannerRequest<Record<string, CalendarItem[]>>(
          `${BASE}/${planId}/calendar`,
          { timeoutMs: options?.timeoutMs },
        ),
      ]);

      setPlan(planData);
      setCalendar(calendarData || {});
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load planner");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPlan();
  }, [planId]);

  useEffect(() => {
    if (!plan) return;
    setExamType(plan.examType || "");
    setExamDateDraft(plan.examDate ? toIsoDateOnly(plan.examDate) : "");
    setPlanTitleDraft(plan.title || "");
    setDailyGoalDraft(plan.dailyGoal || 3);
    setOffDaysDraft(plan.offDays || []);
  }, [plan]);

  useEffect(() => {
    if (!initialView) return;
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!isTourActive || currentTour?.id !== "study-planner") return;
    const step = currentTour.steps[currentStep];
    if (!step?.target) return;

    const requiredView = STUDY_PLANNER_TOUR_VIEW_BY_TARGET[step.target];
    if (!requiredView || requiredView === view) return;

    setView(requiredView);
    navigate(`/study/planner/${planId}/${requiredView}`, { replace: true });
  }, [isTourActive, currentTour, currentStep, view, navigate, planId]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const syncDarkMode = () => setIsDarkMode(root.classList.contains("dark"));
    syncDarkMode();

    const observer = new MutationObserver(syncDarkMode);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Visual Chart Creation States
  const [isAddingChapterForSubject, setIsAddingChapterForSubject] = useState<
    string | null
  >(null);
  const [isAddingTopicForChapter, setIsAddingTopicForChapter] = useState<
    string | null
  >(null);
  const [visualAddDraft, setVisualAddDraft] = useState("");
  const [orgChartZoom, setOrgChartZoom] = useState(1);
  const [isOrgChartEditorOpen, setIsOrgChartEditorOpen] = useState(false);

  useEffect(() => {
    if (syllabusLayoutMode === "org-chart") return;
    setSyllabusLayoutMode("org-chart");
  }, [syllabusLayoutMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BEGINNER_MODE_STORAGE_KEY,
      beginnerMode ? "1" : "0",
    );
  }, [beginnerMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SYLLABUS_LAYOUT_MODE_STORAGE_KEY,
      syllabusLayoutMode,
    );
  }, [syllabusLayoutMode]);

  const unplannedTopicsCount = useMemo(() => {
    if (!plan) return 0;
    return flattenTopics(plan).filter(
      (t) => t.status !== "done" && !t.plannedDate,
    ).length;
  }, [plan]);

  async function updatePlanMeta(patch: Record<string, unknown>) {
    const data = await plannerRequest<Plan>(`${BASE}/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setPlan(data);
  }

  async function saveExamType() {
    const normalized = examType.trim();
    if (normalized === (plan?.examType || "")) {
      showToast("No exam type changes to save.", "info");
      return;
    }
    // P1-11: If plan has existing topics and exam type changed, prompt to clear
    const hasTopics =
      plan &&
      plan.subjects.some((s) => s.chapters.some((c) => c.topics.length > 0));
    if (hasTopics && plan?.examType && plan.examType !== normalized) {
      setPendingExamType(normalized);
      setShowExamTypeChangePrompt(true);
      return;
    }
    await doSaveExamType(normalized);
  }

  async function doSaveExamType(normalized: string) {
    try {
      await updatePlanMeta({ examType: normalized });
      setError("");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to save exam type",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function clearSyllabusAndSaveExamType() {
    try {
      // Delete all subjects one by one
      if (plan) {
        for (const subject of [...plan.subjects]) {
          await plannerRequest(`${BASE}/${planId}/subjects/${subject.id}`, {
            method: "DELETE",
          });
        }
      }
      await doSaveExamType(pendingExamType);
      // Refresh plan to get clean state
      const refreshed = await plannerRequest<Plan>(`${BASE}/${planId}`);
      setPlan(refreshed);
      showToast("Syllabus cleared and exam type updated.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to clear syllabus", "error");
    } finally {
      setShowExamTypeChangePrompt(false);
      setPendingExamType("");
    }
  }

  async function saveExamDate() {
    const normalized = examDateDraft.trim();
    if (!normalized) {
      const message = "Please choose a valid exam date";
      setError(message);
      showToast(message, "error");
      return;
    }
    // Guard against corrupt year values (e.g. year 52026)
    const parsedYear = new Date(normalized).getFullYear();
    if (Number.isNaN(parsedYear) || parsedYear < 2020 || parsedYear > 2099) {
      const message = "Invalid date. Please pick a date between 2020 and 2099.";
      setError(message);
      showToast(message, "error");
      return;
    }
    if (normalized === (plan?.examDate ? toIsoDateOnly(plan.examDate) : "")) {
      setIsExamDateEditorOpen(false);
      showToast("Exam date is already up to date.", "info");
      return;
    }
    try {
      await updatePlanMeta({ examDate: normalized });
      setError("");
      setIsExamDateEditorOpen(false);
      showToast("Exam date saved.", "success");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to save exam date",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  function handleViewChange(
    next: PlannerSection,
    options?: { bypassOnboarding?: boolean },
  ) {
    const shouldEnforceGuide =
      beginnerMode &&
      !plannerOnboardingState.completed &&
      !plannerOnboardingState.skipped;
    if (shouldEnforceGuide && !options?.bypassOnboarding) {
      const requiredView = PLANNER_ONBOARDING_REQUIRED_VIEW[activeGuideAction];
      if (next !== requiredView) {
        // BUG-2 Fix: Show reminder toast instead of blocking navigation
        showToast(
          `Tip: You're on ${currentGuide.step} — head to ${PLANNER_ONBOARDING_REQUIRED_VIEW[activeGuideAction]} to continue setup.`,
          "info",
        );
      }
    }
    setView(next);
    navigate(`/study/planner/${planId}/${next}`, { replace: true });
  }

  async function runGuidedAction(action: GuidedActionId) {
    if (action === "set_exam_date") {
      handleViewChange("plan", { bypassOnboarding: true });
      setIsExamDateEditorOpen(true);
      return;
    }

    if (action === "add_topics") {
      handleViewChange("syllabus", { bypassOnboarding: true });
      return;
    }

    if (action === "build_schedule") {
      handleViewChange("plan", { bypassOnboarding: true });
      if (plannerOnboardingState.buildScheduleStepDone) {
        showToast(
          "Step 3 already completed. Open calendar to continue.",
          "info",
        );
        return;
      }
      if (hasScheduledTopics && !hasPendingUnplannedTopics) {
        updatePlannerOnboardingState({ buildScheduleStepDone: true });
        showToast(
          "Step 3 completed. Your schedule is already ready.",
          "success",
        );
        return;
      }
      const didBuild = await autoDistribute();
      if (didBuild) {
        updatePlannerOnboardingState({ buildScheduleStepDone: true });
        showToast(
          "Step 3 complete. Open calendar for the final step.",
          "success",
        );
      }
      return;
    }

    handleViewChange("calendar", { bypassOnboarding: true });
    if (!plannerOnboardingState.calendarReviewStepDone) {
      updatePlannerOnboardingState({
        calendarReviewStepDone: true,
        completed: true,
        skipped: false,
      });
      showToast("Great work. Study Planner onboarding completed.", "success");
    }
  }

  function skipPlannerOnboarding() {
    updatePlannerOnboardingState({ skipped: true });
    showToast("Guide paused. Use Resume Guide any time.", "info");
  }

  function resumePlannerOnboarding() {
    updatePlannerOnboardingState({ skipped: false });
    showToast("Guide resumed. Complete the next step to continue.", "info");
  }

  function toggleSubjectBranch(subjectId: string) {
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  }

  function toggleChapterBranch(chapterId: string) {
    setExpandedChapterIds((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  }

  function openTopicInSyllabus(
    topic: Topic,
    subject: Subject,
    chapter: Chapter,
  ) {
    setSyllabusQuery(topic.name);
    setSyllabusSubject(subject.id);
    setSyllabusStatus("all");
    setSelectedSubjectId(subject.id);
    setSelectedChapterId(chapter.id);
    setSelectedTopicId(topic.id);
    setExpandedSubjectIds((prev) => ({ ...prev, [subject.id]: true }));
    setExpandedChapterIds((prev) => ({ ...prev, [chapter.id]: true }));
    setExpandedTopicId(topic.id);
    handleViewChange("syllabus");
  }

  function toggleOffDay(day: number) {
    setOffDaysDraft((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function saveExamSettings() {
    const trimmedTitle = planTitleDraft.trim();
    if (!trimmedTitle) {
      const message = "Add a plan title";
      setError(message);
      showToast(message, "error");
      return;
    }

    // Validate exam date before saving
    const rawDate = examDateDraft.trim();
    if (rawDate) {
      const parsedDate = new Date(rawDate);
      const year = parsedDate.getFullYear();
      if (Number.isNaN(parsedDate.getTime()) || year < 2020 || year > 2099) {
        const message =
          "Invalid exam date. Please use the date picker to select a valid date (2020–2099).";
        setError(message);
        showToast(message, "error");
        return;
      }
    }

    const payload: Record<string, unknown> = {
      title: trimmedTitle,
      examType: examType.trim() || undefined,
      examDate: rawDate || undefined,
    };

    try {
      await updatePlanMeta(payload);
      setError("");
      showToast("Plan settings saved.", "success");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to save plan settings",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function saveCapacitySettings() {
    const payload: Record<string, unknown> = {
      dailyGoal: Math.max(1, Number(dailyGoalDraft) || 1),
      offDays: offDaysDraft,
    };

    // P1-9: Detect off-day changes to prompt rebuild
    const offDaysChanged =
      plan &&
      JSON.stringify(plan.offDays || []) !== JSON.stringify(offDaysDraft);

    try {
      await updatePlanMeta(payload);
      setError("");
      // Show rebuild prompt if off-days changed and there are scheduled topics
      if (offDaysChanged) {
        const hasScheduledTopics = plan!.subjects.some((s) =>
          s.chapters.some((c) =>
            c.topics.some((t) => t.plannedDate && t.status !== "done"),
          ),
        );
        if (hasScheduledTopics) {
          setShowRebuildPrompt(true);
        }
      }
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to save study capacity",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function patchTopic(topicId: string, patch: Record<string, unknown>) {
    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/topics/${topicId}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        },
      );
      setPlan(data);
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
      setError("");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to update topic",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function patchTopicSilent(
    topicId: string,
    patch: Record<string, unknown>,
  ) {
    return plannerRequest<Plan>(`${BASE}/${planId}/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async function patchTopicsAndRefresh(
    updates: Array<{ topicId: string; patch: Record<string, unknown> }>,
  ) {
    if (updates.length === 0) {
      showToast("Nothing to update for this action.", "info");
      return false;
    }
    let latest: Plan | null = null;
    try {
      for (const update of updates) {
        latest = await patchTopicSilent(update.topicId, update.patch);
      }
      if (latest) {
        setPlan(latest);
      }
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
      setError("");
      return true;
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to update some topics",
      );
      setError(message);
      showToast(message, "error");
      return false;
    }
  }

  async function addSubject() {
    if (!subjectName.trim()) {
      showToast("Enter a subject name first.", "error");
      return;
    }
    const palette = [
      "#0ea5e9",
      "#9333ea",
      "#16a34a",
      "#ef4444",
      "#f59e0b",
      "#0f766e",
    ];
    const color = palette[(plan?.subjects.length || 0) % palette.length];
    try {
      const data = await plannerRequest<Plan>(`${BASE}/${planId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ name: subjectName.trim(), color }),
      });
      setPlan(data);
      setError("");
      setSubjectName("");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to add subject",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function addChapter(subjectId: string) {
    const name = chapterName[subjectId]?.trim();
    if (!name) {
      showToast("Enter a chapter name first.", "error");
      return;
    }
    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );
      setPlan(data);
      setError("");
      setChapterName((prev) => ({ ...prev, [subjectId]: "" }));
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to add chapter",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function addTopic(subjectId: string, chapterId: string) {
    const key = `${subjectId}:${chapterId}`;
    const names = splitTopicLines(topicName[key] || "");
    if (names.length === 0) {
      showToast("Add at least one topic first.", "error");
      return;
    }

    const plannedDate = topicDate[key] || undefined;
    let updatedPlan: Plan | null = null;

    try {
      for (const name of names) {
        updatedPlan = await plannerRequest<Plan>(
          `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/topics`,
          {
            method: "POST",
            body: JSON.stringify({ name, plannedDate }),
          },
        );
      }

      if (updatedPlan) {
        setPlan(updatedPlan);
      }
      setTopicName((prev) => ({ ...prev, [key]: "" }));
      setTopicDate((prev) => ({ ...prev, [key]: "" }));
      setError("");

      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to add topic",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  function startSubjectRename(subject: Subject) {
    setEditingSubjectId(subject.id);
    setEditingChapterId(null);
    setEditingTopicId(null);
    setSubjectRenameDraft((prev) => ({ ...prev, [subject.id]: subject.name }));
  }

  async function submitSubjectRename(subject: Subject) {
    const nextName = (subjectRenameDraft[subject.id] ?? "").trim();
    if (nextName.length < 2) {
      showToast("Subject name must be at least 2 characters.", "error");
      return;
    }
    if (nextName === subject.name) {
      setEditingSubjectId(null);
      return;
    }

    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subject.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: nextName }),
        },
      );
      setPlan(data);
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
      setEditingSubjectId(null);
      setError("");
      showToast("Subject renamed.", "success");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to rename subject",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  function startChapterRename(chapter: Chapter) {
    setEditingChapterId(chapter.id);
    setEditingSubjectId(null);
    setEditingTopicId(null);
    setChapterRenameDraft((prev) => ({ ...prev, [chapter.id]: chapter.name }));
  }

  async function submitChapterRename(subjectId: string, chapter: Chapter) {
    const nextName = (chapterRenameDraft[chapter.id] ?? "").trim();
    if (nextName.length < 2) {
      showToast("Chapter name must be at least 2 characters.", "error");
      return;
    }
    if (nextName === chapter.name) {
      setEditingChapterId(null);
      return;
    }

    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapter.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: nextName }),
        },
      );
      setPlan(data);
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
      setEditingChapterId(null);
      setError("");
      showToast("Chapter renamed.", "success");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to rename chapter",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  function startTopicRename(topic: Topic) {
    setEditingTopicId(topic.id);
    setEditingSubjectId(null);
    setEditingChapterId(null);
    setTopicRenameDraft((prev) => ({ ...prev, [topic.id]: topic.name }));
  }

  async function submitTopicRename(topic: Topic) {
    const nextName = (topicRenameDraft[topic.id] ?? "").trim();
    if (nextName.length < 2) {
      showToast("Topic name must be at least 2 characters.", "error");
      return;
    }
    if (nextName === topic.name) {
      setEditingTopicId(null);
      return;
    }

    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/topics/${topic.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: nextName }),
        },
      );
      setPlan(data);
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
      setEditingTopicId(null);
      setError("");
      showToast("Topic renamed.", "success");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to rename topic",
      );
      setError(message);
      showToast(message, "error");
    }
  }

  async function doDeleteSubject(subjectId: string) {
    const data = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}`,
      {
        method: "DELETE",
      },
    );
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
      `${BASE}/${planId}/calendar`,
    );
    setCalendar(calendarData || {});
    showToast("Subject deleted.", "success");
  }

  function deleteSubject(subjectId: string) {
    setPendingDelete({
      type: "subject",
      id: subjectId,
      parentId: undefined,
      label: "Delete this subject and all its chapters/topics?",
    });
  }

  async function doDeleteChapter(subjectId: string, chapterId: string) {
    const data = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}`,
      {
        method: "DELETE",
      },
    );
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
      `${BASE}/${planId}/calendar`,
    );
    setCalendar(calendarData || {});
    showToast("Chapter deleted.", "success");
  }

  function deleteChapter(subjectId: string, chapterId: string) {
    setPendingDelete({
      type: "chapter",
      id: chapterId,
      parentId: subjectId,
      label: "Delete this chapter and all topics inside it?",
    });
  }

  async function doDeleteTopic(topicId: string) {
    const data = await plannerRequest<Plan>(
      `${BASE}/${planId}/topics/${topicId}`,
      {
        method: "DELETE",
      },
    );
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
      `${BASE}/${planId}/calendar`,
    );
    setCalendar(calendarData || {});
    showToast("Topic deleted.", "success");
  }

  function deleteTopic(topicId: string) {
    setPendingDelete({
      type: "topic",
      id: topicId,
      parentId: undefined,
      label: "Delete this topic?",
    });
  }

  async function clearFutureDates() {
    if (!plan) {
      showToast("Plan is not ready yet.", "error");
      return false;
    }

    const todayKey = toIsoDateOnly(new Date());
    const updates: Array<{ topicId: string; patch: Record<string, unknown> }> =
      [];

    for (const subject of plan.subjects) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          if (!topic.plannedDate) continue;
          const plannedKey = toIsoDateOnly(topic.plannedDate);
          if (plannedKey && plannedKey > todayKey) {
            updates.push({ topicId: topic.id, patch: { plannedDate: "" } });
          }
        }
      }
    }

    return patchTopicsAndRefresh(updates);
  }

  async function resetPlanTopics() {
    if (!plan) {
      showToast("Plan is not ready yet.", "error");
      return false;
    }
    // confirmation handled by inline modal in UI

    const updates: Array<{ topicId: string; patch: Record<string, unknown> }> =
      [];

    for (const subject of plan.subjects) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          updates.push({
            topicId: topic.id,
            patch: { status: "todo", plannedDate: "" },
          });
        }
      }
    }

    return patchTopicsAndRefresh(updates);
  }

  function matchesSyllabusFilters(
    topic: Topic,
    subject: Subject,
    chapter: Chapter,
  ) {
    if (syllabusSubject !== "all" && subject.id !== syllabusSubject)
      return false;
    if (syllabusStatus !== "all" && topic.status !== syllabusStatus)
      return false;
    const query = syllabusQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      topic.name.toLowerCase().includes(query) ||
      subject.name.toLowerCase().includes(query) ||
      chapter.name.toLowerCase().includes(query)
    );
  }

  async function moveTopicsToDate(topicIds: string[], dateKey: string) {
    if (topicIds.length === 0) {
      showToast("No topics selected to move.", "error");
      return;
    }
    const updates = topicIds.map((topicId) => ({
      topicId,
      patch: { plannedDate: dateKey },
    }));
    await patchTopicsAndRefresh(updates);
  }

  async function clearTopicsFromDate(topicIds: string[]) {
    if (topicIds.length === 0) {
      showToast("No topics selected to clear.", "error");
      return;
    }
    const updates = topicIds.map((topicId) => ({
      topicId,
      patch: { plannedDate: "" },
    }));
    await patchTopicsAndRefresh(updates);
  }

  async function editTopicNotes(topic: Topic) {
    // notes editing handled by expanded topic UI; no window.prompt needed
    setExpandedTopicId((prev) => (prev === topic.id ? null : topic.id));
  }

  // --- Visual Builder Handlers ---
  async function submitVisualChapter(subjectId: string) {
    const name = visualAddDraft.trim();
    if (!name) {
      setIsAddingChapterForSubject(null);
      return;
    }
    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );
      setPlan(data);
      setIsAddingChapterForSubject(null);
      setVisualAddDraft("");
      showToast(`Chapter "${name}" added.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to add chapter", "error");
    }
  }

  async function submitVisualTopic(subjectId: string, chapterId: string) {
    const name = visualAddDraft.trim();
    if (!name) {
      setIsAddingTopicForChapter(null);
      return;
    }
    try {
      const data = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/topics`,
        {
          method: "POST",
          body: JSON.stringify({ name, status: "todo" }),
        },
      );
      setPlan(data);
      setIsAddingTopicForChapter(null);
      setVisualAddDraft("");
      showToast(`Topic "${name}" added.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to add topic", "error");
    }
  }

  async function submitVisualSubject() {
    const name = visualAddDraft.trim();
    if (!name) {
      setIsAddingChapterForSubject(null); // Assuming shared state or a new one
      return;
    }
    try {
      const data = await plannerRequest<Plan>(`${BASE}/${planId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setPlan(data);
      setVisualAddDraft("");
      showToast(`Subject "${name}" added.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to add subject", "error");
    }
  }

  function resetBulkAdd() {
    setBulkAddOpen(false);
    setBulkAddMode("manual");
    setBulkSubjectId("");
    setBulkSubjectName("");
    setBulkChapterName("");
    setBulkTopicsText("");
    setBulkAddError("");
    setBulkImportedFileName("");
    setBulkTxtGuideOpen(false);
  }

  function switchBulkAddMode(nextMode: BulkAddMode) {
    setBulkAddMode(nextMode);
    setBulkAddError("");
    setBulkTxtGuideOpen(false);
    if (nextMode === "txt-file") {
      setBulkSubjectId("");
      setBulkSubjectName("");
      setBulkChapterName("");
      return;
    }

    setBulkImportedFileName("");
  }

  async function ensureBulkSubjectByName(
    currentPlan: Plan,
    name: string,
    options?: { reuseExisting?: boolean },
  ) {
    const normalizedName = name.trim();
    const reuseExisting = options?.reuseExisting ?? true;
    if (reuseExisting) {
      const existingSubject = currentPlan.subjects.find(
        (subject) =>
          subject.name.toLowerCase() === normalizedName.toLowerCase(),
      );
      if (existingSubject) {
        return { nextPlan: currentPlan, subject: existingSubject };
      }
    }

    const color =
      BULK_IMPORT_SUBJECT_PALETTE[
        currentPlan.subjects.length % BULK_IMPORT_SUBJECT_PALETTE.length
      ];
    const nextPlan = await plannerRequest<Plan>(`${BASE}/${planId}/subjects`, {
      method: "POST",
      timeoutMs: BULK_IMPORT_REQUEST_TIMEOUT_MS,
      body: JSON.stringify({ name: normalizedName, color }),
    });
    setPlan(nextPlan);
    const subject =
      nextPlan.subjects.find(
        (item) => item.name.toLowerCase() === normalizedName.toLowerCase(),
      ) || nextPlan.subjects[nextPlan.subjects.length - 1];

    if (!subject) {
      throw new Error(`Could not create subject: ${normalizedName}`);
    }

    return { nextPlan, subject };
  }

  async function ensureBulkChapterByName(
    currentPlan: Plan,
    subjectId: string,
    chapterName: string,
  ) {
    const subject = currentPlan.subjects.find((item) => item.id === subjectId);
    const existingChapter = subject?.chapters.find(
      (chapter) => chapter.name.toLowerCase() === chapterName.toLowerCase(),
    );
    if (existingChapter) {
      return { nextPlan: currentPlan, chapterId: existingChapter.id };
    }

    const nextPlan = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters`,
      {
        method: "POST",
        timeoutMs: BULK_IMPORT_REQUEST_TIMEOUT_MS,
        body: JSON.stringify({ name: chapterName }),
      },
    );
    setPlan(nextPlan);
    const nextSubject = nextPlan.subjects.find((item) => item.id === subjectId);
    const chapterId = nextSubject?.chapters.find(
      (chapter) => chapter.name.toLowerCase() === chapterName.toLowerCase(),
    )?.id;

    if (!chapterId) {
      throw new Error(`Could not create chapter: ${chapterName}`);
    }

    return { nextPlan, chapterId };
  }

  async function createBulkTopicEntry(
    subjectId: string,
    chapterId: string,
    topicName: string,
  ) {
    const nextPlan = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/topics`,
      {
        method: "POST",
        timeoutMs: BULK_IMPORT_REQUEST_TIMEOUT_MS,
        body: JSON.stringify({ name: topicName }),
      },
    );

    if (!nextPlan) {
      throw new Error(`Failed to create topic: ${topicName}`);
    }

    setPlan(nextPlan);
    return nextPlan;
  }

  async function handleBulkFileImport(event: any) {
    const file = event?.target?.files?.[0] as File | undefined;
    if (!file) return;

    try {
      const accessToken = getAccessToken();
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch(`${API_BASE}/syllabus/import`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const details = payload?.detail || payload?.message || payload?.error || "";
        const message = details || "Could not import syllabus file.";
        setBulkAddError(message);
        showToast(message, "error");
        return;
      }

      if (!payload?.success) {
        const details = Array.isArray(payload?.errors)
          ? payload.errors.join("; ")
          : "";
        const message =
          payload?.message || details || "Could not import syllabus file.";
        setBulkTopicsText(String(payload?.syllabusCode || ""));
        setBulkAddError(message);
        showToast(message, "error");
        return;
      }

      switchBulkAddMode("txt-file");
      setBulkTopicsText(String(payload.syllabusCode || ""));
      setBulkAddError("");
      setBulkImportedFileName(file.name);
      showToast(`Formatted syllabus imported from ${file.name}.`, "success");
    } catch {
      const message = "Could not import the syllabus file.";
      setBulkAddError(message);
      showToast(message, "error");
    } finally {
      if (event?.target) {
        event.target.value = "";
      }
    }
  }

  async function handleBulkAdd() {
    if (!plan) {
      setBulkAddError("Plan is still loading. Please try again.");
      showToast("Plan is still loading. Please try again.", "error");
      return;
    }

    // ── Premium gate: Bulk Add ──
    if (!isPremium) {
      setPremiumModalReason("bulk_add");
      resetBulkAdd();
      return;
    }
    try {
      let currentPlan = plan;
      let totalTopicCount = 0;
      let totalChapterCount = 0;
      let totalSubjectCount = 0;

      if (bulkAddMode === "txt-file") {
        const subjectGroups = parseBulkSubjectsFromTxt(bulkTopicsText);
        totalTopicCount = subjectGroups.reduce(
          (count, subject) =>
            count +
            subject.chapters.reduce(
              (chapterCount, chapter) => chapterCount + chapter.topics.length,
              0,
            ),
          0,
        );
        totalChapterCount = subjectGroups.reduce(
          (count, subject) => count + subject.chapters.length,
          0,
        );
        totalSubjectCount = subjectGroups.length;

        for (const subjectGroup of subjectGroups) {
          const ensuredSubject = await ensureBulkSubjectByName(
            currentPlan,
            subjectGroup.subjectName,
          );
          currentPlan = ensuredSubject.nextPlan;

          for (const chapterGroup of subjectGroup.chapters) {
            const ensuredChapter = await ensureBulkChapterByName(
              currentPlan,
              ensuredSubject.subject.id,
              chapterGroup.chapterName,
            );
            currentPlan = ensuredChapter.nextPlan;

            for (const topicName of chapterGroup.topics) {
              currentPlan = await createBulkTopicEntry(
                ensuredSubject.subject.id,
                ensuredChapter.chapterId,
                topicName,
              );
            }
          }
        }
      } else {
        const chapterGroups = parseBulkTopicsByChapter(
          bulkTopicsText,
          bulkChapterName.trim() || "General",
        );
        totalTopicCount = chapterGroups.reduce(
          (count, chapter) => count + chapter.topics.length,
          0,
        );
        totalChapterCount = chapterGroups.length;
        totalSubjectCount = 1;

        if (totalTopicCount === 0) {
          setBulkAddError("Add at least one topic");
          return;
        }

        let subjectId = bulkSubjectId;
        if (!subjectId) {
          const name = bulkSubjectName.trim();
          if (!name) {
            setBulkAddError("Choose or add a subject");
            return;
          }

          const ensuredSubject = await ensureBulkSubjectByName(
            currentPlan,
            name,
            { reuseExisting: false },
          );
          currentPlan = ensuredSubject.nextPlan;
          subjectId = ensuredSubject.subject.id;
        }

        const selectedSubject = currentPlan.subjects.find(
          (subject) => subject.id === subjectId,
        );
        if (!selectedSubject) {
          setBulkAddError("Subject not found");
          return;
        }

        for (const chapterGroup of chapterGroups) {
          const ensuredChapter = await ensureBulkChapterByName(
            currentPlan,
            selectedSubject.id,
            chapterGroup.chapterName,
          );
          currentPlan = ensuredChapter.nextPlan;

          for (const topicName of chapterGroup.topics) {
            currentPlan = await createBulkTopicEntry(
              selectedSubject.id,
              ensuredChapter.chapterId,
              topicName,
            );
          }
        }
      }

      if (totalTopicCount === 0) {
        setBulkAddError("Add at least one topic");
        return;
      }

      setPlan(currentPlan);

      // Force a full refresh of plan and calendar data to ensure UI consistency
      await fetchPlan({ timeoutMs: BULK_IMPORT_REQUEST_TIMEOUT_MS });

      const summaryMessage =
        bulkAddMode === "txt-file"
          ? `Imported ${totalTopicCount} topics across ${totalChapterCount} chapter${totalChapterCount > 1 ? "s" : ""} in ${totalSubjectCount} subject${totalSubjectCount > 1 ? "s" : ""}.`
          : `Imported ${totalTopicCount} topics across ${totalChapterCount} chapter${totalChapterCount > 1 ? "s" : ""}.`;
      showToast(summaryMessage, "success");
      resetBulkAdd();
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Bulk add failed",
      );
      setBulkAddError(message);
      showToast(message, "error");
    }
  }

  async function autoDistribute(options?: {
    lockExistingDates?: boolean;
    includeRevisionNeeded?: boolean;
  }) {
    // ── Premium gate: Auto-Schedule ──
    if (!isPremium) {
      setPremiumModalReason("auto_schedule");
      return false;
    }
    if (isAutoDistributing) return false;
    setIsAutoDistributing(true);
    try {
      const payload = {
        lockExistingDates: options?.lockExistingDates ?? lockExistingDates,
        includeRevisionNeeded:
          options?.includeRevisionNeeded ?? includeRevisionNeeded,
      };
      const data = await plannerRequest<{
        plan: Plan;
        assigned: number;
        skipped: number;
      }>(`${BASE}/${planId}/auto-distribute`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPlan(data.plan);
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(
        `${BASE}/${planId}/calendar`,
      );
      setCalendar(calendarData || {});
      showToast(
        `Schedule built! ${data.assigned ?? ""} topics scheduled.`,
        "success",
      );
      return true;
    } catch (err: any) {
      const rawMessage = String(err?.message || "Auto distribution failed");
      const safeMessage = /premium|paid/i.test(rawMessage)
        ? "Auto plan is temporarily unavailable for this account."
        : rawMessage;
      showToast(safeMessage, "error");
      return false;
    } finally {
      setIsAutoDistributing(false);
    }
  }

  async function upgradePlannerPremium() {
    try {
      const data = await plannerRequest<{ message: string; plan: Plan }>(
        `${BASE}/${planId}/upgrade`,
        {
          method: "POST",
        },
      );
      setPlan(data.plan);
      setPremiumModalReason(null);
      showToast("Premium insights unlocked.", "success");
    } catch (err: any) {
      const message = normalizePlannerActionMessage(
        err?.message,
        "Failed to unlock planner premium",
      );
      showToast(message, "error");
    }
  }

  const premiumModalMeta: Record<
    string,
    { title: string; description: string; icon: string }
  > = {
    topic_limit: {
      title: "Topic Limit Reached",
      description: `Free plans support up to ${FREE_TOPIC_LIMIT} topics. Competitive exams like JEE and NEET have 200+ topics \u2014 upgrade to add unlimited topics.`,
      icon: "\u{1F4DA}",
    },
    auto_schedule: {
      title: "Unlock Auto-Schedule",
      description:
        "Auto-Schedule builds your perfect study calendar in one click based on your exam date, daily goal, and off days. Stop spending hours on manual planning.",
      icon: "\u26A1",
    },
    bulk_add: {
      title: "Unlock Bulk Add",
      description:
        "Bulk Add lets you import hundreds of topics at once from text or file. Save hours of manual entry \u2014 paste your entire syllabus in seconds.",
      icon: "\u{1F4CB}",
    },
    reschedule: {
      title: "Unlock Reschedule",
      description:
        "Fallen behind on your study plan? Reschedule rebuilds your entire calendar to still hit your exam date. Get back on track in one click.",
      icon: "\u{1F504}",
    },
    template: {
      title: "Unlock Exam Templates",
      description:
        "Access pre-built syllabi for JEE, NEET, SSC, Railway, and more. Load a complete exam syllabus with 200+ topics instantly.",
      icon: "\u{1F4C4}",
    },
  };

  // ── Premium Upgrade Modal ──
  const premiumModal = premiumModalReason
    ? (() => {
        const meta = premiumModalMeta[premiumModalReason];
        if (!meta) return null;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              className={`relative w-full max-w-lg rounded-[32px] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border ${isDarkMode ? "bg-[#0c0d0e] border-slate-800" : "bg-white border-slate-200"}`}
            >
              <button
                onClick={() => setPremiumModalReason(null)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              >
                ✕
              </button>

              <div className="text-center">
                <div className="text-6xl mb-6 transform hover:scale-110 transition-transform duration-300">{meta.icon}</div>
                <div className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-500 mb-4">
                  Premium Feature
                </div>
                <h3 className={`text-2xl font-bold tracking-tight mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {meta.title}
                </h3>
                <p className={`text-[15px] font-medium leading-relaxed mb-10 max-w-sm mx-auto ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {meta.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      void upgradePlannerPremium();
                    }}
                    className="px-8 py-4 rounded-[20px] bg-blue-600 text-white text-[13px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Upgrade Now
                  </button>
                  <button
                    onClick={() => setPremiumModalReason(null)}
                    className={`px-8 py-4 rounded-[20px] border text-[13px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e6e7ee] dark:bg-[#131416] flex items-center justify-center p-6 text-[#3c4146] dark:text-[#e7e5e5] transition-colors duration-500">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-full border-[6px] border-[#d9dbe2] dark:border-[#1a1c1e] border-t-blue-500 shadow-[inset_2px_2px_4px_rgba(166,171,189,0.3),4px_4px_8px_rgba(166,171,189,0.2)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),4px_4px_10px_rgba(0,0,0,0.6)]"
          />
          <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-[#6b7280] dark:text-[#767575]">
            Waking System...
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#e6e7ee] dark:bg-[#131416] flex items-center justify-center p-6 transition-colors duration-500">
        <div className="rounded-3xl p-8 bg-[#fef2f2] dark:bg-[#1f1315] border border-red-200 dark:border-red-900/50 shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)] dark:shadow-[8px_8px_20px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.02)]">
          <p className="text-red-600 dark:text-red-400 font-bold text-lg drop-shadow-sm">
            {error || "Plan not found"}
          </p>
        </div>
      </div>
    );
  }

  const topics = flattenTopics(plan);
  const todayKey = toIsoDateOnly(new Date());
  const tomorrowKey = (() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return toIsoDateOnly(nextDay);
  })();
  const hasSyllabusSubjectFilter = syllabusSubject !== "all";
  const hasSyllabusTopicFilter =
    Boolean(syllabusQuery.trim()) || syllabusStatus !== "all";
  const hasActiveSyllabusFilter =
    hasSyllabusSubjectFilter || hasSyllabusTopicFilter;
  const visibleSubjects = plan.subjects.filter((subject) => {
    if (hasSyllabusSubjectFilter && subject.id !== syllabusSubject) {
      return false;
    }
    if (!hasSyllabusTopicFilter) {
      return true;
    }
    return subject.chapters.some((chapter) =>
      chapter.topics.some((topic) =>
        matchesSyllabusFilters(topic, subject, chapter),
      ),
    );
  });
  const hierarchySubjects = visibleSubjects
    .map((subject) => {
      const chapters = subject.chapters
        .map((chapter) => {
          const filteredTopics = chapter.topics.filter((topic) =>
            matchesSyllabusFilters(topic, subject, chapter),
          );
          const visibleTopics = hasSyllabusTopicFilter
            ? filteredTopics
            : chapter.topics;
          const doneTopics = visibleTopics.filter(
            (topic) => topic.status === "done",
          ).length;
          const scheduledTopics = visibleTopics.filter((topic) =>
            Boolean(topic.plannedDate),
          ).length;
          const overdueTopics = visibleTopics.filter((topic) => {
            if (!topic.plannedDate) return false;
            return (
              toIsoDateOnly(topic.plannedDate) < todayKey &&
              topic.status !== "done"
            );
          }).length;

          return {
            chapter,
            visibleTopics,
            key: `${subject.id}:${chapter.id}`,
            totalTopics: visibleTopics.length,
            doneTopics,
            scheduledTopics,
            overdueTopics,
          };
        })
        .filter(
          (chapterNode) =>
            !hasSyllabusTopicFilter || chapterNode.visibleTopics.length > 0,
        );

      const subjectTopics = chapters.flatMap(
        (chapterNode) => chapterNode.visibleTopics,
      );
      const doneTopics = subjectTopics.filter(
        (topic) => topic.status === "done",
      ).length;
      const scheduledTopics = subjectTopics.filter((topic) =>
        Boolean(topic.plannedDate),
      ).length;
      const overdueTopics = subjectTopics.filter((topic) => {
        if (!topic.plannedDate) return false;
        return (
          toIsoDateOnly(topic.plannedDate) < todayKey && topic.status !== "done"
        );
      }).length;

      return {
        subject,
        chapters,
        totalTopics: subjectTopics.length,
        doneTopics,
        scheduledTopics,
        overdueTopics,
      };
    })
    .filter(
      (subjectNode) =>
        !hasSyllabusTopicFilter || subjectNode.chapters.length > 0,
    );

  const activeHierarchySubject =
    hierarchySubjects.find(
      (subjectNode) => subjectNode.subject.id === selectedSubjectId,
    ) ||
    hierarchySubjects[0] ||
    null;
  const activeHierarchyChapter =
    activeHierarchySubject?.chapters.find(
      (chapterNode) => chapterNode.chapter.id === selectedChapterId,
    ) ||
    activeHierarchySubject?.chapters[0] ||
    null;
  const selectedChapterContext = (() => {
    if (!selectedChapterId) return null;
    for (const subjectNode of hierarchySubjects) {
      const chapterNode = subjectNode.chapters.find(
        (candidate) => candidate.chapter.id === selectedChapterId,
      );
      if (chapterNode) {
        return { subjectNode, chapterNode };
      }
    }
    return null;
  })();
  const selectedTopicContext = (() => {
    if (!selectedTopicId) return null;
    for (const subjectNode of hierarchySubjects) {
      for (const chapterNode of subjectNode.chapters) {
        const topic = chapterNode.visibleTopics.find(
          (candidate) => candidate.id === selectedTopicId,
        );
        if (topic) {
          return { subjectNode, chapterNode, topic };
        }
      }
    }
    return null;
  })();
  const todayTasks = topics.filter(
    (topic) =>
      topic.plannedDate && toIsoDateOnly(topic.plannedDate) === todayKey,
  );
  const overdueTasks = topics.filter((topic) => {
    if (!topic.plannedDate) return false;
    const plannedKey = toIsoDateOnly(topic.plannedDate);
    return (
      plannedKey !== "" && plannedKey < todayKey && topic.status !== "done"
    );
  });
  const upcomingTasks = topics
    .filter((topic) => {
      if (!topic.plannedDate) return false;
      const plannedKey = toIsoDateOnly(topic.plannedDate);
      return (
        plannedKey !== "" && plannedKey > todayKey && topic.status !== "done"
      );
    })
    .sort((a, b) => (a.plannedDate || "").localeCompare(b.plannedDate || ""));
  const overdueCount = overdueTasks.length;
  const statusCounts = {
    todo: topics.filter((topic) => topic.status === "todo").length,
    in_progress: topics.filter((topic) => topic.status === "in_progress")
      .length,
    done: topics.filter((topic) => topic.status === "done").length,
    revision_needed: topics.filter(
      (topic) => topic.status === "revision_needed",
    ).length,
  };
  const summaryStatusLabel =
    overdueCount > 0 ? `Behind by ${overdueCount} topics` : "On track";
  const nextOffDayLabel = (() => {
    if (!plan.offDays || plan.offDays.length === 0) return "None";
    const offDaySet = new Set(plan.offDays);
    const now = new Date();
    for (let i = 0; i < 7; i += 1) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + i);
      if (offDaySet.has(candidate.getDay())) {
        return candidate.toLocaleDateString("en-US", { weekday: "long" });
      }
    }
    return "None";
  })();
  const kanban = {
    todo: topics.filter((t) => t.status === "todo"),
    in_progress: topics.filter((t) => t.status === "in_progress"),
    done: topics.filter((t) => t.status === "done"),
  };

  const selectedDayItems = pickedDay ? calendar[pickedDay] || [] : [];
  const selectedDayDone = selectedDayItems.filter(
    (item) => item.status === "done",
  );
  const selectedDayMissed =
    pickedDay && pickedDay < todayKey
      ? selectedDayItems.filter((item) => item.status !== "done")
      : [];
  const hasExamDate = Boolean(plan.examDate && toIsoDateOnly(plan.examDate));
  const hasTopics = topics.length > 0;
  const hasScheduledTopics = topics.some((topic) => Boolean(topic.plannedDate));
  const hasPendingUnplannedTopics = topics.some(
    (topic) => topic.status !== "done" && !topic.plannedDate,
  );
  const isPremium = Boolean(plan.features?.isPremium);
  const totalTopicCount = getTotalTopicCount();
  const remainingFreeTopics = Math.max(0, FREE_TOPIC_LIMIT - totalTopicCount);
  const insights: PlannerInsights = (() => {
    const now = startOfDay(new Date());
    const examDateKey = plan.examDate ? toIsoDateOnly(plan.examDate) : "";
    const examDate = examDateKey ? startOfDay(examDateKey) : null;
    const dailyGoal = Math.max(1, plan.dailyGoal || 1);
    const remainingTopics = topics.filter((topic) => topic.status !== "done");
    const remainingTopicCount = remainingTopics.length;
    const completedByDate = countCompletedTopicsByDate(topics);
    const activeDaysLast14 = buildPlannerHeatmap(
      completedByDate,
      now,
      14,
    ).filter((point) => point.count > 0).length;
    const last30Heatmap = buildPlannerHeatmap(completedByDate, now, 30);
    const activeDaysLast30 = last30Heatmap.filter(
      (point) => point.count > 0,
    ).length;
    const studyStreak = computeStudyStreak(completedByDate, todayKey);
    const weekdayCounts = new Map<number, number>();

    for (const point of last30Heatmap) {
      if (point.count <= 0) continue;
      const weekday = new Date(point.date).getDay();
      weekdayCounts.set(
        weekday,
        (weekdayCounts.get(weekday) || 0) + point.count,
      );
    }

    const bestStudyWeekday =
      weekdayCounts.size > 0
        ? [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][[...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]]
        : "No recent study";

    const availableStudyDays = examDate
      ? countStudyDaysBetween(now, examDate, plan.offDays || [])
      : null;
    const requiredTopicsPerStudyDay =
      availableStudyDays === null
        ? null
        : availableStudyDays === 0
          ? remainingTopicCount > 0
            ? remainingTopicCount
            : 0
          : Number((remainingTopicCount / availableStudyDays).toFixed(1));
    const forecastCompletionDate =
      examDate && remainingTopicCount > 0
        ? simulateForecastCompletionDate(
            remainingTopicCount,
            dailyGoal,
            plan.offDays || [],
            now,
          )
        : examDate
          ? todayKey
          : null;
    const daysBuffer =
      examDate && forecastCompletionDate
        ? startOfDay(forecastCompletionDate).getTime() <= examDate.getTime()
          ? countStudyDaysBetween(
              addDays(startOfDay(forecastCompletionDate), 1),
              examDate,
              plan.offDays || [],
            )
          : -countStudyDaysBetween(
              addDays(examDate, 1),
              startOfDay(forecastCompletionDate),
              plan.offDays || [],
            )
        : remainingTopicCount === 0 && examDate
          ? countStudyDaysBetween(addDays(now, 1), examDate, plan.offDays || [])
          : null;
    const unfinishedScheduledBeforeExam = remainingTopics.filter((topic) => {
      if (!topic.plannedDate || !examDateKey) return false;
      const plannedKey = toIsoDateOnly(topic.plannedDate);
      return plannedKey !== "" && plannedKey <= examDateKey;
    }).length;
    const scheduleCoveragePercent = examDateKey
      ? remainingTopicCount === 0
        ? 100
        : Math.round(
            (unfinishedScheduledBeforeExam / remainingTopicCount) * 100,
          )
      : null;

    const next14Days: PlannerInsightDay[] = Array.from(
      { length: 14 },
      (_, index) => {
        const date = addDays(now, index);
        const key = toIsoDateOnly(date);
        const items = calendar[key] || [];
        return {
          date: key,
          plannedCount: items.filter((item) => item.status !== "done").length,
          doneCount: items.filter((item) => item.status === "done").length,
          overdueCount:
            key < todayKey
              ? items.filter((item) => item.status !== "done").length
              : 0,
          isOffDay: (plan.offDays || []).includes(date.getDay()),
        };
      },
    );

    const overloadDays = next14Days.filter(
      (day) => !day.isOffDay && day.plannedCount > dailyGoal,
    ).length;
    const emptyStudyDays = next14Days.filter(
      (day) => !day.isOffDay && day.plannedCount === 0,
    ).length;
    const busiestDay =
      [...next14Days]
        .filter((day) => !day.isOffDay)
        .sort((a, b) => b.plannedCount - a.plannedCount)[0] || null;

    const upcomingSubjectCounts = new Map<
      string,
      { name: string; count: number }
    >();
    for (const day of next14Days) {
      const items = calendar[day.date] || [];
      for (const item of items) {
        if (item.status === "done") continue;
        const current = upcomingSubjectCounts.get(item.subjectName) || {
          name: item.subjectName,
          count: 0,
        };
        current.count += 1;
        upcomingSubjectCounts.set(item.subjectName, current);
      }
    }
    const busiestSubjectUpcoming =
      upcomingSubjectCounts.size > 0
        ? [...upcomingSubjectCounts.values()].sort(
            (a, b) => b.count - a.count,
          )[0].name
        : null;

    const subjectRows = plan.subjects
      .map((subject) => {
        const subjectTopics = subject.chapters.flatMap(
          (chapter) => chapter.topics,
        );
        const remaining = subjectTopics.filter(
          (topic) => topic.status !== "done",
        );
        const overdue = remaining.filter(
          (topic) =>
            topic.plannedDate && toIsoDateOnly(topic.plannedDate) < todayKey,
        ).length;
        const revision = subjectTopics.filter(
          (topic) => topic.status === "revision_needed",
        ).length;
        const scheduled = remaining.filter((topic) =>
          Boolean(topic.plannedDate),
        ).length;
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          color: subject.color,
          completionPercent: subjectPercent(subject),
          remainingTopics: remaining.length,
          overdueTopics: overdue,
          revisionTopics: revision,
          scheduledTopics: scheduled,
        };
      })
      .sort(
        (a, b) =>
          a.completionPercent - b.completionPercent ||
          b.remainingTopics - a.remainingTopics,
      );

    const laggingChapters = plan.subjects
      .flatMap((subject) =>
        subject.chapters.map((chapter) => {
          const remaining = chapter.topics.filter(
            (topic) => topic.status !== "done",
          );
          const overdue = remaining.filter(
            (topic) =>
              topic.plannedDate && toIsoDateOnly(topic.plannedDate) < todayKey,
          ).length;
          return {
            subjectId: subject.id,
            subjectName: subject.name,
            chapterId: chapter.id,
            chapterName: chapter.name,
            remainingTopics: remaining.length,
            completionPercent: chapterPercent(chapter),
            overdueTopics: overdue,
          };
        }),
      )
      .filter((chapter) => chapter.remainingTopics > 0)
      .sort(
        (a, b) =>
          b.remainingTopics - a.remainingTopics ||
          a.completionPercent - b.completionPercent,
      )
      .slice(0, 5);

    const overdueAgingBuckets = overdueTasks.reduce(
      (acc, topic) => {
        const age = topic.plannedDate
          ? daysBetweenDateKeys(toIsoDateOnly(topic.plannedDate), todayKey)
          : 0;
        if (age >= 1 && age <= 3) acc.days1to3 += 1;
        else if (age >= 4 && age <= 7) acc.days4to7 += 1;
        else if (age >= 8) acc.days8Plus += 1;
        return acc;
      },
      { days1to3: 0, days4to7: 0, days8Plus: 0 },
    );

    const reviewDueSoon = topics.filter((topic) => {
      if (topic.status !== "done" || !topic.completedDate) return false;
      const age = daysBetweenDateKeys(
        toIsoDateOnly(topic.completedDate),
        todayKey,
      );
      return age >= 3 && age <= 7;
    }).length;
    const reviewOverdue = topics.filter((topic) => {
      if (topic.status !== "done" || !topic.completedDate) return false;
      const age = daysBetweenDateKeys(
        toIsoDateOnly(topic.completedDate),
        todayKey,
      );
      return age >= 8;
    }).length;

    let onTrackStatus: InsightTrackStatus = "on_track";
    if (!examDate && remainingTopicCount > 0) {
      onTrackStatus = "needs_attention";
    } else if (
      overdueTasks.length > 0 ||
      (daysBuffer !== null &&
        forecastCompletionDate !== null &&
        startOfDay(forecastCompletionDate).getTime() >
          (examDate?.getTime() || 0)) ||
      (requiredTopicsPerStudyDay !== null &&
        requiredTopicsPerStudyDay > dailyGoal)
    ) {
      onTrackStatus = "at_risk";
    } else if (
      hasPendingUnplannedTopics ||
      (scheduleCoveragePercent !== null && scheduleCoveragePercent < 85) ||
      statusCounts.revision_needed > Math.max(5, dailyGoal * 2)
    ) {
      onTrackStatus = "needs_attention";
    }

    const recommendations: PlannerInsightRecommendation[] = [];
    if (!examDate && remainingTopicCount > 0) {
      recommendations.push({
        id: "set-exam-date",
        title: "Set your exam date",
        reason:
          "Forecasts and pacing guidance need a valid exam date to benchmark against.",
        ctaLabel: "Open Plan",
        targetView: "plan",
      });
    }
    if (hasPendingUnplannedTopics) {
      recommendations.push({
        id: "build-schedule",
        title: "Build or rebuild schedule",
        reason: `${Math.max(0, statusCounts.todo + statusCounts.in_progress + statusCounts.revision_needed - unfinishedScheduledBeforeExam)} unfinished topics are still floating without a usable exam-bound schedule.`,
        ctaLabel: "Open Plan",
        targetView: "plan",
      });
    }
    if (overdueTasks.length > 0) {
      recommendations.push({
        id: "reschedule-overdue",
        title: "Reschedule overdue topics",
        reason: `${overdueTasks.length} topic${overdueTasks.length === 1 ? "" : "s"} are already behind schedule and need reassignment.`,
        ctaLabel: "Open Calendar",
        targetView: "calendar",
      });
    }
    if (
      requiredTopicsPerStudyDay !== null &&
      requiredTopicsPerStudyDay > dailyGoal
    ) {
      recommendations.push({
        id: "increase-capacity",
        title: "Increase daily goal or reduce scope",
        reason: `You need ${requiredTopicsPerStudyDay.toFixed(1)} topics/day against a current target of ${dailyGoal}/day.`,
        ctaLabel: "Open Plan",
        targetView: "plan",
      });
    }
    if (
      subjectRows[0] &&
      subjectRows[0].remainingTopics > Math.max(3, dailyGoal * 2)
    ) {
      recommendations.push({
        id: "prioritize-subject",
        title: `Prioritize ${subjectRows[0].subjectName}`,
        reason: `${subjectRows[0].subjectName} carries the heaviest remaining load at ${subjectRows[0].remainingTopics} unfinished topics.`,
        ctaLabel: "Open Syllabus",
        targetView: "syllabus",
      });
    }
    if (
      statusCounts.revision_needed > 0 ||
      reviewDueSoon > Math.max(3, dailyGoal) ||
      reviewOverdue > 0
    ) {
      recommendations.push({
        id: "allocate-revision",
        title: "Allocate a revision block this week",
        reason: `${statusCounts.revision_needed + reviewDueSoon + reviewOverdue} topics are either flagged for revision or entering a review-risk window.`,
        ctaLabel: "Open Calendar",
        targetView: "calendar",
      });
    }

    return {
      summary: {
        completionPercent: summary.percent,
        remainingTopics: remainingTopicCount,
        daysUntilExam: examDate ? countdown : null,
        availableStudyDays,
        requiredTopicsPerStudyDay,
        onTrackStatus,
        forecastCompletionDate,
        daysBuffer,
        scheduleCoveragePercent,
      },
      consistency: {
        studyStreak,
        activeDaysLast14,
        activeDaysLast30,
        bestStudyWeekday,
        heatmap: last30Heatmap,
      },
      workload: {
        next14Days,
        overloadDays,
        emptyStudyDays,
        busiestDay,
        busiestSubjectUpcoming,
      },
      coverage: {
        subjectRows,
        laggingChapters,
      },
      backlog: {
        overdueTotal: overdueTasks.length,
        overdueAgingBuckets,
        unplannedUnfinishedTopics: hasPendingUnplannedTopics
          ? unplannedTopicsCount
          : 0,
        revisionNeededTopics: statusCounts.revision_needed,
        reviewDueSoon,
        reviewOverdue,
      },
      recommendations: recommendations.slice(0, 3),
    };
  })();
  const insightStatusMeta: Record<
    InsightTrackStatus,
    { label: string; tone: string; chip: string }
  > = {
    on_track: {
      label: "On Track",
      tone: "text-emerald-700 dark:text-emerald-300",
      chip: "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/40",
    },
    needs_attention: {
      label: "Needs Attention",
      tone: "text-amber-700 dark:text-amber-300",
      chip: "bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/40",
    },
    at_risk: {
      label: "At Risk",
      tone: "text-rose-700 dark:text-rose-300",
      chip: "bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/40",
    },
  };
  const guidedActionMeta: Record<
    GuidedActionId,
    { step: string; title: string; description: string; actionLabel: string }
  > = {
    set_exam_date: {
      step: "Step 1 of 4",
      title: "Set your exam date",
      description:
        "This lets the planner calculate days left and create a realistic schedule.",
      actionLabel: "Set Exam Date",
    },
    add_topics: {
      step: "Step 2 of 4",
      title: "Add your syllabus topics",
      description:
        "Start by adding subjects, chapters, and topics. Keep it simple; you can refine later.",
      actionLabel: "Add Topics",
    },
    build_schedule: {
      step: "Step 3 of 4",
      title: "Build your first schedule",
      description:
        "Use Daily Goal and Off Days, then auto-schedule unfinished topics to your calendar.",
      actionLabel: "Build Schedule",
    },
    open_calendar: {
      step: "Step 4 of 4",
      title: "Review and adjust in calendar",
      description:
        "Open the calendar to move, clear, or complete planned topics day by day.",
      actionLabel: "Open Calendar",
    },
  };
  const guideStepCompletion: Record<GuidedActionId, boolean> = {
    set_exam_date: hasExamDate,
    add_topics: hasTopics,
    build_schedule: plannerOnboardingState.buildScheduleStepDone,
    open_calendar: plannerOnboardingState.calendarReviewStepDone,
  };
  const activeGuideAction =
    PLANNER_ONBOARDING_STEPS.find((stepId) => !guideStepCompletion[stepId]) ||
    "open_calendar";
  const activeGuideIndex = PLANNER_ONBOARDING_STEPS.indexOf(activeGuideAction);
  const currentGuide = guidedActionMeta[activeGuideAction];
  const onboardingGuideActive =
    beginnerMode &&
    !plannerOnboardingState.completed &&
    !plannerOnboardingState.skipped;
  const onboardingResumeVisible =
    beginnerMode &&
    plannerOnboardingState.skipped &&
    !plannerOnboardingState.completed;

  const cleanPillBase =
    `inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-semibold tracking-[0.01em] leading-none ${PLANNER_PRESSABLE} disabled:opacity-60 disabled:cursor-not-allowed`;
  const cleanPrimaryPill = `${cleanPillBase} bg-[#3b82f6] text-white shadow-[0_8px_18px_rgba(37,99,235,0.32)] hover:bg-[#2563eb]`;
  const cleanSecondaryPill = `${cleanPillBase} border ${isDarkMode ? "bg-[#343840] border-[#4a4e55] text-[#e2e8f0] hover:bg-[#3b4048]" : "bg-white/95 border-[#cfd6e2] text-[#1f2937] hover:bg-white"} shadow-[0_4px_10px_rgba(15,23,42,0.14)]`;
  const cleanHeaderLabelClass =
    "text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b919e] dark:text-[#767575]";

  return (
    <>
      {premiumModal}
      <PlannerSidebar />
      <style>{`
        .study-planner-motion button:not(:disabled),
        .study-planner-motion [role="button"]:not([aria-disabled="true"]) {
          transform-origin: center;
          transition-property: transform, box-shadow, background-color, border-color, color, opacity;
          transition-duration: 150ms;
          transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
        }

        .study-planner-motion button:not(:disabled):active,
        .study-planner-motion [role="button"]:not([aria-disabled="true"]):active {
          transform: scale(0.97) translateY(1px);
        }

        @media (prefers-reduced-motion: reduce) {
          .study-planner-motion button:not(:disabled),
          .study-planner-motion [role="button"]:not([aria-disabled="true"]) {
            transition-property: background-color, border-color, color, opacity;
          }

          .study-planner-motion button:not(:disabled):active,
          .study-planner-motion [role="button"]:not([aria-disabled="true"]):active {
            transform: none;
          }
        }
      `}</style>
      <div className="fixed top-6 right-6 z-[40] flex items-center gap-4">
        <div className="rounded-2xl bg-white/70 dark:bg-black/20 backdrop-blur-md px-4 py-2 shadow-[6px_6px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-slate-300 dark:border-white/20 scale-110 origin-right transition-all hover:scale-115">
          <LanguageToggle />
        </div>
        <div className="rounded-2xl bg-white/70 dark:bg-black/20 backdrop-blur-md p-1.5 shadow-[6px_6px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-slate-300 dark:border-white/20 scale-110 origin-right transition-all hover:scale-115">
          <ThemeToggle />
        </div>
      </div>
      <div className="study-planner-motion min-h-[100dvh] bg-gradient-to-br from-[#E0F2FE] via-[#F5F3FF] to-[#FFF1F2] dark:from-[#131416] dark:via-[#131416] dark:to-[#131416] text-[#3c4146] dark:text-[#e7e5e5] font-study-planner overflow-x-hidden selection:bg-blue-500/30 transition-colors duration-500">
        {/* Noise Texture */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-0"
          style={{
            backgroundImage:
              'url(\'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E\')',
          }}
        />

        <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
          {/* Header Section */}
          <div
            data-tour="planner-header"
            className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative"
          >
            <div>
              <button
                onClick={() => navigate("/study/planner")}
                className={`text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8b919e] dark:text-[#767575] hover:text-[#2d333b] dark:hover:text-[#e7e5e5] mb-3 inline-block ${PLANNER_TEXT_PRESSABLE}`}
              >
                ← All Plans
              </button>
              <h1
                className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#2d333b] dark:text-[#fcf9f8] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.02em" }}
              >
                {plan.title}.
              </h1>
              {plan.examType && (
                <div className="text-[14px] font-semibold uppercase tracking-[0.08em] text-[#8b919e] dark:text-[#767575] mb-4">
                  {plan.examType}
                </div>
              )}
              <motion.div layout className="flex flex-wrap items-center gap-6">
                <div
                  data-tour="planner-countdown"
                  className="inline-flex gap-3"
                >
                  {countdown === null ? (
                    <motion.button
                      layout
                      onClick={() => setIsExamDateEditorOpen((prev) => !prev)}
                      className={`bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] text-[20px] md:text-[22px] font-black uppercase tracking-[0.1em] px-8 py-3 rounded-full shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8),0_6px_14px_rgba(0,0,0,0.12)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)] border border-[#c0c4d1] dark:border-[#252626] hover:scale-[1.03] ${PLANNER_PRESSABLE}`}
                      title="Set your exam date"
                    >
                      Set Exam Date
                    </motion.button>
                  ) : (
                    <>
                      <motion.span
                        layout
                        className="bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] text-[12px] font-semibold uppercase tracking-[0.08em] px-4 py-1.5 rounded-full shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#252626]"
                      >
                        {countdownLabel}
                      </motion.span>
                      <motion.button
                        layout
                        onClick={() => setIsExamDateEditorOpen((prev) => !prev)}
                        className={`${cleanSecondaryPill} text-[12px] px-4 py-2`}
                        title="Edit exam date"
                      >
                        Update Date
                      </motion.button>
                    </>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isExamDateEditorOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                      className="inline-flex flex-col gap-3 rounded-2xl bg-[#f0f0f5] dark:bg-[#1a1c1e] px-5 py-4 border border-[#c0c4d1] dark:border-[#2b2c2c] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]"
                    >
                      <div className="text-[13px] font-bold text-[#334155] dark:text-[#e2e8f0] uppercase tracking-[0.2em] px-1">
                        Select Exam
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <CustomDatePicker
                          value={examDateDraft}
                          onChange={setExamDateDraft}
                          isDarkMode={isDarkMode}
                        />
                        <button
                          onClick={() => {
                            void saveExamDate();
                          }}
                          className={`bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white text-[12px] font-extrabold uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.35)] ${PLANNER_PRESSABLE}`}
                        >
                          Save Date
                        </button>
                        <button
                          onClick={() => {
                            setExamDateDraft(
                              plan?.examDate
                                ? toIsoDateOnly(plan.examDate)
                                : "",
                            );
                            setIsExamDateEditorOpen(false);
                          }}
                          className={`bg-[#e6e7ee] dark:bg-[#202225] text-[#2d333b] dark:text-[#e7e5e5] text-[12px] font-extrabold uppercase tracking-[0.15em] px-4 py-2 rounded-xl border border-[#c0c4d1] dark:border-[#2b2c2c] ${PLANNER_PRESSABLE}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            <div
              data-tour="planner-header-actions"
              className="flex flex-wrap gap-3"
            >
              {beginnerMode &&
              !showHeaderActions &&
              !plannerOnboardingState.completed ? (
                <>
                  <button
                    onClick={() => {
                      if (onboardingResumeVisible) {
                        resumePlannerOnboarding();
                        return;
                      }
                      void runGuidedAction(activeGuideAction);
                    }}
                    className={cleanPrimaryPill}
                  >
                    {onboardingResumeVisible
                      ? "Resume Guide"
                      : currentGuide.actionLabel}
                  </button>
                  {/* BUG-1 FIX: Show "More Actions" only when NOT in resume state — prevents duplicate Resume Guide */}
                  <button
                    onClick={() => setShowHeaderActions(true)}
                    className={cleanSecondaryPill}
                  >
                    More Actions
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleViewChange("plan")}
                    className={cleanSecondaryPill}
                  >
                    Edit Plan
                  </button>
                  <button
                    onClick={() => handleViewChange("syllabus")}
                    className={cleanSecondaryPill}
                  >
                    Add Topics
                  </button>
                </>
              )}
            </div>
          </div>

          {!plannerOnboardingState.completed && (
            <div
              data-tour="planner-setup-tray"
              className="mb-10 rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className={cleanHeaderLabelClass}>
                    {currentGuide.step}
                  </div>
                  <h3 className="text-[22px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mt-1">
                    {currentGuide.title}
                  </h3>
                  <p className="text-[14px] font-medium text-[#64748b] dark:text-[#9aa2ae] mt-2 max-w-2xl">
                    {currentGuide.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      if (onboardingResumeVisible) {
                        resumePlannerOnboarding();
                        return;
                      }
                      void runGuidedAction(activeGuideAction);
                    }}
                    disabled={
                      isAutoDistributing &&
                      activeGuideAction === "build_schedule"
                    }
                    className={`${cleanPrimaryPill} px-6`}
                  >
                    {isAutoDistributing &&
                    activeGuideAction === "build_schedule"
                      ? "Building..."
                      : onboardingResumeVisible
                        ? "Resume Guide"
                        : currentGuide.actionLabel}
                  </button>
                  {
                    onboardingGuideActive ? (
                      <button
                        onClick={skipPlannerOnboarding}
                        className={`${cleanSecondaryPill} px-6`}
                      >
                        Skip For Now
                      </button>
                    ) : null /* BUG-1 FIX: Removed duplicate "Resume Guide" button — the header already has it */
                  }
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PLANNER_ONBOARDING_STEPS.map((stepId, index) => {
                  const completed = guideStepCompletion[stepId];
                  const active = stepId === activeGuideAction;
                  return (
                    <div
                      key={stepId}
                      className={`rounded-2xl px-4 py-3 border ${
                        completed
                          ? "border-emerald-400/40 bg-emerald-50/70 dark:bg-emerald-900/20"
                          : active
                            ? "border-blue-400/50 bg-blue-50/70 dark:bg-blue-900/20"
                            : "border-[#c0c4d1] dark:border-[#2b2c2c] bg-white/60 dark:bg-[#131416]"
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b919e] dark:text-[#767575]">
                        Step {index + 1}
                      </div>
                      <div className="text-[14px] font-semibold text-[#2d333b] dark:text-[#e7e5e5] mt-1">
                        {guidedActionMeta[stepId].title}
                      </div>
                      <div
                        className={`text-[11px] font-semibold tracking-[0.03em] mt-2 ${completed ? "text-emerald-600 dark:text-emerald-400" : active ? "text-blue-600 dark:text-blue-400" : "text-[#8b919e] dark:text-[#767575]"}`}
                      >
                        {completed
                          ? "Completed"
                          : active
                            ? "Current"
                            : "Pending"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions - Moved to top for immediate visibility */}
          {view === "today" && (
            <div
              data-tour="planner-quick-actions"
              className="mb-8 rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]"
            >
              <h3 className="text-[16px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-4">
                Quick Actions
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleViewChange("plan")}
                  className={`text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#1e40af] text-white shadow-md hover:shadow-lg ${PLANNER_PRESSABLE}`}
                >
                  Build Schedule
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleViewChange("syllabus")}
                    className={`text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-none bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c] hover:shadow-md ${PLANNER_PRESSABLE}`}
                  >
                    Add Topics
                  </button>
                  <button
                    onClick={() => handleViewChange("plan")}
                    className={`text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-none bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c] hover:shadow-md ${PLANNER_PRESSABLE}`}
                  >
                    Edit Plan
                  </button>
                  <button
                    onClick={() => handleViewChange("calendar")}
                    className={`text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-none bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c] hover:shadow-md ${PLANNER_PRESSABLE}`}
                  >
                    Open Calendar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          {view === "today" && (
            <div
              data-tour="planner-metrics"
              className="grid grid-cols-2 lg:grid-cols-5 gap-5 md:gap-8 mb-12"
            >
              {/* Days Left */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">
                  Days left
                </div>
                <div
                  className="text-5xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm"
                  style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
                >
                  {countdown === null
                    ? "--"
                    : Math.abs(countdown) > 9999
                      ? "???"
                      : Math.abs(countdown)}
                </div>
                <div className="text-[14px] font-bold text-[#64748b] dark:text-[#9aa2ae] uppercase tracking-[0.1em]">
                  {countdown === null
                    ? "Set exam date"
                    : Math.abs(countdown) > 9999
                      ? "Invalid date — please reset"
                      : countdown >= 0
                        ? "days remaining"
                        : "days since exam"}
                </div>
              </div>

              {/* Completed */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">
                  Completed
                </div>
                <div
                  className="text-5xl font-bold text-[#2d333b] dark:text-[#e7e5e5] flex items-baseline gap-2 mt-auto drop-shadow-sm"
                  style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
                >
                  {summary.done}{" "}
                  <span className="text-xl text-[#64748b] dark:text-[#9aa2ae] font-study-planner font-bold">
                    / {summary.total}
                  </span>
                </div>
              </div>

              {/* Today */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">
                  Today
                </div>
                <div
                  className="text-5xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm"
                  style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
                >
                  {todayTasks.length}
                </div>
                <div className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] uppercase tracking-[0.1em]">
                  tasks planned
                </div>
              </div>

              {/* Status */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">
                  Status
                </div>
                <div className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm">
                  {summaryStatusLabel}
                </div>
                <div className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] uppercase tracking-[0.1em]">
                  {overdueCount > 0
                    ? "Recover overdue tasks"
                    : "Keep the streak"}
                </div>
              </div>

              {/* Next Off Day */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">
                  Next off day
                </div>
                <div
                  className="text-3xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm"
                  style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
                >
                  {nextOffDayLabel}
                </div>
                <div className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] uppercase tracking-[0.1em]">
                  {plan.offDays.length > 0
                    ? "Off days are skipped"
                    : "No off days set"}
                </div>
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <div
              data-tour="planner-view-toggle"
              className="flex p-1.5 rounded-full transition-colors duration-500 bg-[#d9dbe2] dark:bg-[#0e0e0e] shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#1a1c1e] w-full md:w-auto"
            >
              {(
                [
                  ["today", "Today"],
                  ["plan", "Plan"],
                  ["syllabus", "Syllabus"],
                  ["calendar", "Calendar"],
                  ["insights" as PlannerSection, "Insights"],
                ] as Array<[PlannerSection, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleViewChange(value)}
                  className={`relative px-6 py-2.5 rounded-full ${value === "plan" || value === "syllabus" ? "text-[13px] md:text-[15px]" : "text-[14px] md:text-[14px]"} font-semibold tracking-[0.01em] z-10 flex-1 md:flex-none ${PLANNER_PRESSABLE} ${
                    view === value
                      ? "text-[#2d333b] dark:text-[#e7e5e5]"
                      : "text-[#8b919e] dark:text-[#767575] hover:text-[#4b5563] dark:hover:text-[#acabaa]"
                  }`}
                >
                  {view === value && (
                    <motion.div
                      layoutId="viewToggle"
                      className="absolute inset-0 rounded-full bg-[#f0f0f5] dark:bg-[#202225] shadow-[2px_2px_4px_rgba(166,171,189,0.4),-2px_-2px_4px_rgba(255,255,255,0.9),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.6),-1px_-1px_3px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="inline-flex items-center gap-2">
                    <span>{label}</span>
                    {value === "insights" && !isPremium && (
                      <span className="text-[8px] font-black tracking-[0.2em] px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30">
                        LOCK
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                void autoDistribute();
              }}
              disabled={isAutoDistributing}
              className={`${cleanPrimaryPill} py-4 px-10 text-[15px] font-black shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all hover:scale-[1.03] active:scale-[0.97] whitespace-nowrap flex-shrink-0`}
            >
              {isAutoDistributing ? "Building Schedule..." : "Build Schedule"}
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl p-4 bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]">
              {error}
            </div>
          )}

          {view === "today" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div
                  data-tour="planner-today-tasks"
                  className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                      Today&apos;s Study Tasks
                    </h3>
                    <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#64748b] dark:text-[#9aa2ae]">
                      {todayTasks.length} planned
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {todayTasks.map((topic) => (
                      <div
                        key={topic.id}
                        className={`rounded-2xl p-5 border shadow-sm ${isDarkMode ? "bg-[#232628] border-[#3a3d42] shadow-[0_2px_8px_rgba(0,0,0,0.4)]" : "bg-white border-[#d1d5db]"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-[19px] font-bold leading-snug ${isDarkMode ? "text-white" : "text-[#1a202c]"}`}
                            >
                              {topic.name}
                            </div>
                            <div
                              className={`text-[14px] font-bold tracking-wider mt-1 ${isDarkMode ? "text-[#9aa2ae]" : "text-[#64748b]"}`}
                            >
                              <span className="uppercase">{topic.subject.name}</span>
                              {topic.chapter?.name
                                ? ` - ${topic.chapter.name}`
                                : ""}
                            </div>
                            {topic.notes && (
                              <div className="text-[12px] font-extrabold uppercase tracking-widest text-[#64748b] mt-2">
                                Notes attached
                              </div>
                            )}
                          </div>
                          <span
                            className="flex-shrink-0 text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full font-black tracking-widest"
                            style={{
                              color: STATUS_UI[topic.status].color,
                              background: isDarkMode
                                ? STATUS_UI[topic.status].darkBg ||
                                  STATUS_UI[topic.status].bg
                                : STATUS_UI[topic.status].bg,
                              border: `1px solid ${STATUS_UI[topic.status].color}30`,
                            }}
                          >
                            {STATUS_UI[topic.status].label}
                          </span>
                        </div>

                        {/* P1-8: Promoted "Needs Revision" to primary row + P1-7: Move Date picker */}
                        <div className="flex flex-wrap items-center gap-4 mt-5 border-t border-slate-200/50 dark:border-slate-800 pt-4">
                          <button
                            onClick={() =>
                              patchTopic(topic.id, { status: "in_progress" })
                            }
                            className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            Start
                          </button>
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                          <button
                            onClick={() =>
                              patchTopic(topic.id, { status: "done" })
                            }
                            className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                          >
                            Done
                          </button>
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                          <button
                            onClick={() =>
                              patchTopic(topic.id, {
                                status: "revision_needed",
                              })
                            }
                            className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                          >
                            Needs Revision
                          </button>
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                          <div className="relative move-date-dropdown-container">
                            <button
                              onClick={() =>
                                setMoveDatePickerTopicId((prev) =>
                                  prev === topic.id ? null : topic.id,
                                )
                              }
                              className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                              Move ▾
                            </button>
                            {moveDatePickerTopicId === topic.id && (
                              <div
                                className={`absolute top-full left-0 mt-2 z-50 rounded-2xl p-3 shadow-xl border min-w-[180px] ${isDarkMode ? "bg-[#1a1c1e] border-[#2b2c2c]" : "bg-white border-[#c0c4d1]"}`}
                              >
                                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-2">
                                  Pick a date
                                </div>
                                {(() => {
                                  const offDaysSet = new Set(
                                    plan?.offDays || [],
                                  );
                                  const options: {
                                    label: string;
                                    key: string;
                                  }[] = [];
                                  let d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  let count = 0;
                                  while (count < 7) {
                                    const dayOfWeek = d.getDay();
                                    if (!offDaysSet.has(dayOfWeek)) {
                                      const key = toIsoDateOnly(d);
                                      const dayNames = [
                                        "Sun",
                                        "Mon",
                                        "Tue",
                                        "Wed",
                                        "Thu",
                                        "Fri",
                                        "Sat",
                                      ];
                                      const label =
                                        count === 0 &&
                                        !offDaysSet.has(
                                          new Date(
                                            Date.now() + 86400000,
                                          ).getDay(),
                                        )
                                          ? `Tomorrow (${dayNames[dayOfWeek]})`
                                          : `${dayNames[dayOfWeek]}, ${d.getDate()}/${d.getMonth() + 1}`;
                                      options.push({ label, key });
                                      count++;
                                    }
                                    d = new Date(d.getTime() + 86400000);
                                  }
                                  return options.map((opt) => (
                                    <button
                                      key={opt.key}
                                      onClick={() => {
                                        void patchTopic(topic.id, {
                                          plannedDate: opt.key,
                                        });
                                        setMoveDatePickerTopicId(null);
                                      }}
                                      className={`block w-full text-left text-[13px] font-bold px-3 py-2 rounded-lg transition-colors ${isDarkMode ? "text-[#e2e8f0] hover:bg-[#343840]" : "text-[#2d333b] hover:bg-[#e6e7ee]"}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setExpandedTodayTopicId((prev) =>
                                prev === topic.id ? null : topic.id,
                              )
                            }
                            className={`text-[14px] font-black tracking-wide px-4 py-2.5 rounded-full border ${isDarkMode ? "bg-[#343840] border-[#4a4e55] text-[#e2e8f0]" : "bg-white border-[#c0c4d1] text-[#1a202c]"}`}
                          >
                            More
                          </button>
                        </div>

                        {expandedTodayTopicId === topic.id && (
                          <div className="flex flex-wrap gap-3 mt-3">
                            <button
                              onClick={() =>
                                patchTopic(topic.id, { plannedDate: "" })
                              }
                              className="text-[12px] font-black tracking-wide px-3 py-2 rounded-full border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
                            >
                              Remove Date
                            </button>
                            <button
                              onClick={() => {
                                void editTopicNotes(topic);
                              }}
                              className={`text-[12px] font-black tracking-wide px-3 py-2 rounded-full border ${isDarkMode ? "bg-[#343840] text-[#e2e8f0] border-[#4a4e55]" : "bg-white text-[#1a202c] border-[#c0c4d1]"}`}
                            >
                              Edit Notes
                            </button>
                            <button
                              onClick={() =>
                                openTopicInSyllabus(
                                  topic,
                                  topic.subject,
                                  topic.chapter,
                                )
                              }
                              className={`text-[12px] font-black tracking-wide px-3 py-2 rounded-full border ${isDarkMode ? "bg-[#343840] text-[#e2e8f0] border-[#4a4e55]" : "bg-white text-[#1a202c] border-[#c0c4d1]"}`}
                            >
                              Open in Syllabus
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {todayTasks.length === 0 && (
                      <div className="text-[14px] font-bold text-[#64748b] dark:text-[#9aa2ae] text-center py-10 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                        No tasks planned for today.
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                          <button
                            onClick={() => handleViewChange("calendar")}
                            className={`text-[12px] font-black tracking-wide px-4 py-2 rounded-full border ${isDarkMode ? "bg-[#343840] text-[#e2e8f0] border-[#4a4e55]" : "bg-white text-[#1a202c] border-[#c0c4d1]"}`}
                          >
                            View Upcoming
                          </button>
                          <button
                            onClick={() => handleViewChange("plan")}
                            className="text-[12px] font-black tracking-wide px-4 py-2 rounded-full bg-[#3b82f6] text-white"
                          >
                            Rebuild Plan
                          </button>
                          <button
                            onClick={() => handleViewChange("syllabus")}
                            className={`text-[12px] font-black tracking-wide px-4 py-2 rounded-full border ${isDarkMode ? "bg-[#343840] text-[#e2e8f0] border-[#4a4e55]" : "bg-white text-[#1a202c] border-[#c0c4d1]"}`}
                          >
                            Add Topics
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  data-tour="planner-upcoming"
                  className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                      Coming Up
                    </h3>
                    <button
                      onClick={() => handleViewChange("calendar")}
                      className="text-[12px] font-black tracking-wide text-blue-600 dark:text-blue-400"
                    >
                      Open Calendar
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {upcomingTasks.slice(0, 7).map((topic) => (
                      <div
                        key={topic.id}
                        className={`flex flex-col justify-between gap-3 rounded-2xl p-4 border shadow-sm ${isDarkMode ? "bg-[#232628] border-[#3a3d42]" : "bg-white border-[#d1d5db]"}`}
                      >
                        <div>
                          <div
                            className={`text-[18px] font-bold leading-snug ${isDarkMode ? "text-white" : "text-[#1a202c]"}`}
                          >
                            {topic.name}
                          </div>
                          <div
                            className={`text-[14px] font-bold tracking-wider mt-1 ${isDarkMode ? "text-[#9aa2ae]" : "text-[#64748b]"}`}
                          >
                            <span className="uppercase">{topic.subject.name}</span>
                            {topic.chapter?.name
                              ? ` - ${topic.chapter.name}`
                              : ""}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[14px] font-black tracking-wide text-[#1e40af] dark:text-[#93c5fd]">
                            {topic.plannedDate
                              ? formatDate(topic.plannedDate)
                              : "Unplanned"}
                          </div>
                          <button
                            onClick={() =>
                              patchTopic(topic.id, { status: "done" })
                            }
                            className="text-[13px] font-black tracking-wide px-4 py-2 rounded-full bg-emerald-600 text-white shadow-sm"
                          >
                            Done
                          </button>
                          <div className="relative move-date-dropdown-container">
                            <button
                              onClick={() =>
                                setMoveDatePickerTopicId((prev) =>
                                  prev === topic.id ? null : topic.id,
                                )
                              }
                              className={`text-[13px] font-black tracking-wide px-4 py-2 rounded-full border ${isDarkMode ? "bg-[#1e3a5f] text-[#93c5fd] border-[#1e40af]" : "bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]"}`}
                            >
                              Move ▾
                            </button>
                            {moveDatePickerTopicId === topic.id && (
                              <div
                                className={`absolute top-full left-0 mt-2 z-50 rounded-2xl p-3 shadow-xl border min-w-[180px] ${isDarkMode ? "bg-[#1a1c1e] border-[#2b2c2c]" : "bg-white border-[#c0c4d1]"}`}
                              >
                                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-2">
                                  Pick a date
                                </div>
                                {(() => {
                                  const offDaysSet = new Set(
                                    plan?.offDays || [],
                                  );
                                  const options: {
                                    label: string;
                                    key: string;
                                  }[] = [];
                                  let d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  let count = 0;
                                  while (count < 7) {
                                    const dow = d.getDay();
                                    if (!offDaysSet.has(dow)) {
                                      const key = toIsoDateOnly(d);
                                      const dn = [
                                        "Sun",
                                        "Mon",
                                        "Tue",
                                        "Wed",
                                        "Thu",
                                        "Fri",
                                        "Sat",
                                      ];
                                      options.push({
                                        label: `${dn[dow]}, ${d.getDate()}/${d.getMonth() + 1}`,
                                        key,
                                      });
                                      count++;
                                    }
                                    d = new Date(d.getTime() + 86400000);
                                  }
                                  return options.map((opt) => (
                                    <button
                                      key={opt.key}
                                      onClick={() => {
                                        void patchTopic(topic.id, {
                                          plannedDate: opt.key,
                                        });
                                        setMoveDatePickerTopicId(null);
                                      }}
                                      className={`block w-full text-left text-[13px] font-bold px-3 py-2 rounded-lg transition-colors ${isDarkMode ? "text-[#e2e8f0] hover:bg-[#343840]" : "text-[#2d333b] hover:bg-[#e6e7ee]"}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleViewChange("calendar")}
                            className={`text-[13px] font-black tracking-wide px-4 py-2 rounded-full border ${isDarkMode ? "bg-[#343840] text-[#e2e8f0] border-[#4a4e55]" : "bg-white text-slate-700 border-slate-300"}`}
                          >
                            Calendar
                          </button>
                        </div>
                      </div>
                    ))}

                    {upcomingTasks.length === 0 && (
                      <div className="text-[14px] font-bold text-[#64748b] dark:text-[#9aa2ae] text-center py-8 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                        No upcoming tasks yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div
                  data-tour="planner-overdue"
                  className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                      Overdue
                    </h3>
                    <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#64748b] dark:text-[#9aa2ae]">
                      {overdueCount} items
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {overdueTasks.slice(0, 5).map((topic) => (
                      <div
                        key={topic.id}
                        className="rounded-2xl p-4 bg-[#fee2e2] dark:bg-[#2a1216] border border-[#fecaca] dark:border-[#7f1d1d]"
                      >
                        <div className="text-[14px] font-bold text-[#7f1d1d] dark:text-[#fecaca]">
                          {topic.name}
                        </div>
                        <div className="text-[12px] font-extrabold tracking-wide text-[#b91c1c] dark:text-[#fca5a5] mt-1">
                          <span className="uppercase">{topic.subject.name}</span>
                          {topic.chapter?.name
                            ? ` - ${topic.chapter.name}`
                            : ""}
                        </div>
                        {topic.plannedDate && (
                          <div className="text-[12px] font-black tracking-wide text-[#b91c1c] dark:text-[#fca5a5] mt-2">
                            {daysBetweenDateKeys(
                              toIsoDateOnly(topic.plannedDate),
                              todayKey,
                            )}{" "}
                            days overdue
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() =>
                              patchTopic(topic.id, { status: "done" })
                            }
                            className="text-[13px] font-black tracking-wide px-4 py-2 rounded-full bg-emerald-600 text-white shadow-sm"
                          >
                            Done
                          </button>
                          <div className="relative move-date-dropdown-container">
                            <button
                              onClick={() =>
                                setMoveDatePickerTopicId((prev) =>
                                  prev === topic.id ? null : topic.id,
                                )
                              }
                              className={`text-[13px] font-black tracking-wide px-4 py-2 rounded-full border ${isDarkMode ? "bg-[#1e3a5f] text-[#93c5fd] border-[#1e40af]" : "bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]"}`}
                            >
                              Move ▾
                            </button>
                            {moveDatePickerTopicId === topic.id && (
                              <div
                                className={`absolute top-full left-0 mt-2 z-50 rounded-2xl p-3 shadow-xl border min-w-[180px] ${isDarkMode ? "bg-[#1a1c1e] border-[#2b2c2c]" : "bg-white border-[#c0c4d1]"}`}
                              >
                                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-2">
                                  Pick a date
                                </div>
                                {(() => {
                                  const offDaysSet = new Set(
                                    plan?.offDays || [],
                                  );
                                  const options: {
                                    label: string;
                                    key: string;
                                  }[] = [];
                                  let d = new Date();
                                  d.setDate(d.getDate() + 1);
                                  let count = 0;
                                  while (count < 7) {
                                    const dow = d.getDay();
                                    if (!offDaysSet.has(dow)) {
                                      const key = toIsoDateOnly(d);
                                      const dn = [
                                        "Sun",
                                        "Mon",
                                        "Tue",
                                        "Wed",
                                        "Thu",
                                        "Fri",
                                        "Sat",
                                      ];
                                      options.push({
                                        label: `${dn[dow]}, ${d.getDate()}/${d.getMonth() + 1}`,
                                        key,
                                      });
                                      count++;
                                    }
                                    d = new Date(d.getTime() + 86400000);
                                  }
                                  return options.map((opt) => (
                                    <button
                                      key={opt.key}
                                      onClick={() => {
                                        void patchTopic(topic.id, {
                                          plannedDate: opt.key,
                                        });
                                        setMoveDatePickerTopicId(null);
                                      }}
                                      className={`block w-full text-left text-[13px] font-bold px-3 py-2 rounded-lg transition-colors ${isDarkMode ? "text-[#e2e8f0] hover:bg-[#343840]" : "text-[#2d333b] hover:bg-[#e6e7ee]"}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              patchTopic(topic.id, { plannedDate: "" })
                            }
                            className="text-[13px] font-black tracking-wide px-4 py-2 rounded-full border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}

                    {overdueTasks.length === 0 && (
                      <div className="text-[14px] font-bold text-[#64748b] dark:text-[#9aa2ae] text-center py-8 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                        No overdue topics.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewChange("calendar")}
                    className="mt-5 w-full text-[12px] font-black tracking-wide px-4 py-3 rounded-full bg-[#0ea5e9] text-white"
                  >
                    Reschedule Overdue
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === "insights" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="space-y-3">
                    <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#9aa2ae]">
                      Premium Study Intelligence
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2
                        className="text-3xl md:text-4xl font-black text-[#2d333b] dark:text-[#e7e5e5]"
                        style={{
                          fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em",
                        }}
                      >
                        {
                          insightStatusMeta[insights.summary.onTrackStatus]
                            .label
                        }
                      </h2>
                      <span
                        className={`text-[13px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-full ${insightStatusMeta[insights.summary.onTrackStatus].tone} ${insightStatusMeta[insights.summary.onTrackStatus].chip}`}
                      >
                        {insights.summary.remainingTopics} topics left
                      </span>
                    </div>
                    <p className="text-sm md:text-base font-bold text-[#64748b] dark:text-[#9aa2ae] max-w-3xl leading-relaxed">
                      This view turns your syllabus, schedule, revision load,
                      and exam timing into pacing guidance. It benchmarks only
                      against your own plan, daily target, and exam date.
                    </p>
                  </div>

                  {!isPremium ? (
                    <div className="rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20 px-5 py-4 min-w-[280px]">
                      <div className="text-[12px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300 mb-2">
                        Premium Locked
                      </div>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-relaxed mb-4">
                        Upgrade to unlock workload balance, forecast completion,
                        revision pressure, and prescriptive next-step
                        recommendations.
                      </p>
                      <button
                        onClick={() => {
                          void upgradePlannerPremium();
                        }}
                        className="w-full text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-[#3b82f6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.35)]"
                      >
                        Upgrade to Premium
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-300 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 min-w-[260px]">
                      <div className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300 mb-2">
                        Premium Active
                      </div>
                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 leading-relaxed">
                        Forecasting, coverage insights, and rule-based
                        recommendations are active for this plan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
                {[
                  {
                    label: "On-track status",
                    value:
                      insightStatusMeta[insights.summary.onTrackStatus].label,
                    subtext:
                      insights.summary.daysBuffer === null
                        ? "Set exam date to unlock pacing forecast"
                        : insights.summary.daysBuffer >= 0
                          ? `${insights.summary.daysBuffer} study-day buffer before exam`
                          : "You are projected to miss the exam window",
                    tone: insightStatusMeta[insights.summary.onTrackStatus]
                      .tone,
                  },
                  {
                    label: "Completion",
                    value: `${insights.summary.completionPercent}%`,
                    subtext: `${summary.done}/${summary.total} topics completed`,
                    tone: "text-[#2d333b] dark:text-[#e7e5e5]",
                  },
                  {
                    label: "Study streak",
                    value: `${insights.consistency.studyStreak}d`,
                    subtext: `${insights.consistency.activeDaysLast14}/14 active days recently`,
                    tone: "text-[#2d333b] dark:text-[#e7e5e5]",
                  },
                  {
                    label: "Required / day",
                    value:
                      insights.summary.requiredTopicsPerStudyDay === null
                        ? "--"
                        : `${insights.summary.requiredTopicsPerStudyDay}`,
                    subtext: `Current goal ${Math.max(1, plan.dailyGoal || 1)}/day`,
                    tone:
                      insights.summary.requiredTopicsPerStudyDay !== null &&
                      insights.summary.requiredTopicsPerStudyDay >
                        Math.max(1, plan.dailyGoal || 1)
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-[#2d333b] dark:text-[#e7e5e5]",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                  >
                    <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-3">
                      {card.label}
                    </div>
                    <div
                      className={`text-3xl md:text-4xl font-black mb-2 ${card.tone}`}
                      style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
                    >
                      {card.value}
                    </div>
                    <div className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] leading-relaxed">
                      {card.subtext}
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div
                  className={`${!isPremium ? "pointer-events-none select-none blur-[3px]" : ""} space-y-8`}
                >
                  <div className="rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Consistency Pulse
                        </h3>
                        <p className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] mt-2">
                          Shows how regularly you are completing topics, so
                          pacing guidance reflects actual execution and not just
                          planned dates.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                        <span className="px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          Best day: {insights.consistency.bestStudyWeekday}
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          {insights.consistency.activeDaysLast30}/30 active days
                        </span>
                      </div>
                    </div>
                    <div className="grid xl:grid-cols-[260px_minmax(0,1fr)] gap-6">
                      <div className="grid sm:grid-cols-3 xl:grid-cols-1 gap-4">
                        <div className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Study streak
                          </div>
                          <div className="text-3xl font-black text-[#2d333b] dark:text-[#e7e5e5]">
                            {insights.consistency.studyStreak} days
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Last 14 days
                          </div>
                          <div className="text-3xl font-black text-[#2d333b] dark:text-[#e7e5e5]">
                            {insights.consistency.activeDaysLast14}
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Best weekday
                          </div>
                          <div className="text-lg font-black text-[#2d333b] dark:text-[#e7e5e5] leading-snug">
                            {insights.consistency.bestStudyWeekday}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl p-5 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                            30-day completion heatmap
                          </div>
                          <div className="text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae]">
                            Darker cells mean more completed topics
                          </div>
                        </div>
                        <div className="grid grid-cols-10 sm:grid-cols-15 gap-2">
                          {insights.consistency.heatmap.map((point) => {
                            const intensity =
                              point.count >= 4
                                ? "bg-emerald-600 dark:bg-emerald-400"
                                : point.count >= 2
                                  ? "bg-emerald-400 dark:bg-emerald-500"
                                  : point.count >= 1
                                    ? "bg-emerald-200 dark:bg-emerald-700/70"
                                    : "bg-[#d9dbe2] dark:bg-[#111315]";
                            return (
                              <div
                                key={point.date}
                                className="flex flex-col items-center gap-1"
                              >
                                <div
                                  title={`${formatDate(point.date)}: ${point.count} topic${point.count === 1 ? "" : "s"} completed`}
                                  className={`w-full aspect-square rounded-lg border border-white/70 dark:border-[#2b2c2c] ${intensity}`}
                                />
                                <span className="text-[11px] font-bold text-[#64748b] dark:text-[#767575]">
                                  {new Date(point.date).getDate()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Deadline and Pace
                        </h3>
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#9aa2ae]">
                          Exam-bound forecast
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[
                          {
                            label: "Forecast completion",
                            value: insights.summary.forecastCompletionDate
                              ? formatDate(
                                  insights.summary.forecastCompletionDate,
                                )
                              : "Not available",
                          },
                          {
                            label: "Available study days",
                            value:
                              insights.summary.availableStudyDays === null
                                ? "--"
                                : String(insights.summary.availableStudyDays),
                          },
                          {
                            label: "Days until exam",
                            value:
                              insights.summary.daysUntilExam === null
                                ? "--"
                                : String(insights.summary.daysUntilExam),
                          },
                          {
                            label: "Schedule coverage",
                            value:
                              insights.summary.scheduleCoveragePercent === null
                                ? "--"
                                : `${insights.summary.scheduleCoveragePercent}%`,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]"
                          >
                            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                              {item.label}
                            </div>
                            <div
                              className="text-2xl font-black text-[#2d333b] dark:text-[#e7e5e5]"
                              style={{
                                fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em",
                              }}
                            >
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 rounded-2xl p-4 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                        <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                          Pacing read
                        </div>
                        <p className="text-sm font-bold text-[#475569] dark:text-[#c6c6c6] leading-relaxed">
                          {insights.summary.daysBuffer === null
                            ? "Set a valid exam date to unlock the pacing forecast."
                            : insights.summary.daysBuffer >= 0
                              ? `At the current pace, you are projected to finish with a ${insights.summary.daysBuffer}-study-day buffer.`
                              : `At the current pace, your plan misses the exam window. You need to increase throughput or reduce load.`}
                        </p>
                      </div>
                    </div>

                    <div className="xl:col-span-7 rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Workload Balance
                        </h3>
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#9aa2ae]">
                          Next 14 study days
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-4 items-end min-h-[220px]">
                        {insights.workload.next14Days.map((day) => {
                          const barHeight = Math.max(
                            14,
                            Math.min(144, day.plannedCount * 18),
                          );
                          const isOverloaded =
                            !day.isOffDay &&
                            day.plannedCount > Math.max(1, plan.dailyGoal || 1);
                          return (
                            <div
                              key={day.date}
                              className="flex flex-col items-center gap-3"
                            >
                              <div
                                className={`w-full rounded-2xl flex items-end justify-center transition-all border ${day.isOffDay ? "bg-amber-100 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40" : isOverloaded ? "bg-rose-100 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40" : "bg-[#e6e7ee] dark:bg-[#131416] border-[#d9dbe2] dark:border-[#2b2c2c]"}`}
                                style={{ height: `${barHeight}px` }}
                              >
                                <span
                                  className={`text-[13px] font-black mb-3 ${day.isOffDay ? "text-amber-700 dark:text-amber-300" : isOverloaded ? "text-rose-700 dark:text-rose-300" : "text-[#2d333b] dark:text-[#e7e5e5]"}`}
                                >
                                  {day.isOffDay ? "OFF" : day.plannedCount}
                                </span>
                              </div>
                              <div className="text-center">
                                <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#475569] dark:text-[#9aa2ae]">
                                  {new Date(day.date).toLocaleDateString(
                                    "en-US",
                                    { weekday: "short" },
                                  )}
                                </div>
                                <div className="text-[12px] font-bold text-[#64748b] dark:text-[#767575]">
                                  {formatDate(day.date)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                        <div className="rounded-2xl p-4 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Overloaded days
                          </div>
                          <div className="text-2xl font-black text-[#2d333b] dark:text-[#e7e5e5]">
                            {insights.workload.overloadDays}
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Empty study days
                          </div>
                          <div className="text-2xl font-black text-[#2d333b] dark:text-[#e7e5e5]">
                            {insights.workload.emptyStudyDays}
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Busiest day
                          </div>
                          <div className="text-lg font-black text-[#2d333b] dark:text-[#e7e5e5] leading-snug">
                            {insights.workload.busiestDay
                              ? formatDate(insights.workload.busiestDay.date)
                              : "No scheduled load"}
                          </div>
                          <div className="text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] mt-2">
                            {insights.workload.busiestDay
                              ? `${insights.workload.busiestDay.plannedCount} planned topics`
                              : "Add dates to surface workload peaks"}
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Busiest subject
                          </div>
                          <div className="text-lg font-black text-[#2d333b] dark:text-[#e7e5e5] leading-snug">
                            {insights.workload.busiestSubjectUpcoming ||
                              "Balanced load"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-7 rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Coverage and Retention
                        </h3>
                        <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#9aa2ae]">
                          Worst-to-best subjects
                        </span>
                      </div>
                      <div className="space-y-4">
                        {insights.coverage.subjectRows.map((subject) => (
                          <div
                            key={subject.subjectId}
                            className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                              <div>
                                <div className="text-[16px] font-black text-[#2d333b] dark:text-[#e7e5e5]">
                                  {subject.subjectName}
                                </div>
                                <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mt-1">
                                  {subject.remainingTopics} remaining ·{" "}
                                  {subject.scheduledTopics} scheduled ·{" "}
                                  {subject.overdueTopics} overdue
                                </div>
                              </div>
                              <div className="text-[18px] font-black text-[#2d333b] dark:text-[#e7e5e5]">
                                {subject.completionPercent}%
                              </div>
                            </div>
                            <div className="h-3 rounded-full bg-white dark:bg-[#202225] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${subject.completionPercent}%`,
                                  background: subject.color || "#3b82f6",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="xl:col-span-5 space-y-8">
                      <div className="rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-[18px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                            Lagging Chapters
                          </h3>
                          <span className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                            Focus now
                          </span>
                        </div>
                        <div className="space-y-3">
                          {insights.coverage.laggingChapters.map((chapter) => (
                            <div
                              key={chapter.chapterId}
                              className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]"
                            >
                              <div className="text-[14px] font-black text-[#2d333b] dark:text-[#e7e5e5]">
                                {chapter.chapterName}
                              </div>
                              <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mt-1">
                                {chapter.subjectName} ·{" "}
                                {chapter.remainingTopics} remaining ·{" "}
                                {chapter.overdueTopics} overdue
                              </div>
                            </div>
                          ))}
                          {insights.coverage.laggingChapters.length === 0 && (
                            <div className="text-[14px] font-bold text-[#64748b] dark:text-[#9aa2ae] text-center py-6 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                              No lagging chapters right now.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-[18px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                            Revision Queue
                          </h3>
                          <span className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                            Retention pressure
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            {
                              label: "Needs revision",
                              value: insights.backlog.revisionNeededTopics,
                              tone: "text-violet-700 dark:text-violet-300",
                            },
                            {
                              label: "Review due soon",
                              value: insights.backlog.reviewDueSoon,
                              tone: "text-amber-700 dark:text-amber-300",
                            },
                            {
                              label: "Review overdue",
                              value: insights.backlog.reviewOverdue,
                              tone: "text-rose-700 dark:text-rose-300",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c] text-center"
                            >
                              <div
                                className={`text-2xl font-black ${item.tone}`}
                              >
                                {item.value}
                              </div>
                              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mt-2">
                                {item.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[18px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Backlog Health
                        </h3>
                        <span className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                          Current state
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 mb-5">
                        <div className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Unplanned unfinished
                          </div>
                          <div className="text-3xl font-black text-[#2d333b] dark:text-[#e7e5e5]">
                            {insights.backlog.unplannedUnfinishedTopics}
                          </div>
                        </div>
                        <div className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]">
                          <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Overdue total
                          </div>
                          <div className="text-3xl font-black text-rose-700 dark:text-rose-300">
                            {insights.backlog.overdueTotal}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {[
                          [
                            "1-3 days",
                            insights.backlog.overdueAgingBuckets.days1to3,
                          ],
                          [
                            "4-7 days",
                            insights.backlog.overdueAgingBuckets.days4to7,
                          ],
                          [
                            "8+ days",
                            insights.backlog.overdueAgingBuckets.days8Plus,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-2xl p-4 bg-white/70 dark:bg-[#202225] border border-[#d9dbe2] dark:border-[#2b2c2c]"
                          >
                            <span className="text-[14px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                              {label}
                            </span>
                            <span className="text-[20px] font-black text-[#2d333b] dark:text-[#e7e5e5]">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="xl:col-span-7 rounded-3xl p-6 md:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[18px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Next Actions
                        </h3>
                        <span className="text-[12px] font-black uppercase tracking-[0.18em] text-[#64748b] dark:text-[#9aa2ae]">
                          Rule-based guidance
                        </span>
                      </div>
                      <div className="space-y-4">
                        {insights.recommendations.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl p-5 bg-[#e6e7ee] dark:bg-[#131416] border border-[#d9dbe2] dark:border-[#2b2c2c]"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <div className="text-[16px] font-black text-[#2d333b] dark:text-[#e7e5e5]">
                                  {item.title}
                                </div>
                                <div className="text-[13px] font-bold text-[#64748b] dark:text-[#9aa2ae] mt-2 leading-relaxed">
                                  {item.reason}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleViewChange(item.targetView)
                                }
                                className="shrink-0 text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#3b82f6] text-white shadow-[0_4px_10px_rgba(37,99,235,0.35)] hover:bg-blue-700 transition-colors"
                              >
                                {item.ctaLabel}
                              </button>
                            </div>
                          </div>
                        ))}
                        {insights.recommendations.length === 0 && (
                          <div className="text-[14px] font-bold text-[#64748b] dark:text-[#9aa2ae] text-center py-8 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                            No urgent changes recommended right now. Keep
                            executing the current plan.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {!isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center px-6">
                    <div className="pointer-events-auto max-w-xl rounded-3xl border border-amber-300 dark:border-amber-700/50 bg-white/90 dark:bg-[#111214]/90 backdrop-blur-md p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
                      <div className="text-[12px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300 mb-3">
                        Premium Preview
                      </div>
                      <h3 className="text-2xl font-black text-[#2d333b] dark:text-[#e7e5e5] mb-3">
                        Unlock forecasts, workload balance, and revision
                        intelligence
                      </h3>
                      <p className="text-sm font-bold text-[#64748b] dark:text-[#9aa2ae] leading-relaxed mb-6">
                        The detailed insights layer stays locked on free plans.
                        Upgrade this planner to see subject risk, upcoming
                        workload pressure, forecast completion, and rule-based
                        next actions.
                      </p>
                      <button
                        onClick={() => {
                          void upgradePlannerPremium();
                        }}
                        className="text-[12px] font-black uppercase tracking-widest px-6 py-3 rounded-full bg-[#3b82f6] text-white shadow-[0_4px_12px_rgba(59,130,246,0.35)]"
                      >
                        Upgrade to Premium
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === "plan" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-10"
            >
              {plan?.subjects?.length === 0 ? (
                <div className="lg:col-span-2 rounded-3xl p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#2d333b] dark:text-[#e7e5e5] mb-3">
                      Step 1: Build Your Syllabus
                    </h3>
                    <p className="text-sm font-bold text-[#4b5563] dark:text-[#9ca3af] max-w-sm mx-auto leading-relaxed">
                      You don't have any study materials yet! Head over to the
                      Syllabus tab to add your subjects and topics. Once your
                      syllabus is ready, come back here to instantly generate
                      your calendar.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleViewChange("syllabus", { bypassOnboarding: true })
                    }
                    className="text-[14px] font-black uppercase tracking-widest px-10 py-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.39)] transition-transform hover:scale-105 active:scale-95"
                  >
                    Go to Syllabus Builder
                  </button>
                </div>
              ) : (
                <>
                  <div
                    data-tour="planner-plan-basics"
                    className="flex flex-col gap-8"
                  >
                    <div className="rounded-3xl p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="text-[12px] font-bold tracking-wide text-[#64748b] dark:text-[#9aa2ae] mb-4">
                        Exam Settings
                      </div>
                      <div className="grid gap-6">
                        <input
                          value={planTitleDraft}
                          onChange={(e) => setPlanTitleDraft(e.target.value)}
                          placeholder="Plan title"
                          className="w-full bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                        />
                        <input
                          value={examType}
                          onChange={(e) => setExamType(e.target.value)}
                          placeholder="Exam / goal name"
                          data-tour="planner-exam-input"
                          className="w-full bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                        />
                        <CustomDatePicker
                          value={examDateDraft}
                          onChange={setExamDateDraft}
                          isDarkMode={isDarkMode}
                        />
                        <button
                          onClick={() => {
                            void saveExamSettings();
                          }}
                          className="text-[13px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#3b82f6] text-white"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="text-[12px] font-bold tracking-wide text-[#64748b] dark:text-[#9aa2ae] mb-4">
                        Study Capacity
                      </div>
                      <div className="grid gap-6">
                        <div>
                          <label className="text-[12px] font-black uppercase tracking-widest text-[#64748b] dark:text-[#9aa2ae]">
                            Daily goal
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={dailyGoalDraft}
                            onChange={(e) =>
                              setDailyGoalDraft(Number(e.target.value))
                            }
                            className="w-full mt-2 bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                          />
                        </div>

                        <div>
                          <div className="text-[12px] font-black uppercase tracking-widest text-[#64748b] dark:text-[#9aa2ae] mb-2">
                            Off days
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                "Sun",
                                "Mon",
                                "Tue",
                                "Wed",
                                "Thu",
                                "Fri",
                                "Sat",
                              ] as const
                            ).map((label, idx) => (
                              <button
                                key={label}
                                onClick={() => toggleOffDay(idx)}
                                className={`text-[12px] font-black uppercase tracking-widest px-3 py-2 rounded-full border ${
                                  offDaysDraft.includes(idx)
                                    ? "bg-[#3b82f6] text-white border-[#2563eb]"
                                    : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {beginnerMode && (
                          <button
                            onClick={() =>
                              setShowAdvancedCapacity((prev) => !prev)
                            }
                            className="text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-none border border-[#c0c4d1] dark:border-[#2b2c2c] bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5]"
                          >
                            {showAdvancedCapacity
                              ? "Hide Advanced Settings"
                              : "Show Advanced Settings"}
                          </button>
                        )}

                        {(showAdvancedCapacity) && (
                          <div className="flex flex-col gap-3">
                            <button
                              onClick={() =>
                                setIncludeRevisionNeeded((prev) => !prev)
                              }
                              className={`text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-none border ${
                                includeRevisionNeeded
                                  ? "bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]"
                                  : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                              }`}
                            >
                              Include revision topics
                            </button>
                            <button
                              onClick={() =>
                                setLockExistingDates((prev) => !prev)
                              }
                              className={`text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-none border ${
                                lockExistingDates
                                  ? "bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]"
                                  : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                              }`}
                            >
                              Keep already planned dates
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            void saveCapacitySettings();
                          }}
                          className="text-[13px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#3b82f6] text-white"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    data-tour="planner-plan-actions"
                    className="flex flex-col gap-8"
                  >
                    <div className="rounded-3xl p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[18px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">
                          Schedule Management
                        </h3>
                      </div>

                      <button
                        data-tour="planner-autoplan"
                        onClick={() => {
                          void runGuidedAction("build_schedule");
                        }}
                        disabled={isAutoDistributing}
                        className={`${cleanPrimaryPill} w-full py-4 text-[15px] font-bold shadow-lg shadow-blue-500/20`}
                      >
                        {isAutoDistributing
                          ? "Building Planner..."
                          : "Create Planner Calendar"}
                      </button>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => {
                            if (!isPremium) {
                              setPremiumModalReason("reschedule");
                              return;
                            }
                            handleViewChange("calendar");
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest border ${isDarkMode ? "bg-[#202225] border-[#2b2c2c] text-[#9aa2ae] hover:text-white" : "bg-white border-[#c0c4d1] text-[#64748b] hover:text-[#1a202c]"} transition-all`}
                        >
                          Reschedule{!isPremium ? <PremiumEmoji name="lock" alt="" className="h-3.5 w-3.5" /> : null}
                        </button>
                        <button
                          onClick={() => {
                            if (!isPremium) {
                              setPremiumModalReason("reschedule");
                              return;
                            }
                            setPendingDelete({
                              type: "topic",
                              id: "__clear_future__",
                              parentId: undefined,
                              label:
                                "This will remove planned dates for future topics. Continue?",
                            });
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest border border-red-200/50 dark:border-red-900/30 ${isDarkMode ? "bg-red-950/10 text-red-400/80 hover:bg-red-950/20" : "bg-red-50 text-red-600/80 hover:bg-red-100"} transition-all`}
                        >
                          Clear Dates{!isPremium ? <PremiumEmoji name="lock" alt="" className="h-3.5 w-3.5" /> : null}
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          setPendingDelete({
                            type: "topic",
                            id: "__reset_plan__",
                            parentId: undefined,
                            label:
                              "This will reset ALL topics to Not Started. This cannot be undone!",
                          })
                        }
                        className={`w-full mt-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${isDarkMode ? "text-red-900/50 hover:text-red-500" : "text-red-300 hover:text-red-600"}`}
                      >
                        Reset Entire Plan
                      </button>
                    </div>

                    <div className="rounded-3xl p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                      <div className="text-[12px] font-bold tracking-wide text-[#64748b] dark:text-[#9aa2ae] mb-4">
                        Progress Snapshot
                      </div>
                      <div className="grid gap-3 text-[14px] font-bold text-[#475569] dark:text-[#9aa2ae]">
                        <div className="flex justify-between">
                          <span>Not Started</span>
                          <span>{statusCounts.todo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>In Progress</span>
                          <span>{statusCounts.in_progress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Done</span>
                          <span>{statusCounts.done}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Needs Revision</span>
                          <span>{statusCounts.revision_needed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overdue</span>
                          <span>{overdueCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {view === "syllabus" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              {/* ── Free Plan Topic Counter Badge ── */}
              {!isPremium && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-5 py-3 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/20 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <PremiumEmoji name="library" alt="" className="h-5 w-5" />
                    <span className="text-[13px] font-bold text-amber-700 dark:text-amber-300">
                      {totalTopicCount}/{FREE_TOPIC_LIMIT} topics used on Free
                      Plan
                    </span>
                    {remainingFreeTopics <= 5 && remainingFreeTopics > 0 && (
                      <span className="text-[11px] font-black text-red-500 dark:text-red-400 animate-pulse">
                        {remainingFreeTopics} remaining!
                      </span>
                    )}
                    {remainingFreeTopics === 0 && (
                      <span className="text-[11px] font-black text-red-500 dark:text-red-400 animate-pulse">
                        LIMIT REACHED
                      </span>
                    )}
                  </div>
                  {remainingFreeTopics <= 10 && (
                    <button
                      onClick={() => setPremiumModalReason("topic_limit")}
                      className="text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm hover:shadow-md transition-all whitespace-nowrap"
                    >
                      Upgrade for Unlimited
                    </button>
                  )}
                </motion.div>
              )}
              {unplannedTopicsCount > 0 && (
                <div
                  className={`rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-500 animate-pulse-slow ${isDarkMode ? "bg-[#0e0e0e] shadow-[8px_8px_20px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]" : "bg-[#f0f0f5] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)]"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#93c5fd] shadow-[inset_1px_1px_2px_rgba(255,255,255,0.1)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1e293b] dark:text-[#c6c6c6]">
                        Ready to Schedule!
                      </h4>
                      <p className="text-sm font-bold text-[#64748b] dark:text-[#767575] mt-0.5">
                        You have{" "}
                        <span className="text-blue-600 dark:text-[#93c5fd] font-black">
                          {unplannedTopicsCount} unscheduled topics
                        </span>{" "}
                        sitting in your syllabus.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewChange("plan")}
                    className={`${cleanPrimaryPill} shrink-0 px-6`}
                  >
                    Auto-Schedule Now
                  </button>
                </div>
              )}

              <div
                data-tour="planner-syllabus-setup"
                className={`rounded-3xl p-6 transition-colors duration-500 ${isDarkMode ? "bg-[#0e0e0e] shadow-[8px_8px_20px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]" : "bg-[#f0f0f5] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)]"}`}
              >
                <div className={`${cleanHeaderLabelClass} mb-4`}>
                  Syllabus Setup
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                  <input
                    value={syllabusQuery}
                    onChange={(e) => setSyllabusQuery(e.target.value)}
                    placeholder="Search topics, chapters, or subjects"
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5] placeholder-[#767575]" : "bg-[#e6e7ee] text-[#2d333b] placeholder-[#8b919e]"}`}
                  />
                  <select
                    value={syllabusSubject}
                    onChange={(e) => setSyllabusSubject(e.target.value)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e6e7ee] text-[#2d333b]"}`}
                  >
                    <option value="all">All subjects</option>
                    {plan.subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={syllabusStatus}
                    onChange={(e) =>
                      setSyllabusStatus(e.target.value as TopicStatus | "all")
                    }
                    className={`rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e6e7ee] text-[#2d333b]"}`}
                  >
                    <option value="all">All statuses</option>
                    {Object.entries(STATUS_UI).map(([value, ui]) => (
                      <option key={value} value={value}>
                        {ui.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col lg:flex-row items-center gap-4 mt-5">
                  <div className="flex flex-1 gap-2 w-full lg:w-auto">
                    <input
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="Add a subject"
                      data-tour="planner-subject-input"
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5] placeholder-[#767575]" : "bg-[#e6e7ee] text-[#2d333b] placeholder-[#8b919e]"}`}
                    />
                    <button
                      data-tour="planner-add-subject"
                      onClick={addSubject}
                      className={`${cleanSecondaryPill} rounded-xl px-6`}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      data-tour="planner-bulk-add-button"
                      onClick={() => setBulkAddOpen(true)}
                      className={`${cleanPrimaryPill} rounded-xl px-6`}
                    >
                      Bulk Add
                    </button>
                    <button
                      onClick={async () => {
                        setTemplatePickerOpen(true);
                        if (availableTemplates.length === 0) {
                          try {
                            const templates = await plannerRequest<
                              {
                                id: string;
                                name: string;
                                examBody: string;
                                category: string;
                                description: string;
                                estimatedTopics: number;
                                recommendedDailyGoal: number;
                                tags: string[];
                              }[]
                            >(`${BASE}/templates`);
                            setAvailableTemplates(templates);
                          } catch {
                            showToast("Failed to load exam templates.", "error");
                          }
                        }
                      }}
                      className={`${cleanSecondaryPill} rounded-xl px-6 ${isDarkMode ? "bg-[#1a3a52] border-[#0ea5e9] text-[#0ea5e9] hover:bg-[#214864]" : "bg-[#dbeafe] border-[#0ea5e9] text-[#0c4a6e] hover:bg-[#d1e8ff]"}`}
                    >
                      <PremiumEmoji name="bookmarks" alt="" className="h-4 w-4" />
                      Template
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mt-6 mb-2">
                  <div className="text-[13px] font-medium text-[#8b919e] dark:text-[#767575]">
                    Use bulk add for fast entry, or load a full exam template (JEE, NEET, SSC, etc.).
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mr-2">
                      View
                    </span>
                    <button
                      onClick={() => setSyllabusLayoutMode("classic")}
                      className={`text-[12px] font-semibold tracking-[0.02em] whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-[transform,color,background-color,box-shadow] duration-150 ease-out active:scale-[0.98] ${
                        syllabusLayoutMode === "classic"
                          ? "bg-[#0f766e] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
                          : isDarkMode
                            ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_8px_rgba(0,0,0,0.5),-2px_-2px_4px_rgba(255,255,255,0.02)]"
                            : "bg-[#e6e7ee] text-[#4b5563] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)]"
                      }`}
                    >
                      Classic
                    </button>
                    <button
                      onClick={() => setSyllabusLayoutMode("org-chart")}
                      className={`text-[12px] font-semibold tracking-[0.02em] whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-[transform,color,background-color,box-shadow] duration-150 ease-out active:scale-[0.98] ${
                        syllabusLayoutMode === "org-chart"
                          ? "bg-[#9333ea] text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]"
                          : isDarkMode
                            ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_8px_rgba(0,0,0,0.5),-2px_-2px_4px_rgba(255,255,255,0.02)]"
                            : "bg-[#e6e7ee] text-[#4b5563] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)]"
                      }`}
                    >
                      Chart
                    </button>
                  </div>
                </div>
              </div>

              {visibleSubjects.length === 0 ? (
                <div
                  className={`rounded-3xl p-10 text-center transition-colors duration-500 ${isDarkMode ? "bg-[#0e0e0e] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]" : "bg-[#e6e7ee] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]"}`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 ${isDarkMode ? "text-[#e7e5e5]" : "text-[#2d333b]"}`}
                  >
                    {plan.subjects.length === 0
                      ? "Start your syllabus"
                      : "No topics match these filters"}
                  </h3>
                  <p
                    className={`text-sm mb-6 ${isDarkMode ? "text-[#767575]" : "text-[#8b919e]"}`}
                  >
                    {plan.subjects.length === 0
                      ? "Add your first subject and topics to get started."
                      : "Try clearing filters or searching with different keywords."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {plan.subjects.length === 0 ? (
                      <>
                        <button
                          onClick={() => handleViewChange("plan")}
                          className={`text-[13px] font-black uppercase tracking-widest rounded-full px-6 py-3 shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02)] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6]" : "bg-[#e6e7ee] text-[#2d333b]"}`}
                        >
                          Edit Plan
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSyllabusQuery("");
                          setSyllabusStatus("all");
                          setSyllabusSubject("all");
                        }}
                        className="text-[13px] font-black uppercase tracking-widest rounded-full px-6 py-3 bg-[#3b82f6] text-white shadow-[0_4px_10px_rgba(59,130,246,0.35)]"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : syllabusLayoutMode === "hierarchy" ? (
                <div
                  data-tour="planner-subjects-area"
                  className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]"
                >
                  <div
                    className={`rounded-3xl p-6 transition-colors duration-500 ${isDarkMode ? "bg-[#0e0e0e] shadow-[8px_8px_20px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]" : "bg-[#f0f0f5] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)]"}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
                      <div>
                        <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575]">
                          Hierarchy Map
                        </div>
                        <h3
                          className={`text-2xl font-bold mt-2 ${isDarkMode ? "text-zinc-50" : "text-[#2d333b]"}`}
                        >
                          Subject -&gt; Chapter -&gt; Topic
                        </h3>
                      </div>
                      <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                        {hierarchySubjects.length} subjects · {topics.length}{" "}
                        topics
                      </div>
                    </div>

                    <div className="space-y-4">
                      {hierarchySubjects.map((subjectNode) => {
                        const subject = subjectNode.subject;
                        const isSubjectSelected = selectedSubjectId
                          ? selectedSubjectId === subject.id
                          : activeHierarchySubject?.subject.id === subject.id;
                        const subjectOpen =
                          expandedSubjectIds[subject.id] ?? isSubjectSelected;

                        return (
                          <div
                            key={subject.id}
                            className={`rounded-2xl p-4 transition-colors ${
                              isSubjectSelected
                                ? isDarkMode
                                  ? "bg-[#161a22] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]"
                                  : "bg-[#e2e8f0] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]"
                                : isDarkMode
                                  ? "bg-[#131416] shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02)]"
                                  : "bg-[#f8fafc] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleSubjectBranch(subject.id)}
                                className={`w-7 h-7 rounded-full text-[12px] font-black flex items-center justify-center transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[2px_2px_4px_rgba(0,0,0,0.5),-1px_-1px_2px_rgba(255,255,255,0.05)]" : "bg-white text-slate-700 shadow-[2px_2px_4px_rgba(166,171,189,0.3),-2px_-2px_4px_rgba(255,255,255,0.8)]"}`}
                                aria-label={
                                  subjectOpen
                                    ? "Collapse subject"
                                    : "Expand subject"
                                }
                              >
                                {subjectOpen ? "▾" : "▸"}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSubjectId(subject.id);
                                  setSelectedChapterId(null);
                                  setSelectedTopicId(null);
                                  setExpandedSubjectIds((prev) => ({
                                    ...prev,
                                    [subject.id]: true,
                                  }));
                                }}
                                className="flex-1 min-w-0 text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: subject.color }}
                                  />
                                  <span
                                    className={`text-[18px] font-bold truncate ${isDarkMode ? "text-zinc-50" : "text-[#1f2937]"}`}
                                  >
                                    {subject.name}
                                  </span>
                                  <span
                                    className={`ml-auto text-[12px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isDarkMode ? "bg-zinc-800 text-zinc-200" : "bg-white text-slate-700"}`}
                                  >
                                    {subjectNode.doneTopics}/
                                    {subjectNode.totalTopics} done
                                  </span>
                                </div>
                                <div className="mt-1 text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                  {subjectNode.chapters.length} chapters ·{" "}
                                  {subjectNode.scheduledTopics} scheduled ·{" "}
                                  {subjectNode.overdueTopics} overdue
                                </div>
                              </button>
                            </div>

                            {subjectOpen && (
                              <div
                                className={`ml-8 mt-4 border-l pl-4 space-y-3 ${isDarkMode ? "border-zinc-700" : "border-slate-300"}`}
                              >
                                {subjectNode.chapters.length === 0 ? (
                                  <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                    Add a chapter to begin this subject.
                                  </div>
                                ) : (
                                  subjectNode.chapters.map((chapterNode) => {
                                    const chapter = chapterNode.chapter;
                                    const isChapterSelected = selectedChapterId
                                      ? selectedChapterId === chapter.id
                                      : activeHierarchyChapter?.chapter.id ===
                                        chapter.id;
                                    const chapterOpen =
                                      expandedChapterIds[chapter.id] ??
                                      Boolean(
                                        isChapterSelected ||
                                        selectedTopicContext?.chapterNode
                                          .chapter.id === chapter.id,
                                      );

                                    return (
                                      <div
                                        key={chapter.id}
                                        className={`rounded-xl p-3 transition-colors ${
                                          isChapterSelected
                                            ? isDarkMode
                                              ? "bg-[#161a22] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]"
                                              : "bg-[#e2e8f0] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]"
                                            : isDarkMode
                                              ? "bg-[#131416] shadow-[2px_2px_6px_rgba(0,0,0,0.4),-1px_-1px_3px_rgba(255,255,255,0.02)]"
                                              : "bg-[#f8fafc] shadow-[2px_2px_6px_rgba(166,171,189,0.2),-2px_-2px_6px_rgba(255,255,255,0.8)]"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() =>
                                              toggleChapterBranch(chapter.id)
                                            }
                                            className={`w-6 h-6 rounded-full text-[12px] font-black flex items-center justify-center transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[2px_2px_4px_rgba(0,0,0,0.5),-1px_-1px_2px_rgba(255,255,255,0.05)]" : "bg-white text-slate-700 shadow-[2px_2px_4px_rgba(166,171,189,0.3),-2px_-2px_4px_rgba(255,255,255,0.8)]"}`}
                                            aria-label={
                                              chapterOpen
                                                ? "Collapse chapter"
                                                : "Expand chapter"
                                            }
                                          >
                                            {chapterOpen ? "▾" : "▸"}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setSelectedSubjectId(subject.id);
                                              setSelectedChapterId(chapter.id);
                                              setSelectedTopicId(null);
                                              setExpandedSubjectIds((prev) => ({
                                                ...prev,
                                                [subject.id]: true,
                                              }));
                                              setExpandedChapterIds((prev) => ({
                                                ...prev,
                                                [chapter.id]: true,
                                              }));
                                            }}
                                            className="flex-1 text-left"
                                          >
                                            <div
                                              className={`text-sm font-bold ${isDarkMode ? "text-zinc-100" : "text-slate-800"}`}
                                            >
                                              {chapter.name}
                                            </div>
                                            <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                              {chapterNode.doneTopics}/
                                              {chapterNode.totalTopics} done ·{" "}
                                              {chapterNode.overdueTopics}{" "}
                                              overdue
                                            </div>
                                          </button>
                                        </div>

                                        {chapterOpen && (
                                          <div
                                            className={`mt-3 ml-7 border-l pl-3 space-y-2 ${isDarkMode ? "border-zinc-800" : "border-slate-200"}`}
                                          >
                                            {chapterNode.visibleTopics
                                              .length === 0 ? (
                                              <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                                No topics in this chapter.
                                              </div>
                                            ) : (
                                              chapterNode.visibleTopics.map(
                                                (topic) => {
                                                  const isTopicSelected =
                                                    selectedTopicContext?.topic
                                                      .id === topic.id;
                                                  return (
                                                    <button
                                                      key={topic.id}
                                                      onClick={() => {
                                                        setSelectedSubjectId(
                                                          subject.id,
                                                        );
                                                        setSelectedChapterId(
                                                          chapter.id,
                                                        );
                                                        setSelectedTopicId(
                                                          topic.id,
                                                        );
                                                        setExpandedSubjectIds(
                                                          (prev) => ({
                                                            ...prev,
                                                            [subject.id]: true,
                                                          }),
                                                        );
                                                        setExpandedChapterIds(
                                                          (prev) => ({
                                                            ...prev,
                                                            [chapter.id]: true,
                                                          }),
                                                        );
                                                      }}
                                                      className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${
                                                        isTopicSelected
                                                          ? isDarkMode
                                                            ? "bg-[#161a22] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]"
                                                            : "bg-[#e2e8f0] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]"
                                                          : isDarkMode
                                                            ? "bg-[#131416] shadow-[2px_2px_6px_rgba(0,0,0,0.4),-1px_-1px_3px_rgba(255,255,255,0.02)] hover:bg-[#1a1c1e]"
                                                            : "bg-[#f8fafc] shadow-[2px_2px_6px_rgba(166,171,189,0.2),-2px_-2px_6px_rgba(255,255,255,0.8)] hover:bg-slate-50"
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <span
                                                          className={`text-[13px] font-bold truncate ${isDarkMode ? "text-zinc-100" : "text-slate-800"}`}
                                                        >
                                                          {topic.name}
                                                        </span>
                                                        <span
                                                          className="ml-auto text-[11px] whitespace-nowrap px-2 py-1 rounded-full font-black tracking-widest"
                                                          style={{
                                                            color:
                                                              STATUS_UI[
                                                                topic.status
                                                              ].color,
                                                            background:
                                                              isDarkMode
                                                                ? STATUS_UI[
                                                                    topic.status
                                                                  ].darkBg ||
                                                                  STATUS_UI[
                                                                    topic.status
                                                                  ].bg
                                                                : STATUS_UI[
                                                                    topic.status
                                                                  ].bg,
                                                            border: `1px solid ${STATUS_UI[topic.status].color}30`,
                                                          }}
                                                        >
                                                          {
                                                            STATUS_UI[
                                                              topic.status
                                                            ].label
                                                          }
                                                        </span>
                                                      </div>
                                                      <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mt-1">
                                                        {topic.plannedDate
                                                          ? formatDate(
                                                              topic.plannedDate,
                                                            )
                                                          : "Unplanned"}
                                                      </div>
                                                    </button>
                                                  );
                                                },
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className={`rounded-3xl p-6 transition-colors duration-500 ${isDarkMode ? "bg-[#0b0c0e] shadow-[inset_2px_2px_10px_rgba(0,0,0,0.8),inset_-1px_-1px_4px_rgba(255,255,255,0.03)]" : "bg-[#e8ebf3] shadow-[inset_4px_4px_8px_rgba(166,171,189,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]"}`}
                  >
                    <div className="text-[12px] font-black uppercase tracking-[0.2em] mb-4 text-[#8b919e] dark:text-[#767575]">
                      Focused Editor
                    </div>

                    {selectedTopicContext ? (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                            {selectedTopicContext.subjectNode.subject.name} ·{" "}
                            {selectedTopicContext.chapterNode.chapter.name}
                          </div>
                          {editingTopicId === selectedTopicContext.topic.id ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <input
                                value={
                                  topicRenameDraft[
                                    selectedTopicContext.topic.id
                                  ] || ""
                                }
                                onChange={(e) =>
                                  setTopicRenameDraft((prev) => ({
                                    ...prev,
                                    [selectedTopicContext.topic.id]:
                                      e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void submitTopicRename(
                                      selectedTopicContext.topic,
                                    );
                                  }
                                  if (e.key === "Escape")
                                    setEditingTopicId(null);
                                }}
                                autoFocus
                                className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                              />
                              <button
                                onClick={() => {
                                  void submitTopicRename(
                                    selectedTopicContext.topic,
                                  );
                                }}
                                className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white shadow-[0_4px_10px_rgba(37,99,235,0.35)] transition-transform hover:scale-[1.05]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingTopicId(null)}
                                className={`text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <h4
                                className={`text-xl font-bold ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                              >
                                {selectedTopicContext.topic.name}
                              </h4>
                              <button
                                onClick={() =>
                                  startTopicRename(selectedTopicContext.topic)
                                }
                                className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                              >
                                Edit Tag
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "todo",
                              })
                            }
                            className={`text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full transition-transform hover:scale-[1.05] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#64748b] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                          >
                            Not Started
                          </button>
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "in_progress",
                              })
                            }
                            className="text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full bg-[#0284c7] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(2,132,199,0.4)] transition-transform hover:scale-[1.05]"
                          >
                            Start
                          </button>
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "done",
                              })
                            }
                            className="text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full bg-[#16a34a] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(22,163,74,0.4)] transition-transform hover:scale-[1.05]"
                          >
                            Mark Done
                          </button>
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "revision_needed",
                              })
                            }
                            className="text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full bg-[#9333ea] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(147,51,234,0.4)] transition-transform hover:scale-[1.05]"
                          >
                            Needs Revision
                          </button>
                        </div>

                        <div className="flex flex-col gap-3">
                          <CustomDatePicker
                            value={
                              selectedTopicContext.topic.plannedDate
                                ? toIsoDateOnly(
                                    selectedTopicContext.topic.plannedDate,
                                  )
                                : ""
                            }
                            onChange={(val) =>
                              patchTopic(selectedTopicContext.topic.id, {
                                plannedDate: val || "",
                              })
                            }
                            isDarkMode={isDarkMode}
                            align="bottom"
                            offDays={plan?.offDays || []}
                            minDate={toIsoDateOnly(new Date())}
                          />
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                void editTopicNotes(selectedTopicContext.topic);
                              }}
                              className={`text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                            >
                              Edit Notes
                            </button>
                            <button
                              onClick={() =>
                                patchTopic(selectedTopicContext.topic.id, {
                                  plannedDate: "",
                                })
                              }
                              className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#ef4444] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(239,68,68,0.4)] transition-transform hover:scale-[1.05]"
                            >
                              Un-Schedule
                            </button>
                            <button
                              onClick={() => {
                                void deleteTopic(selectedTopicContext.topic.id);
                              }}
                              className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#dc2626] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(220,38,38,0.4)] transition-transform hover:scale-[1.05]"
                            >
                              Delete Topic
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : selectedChapterContext ? (
                      <div className="space-y-4">
                        <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          {selectedChapterContext.subjectNode.subject.name}
                        </div>

                        {editingChapterId ===
                        selectedChapterContext.chapterNode.chapter.id ? (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <input
                              value={
                                chapterRenameDraft[
                                  selectedChapterContext.chapterNode.chapter.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setChapterRenameDraft((prev) => ({
                                  ...prev,
                                  [selectedChapterContext.chapterNode.chapter
                                    .id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void submitChapterRename(
                                    selectedChapterContext.subjectNode.subject
                                      .id,
                                    selectedChapterContext.chapterNode.chapter,
                                  );
                                }
                                if (e.key === "Escape")
                                  setEditingChapterId(null);
                              }}
                              autoFocus
                              className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                            />
                            <button
                              onClick={() => {
                                void submitChapterRename(
                                  selectedChapterContext.subjectNode.subject.id,
                                  selectedChapterContext.chapterNode.chapter,
                                );
                              }}
                              className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white shadow-[0_4px_10px_rgba(37,99,235,0.35)] transition-transform hover:scale-[1.05]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingChapterId(null)}
                              className={`text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <h4
                              className={`text-xl font-bold ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                            >
                              {selectedChapterContext.chapterNode.chapter.name}
                            </h4>
                            <button
                              onClick={() =>
                                startChapterRename(
                                  selectedChapterContext.chapterNode.chapter,
                                )
                              }
                              className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                            >
                              Edit Name
                            </button>
                          </div>
                        )}

                        <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          {selectedChapterContext.chapterNode.totalTopics}{" "}
                          topics ·{" "}
                          {selectedChapterContext.chapterNode.doneTopics} done ·{" "}
                          {selectedChapterContext.chapterNode.overdueTopics}{" "}
                          overdue
                        </div>

                        <div className="flex flex-col gap-3">
                          <textarea
                            value={
                              topicName[
                                selectedChapterContext.chapterNode.key
                              ] || ""
                            }
                            onChange={(e) =>
                              setTopicName((prev) => ({
                                ...prev,
                                [selectedChapterContext.chapterNode.key]:
                                  e.target.value,
                              }))
                            }
                            placeholder="Add topics (one per line)"
                            rows={3}
                            className={`w-full text-sm font-bold rounded-xl px-4 py-3 shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors resize-y min-h-[96px] ${isDarkMode ? "bg-[#131416] text-[#e7e5e5] placeholder-[#767575]" : "bg-[#e8ebf3] text-[#2d333b] placeholder-[#8b919e]"}`}
                          />
                          <div className="flex flex-col sm:flex-row gap-3">
                            <CustomDatePicker
                              value={
                                topicDate[
                                  selectedChapterContext.chapterNode.key
                                ] || ""
                              }
                              onChange={(val) =>
                                setTopicDate((prev) => ({
                                  ...prev,
                                  [selectedChapterContext.chapterNode.key]: val,
                                }))
                              }
                              isDarkMode={isDarkMode}
                              align="bottom"
                              offDays={plan?.offDays || []}
                              minDate={toIsoDateOnly(new Date())}
                            />
                            <button
                              onClick={() =>
                                addTopic(
                                  selectedChapterContext.subjectNode.subject.id,
                                  selectedChapterContext.chapterNode.chapter.id,
                                )
                              }
                              className="text-[12px] font-black uppercase tracking-widest rounded-xl px-5 py-3 bg-[#0ea5e9] text-white shadow-[0_4px_10px_rgba(14,165,233,0.35)] transition-transform hover:scale-[1.05]"
                            >
                              Add Topics
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            void deleteChapter(
                              selectedChapterContext.subjectNode.subject.id,
                              selectedChapterContext.chapterNode.chapter.id,
                            );
                          }}
                          className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#dc2626] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(220,38,38,0.4)] transition-transform hover:scale-[1.05]"
                        >
                          Delete Chapter
                        </button>
                      </div>
                    ) : activeHierarchySubject ? (
                      <div className="space-y-4">
                        {editingSubjectId ===
                        activeHierarchySubject.subject.id ? (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <input
                              value={
                                subjectRenameDraft[
                                  activeHierarchySubject.subject.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setSubjectRenameDraft((prev) => ({
                                  ...prev,
                                  [activeHierarchySubject.subject.id]:
                                    e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void submitSubjectRename(
                                    activeHierarchySubject.subject,
                                  );
                                }
                                if (e.key === "Escape")
                                  setEditingSubjectId(null);
                              }}
                              autoFocus
                              className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                            />
                            <button
                              onClick={() => {
                                void submitSubjectRename(
                                  activeHierarchySubject.subject,
                                );
                              }}
                              className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white shadow-[0_4px_10px_rgba(37,99,235,0.35)] transition-transform hover:scale-[1.05]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSubjectId(null)}
                              className={`text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <h4
                              className={`text-2xl font-bold ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                            >
                              {activeHierarchySubject.subject.name}
                            </h4>
                            <button
                              onClick={() =>
                                startSubjectRename(
                                  activeHierarchySubject.subject,
                                )
                              }
                              className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                            >
                              Edit Name
                            </button>
                          </div>
                        )}

                        <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          {activeHierarchySubject.totalTopics} topics ·{" "}
                          {activeHierarchySubject.doneTopics} done ·{" "}
                          {activeHierarchySubject.chapters.length} chapters
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            value={
                              chapterName[activeHierarchySubject.subject.id] ||
                              ""
                            }
                            onChange={(e) =>
                              setChapterName((prev) => ({
                                ...prev,
                                [activeHierarchySubject.subject.id]:
                                  e.target.value,
                              }))
                            }
                            placeholder="Add a chapter (optional)"
                            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5] placeholder-[#767575]" : "bg-[#e8ebf3] text-[#2d333b] placeholder-[#8b919e]"}`}
                          />
                          <button
                            onClick={() =>
                              addChapter(activeHierarchySubject.subject.id)
                            }
                            className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#0ea5e9] text-white shadow-[0_4px_10px_rgba(14,165,233,0.35)] transition-transform hover:scale-[1.05]"
                          >
                            Add Chapter
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => {
                              setBulkSubjectId(
                                activeHierarchySubject.subject.id,
                              );
                              setBulkSubjectName("");
                              setBulkAddOpen(true);
                            }}
                            className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#3b82f6] text-white shadow-[0_4px_10px_rgba(59,130,246,0.35)] transition-transform hover:scale-[1.05]"
                          >
                            Bulk Add
                          </button>
                          <button
                            onClick={() => {
                              void deleteSubject(
                                activeHierarchySubject.subject.id,
                              );
                            }}
                            className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#dc2626] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(220,38,38,0.4)] transition-transform hover:scale-[1.05]"
                          >
                            Delete Subject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[14px] font-bold text-[#8b919e] dark:text-[#767575]">
                        Select a subject, chapter, or topic to edit.
                      </div>
                    )}
                  </div>
                </div>
              ) : syllabusLayoutMode === "org-chart" ? (
                <div
                  data-tour="planner-subjects-area"
                  className="relative flex flex-col gap-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                    <div
                      className={`flex items-center gap-2 rounded-full px-3 py-2 border ${isDarkMode ? "bg-[#15171a] border-[#2f3440] text-[#c6c6c6]" : "bg-white border-[#c0c4d1] text-[#334155]"}`}
                    >
                      <button
                        onClick={() =>
                          setOrgChartZoom((prevZoom) =>
                            Math.max(0.55, Number((prevZoom - 0.1).toFixed(2))),
                          )
                        }
                        className={`w-8 h-8 rounded-full text-lg font-black ${isDarkMode ? "bg-[#202225]" : "bg-[#f0f0f5]"}`}
                        aria-label="Zoom out chart"
                        title="Zoom Out"
                      >
                        -
                      </button>
                      <div className="text-[11px] font-black uppercase tracking-widest min-w-[56px] text-center">
                        {Math.round(orgChartZoom * 100)}%
                      </div>
                      <button
                        onClick={() => setOrgChartZoom(1)}
                        className={`px-3 h-8 rounded-full text-[10px] font-black uppercase tracking-[0.14em] ${isDarkMode ? "bg-[#202225]" : "bg-[#f0f0f5]"}`}
                        aria-label="Reset chart zoom"
                        title="Reset Zoom"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() =>
                          setOrgChartZoom((prevZoom) =>
                            Math.min(1.7, Number((prevZoom + 0.1).toFixed(2))),
                          )
                        }
                        className={`w-8 h-8 rounded-full text-lg font-black ${isDarkMode ? "bg-[#202225]" : "bg-[#f0f0f5]"}`}
                        aria-label="Zoom in chart"
                        title="Zoom In"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setIsOrgChartEditorOpen((prevOpen) => !prevOpen)
                      }
                      className={`text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full border ${isDarkMode ? "bg-[#202225] border-[#2f3440] text-[#c6c6c6]" : "bg-white border-[#c0c4d1] text-[#334155]"}`}
                    >
                      {isOrgChartEditorOpen
                        ? "Hide Details Panel"
                        : "Show Details Panel"}
                    </button>
                  </div>

                  <div
                    className={`grid gap-4 ${isOrgChartEditorOpen ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "xl:grid-cols-1"}`}
                  >
                  <div
                    className={`rounded-[2rem] p-8 sm:p-10 overflow-auto min-h-[800px] transition-colors duration-500 ${isDarkMode ? "bg-[#0b0c0e] shadow-[inset_2px_2px_15px_rgba(0,0,0,0.9)]" : "bg-[#f4f7fa] shadow-[inset_4px_4px_12px_rgba(166,171,189,0.4)]"}`}
                  >
                    <div
                      className="flex flex-col items-center min-w-[max-content] pb-32 transition-transform duration-200"
                      style={{
                        transform: `scale(${orgChartZoom})`,
                        transformOrigin: "top center",
                      }}
                    >
                      {hierarchySubjects.map((subjectNode) => {
                        const subject = subjectNode.subject;
                        return (
                          <div
                            key={subject.id}
                            className="flex flex-col items-center mb-24 last:mb-0 w-full"
                          >
                            {/* Level 1: Subject Node (Centered Header) */}
                            <div className="flex flex-col items-center relative gap-6">
                              <button
                                onClick={() => {
                                  setSelectedSubjectId(subject.id);
                                  setSelectedChapterId(null);
                                  setSelectedTopicId(null);
                                }}
                                className={`relative group z-30 px-12 py-6 rounded-xl min-w-[320px] border-2 transition-all duration-300 ${
                                  selectedSubjectId === subject.id ||
                                  activeHierarchySubject?.subject.id ===
                                    subject.id
                                    ? "bg-slate-800 dark:bg-zinc-100 text-white dark:text-zinc-900 border-blue-500 shadow-2xl scale-[1.02]"
                                    : isDarkMode
                                      ? "bg-[#181a1d] text-zinc-300 border-zinc-800 hover:border-zinc-700 shadow-xl"
                                      : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-xl"
                                }`}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <div className="text-[12px] font-black uppercase tracking-[0.3em] opacity-50 mb-1">
                                    Subject
                                  </div>
                                  <div className="text-xl font-black tracking-tight uppercase">
                                    {subject.name}
                                  </div>
                                  <div
                                    className="mt-2 h-1 w-12 rounded-full"
                                    style={{ backgroundColor: subject.color }}
                                  />
                                </div>
                              </button>

                              {/* Vertical connector down to branches */}
                              {(subjectNode.chapters.length > 0 ||
                                subject.id === bulkSubjectId) && (
                                <div className="w-[2px] h-12 bg-slate-300 dark:bg-zinc-800" />
                              )}
                            </div>

                            {/* Level 2: Chapters (Horizontal Branches) */}
                            <div className="relative pt-0">
                              {/* Horizontal Crossbar (Spine) */}
                              {subjectNode.chapters.length > 1 && (
                                <div className="absolute top-0 left-0 right-0 flex justify-center h-[2px]">
                                  <div
                                    className="h-full bg-slate-300 dark:bg-zinc-800"
                                    style={{
                                      width: `calc(100% - ${100 / subjectNode.chapters.length}%)`,
                                      transition: "width 0.3s ease",
                                    }}
                                  />
                                </div>
                              )}

                              <div className="flex gap-x-16 items-start justify-center">
                                {subjectNode.chapters.map(
                                  (chapterNode, idx) => {
                                    const chapter = chapterNode.chapter;
                                    const isChapterSelected =
                                      selectedChapterId === chapter.id ||
                                      activeHierarchyChapter?.chapter.id ===
                                        chapter.id;

                                    return (
                                      <div
                                        key={chapter.id}
                                        className="flex flex-col items-center relative group/node"
                                      >
                                        {/* Vertical drop line from crossbar */}
                                        <div className="w-[2px] h-10 bg-slate-300 dark:bg-zinc-800" />

                                        <button
                                          onClick={() => {
                                            setSelectedSubjectId(subject.id);
                                            setSelectedChapterId(chapter.id);
                                            setSelectedTopicId(null);
                                          }}
                                          className={`z-10 px-8 py-5 rounded-lg min-w-[240px] border transition-all duration-300 hover:shadow-lg ${
                                            isChapterSelected
                                              ? "bg-slate-700 dark:bg-zinc-800 text-white border-blue-400 shadow-lg scale-[1.05]"
                                              : isDarkMode
                                                ? "bg-[#131416] text-zinc-400 border-zinc-800"
                                                : "bg-[#f8fafc] text-slate-700 border-slate-200"
                                          }`}
                                        >
                                          <div className="text-[11px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                                            Chapter
                                          </div>
                                          <div className="text-sm font-bold uppercase truncate">
                                            {chapter.name}
                                          </div>
                                        </button>

                                        {/* Vertical line to topics */}
                                        <div className="w-[2px] h-8 bg-slate-200/50 dark:bg-zinc-800/50" />

                                        {/* Level 3: Topics (Vertical List) */}
                                        <div className="flex flex-col gap-3">
                                          {chapterNode.visibleTopics.map(
                                            (topic) => {
                                              const isTopicSelected =
                                                selectedTopicId === topic.id;
                                              return (
                                                <div
                                                  key={topic.id}
                                                  className="flex flex-col items-center"
                                                >
                                                  <button
                                                    onClick={() => {
                                                      setSelectedSubjectId(
                                                        subject.id,
                                                      );
                                                      setSelectedChapterId(
                                                        chapter.id,
                                                      );
                                                      setSelectedTopicId(
                                                        topic.id,
                                                      );
                                                    }}
                                                    className={`group flex items-center justify-between gap-4 px-6 py-4 rounded-xl min-w-[220px] border transition-all duration-300 ${
                                                      isTopicSelected
                                                        ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-xl -translate-y-1"
                                                        : isDarkMode
                                                          ? "bg-[#0b0c0e] hover:bg-[#111214] text-zinc-500 border-zinc-800"
                                                          : "bg-white hover:bg-slate-50 text-slate-500 border-slate-100"
                                                    }`}
                                                  >
                                                    <div className="text-[13px] font-black uppercase tracking-tight truncate text-left flex-1">
                                                      {topic.name}
                                                    </div>
                                                    <div
                                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                      style={{
                                                        backgroundColor:
                                                          STATUS_UI[
                                                            topic.status
                                                          ].color,
                                                      }}
                                                    />
                                                  </button>
                                                </div>
                                              );
                                            },
                                          )}

                                          {/* Inline Add Topic Button */}
                                          {isAddingTopicForChapter ===
                                          chapter.id ? (
                                            <div className="mt-2 flex flex-col items-center gap-2">
                                              <input
                                                autoFocus
                                                value={visualAddDraft}
                                                onChange={(e) =>
                                                  setVisualAddDraft(
                                                    e.target.value,
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter")
                                                    void submitVisualTopic(
                                                      subject.id,
                                                      chapter.id,
                                                    );
                                                  if (e.key === "Escape") {
                                                    setIsAddingTopicForChapter(
                                                      null,
                                                    );
                                                    setVisualAddDraft("");
                                                  }
                                                }}
                                                onBlur={() => {
                                                  if (!visualAddDraft.trim())
                                                    setIsAddingTopicForChapter(
                                                      null,
                                                    );
                                                }}
                                                placeholder="Topic name..."
                                                className={`w-full px-4 py-3 rounded-xl text-[13px] font-bold border focus:outline-none focus:border-blue-500 ${isDarkMode ? "bg-[#111214] border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}
                                              />
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setIsAddingTopicForChapter(
                                                  chapter.id,
                                                );
                                                setIsAddingChapterForSubject(
                                                  null,
                                                );
                                                setVisualAddDraft("");
                                              }}
                                              className={`mt-2 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed transition-all active:scale-95 group/add ${
                                                isDarkMode
                                                  ? "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                                                  : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                              }`}
                                            >
                                              <svg
                                                className="transition-transform group-hover/add:scale-110"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <path d="M5 12h14m-7-7v14" />
                                              </svg>
                                              <span className="text-[11px] font-black uppercase tracking-widest">
                                                Add Topic
                                              </span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  },
                                )}

                                {/* Inline Add Chapter Button */}
                                <div className="flex flex-col items-center relative pt-10">
                                  {isAddingChapterForSubject === subject.id ? (
                                    <div className="flex flex-col items-center gap-2">
                                      <input
                                        autoFocus
                                        value={visualAddDraft}
                                        onChange={(e) =>
                                          setVisualAddDraft(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            void submitVisualChapter(
                                              subject.id,
                                            );
                                          if (e.key === "Escape") {
                                            setIsAddingChapterForSubject(null);
                                            setVisualAddDraft("");
                                          }
                                        }}
                                        onBlur={() => {
                                          if (!visualAddDraft.trim())
                                            setIsAddingChapterForSubject(null);
                                        }}
                                        placeholder="Chapter name..."
                                        className={`px-8 py-5 rounded-lg min-w-[240px] border-2 focus:outline-none focus:border-blue-500 text-sm font-bold ${isDarkMode ? "bg-[#111214] border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setIsAddingChapterForSubject(
                                          subject.id,
                                        );
                                        setIsAddingTopicForChapter(null);
                                        setVisualAddDraft("");
                                      }}
                                      className={`px-8 py-5 rounded-lg min-w-[240px] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 group/add ${
                                        isDarkMode
                                          ? "bg-[#0e0e0e]/50 border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                                          : "bg-slate-100/30 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                      }`}
                                    >
                                      <svg
                                        className="transition-transform group-hover/add:scale-110"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M5 12h14m-7-7v14" />
                                      </svg>
                                      <span className="text-[12px] font-black uppercase tracking-widest">
                                        New Chapter
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Subject Placeholder at bottom */}
                      {isAddingChapterForSubject === "NEW_SUBJECT" ? (
                        <div className="mt-12 flex flex-col items-center gap-4">
                          <input
                            autoFocus
                            value={visualAddDraft}
                            onChange={(e) => setVisualAddDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void submitVisualSubject();
                              if (e.key === "Escape") {
                                setIsAddingChapterForSubject(null);
                                setVisualAddDraft("");
                              }
                            }}
                            placeholder="New Subject name..."
                            className={`px-12 py-8 rounded-2xl border-4 text-center focus:outline-none focus:border-blue-500 text-xl font-black uppercase tracking-tight ${isDarkMode ? "bg-[#0b0c0e] border-zinc-800 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}
                          />
                          <div className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                            Press Enter to Create
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setIsAddingChapterForSubject("NEW_SUBJECT");
                            setIsAddingTopicForChapter(null);
                            setVisualAddDraft("");
                          }}
                          className={`mt-12 px-12 py-8 rounded-2xl border-4 border-dashed flex flex-col items-center justify-center gap-4 transition-all hover:scale-[1.05] active:scale-95 group/add ${
                            isDarkMode
                              ? "bg-[#181a1d]/30 border-zinc-900 text-zinc-700 hover:border-zinc-800 hover:text-zinc-500"
                              : "bg-slate-100/50 border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                          }`}
                        >
                          <svg
                            className="transition-transform group-hover/add:scale-110"
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14m-7-7v14" />
                          </svg>
                          <div className="text-sm font-black uppercase tracking-[0.4em]">
                            Initialize Project
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Shared Focused Editor for Org Chart View */}
                  {isOrgChartEditorOpen && (
                    <div
                      className={`rounded-3xl p-5 sm:p-6 transition-colors duration-500 h-fit self-start xl:sticky xl:top-24 xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto ${isDarkMode ? "bg-[#0b0c0e] shadow-[inset_2px_2px_10px_rgba(0,0,0,0.8),inset_-1px_-1px_4px_rgba(255,255,255,0.03)] border border-[#1f232b]" : "bg-[#e8ebf3] shadow-[inset_4px_4px_8px_rgba(166,171,189,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] border border-[#d0d6e3]"}`}
                    >
                    <div className="text-[12px] font-black uppercase tracking-[0.2em] mb-4 text-[#8b919e] dark:text-[#767575]">
                      Selection Details
                    </div>
                    <div
                      className={`mb-5 rounded-2xl border px-4 py-3 ${isDarkMode ? "bg-[#121418] border-[#262b34]" : "bg-[#f6f8fc] border-[#d6dce8]"}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575]">
                        Currently Selected
                      </div>
                      <div
                        className={`mt-1 text-[11px] font-black uppercase tracking-[0.18em] ${isDarkMode ? "text-[#94a3b8]" : "text-[#475569]"}`}
                      >
                        {selectedTopicContext
                          ? "Topic"
                          : selectedChapterContext
                            ? "Chapter"
                            : activeHierarchySubject
                              ? "Subject"
                              : "No Node"}
                      </div>
                      <div
                        className={`mt-1 text-[15px] font-bold leading-snug ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                      >
                        {selectedTopicContext
                          ? selectedTopicContext.topic.name
                          : selectedChapterContext
                            ? selectedChapterContext.chapterNode.chapter.name
                            : activeHierarchySubject
                              ? activeHierarchySubject.subject.name
                              : "Pick a node from the chart"}
                      </div>
                      {(selectedTopicContext || selectedChapterContext) && (
                        <div className="mt-1 text-[11px] font-bold text-[#8b919e] dark:text-[#767575]">
                          {selectedTopicContext
                            ? `${selectedTopicContext.subjectNode.subject.name} / ${selectedTopicContext.chapterNode.chapter.name}`
                            : selectedChapterContext
                              ? selectedChapterContext.subjectNode.subject.name
                              : ""}
                        </div>
                      )}
                    </div>
                    {selectedTopicContext ? (
                      <div className="space-y-4">
                        <div>
                          <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                            {selectedTopicContext.subjectNode.subject.name} ·{" "}
                            {selectedTopicContext.chapterNode.chapter.name}
                          </div>
                          {editingTopicId === selectedTopicContext.topic.id ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <input
                                value={
                                  topicRenameDraft[
                                    selectedTopicContext.topic.id
                                  ] || ""
                                }
                                onChange={(e) =>
                                  setTopicRenameDraft((prev) => ({
                                    ...prev,
                                    [selectedTopicContext.topic.id]:
                                      e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void submitTopicRename(
                                      selectedTopicContext.topic,
                                    );
                                  }
                                  if (e.key === "Escape")
                                    setEditingTopicId(null);
                                }}
                                autoFocus
                                className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                              />
                              <button
                                onClick={() => {
                                  void submitTopicRename(
                                    selectedTopicContext.topic,
                                  );
                                }}
                                className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <h4
                                className={`text-xl font-bold ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                              >
                                {selectedTopicContext.topic.name}
                              </h4>
                              <button
                                onClick={() =>
                                  startTopicRename(selectedTopicContext.topic)
                                }
                                className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full ${isDarkMode ? "bg-[#202225] text-[#c6c6c6]" : "bg-[#f0f0f5] text-[#4b5563]"}`}
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "todo",
                              })
                            }
                            className={`text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full ${isDarkMode ? "bg-[#202225]" : "bg-[#f0f0f5]"}`}
                          >
                            Todo
                          </button>
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "in_progress",
                              })
                            }
                            className="text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full bg-[#0284c7] text-white"
                          >
                            Start
                          </button>
                          <button
                            onClick={() =>
                              patchTopic(selectedTopicContext.topic.id, {
                                status: "done",
                              })
                            }
                            className="text-[11px] font-black uppercase tracking-widest px-4 py-2.5 rounded-full bg-[#16a34a] text-white"
                          >
                            Done
                          </button>
                        </div>
                        <CustomDatePicker
                          value={
                            selectedTopicContext.topic.plannedDate
                              ? toIsoDateOnly(
                                  selectedTopicContext.topic.plannedDate,
                                )
                              : ""
                          }
                          onChange={(val) =>
                            patchTopic(selectedTopicContext.topic.id, {
                              plannedDate: val || "",
                            })
                          }
                          isDarkMode={isDarkMode}
                          align="bottom"
                          offDays={plan?.offDays || []}
                        />
                      </div>
                    ) : selectedChapterContext ? (
                      <div className="space-y-4">
                        <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          {selectedChapterContext.subjectNode.subject.name}
                        </div>

                        {editingChapterId ===
                        selectedChapterContext.chapterNode.chapter.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={
                                chapterRenameDraft[
                                  selectedChapterContext.chapterNode.chapter.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setChapterRenameDraft((prev) => ({
                                  ...prev,
                                  [selectedChapterContext.chapterNode.chapter
                                    .id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void submitChapterRename(
                                    selectedChapterContext.subjectNode.subject
                                      .id,
                                    selectedChapterContext.chapterNode.chapter,
                                  );
                                }
                                if (e.key === "Escape")
                                  setEditingChapterId(null);
                              }}
                              autoFocus
                              className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                            />
                            <button
                              onClick={() => {
                                void submitChapterRename(
                                  selectedChapterContext.subjectNode.subject.id,
                                  selectedChapterContext.chapterNode.chapter,
                                );
                              }}
                              className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingChapterId(null)}
                              className={`text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl ${isDarkMode ? "bg-[#202225] text-[#c6c6c6]" : "bg-[#f0f0f5] text-[#4b5563]"}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className={`text-xl font-bold ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                            >
                              {selectedChapterContext.chapterNode.chapter.name}
                            </h4>
                            <button
                              onClick={() =>
                                startChapterRename(
                                  selectedChapterContext.chapterNode.chapter,
                                )
                              }
                              className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full ${isDarkMode ? "bg-[#202225] text-[#c6c6c6]" : "bg-[#f0f0f5] text-[#4b5563]"}`}
                            >
                              Edit Name
                            </button>
                          </div>
                        )}

                        <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          {selectedChapterContext.chapterNode.doneTopics}/
                          {selectedChapterContext.chapterNode.totalTopics} Done
                        </div>
                      </div>
                    ) : activeHierarchySubject ? (
                      <div className="space-y-4">
                        <div className="text-[12px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          Subject
                        </div>

                        {editingSubjectId === activeHierarchySubject.subject.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={
                                subjectRenameDraft[
                                  activeHierarchySubject.subject.id
                                ] || ""
                              }
                              onChange={(e) =>
                                setSubjectRenameDraft((prev) => ({
                                  ...prev,
                                  [activeHierarchySubject.subject.id]:
                                    e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void submitSubjectRename(
                                    activeHierarchySubject.subject,
                                  );
                                }
                                if (e.key === "Escape") setEditingSubjectId(null);
                              }}
                              autoFocus
                              className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                            />
                            <button
                              onClick={() => {
                                void submitSubjectRename(
                                  activeHierarchySubject.subject,
                                );
                              }}
                              className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSubjectId(null)}
                              className={`text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl ${isDarkMode ? "bg-[#202225] text-[#c6c6c6]" : "bg-[#f0f0f5] text-[#4b5563]"}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className={`text-xl font-bold ${isDarkMode ? "text-[#e7e5e5]" : "text-[#1f2937]"}`}
                            >
                              {activeHierarchySubject.subject.name}
                            </h4>
                            <button
                              onClick={() =>
                                startSubjectRename(activeHierarchySubject.subject)
                              }
                              className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full ${isDarkMode ? "bg-[#202225] text-[#c6c6c6]" : "bg-[#f0f0f5] text-[#4b5563]"}`}
                            >
                              Edit Name
                            </button>
                          </div>
                        )}

                        <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                          {activeHierarchySubject.doneTopics}/
                          {activeHierarchySubject.totalTopics} Done ·{" "}
                          {activeHierarchySubject.chapters.length} Chapters
                        </div>
                      </div>
                    ) : (
                      <div className="text-[14px] font-bold text-[#8b919e] dark:text-[#767575]">
                        Select a node in the chart to view details.
                      </div>
                    )}
                    </div>
                  )}
                </div>
                </div>
              ) : (
                <div
                  data-tour="planner-subjects-area"
                  className="flex flex-col gap-6"
                >
                  {visibleSubjects.map((subject) => {
                    const subjectTopicCount = subject.chapters.reduce(
                      (total, chapter) => total + chapter.topics.length,
                      0,
                    );
                    return (
                      <div
                        key={subject.id}
                        className={`rounded-3xl overflow-hidden transition-colors duration-500 ${isDarkMode ? "bg-[#09090b] shadow-2xl border border-zinc-800" : "bg-white shadow-[12px_12px_24px_rgba(166,171,189,0.4),-8px_-8px_24px_rgba(255,255,255,0.8)] border border-slate-200"}`}
                      >
                        <div
                          className={`p-6 border-b ${isDarkMode ? "bg-[#101013] border-zinc-800" : "bg-slate-50 border-slate-200"}`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="min-w-0">
                              {editingSubjectId === subject.id ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    value={subjectRenameDraft[subject.id] || ""}
                                    onChange={(e) =>
                                      setSubjectRenameDraft((prev) => ({
                                        ...prev,
                                        [subject.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void submitSubjectRename(subject);
                                      }
                                      if (e.key === "Escape") {
                                        setEditingSubjectId(null);
                                      }
                                    }}
                                    autoFocus
                                    className={`min-w-[220px] flex-1 rounded-none px-4 py-2.5 text-sm font-bold border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-700 text-zinc-50" : "bg-white border-slate-300 text-[#2d333b]"}`}
                                  />
                                  <button
                                    onClick={() => {
                                      void submitSubjectRename(subject);
                                    }}
                                    className="text-[12px] font-black uppercase tracking-widest px-4 py-2 rounded-none bg-[#2563eb] text-white"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSubjectId(null)}
                                    className={`text-[12px] font-black uppercase tracking-widest px-4 py-2 rounded-none border ${isDarkMode ? "border-zinc-700 text-zinc-200" : "border-slate-300 text-slate-700"}`}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <h3
                                    className={`text-[28px] font-bold ${isDarkMode ? "text-zinc-50" : "text-[#2d333b]"}`}
                                  >
                                    {subject.name}
                                  </h3>
                                  <div className="text-[13px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                    {subjectTopicCount} topics ·{" "}
                                    {subjectPercent(subject)}% complete
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {editingSubjectId !== subject.id && (
                                <button
                                  onClick={() => startSubjectRename(subject)}
                                  className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                                >
                                  Edit Name
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setBulkSubjectId(subject.id);
                                  setBulkSubjectName("");
                                  setBulkAddOpen(true);
                                }}
                                className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#3b82f6] text-white shadow-[0_4px_10px_rgba(59,130,246,0.35)] transition-transform hover:scale-[1.05]"
                              >
                                Bulk Add
                              </button>
                              <button
                                onClick={() => {
                                  void deleteSubject(subject.id);
                                }}
                                className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#dc2626] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(220,38,38,0.4)] transition-transform hover:scale-[1.05]"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <input
                              value={chapterName[subject.id] || ""}
                              onChange={(e) =>
                                setChapterName((prev) => ({
                                  ...prev,
                                  [subject.id]: e.target.value,
                                }))
                              }
                              placeholder="Add a chapter (optional)"
                              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5] placeholder-[#767575]" : "bg-[#e8ebf3] text-[#2d333b] placeholder-[#8b919e]"}`}
                            />
                            <button
                              onClick={() => addChapter(subject.id)}
                              className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#0ea5e9] text-white shadow-[0_4px_10px_rgba(14,165,233,0.35)] transition-transform hover:scale-[1.05]"
                            >
                              Add Chapter
                            </button>
                          </div>
                        </div>

                        <div
                          className={`p-6 flex flex-col gap-6 ${isDarkMode ? "bg-[#09090b]" : "bg-white"}`}
                        >
                          {subject.chapters.length === 0 && (
                            <div className="text-[14px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-6 border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] rounded-2xl">
                              No chapters yet. Add one to start.
                            </div>
                          )}

                          {subject.chapters.map((chapter) => {
                            const key = `${subject.id}:${chapter.id}`;
                            const filteredTopics = chapter.topics.filter(
                              (topic) =>
                                matchesSyllabusFilters(topic, subject, chapter),
                            );
                            const visibleTopics = hasSyllabusTopicFilter
                              ? filteredTopics
                              : chapter.topics;

                            if (
                              hasSyllabusTopicFilter &&
                              visibleTopics.length === 0
                            )
                              return null;

                            return (
                              <div
                                key={chapter.id}
                                className={`rounded-3xl p-5 transition-colors duration-500 ${isDarkMode ? "bg-[#121316] shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]" : "bg-[#f0f0f5] shadow-[inset_4px_4px_8px_rgba(166,171,189,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]"}`}
                              >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                                  <div className="min-w-0">
                                    {editingChapterId === chapter.id ? (
                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <input
                                          value={
                                            chapterRenameDraft[chapter.id] || ""
                                          }
                                          onChange={(e) =>
                                            setChapterRenameDraft((prev) => ({
                                              ...prev,
                                              [chapter.id]: e.target.value,
                                            }))
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              void submitChapterRename(
                                                subject.id,
                                                chapter,
                                              );
                                            }
                                            if (e.key === "Escape")
                                              setEditingChapterId(null);
                                          }}
                                          autoFocus
                                          className={`min-w-[220px] flex-1 rounded-xl px-4 py-3 text-sm font-bold shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors ${isDarkMode ? "bg-[#131416] text-[#e7e5e5]" : "bg-[#e8ebf3] text-[#2d333b]"}`}
                                        />
                                        <button
                                          onClick={() => {
                                            void submitChapterRename(
                                              subject.id,
                                              chapter,
                                            );
                                          }}
                                          className="text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl bg-[#2563eb] text-white shadow-[0_4px_10px_rgba(37,99,235,0.35)] transition-transform hover:scale-[1.05]"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() =>
                                            setEditingChapterId(null)
                                          }
                                          className={`text-[12px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div
                                          className={`text-[20px] font-bold mt-2 ${isDarkMode ? "text-[#e7e5e5]" : "text-[#2d333b]"}`}
                                        >
                                          {chapter.name}
                                        </div>
                                        <div className="text-[12px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                          {visibleTopics.length} topics
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    {editingChapterId !== chapter.id && (
                                      <button
                                        onClick={() =>
                                          startChapterRename(chapter)
                                        }
                                        className={`text-[12px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                                      >
                                        Edit Name
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        void deleteChapter(
                                          subject.id,
                                          chapter.id,
                                        );
                                      }}
                                      className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#dc2626] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(220,38,38,0.4)] transition-transform hover:scale-[1.05]"
                                    >
                                      Delete Chapter
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                  {visibleTopics.map((topic) => (
                                    <div
                                      key={topic.id}
                                      className={`rounded-2xl p-4 border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800" : "bg-white border-slate-200"}`}
                                    >
                                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                                        <div className="min-w-0">
                                          {editingTopicId === topic.id ? (
                                            <div className="flex flex-wrap items-center gap-2">
                                              <input
                                                value={
                                                  topicRenameDraft[topic.id] ||
                                                  ""
                                                }
                                                onChange={(e) =>
                                                  setTopicRenameDraft(
                                                    (prev) => ({
                                                      ...prev,
                                                      [topic.id]:
                                                        e.target.value,
                                                    }),
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    void submitTopicRename(
                                                      topic,
                                                    );
                                                  }
                                                  if (e.key === "Escape") {
                                                    setEditingTopicId(null);
                                                  }
                                                }}
                                                autoFocus
                                                className={`min-w-[220px] flex-1 rounded-none px-3 py-2 text-sm font-bold border ${isDarkMode ? "bg-[#0f1113] border-zinc-700 text-zinc-50" : "bg-white border-slate-300 text-[#2d333b]"}`}
                                              />
                                              <button
                                                onClick={() => {
                                                  void submitTopicRename(topic);
                                                }}
                                                className="text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-none bg-[#2563eb] text-white"
                                              >
                                                Save
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setEditingTopicId(null)
                                                }
                                                className={`text-[11px] font-black uppercase tracking-widest px-3 py-2 rounded-none border ${isDarkMode ? "border-zinc-700 text-zinc-200" : "border-slate-300 text-slate-700"}`}
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <div
                                              className={`text-[16px] font-bold ${isDarkMode ? "text-zinc-50" : "text-[#2d333b]"}`}
                                            >
                                              {topic.name}
                                            </div>
                                          )}
                                          <div className="text-[12px] font-extrabold uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mt-1">
                                            {topic.plannedDate
                                              ? formatDate(topic.plannedDate)
                                              : "Unplanned"}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span
                                            className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full font-black tracking-widest"
                                            style={{
                                              color:
                                                STATUS_UI[topic.status].color,
                                              background: isDarkMode
                                                ? STATUS_UI[topic.status]
                                                    .darkBg ||
                                                  STATUS_UI[topic.status].bg
                                                : STATUS_UI[topic.status].bg,
                                              border: `1px solid ${STATUS_UI[topic.status].color}30`,
                                            }}
                                          >
                                            {STATUS_UI[topic.status].label}
                                          </span>
                                          {topic.notes && (
                                            <span className="text-[12px] font-black uppercase tracking-widest text-[#64748b]">
                                              Notes
                                            </span>
                                          )}
                                          {editingTopicId !== topic.id && (
                                            <button
                                              onClick={() =>
                                                startTopicRename(topic)
                                              }
                                              className="whitespace-nowrap flex-shrink-0 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                            >
                                              Edit
                                            </button>
                                          )}
                                          {editingTopicId !== topic.id && <span className="text-slate-300 dark:text-slate-700 text-[10px] mx-1">|</span>}
                                          <button
                                            onClick={() =>
                                              setExpandedTopicId((prev) =>
                                                prev === topic.id
                                                  ? null
                                                  : topic.id,
                                              )
                                            }
                                            className="whitespace-nowrap flex-shrink-0 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                          >
                                            {expandedTopicId === topic.id
                                              ? "Hide"
                                              : "More"}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-4 mt-4 border-t border-slate-200/50 dark:border-slate-800 pt-3">
                                        <button
                                          onClick={() =>
                                            patchTopic(topic.id, {
                                              status: "in_progress",
                                            })
                                          }
                                          className="whitespace-nowrap flex-shrink-0 text-[11px] font-black uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                        >
                                          Start
                                        </button>
                                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                                        <button
                                          onClick={() =>
                                            patchTopic(topic.id, {
                                              status: "done",
                                            })
                                          }
                                          className="whitespace-nowrap flex-shrink-0 text-[11px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                        >
                                          Mark Done
                                        </button>
                                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                                        <button
                                          onClick={() =>
                                            patchTopic(topic.id, {
                                              status: "revision_needed",
                                            })
                                          }
                                          className="whitespace-nowrap flex-shrink-0 text-[11px] font-black uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                                        >
                                          Needs Revision
                                        </button>
                                      </div>

                                      {expandedTopicId === topic.id && (
                                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                          <CustomDatePicker
                                            value={
                                              topic.plannedDate
                                                ? toIsoDateOnly(
                                                    topic.plannedDate,
                                                  )
                                                : ""
                                            }
                                            onChange={(val) =>
                                              patchTopic(topic.id, {
                                                plannedDate: val || "",
                                              })
                                            }
                                            isDarkMode={isDarkMode}
                                            align="top"
                                            offDays={plan?.offDays || []}
                                          />
                                          <button
                                            onClick={() => {
                                              void editTopicNotes(topic);
                                            }}
                                            className={`text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full transition-transform hover:scale-[1.05] active:scale-[0.95] ${isDarkMode ? "bg-[#202225] text-[#c6c6c6] shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02)]" : "bg-[#f0f0f5] text-[#4b5563] shadow-[4px_4px_10px_rgba(166,171,189,0.4),-4px_-4px_10px_rgba(255,255,255,0.8)]"}`}
                                          >
                                            Edit Notes
                                          </button>
                                          <button
                                            onClick={() =>
                                              patchTopic(topic.id, {
                                                plannedDate: "",
                                              })
                                            }
                                            className="text-[11px] font-black tracking-wide whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#f59e0b] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(245,158,11,0.4)] transition-transform hover:scale-[1.05]"
                                          >
                                            Unschedule
                                          </button>
                                          <button
                                            onClick={() => {
                                              void deleteTopic(topic.id);
                                            }}
                                            className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 px-5 py-3 rounded-full bg-[#dc2626] text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_10px_rgba(220,38,38,0.4)] transition-transform hover:scale-[1.05]"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {visibleTopics.length === 0 && (
                                    <div className="text-[14px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-6 border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] rounded-2xl">
                                      No topics yet. Add some below.
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col gap-3 pt-4 mt-4">
                                  <textarea
                                    value={topicName[key] || ""}
                                    onChange={(e) =>
                                      setTopicName((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    placeholder="Add topics (one per line)"
                                    rows={3}
                                    className={`w-full text-sm font-bold rounded-xl px-4 py-3 shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)] focus:outline-none transition-colors resize-y min-h-[96px] ${isDarkMode ? "bg-[#131416] text-[#e7e5e5] placeholder-[#767575]" : "bg-[#e8ebf3] text-[#2d333b] placeholder-[#8b919e]"}`}
                                  />
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <CustomDatePicker
                                      value={topicDate[key] || ""}
                                      onChange={(val) =>
                                        setTopicDate((prev) => ({
                                          ...prev,
                                          [key]: val,
                                        }))
                                      }
                                      isDarkMode={isDarkMode}
                                      align="top"
                                      offDays={plan?.offDays || []}
                                    />
                                    <button
                                      onClick={() =>
                                        addTopic(subject.id, chapter.id)
                                      }
                                      className="text-[12px] font-black uppercase tracking-widest rounded-xl px-5 py-3 bg-[#0ea5e9] text-white shadow-[0_4px_10px_rgba(14,165,233,0.35)] transition-transform hover:scale-[1.05]"
                                    >
                                      Add Topics
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {view === "kanban" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {(
                [
                  ["todo", "Queue"],
                  ["in_progress", "Active"],
                  ["done", "Completed"],
                ] as Array<["todo" | "in_progress" | "done", string]>
              ).map(([status, title]) => {
                const neonClass =
                  status === "todo"
                    ? "dark:shadow-[0_0_8px_#3b82f6] border-blue-500"
                    : status === "in_progress"
                      ? "dark:shadow-[0_0_8px_#f59e0b] border-amber-500"
                      : "dark:shadow-[0_0_8px_#10b981] border-emerald-500";
                const textClass =
                  status === "todo"
                    ? "text-blue-600"
                    : status === "in_progress"
                      ? "text-amber-600"
                      : "text-emerald-700";

                return (
                  <div
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      const topicId = e.dataTransfer.getData("topic-id");
                      if (!topicId) {
                        showToast("Invalid drag action. Try again.", "error");
                        return;
                      }
                      await patchTopic(topicId, { status });
                    }}
                    className="rounded-xl min-h-[700px] p-4 flex flex-col gap-4 transition-colors duration-500
                bg-[#e6e7ee] dark:bg-[#1a1c1e]
                shadow-[inset_4px_4px_8px_rgba(166,171,189,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]
                dark:shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.8)]
                border border-slate-300 dark:border-transparent relative
              "
                  >
                    <div className="flex justify-between items-center mb-4 px-2 pt-2">
                      <h3 className="font-study-planner text-[18.2px] font-bold uppercase tracking-widest text-[#2d333b] dark:text-[#fcf9f8]">
                        {title}
                      </h3>
                      <span className="text-[13px] font-bold bg-[#ffffff] dark:bg-[#252626] px-3 py-1 rounded-full text-[#4b5563] dark:text-[#c3c7cd] shadow-sm dark:shadow-none">
                        {kanban[status].length < 10 && kanban[status].length > 0
                          ? `0${kanban[status].length}`
                          : kanban[status].length}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1 relative">
                      <AnimatePresence>
                        {kanban[status].map((topic) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={topic.id}
                            draggable
                            onDragStart={(e: any) =>
                              e.dataTransfer.setData("topic-id", topic.id)
                            }
                            className={`rounded-lg p-4 cursor-grab active:cursor-grabbing transform transition-all hover:-translate-y-1 bg-[#fcf9f8] dark:bg-[#1a1c1e] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8),0_4px_10px_-2px_rgba(0,0,0,0.6)] ${status === "done" ? (isDarkMode ? "grayscale-[0.2] hover:grayscale-0 opacity-80 hover:opacity-100" : "opacity-80 hover:opacity-100") : ""} border-l-[4px] ${neonClass}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[12px] font-bold text-neutral-500 dark:text-slate-500 uppercase tracking-widest truncate max-w-[80%]">
                                {topic.subject.name}
                              </span>
                              <div
                                className="w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center -mt-1 -mr-1"
                                style={{
                                  backgroundColor: topic.subject.color + "40",
                                }}
                              >
                                <div
                                  className="w-2 h-2 rounded-full shadow-inner"
                                  style={{
                                    backgroundColor: topic.subject.color,
                                  }}
                                ></div>
                              </div>
                            </div>

                            <h4 className="text-neutral-900 dark:text-slate-50 font-extrabold text-[18.2px] mb-2 leading-snug drop-shadow-sm">
                              {topic.name}
                            </h4>

                            <p className="text-[14.5px] text-neutral-600 dark:text-slate-400 mb-4 line-clamp-2 font-black">
                              {topic.chapter.name}
                            </p>

                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex items-center gap-4 text-[12px] text-neutral-500 font-bold">
                                {topic.plannedDate ? (
                                  <span className="flex items-center gap-1 bg-neutral-200/60 px-2 py-1 rounded-md text-[13px]">
                                    <PremiumEmoji name="calendar" alt="" className="h-4 w-4" />
                                    {formatDate(topic.plannedDate)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2 py-1"></span>
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-black uppercase tracking-widest ${textClass} px-3 py-1.5 bg-neutral-200/50 rounded-full`}
                              >
                                {STATUS_UI[topic.status].label}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {kanban[status].length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
                          <div className="text-[15.6px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 text-center leading-relaxed max-w-[80%]">
                            {COLUMN_DESCRIPTIONS[status]}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {view === "calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex justify-between items-center rounded-3xl px-8 py-5 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <motion.button
                    whileHover={{ scale: 0.95 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      setMonthDate(
                        (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                      )
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] transition-colors"
                    title="Previous Month"
                  >
                    ◀
                  </motion.button>

                  <strong
                    className="text-[31px] font-bold text-[#2d333b] dark:text-[#fcf9f8] tracking-widest uppercase drop-shadow-sm"
                    style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
                  >
                    {monthDate.toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>

                  <motion.button
                    whileHover={{ scale: 0.95 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() =>
                      setMonthDate(
                        (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                      )
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] transition-colors"
                    title="Next Month"
                  >
                    ▶
                  </motion.button>
                </div>

                <div data-tour="planner-calendar-grid">
                  <CalendarView
                    monthDate={monthDate}
                    calendar={calendar}
                    onPickDate={setPickedDay}
                    offDays={plan.offDays}
                    todayIso={todayKey}
                  />
                </div>

                <div className="flex flex-wrap gap-3 text-[12px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                  <span className="px-3 py-1 rounded-full border border-slate-200">
                    Planned
                  </span>
                  <span className="px-3 py-1 rounded-full border border-emerald-200 text-emerald-600">
                    Done
                  </span>
                  <span className="px-3 py-1 rounded-full border border-red-200 text-red-500">
                    Overdue
                  </span>
                  <span className="px-3 py-1 rounded-full border border-amber-200 text-amber-600">
                    Off Day
                  </span>
                </div>
              </div>

              <div
                data-tour="planner-day-panel"
                className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] h-fit flex flex-col gap-6 sticky top-8"
              >
                <div className="border-b border-[#d9dbe2] dark:border-[#252626] pb-5 text-center">
                  <strong className="block text-[26px] font-extrabold text-[#2d333b] dark:text-[#fcf9f8] mb-2 drop-shadow-sm uppercase tracking-widest">
                    Selected Log
                  </strong>
                  <div className="text-[14.5px] font-black tracking-widest text-blue-600 dark:text-blue-400 bg-[#e6e7ee] dark:bg-[#131416] inline-block px-4 py-2 rounded-lg border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_1px_1px_3px_rgba(166,171,189,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]">
                    {pickedDay
                      ? new Date(pickedDay).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "AWAITING SELECTION"}
                  </div>
                  {pickedDay && (
                    <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                      <span>Planned {selectedDayItems.length}</span>
                      <span>Done {selectedDayDone.length}</span>
                      <span>Missed {selectedDayMissed.length}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {selectedDayItems.map((item) => (
                    <div
                      key={item.topicId}
                      className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_2px_2px_6px_rgba(166,171,189,0.4),inset_-2px_-2px_6px_rgba(255,255,255,0.6)] dark:shadow-[inset_2px_2px_8px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)] transition-colors overflow-hidden"
                    >
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <strong className="flex-1 min-w-0 text-[17px] font-bold text-[#3c4146] dark:text-[#e7e5e5] leading-snug drop-shadow-sm">
                          {item.topicName}
                        </strong>
                        <span
                          className="shrink-0 text-[11px] whitespace-nowrap px-3 py-1.5 rounded-full font-black tracking-wider shadow-[0_2px_3px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                          style={{
                            color: STATUS_UI[item.status].color,
                            background: isDarkMode
                              ? STATUS_UI[item.status].darkBg ||
                                STATUS_UI[item.status].bg
                              : STATUS_UI[item.status].bg,
                            border: `1px solid ${STATUS_UI[item.status].color}30`,
                          }}
                        >
                          {STATUS_UI[item.status].label}
                        </span>
                      </div>
                      <div className="text-[12px] font-extrabold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                        {item.subjectName}{" "}
                        <span className="text-[#d9dbe2] dark:text-[#252626] mx-1">
                          ·
                        </span>{" "}
                        {item.chapterName}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mt-5 border-t border-[#c0c4d1]/50 dark:border-[#252626] pt-4">
                        <button
                          onClick={() =>
                            patchTopic(item.topicId, { status: "done" })
                          }
                          className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                        >
                          Mark Done
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                        <button
                          onClick={() =>
                            patchTopic(item.topicId, {
                              status: "revision_needed",
                            })
                          }
                          className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                        >
                          Needs Revision
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                        <button
                          onClick={() => {
                            if (!pickedDay) {
                              showToast("Pick a day first.", "error");
                              return;
                            }
                            const next = new Date(pickedDay);
                            next.setDate(next.getDate() + 1);
                            const targetDate = findNextAvailableDate(
                              next,
                              plan.offDays,
                            );
                            void patchTopic(item.topicId, {
                              plannedDate: targetDate,
                            });
                          }}
                          className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                          Move Date
                        </button>
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">|</span>
                        <button
                          onClick={() =>
                            patchTopic(item.topicId, { plannedDate: "" })
                          }
                          className="text-[11px] font-black uppercase tracking-[0.15em] text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                        >
                          Remove Date
                        </button>
                      </div>
                    </div>
                  ))}

                  {pickedDay && selectedDayItems.length === 0 && (
                    <div className="text-[12px] uppercase font-black tracking-widest text-[#8b919e] dark:text-[#565555] text-center py-10 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.3)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
                      NO MODULES SCHEDULED
                    </div>
                  )}
                </div>

                {pickedDay && selectedDayItems.length > 0 && (
                  <div className="flex flex-col gap-3 mt-4">
                    <button
                      onClick={() => {
                        if (!pickedDay) {
                          showToast("Pick a day first.", "error");
                          return;
                        }
                        const next = new Date(pickedDay);
                        next.setDate(next.getDate() + 1);
                        const targetDate = findNextAvailableDate(
                          next,
                          plan.offDays,
                        );
                        void moveTopicsToDate(
                          selectedDayItems.map((item) => item.topicId),
                          targetDate,
                        );
                      }}
                      className="text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-[#3b82f6] text-white"
                    >
                      Move All to Next Available Day
                    </button>
                    <button
                      onClick={() =>
                        clearTopicsFromDate(
                          selectedDayItems.map((item) => item.topicId),
                        )
                      }
                      className="text-[12px] font-black uppercase tracking-widest px-4 py-3 rounded-full border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300"
                    >
                      Clear This Day
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {bulkAddOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={resetBulkAdd}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl rounded-[32px] bg-white dark:bg-[#0c0d0e] border border-slate-200 dark:border-slate-800/60 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] p-8 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white">
                  Bulk Add Topics
                </h3>
                <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Add multiple topics to your syllabus at once.
                </p>
              </div>
              <button
                onClick={resetBulkAdd}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2"
              >
                Close
              </button>
            </div>

            {bulkAddError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-2xl border border-red-200/50 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 px-5 py-4 text-[13px] text-red-600 dark:text-red-400 font-bold flex items-center gap-3"
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-[10px]">✕</span>
                {bulkAddError}
              </motion.div>
            )}

            <div className="space-y-6">
              <div className="flex p-1 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => switchBulkAddMode("manual")}
                  className={`px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-200 ${
                    !isTxtBulkMode
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  type="button"
                  onClick={() => switchBulkAddMode("txt-file")}
                  className={`px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-200 ${
                    isTxtBulkMode
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  .TXT Import
                </button>
              </div>

              {isTxtBulkMode && (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 px-5 py-4 flex items-center justify-between">
                  <div className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
                    Need help with the format?
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkTxtGuideOpen((prev) => !prev)}
                    className="shrink-0 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
                  >
                    {bulkTxtGuideOpen ? "Hide Guide" : "View Guide"}
                  </button>
                </div>
              )}

              {!isTxtBulkMode && (
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/10 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      Destination Details
                    </span>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-wider">Subject</label>
                        <select
                          value={bulkSubjectId}
                          onChange={(e) => {
                            setBulkSubjectId(e.target.value);
                            if (e.target.value) setBulkSubjectName("");
                          }}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-200 px-4 py-3 text-[14px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">Select existing</option>
                          {plan?.subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-wider">New Subject</label>
                        <input
                          value={bulkSubjectName}
                          onChange={(e) => {
                            setBulkSubjectName(e.target.value);
                            if (e.target.value) setBulkSubjectId("");
                          }}
                          placeholder="Or type to create"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 py-3 text-[14px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-wider">Chapter Name (Optional)</label>
                      <input
                        value={bulkChapterName}
                        onChange={(e) => setBulkChapterName(e.target.value)}
                        placeholder="e.g. Calculus Foundations"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 py-3 text-[14px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isTxtBulkMode ? (
                <div className="space-y-4">
                  <div className="px-1">
                    <div 
                      onClick={() => bulkImportInputRef.current?.click()}
                      className={`relative overflow-hidden w-full border-2 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${isDarkMode ? "border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5" : "border-slate-300 hover:border-blue-500/50 hover:bg-blue-50"}`}
                    >
                      <input
                        ref={bulkImportInputRef}
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={(event) => {
                          void handleBulkFileImport(event);
                        }}
                      />
                      
                      {!bulkImportedFileName ? (
                        <>
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-500 transform group-hover:scale-110 ${isDarkMode ? "bg-slate-800 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div className={`text-[15px] font-bold mb-2 text-center ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                            Click to upload or drag and drop
                          </div>
                          <div className={`text-[11px] font-black uppercase tracking-widest text-center ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                            PDF, DOCX ONLY
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className={`text-[15px] font-bold mb-2 text-center ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                            {bulkImportedFileName}
                          </div>
                          <div className="text-[11px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors">
                            Click to replace file
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {bulkTxtGuideOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] pt-2 pb-4">
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 px-5 py-4">
                            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-4">
                              Symbols
                            </div>
                            <div className="space-y-3 text-[13px] font-bold text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700">-</code> Subject
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700">_</code> Chapter
                              </div>
                              <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border dark:border-slate-700">&gt;</code> Topic
                              </div>
                            </div>
                          </div>

                          <pre className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-4 text-[12px] font-mono leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto shadow-inner">
                            {BULK_TXT_FORMAT_EXAMPLE}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="px-1 text-[13px] font-medium text-slate-400 dark:text-slate-500 italic">
                  Tip: Enter one topic per line in the box below.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 ml-1 uppercase tracking-wider">Topics List</label>
                <textarea
                  value={bulkTopicsText}
                  onChange={(e) => setBulkTopicsText(e.target.value)}
                  placeholder={
                    isTxtBulkMode
                      ? "Paste text here or edit the preview from your upload..."
                      : "Topic 1\nTopic 2\nTopic 3..."
                  }
                  className="w-full rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0f172a] dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-6 py-5 text-[15px] font-medium min-h-[180px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-10">
              <button
                onClick={resetBulkAdd}
                className="px-8 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-[13px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleBulkAdd();
                }}
                className="px-10 py-3.5 rounded-2xl bg-blue-600 text-white text-[13px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>{isTxtBulkMode ? "Import Syllabus" : "Add Topics"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-[13px] font-bold ${
              toastType === "success"
                ? "bg-emerald-600 text-white"
                : toastType === "error"
                  ? "bg-red-600 text-white"
                  : "bg-slate-800 text-white"
            }`}
          >
            {toastType === "success" ? "✓" : toastType === "error" ? "✕" : "ℹ"}{" "}
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Modal ── */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setPendingDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-[32px] border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-8 ${isDarkMode ? "bg-[#111214] border-slate-800" : "bg-white border-slate-200"}`}
            >
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
                Confirm Action
              </div>
              <p
                className={`text-[17px] font-bold mb-8 leading-snug tracking-tight ${isDarkMode ? "text-white" : "text-[#0f172a]"}`}
              >
                {pendingDelete.label}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingDelete(null)}
                  className={`px-6 py-3 rounded-2xl border text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    void executePendingDelete();
                  }}
                  className={`px-7 py-3 rounded-2xl bg-red-600 text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95`}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Template Picker Modal ── */}
      {/* ── Template Picker Modal ── */}
      <AnimatePresence>
        {templatePickerOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setTemplatePickerOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`relative w-full max-w-2xl rounded-[32px] border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-8 max-h-[85vh] flex flex-col ${isDarkMode ? "bg-[#0c0d0e] border-slate-800" : "bg-white border-slate-200"}`}
            >
              <div className="flex items-start justify-between mb-8 shrink-0">
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-[#0f172a]"}`}>
                    Exam Templates
                  </h3>
                  <p className={`text-[14px] font-medium mt-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Select a curated template to auto-populate your syllabus.
                  </p>
                </div>
                <button
                  onClick={() => setTemplatePickerOpen(false)}
                  className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2"
                >
                  Close
                </button>
              </div>

              <div className="overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {availableTemplates.length === 0 ? (
                  <div className={`text-center py-16 text-sm font-bold ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                    <div className="animate-pulse mb-2">Loading templates...</div>
                  </div>
                ) : (
                  availableTemplates.map((t) => (
                    <div
                      key={t.id}
                      className={`group rounded-3xl p-6 border transition-all duration-300 ${isDarkMode ? "bg-[#141517] border-slate-800/60 hover:border-blue-500/50 hover:bg-[#1a1c1e]" : "bg-slate-50/50 border-slate-200/60 hover:border-blue-500/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5"}`}
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className={`text-[17px] font-bold tracking-tight ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
                            {t.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"}`}>
                              {t.examBody}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className={`text-[11px] font-bold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                              {t.category}
                            </span>
                          </div>
                          <p className={`text-[14px] font-medium mt-3 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {t.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
                              {t.estimatedTopics} topics
                            </span>
                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${isDarkMode ? "bg-slate-900/50 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500"}`}>
                              {t.recommendedDailyGoal}/day target
                            </span>
                          </div>
                        </div>
                        <button
                          disabled={isLoadingTemplate}
                          onClick={async () => {
                            setIsLoadingTemplate(true);
                            try {
                              const fullTemplate = await plannerRequest<{
                                subjects: {
                                  name: string;
                                  color: string;
                                  chapters: { name: string; topics: string[] }[];
                                }[];
                              }>(`${BASE}/templates/${t.id}`);

                              for (const subject of fullTemplate.subjects) {
                                const updatedPlan = await plannerRequest<Plan>(
                                  `${BASE}/${planId}/subjects`,
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      name: subject.name,
                                      color: subject.color,
                                    }),
                                  },
                                );
                                setPlan(updatedPlan);

                                const createdSubject = updatedPlan.subjects.find(
                                  (s: any) => s.name === subject.name,
                                );
                                if (!createdSubject) continue;

                                for (const chapter of subject.chapters) {
                                  const afterChapter = await plannerRequest<Plan>(
                                    `${BASE}/${planId}/subjects/${createdSubject.id}/chapters`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        name: chapter.name,
                                      }),
                                    },
                                  );
                                  setPlan(afterChapter);

                                  const createdChapter = afterChapter.subjects
                                    .find((s: any) => s.id === createdSubject.id)
                                    ?.chapters.find(
                                      (c: any) => c.name === chapter.name,
                                    );
                                  if (!createdChapter) continue;

                                  for (const topicName of chapter.topics) {
                                    const afterTopic = await plannerRequest<Plan>(
                                      `${BASE}/${planId}/subjects/${createdSubject.id}/chapters/${createdChapter.id}/topics`,
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({ name: topicName }),
                                      },
                                    );
                                    setPlan(afterTopic);
                                  }
                                }
                              }

                              const calendarData = await plannerRequest<
                                Record<string, CalendarItem[]>
                              >(`${BASE}/${planId}/calendar`);
                              setCalendar(calendarData);
                              showToast(
                                `${t.name} template imported — ${t.estimatedTopics} topics added!`,
                                "success",
                              );
                              setTemplatePickerOpen(false);
                            } catch (err: any) {
                              showToast(
                                err?.message || "Failed to import template",
                                "error",
                              );
                            } finally {
                              setIsLoadingTemplate(false);
                            }
                          }}
                          className="px-6 py-2.5 rounded-2xl bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 self-center"
                        >
                          {isLoadingTemplate ? "Importing..." : "Use This"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Off-Day Rebuild Prompt ── */}
      <AnimatePresence>
        {showRebuildPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setShowRebuildPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm rounded-[32px] border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-8 ${isDarkMode ? "bg-[#111214] border-slate-800" : "bg-white border-slate-200"}`}
            >
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
                Off Days Changed
              </div>
              <p
                className={`text-[17px] font-bold mb-8 leading-snug tracking-tight ${isDarkMode ? "text-white" : "text-[#0f172a]"}`}
              >
                Would you like to redistribute topics across your new schedule?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRebuildPrompt(false)}
                  className={`px-6 py-3 rounded-2xl border text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  Later
                </button>
                <button
                  onClick={() => {
                    setShowRebuildPrompt(false);
                    void autoDistribute();
                  }}
                  className="px-7 py-3 rounded-2xl bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Rebuild
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Exam Type Change Prompt ── */}
      <AnimatePresence>
        {showExamTypeChangePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => {
              setShowExamTypeChangePrompt(false);
              setPendingExamType("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-[32px] border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] p-8 ${isDarkMode ? "bg-[#0c0d0e] border-slate-800" : "bg-white border-slate-200"}`}
            >
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">
                Exam Type Changed
              </div>
              <p
                className={`text-[17px] font-bold mb-3 leading-snug tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                Syllabus mismatch detected.
              </p>
              <p
                className={`text-[14px] font-medium mb-8 leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
              >
                You changed the exam type to <strong>{pendingExamType}</strong>. Would you like to clear the existing syllabus and start fresh?
              </p>
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowExamTypeChangePrompt(false);
                    setPendingExamType("");
                  }}
                  className={`px-5 py-3 rounded-2xl border text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await doSaveExamType(pendingExamType);
                    setShowExamTypeChangePrompt(false);
                    setPendingExamType("");
                    showToast(
                      "Exam type updated. Syllabus preserved.",
                      "success",
                    );
                  }}
                  className={`px-5 py-3 rounded-2xl border text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? "border-slate-800 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Keep Syllabus
                </button>
                <button
                  onClick={() => {
                    void clearSyllabusAndSaveExamType();
                  }}
                  className="px-6 py-3 rounded-2xl bg-red-600 text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95"
                >
                  Clear & Switch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <TourPrompt tour={studyPlannerTour} featureName="Syllabus Planner" />
    </>
  );
}
