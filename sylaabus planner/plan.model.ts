import { v4 as uuidv4 } from "uuid";
import type { ExamTemplate } from "./exam-templates/index";

export type TopicStatus = "todo" | "in_progress" | "done" | "revision_needed";

export interface StudyTopic {
  id: string;
  name: string;
  status: TopicStatus;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
}

export interface StudyChapter {
  id: string;
  name: string;
  topics: StudyTopic[];
}

export interface StudySubject {
  id: string;
  name: string;
  color: string;
  weeklyTarget?: number;
  monthlyTarget?: number;
  chapters: StudyChapter[];
}

export interface StudyPlannerFeatureFlags {
  isPremium: boolean;
  unlockedAt?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  examType?: string;
  examDate?: string;
  description?: string;
  dailyGoal?: number;
  offDays: number[]; // 0-6 where 0 is Sunday
  subjects: StudySubject[];
  features: StudyPlannerFeatureFlags;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicLocation {
  subjectId: string;
  chapterId: string;
  topicId: string;
}

export interface AutoDistributeOptions {
  fromDate?: string;
  lockExistingDates?: boolean;
  includeRevisionNeeded?: boolean;
}

export interface ProgressRollup {
  totalTopics: number;
  doneTopics: number;
  inProgressTopics: number;
  revisionTopics: number;
  completionPercent: number;
  remainingPercent: number;
  bySubject: Array<{
    subjectId: string;
    subjectName: string;
    totalTopics: number;
    doneTopics: number;
    completionPercent: number;
    byChapter: Array<{
      chapterId: string;
      chapterName: string;
      totalTopics: number;
      doneTopics: number;
      completionPercent: number;
    }>;
  }>;
}

export interface CalendarTopicItem {
  topicId: string;
  topicName: string;
  chapterId: string;
  chapterName: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  status: TopicStatus;
}

export type CalendarMap = Record<string, CalendarTopicItem[]>;

export interface HeatmapPoint {
  date: string;
  count: number;
}

export function toIsoDateOnly(input: Date | string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  // Use local date parts to avoid UTC timezone drift
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function clampOffDays(offDays: number[] | undefined): number[] {
  if (!Array.isArray(offDays)) return [];
  return [...new Set(offDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
}

export function rollupProgress(plan: StudyPlan): ProgressRollup {
  let totalTopics = 0;
  let doneTopics = 0;
  let inProgressTopics = 0;
  let revisionTopics = 0;

  const bySubject = plan.subjects.map((subject) => {
    let subjectTotal = 0;
    let subjectDone = 0;

    const byChapter = subject.chapters.map((chapter) => {
      const chapterTotal = chapter.topics.length;
      const chapterDone = chapter.topics.filter((t) => t.status === "done").length;

      subjectTotal += chapterTotal;
      subjectDone += chapterDone;

      totalTopics += chapterTotal;
      doneTopics += chapterDone;
      inProgressTopics += chapter.topics.filter((t) => t.status === "in_progress").length;
      revisionTopics += chapter.topics.filter((t) => t.status === "revision_needed").length;

      return {
        chapterId: chapter.id,
        chapterName: chapter.name,
        totalTopics: chapterTotal,
        doneTopics: chapterDone,
        completionPercent: chapterTotal === 0 ? 0 : Math.round((chapterDone / chapterTotal) * 100),
      };
    });

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      totalTopics: subjectTotal,
      doneTopics: subjectDone,
      completionPercent: subjectTotal === 0 ? 0 : Math.round((subjectDone / subjectTotal) * 100),
      byChapter,
    };
  });

  const completionPercent = totalTopics === 0 ? 0 : Math.round((doneTopics / totalTopics) * 100);

  return {
    totalTopics,
    doneTopics,
    inProgressTopics,
    revisionTopics,
    completionPercent,
    remainingPercent: Math.max(0, 100 - completionPercent),
    bySubject,
  };
}

export function buildCalendarMap(plan: StudyPlan): CalendarMap {
  const map: CalendarMap = {};

  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        if (!topic.plannedDate) continue;
        const key = toIsoDateOnly(topic.plannedDate);
        if (!key) continue;

        if (!map[key]) map[key] = [];
        map[key].push({
          topicId: topic.id,
          topicName: topic.name,
          chapterId: chapter.id,
          chapterName: chapter.name,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectColor: subject.color,
          status: topic.status,
        });
      }
    }
  }

  return map;
}

export function buildStudyHeatmap(plan: StudyPlan): HeatmapPoint[] {
  const heat = new Map<string, number>();

  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        if (topic.status === "done" && topic.completedDate) {
          const key = toIsoDateOnly(topic.completedDate);
          if (key) heat.set(key, (heat.get(key) || 0) + 1);
        }
      }
    }
  }

  return [...heat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function findTopicLocation(plan: StudyPlan, topicId: string): TopicLocation | null {
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      const found = chapter.topics.find((topic) => topic.id === topicId);
      if (found) {
        return { subjectId: subject.id, chapterId: chapter.id, topicId: found.id };
      }
    }
  }
  return null;
}

export function updateTopicInPlan(
  plan: StudyPlan,
  topicId: string,
  patch: Partial<Pick<StudyTopic, "name" | "status" | "plannedDate" | "notes">>
): boolean {
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      const topic = chapter.topics.find((item) => item.id === topicId);
      if (!topic) continue;

      if (patch.name !== undefined) {
        const nextName = patch.name.trim();
        if (nextName.length > 0) {
          topic.name = nextName;
        }
      }

      if (patch.status !== undefined) {
        topic.status = patch.status;
        if (patch.status === "done") {
          topic.completedDate = new Date().toISOString();
        } else {
          topic.completedDate = undefined;
        }
      }

      if (patch.plannedDate !== undefined) {
        topic.plannedDate = patch.plannedDate || undefined;
      }

      if (patch.notes !== undefined) {
        topic.notes = patch.notes;
      }

      return true;
    }
  }
  return false;
}

export function autoDistributeTopics(plan: StudyPlan, opts?: AutoDistributeOptions): { assigned: number; skipped: number } {
  const examDate = plan.examDate ? new Date(plan.examDate) : null;
  if (!examDate || Number.isNaN(examDate.getTime())) {
    return { assigned: 0, skipped: 0 };
  }

  const from = opts?.fromDate ? new Date(opts.fromDate) : new Date();
  if (Number.isNaN(from.getTime())) {
    return { assigned: 0, skipped: 0 };
  }

  const includeRevision = Boolean(opts?.includeRevisionNeeded);
  const lockExisting = opts?.lockExistingDates !== false;
  const dailyGoal = Math.max(1, plan.dailyGoal || 3);
  const offDays = new Set(clampOffDays(plan.offDays));

  const queue: StudyTopic[] = [];
  const fixedLoadByDate = new Map<string, number>();
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        const alreadyDone = topic.status === "done";
        const alreadyPlanned = Boolean(topic.plannedDate);
        const isRevision = topic.status === "revision_needed";
        if (alreadyDone) continue;
        if (isRevision && !includeRevision) continue;
        if (lockExisting && alreadyPlanned) {
          const key = toIsoDateOnly(topic.plannedDate as string);
          if (key) {
            fixedLoadByDate.set(key, (fixedLoadByDate.get(key) || 0) + 1);
          }
          continue;
        }

        if (!lockExisting && alreadyPlanned) {
          // Reset planned date before redistribution so daily limit is recomputed from scratch.
          topic.plannedDate = undefined;
        }

        queue.push(topic);
      }
    }
  }

  queue.sort((a, b) => a.name.localeCompare(b.name));

  // Normalize both dates to midnight to avoid day-truncation from time offsets
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const examEnd = new Date(examDate);
  examEnd.setHours(23, 59, 59, 999);

  let i = 0;
  let assigned = 0;

  while (i < queue.length && cursor.getTime() <= examEnd.getTime()) {
    if (offDays.has(cursor.getDay())) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const dateKey = toIsoDateOnly(cursor);
    const usedSlots = fixedLoadByDate.get(dateKey) || 0;
    const availableSlots = Math.max(0, dailyGoal - usedSlots);

    for (let slots = 0; slots < availableSlots && i < queue.length; slots += 1) {
      queue[i].plannedDate = dateKey;
      i += 1;
      assigned += 1;
      fixedLoadByDate.set(dateKey, (fixedLoadByDate.get(dateKey) || 0) + 1);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return { assigned, skipped: Math.max(0, queue.length - assigned) };
}

export interface CreateFromTemplateOptions {
  userId: string;
  template: ExamTemplate;
  title?: string;
  examDate?: string;
  dailyGoal?: number;
  offDays?: number[];
  isPremium: boolean;
  autoDistribute?: boolean;
}

export function createPlanFromTemplate(opts: CreateFromTemplateOptions): StudyPlan {
  const now = new Date().toISOString();

  const subjects: StudySubject[] = opts.template.subjects.map((templateSubject) => {
    const chapters: StudyChapter[] = templateSubject.chapters.map((templateChapter) => {
      const topics: StudyTopic[] = templateChapter.topics.map((topicName) => ({
        id: uuidv4(),
        name: topicName,
        status: "todo" as TopicStatus,
      }));

      return {
        id: uuidv4(),
        name: templateChapter.name,
        topics,
      };
    });

    return {
      id: uuidv4(),
      name: templateSubject.name,
      color: templateSubject.color,
      chapters,
    };
  });

  const plan: StudyPlan = {
    id: uuidv4(),
    userId: opts.userId,
    title: (opts.title || opts.template.name).trim(),
    examType: opts.template.name,
    examDate: opts.examDate ? new Date(opts.examDate).toISOString() : undefined,
    dailyGoal: opts.dailyGoal || opts.template.recommendedDailyGoal || 3,
    offDays: clampOffDays(opts.offDays),
    subjects,
    features: {
      isPremium: opts.isPremium,
      unlockedAt: opts.isPremium ? now : undefined,
    },
    templateId: opts.template.id,
    createdAt: now,
    updatedAt: now,
  };

  if (opts.autoDistribute) {
    autoDistributeTopics(plan, {
      lockExistingDates: false,
      includeRevisionNeeded: false,
    });
  }

  return plan;
}
