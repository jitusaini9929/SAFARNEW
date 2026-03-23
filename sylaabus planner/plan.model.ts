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
  return d.toISOString().split("T")[0];
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
  patch: Partial<Pick<StudyTopic, "status" | "plannedDate" | "notes">>
): boolean {
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      const topic = chapter.topics.find((item) => item.id === topicId);
      if (!topic) continue;

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
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        const alreadyDone = topic.status === "done";
        const alreadyPlanned = Boolean(topic.plannedDate);
        const isRevision = topic.status === "revision_needed";
        if (alreadyDone) continue;
        if (lockExisting && alreadyPlanned) continue;
        if (isRevision && !includeRevision) continue;
        queue.push(topic);
      }
    }
  }

  queue.sort((a, b) => a.name.localeCompare(b.name));

  const cursor = new Date(from);
  let i = 0;
  let assigned = 0;

  while (i < queue.length && cursor.getTime() <= examDate.getTime()) {
    if (offDays.has(cursor.getDay())) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    for (let slots = 0; slots < dailyGoal && i < queue.length; slots += 1) {
      queue[i].plannedDate = toIsoDateOnly(cursor);
      i += 1;
      assigned += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return { assigned, skipped: Math.max(0, queue.length - assigned) };
}
