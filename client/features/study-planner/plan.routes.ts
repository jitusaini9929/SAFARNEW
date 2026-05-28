import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../../server/db";
import { requireAuth } from "../../../server/middleware/auth";
import {
  StudyPlan,
  StudySubject,
  StudyChapter,
  StudyTopic,
  TopicStatus,
  autoDistributeTopics,
  buildCalendarMap,
  clampOffDays,
  rollupProgress,
  toIsoDateOnly,
  updateTopicInPlan,
  createPlanFromTemplate,
} from "./plan.model";
import { getAvailableTemplates, getTemplateById } from "./exam-templates/index";
import { logPlannerEvent } from "./plan.events";

const router = Router();
router.use(requireAuth);
const PLANNER_PREMIUM_BYPASS_EMAILS = [
  "steve123@example.com",
  "safarparmar0@gmail.com",
];
const SYLLABUS_SUBJECT_COLORS = [
  "#6750A4", // M3 Primary
  "#006874", // M3 Cyan
  "#984061", // M3 Rose
  "#386A20", // M3 Green
  "#7D5260", // M3 Tertiary
  "#005FAF", // M3 Blue
  "#E65100", // M3 Orange
  "#004D40", // M3 Teal
];

function getUserId(req: Request): string {
  return req.user?.userId || "";
}

function plansCollection() {
  return getDb().collection<StudyPlan>("study_plans");
}

function usersCollection() {
  return getDb().collection("users");
}

function toObjectId(value: string): ObjectId | null {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function isTopicStatus(input: unknown): input is TopicStatus {
  return ["todo", "in_progress", "done", "revision_needed"].includes(
    String(input),
  );
}

function getDailyGoalLimit(plan: StudyPlan): number {
  return Math.max(1, Number(plan.dailyGoal || 3));
}

function countPlannedActiveTopicsOnDate(
  plan: StudyPlan,
  dateKey: string,
  excludeTopicId?: string,
): number {
  let count = 0;
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        if (excludeTopicId && topic.id === excludeTopicId) continue;
        if (topic.status === "done") continue;
        if (!topic.plannedDate) continue;
        if (toIsoDateOnly(topic.plannedDate) === dateKey) {
          count += 1;
        }
      }
    }
  }
  return count;
}

function findTopicById(plan: StudyPlan, topicId: string): StudyTopic | null {
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      const found = chapter.topics.find((topic) => topic.id === topicId);
      if (found) return found;
    }
  }
  return null;
}

function countAllTopics(plan: StudyPlan): number {
  let total = 0;
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      total += chapter.topics.length;
    }
  }
  return total;
}

function normalizePlannerName(value: unknown): string {
  return String(value ?? "").trim();
}

function plannerNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function withPlannerPremium(plan: StudyPlan): StudyPlan {
  return {
    ...plan,
    features: {
      isPremium: true,
      unlockedAt: plan.features?.unlockedAt || new Date().toISOString(),
    },
  };
}

function createDefaultPlan(userId: string, payload: any): StudyPlan {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    userId,
    title: String(payload.title || "Untitled Plan").trim(),
    examType: payload.examType ? String(payload.examType).trim() : undefined,
    examDate: payload.examDate
      ? new Date(payload.examDate).toISOString()
      : undefined,
    description: payload.description
      ? String(payload.description).trim()
      : undefined,
    dailyGoal: payload.dailyGoal
      ? Math.max(1, Number(payload.dailyGoal))
      : undefined,
    offDays: clampOffDays(payload.offDays),
    subjects: [],
    features: {
      isPremium: true,
      unlockedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await plansCollection()
      .find({ userId })
      .project({
        id: 1,
        title: 1,
        examType: 1,
        examDate: 1,
        description: 1,
        dailyGoal: 1,
        offDays: 1,
        features: 1,
        createdAt: 1,
        updatedAt: 1,
        subjects: 1,
      })
      .toArray();

    const summary = plans.map((plan) => {
      const resolvedPlan = withPlannerPremium(plan as StudyPlan);
      const progress = rollupProgress(resolvedPlan);
      return {
        ...resolvedPlan,
        subjectCount: resolvedPlan.subjects?.length || 0,
        completionPercent: progress.completionPercent,
        totalTopics: progress.totalTopics,
      };
    });

    res.json(summary);
  } catch (error) {
    console.error("[PLANNER] List plans failed:", error);
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

router.post("/:planId/import-syllabus", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const modeRaw = req.body?.mode !== undefined ? String(req.body.mode) : "replace";
    const mode = modeRaw.trim().toLowerCase();
    if (mode !== "replace" && mode !== "merge") {
      return res
        .status(400)
        .json({ message: "mode must be replace or merge" });
    }

    const rawSubjects = Array.isArray(req.body?.subjects)
      ? req.body.subjects
      : null;
    if (!rawSubjects || rawSubjects.length === 0) {
      return res
        .status(400)
        .json({ message: "subjects are required" });
    }

    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const subjectOrder: string[] = [];
    const subjectMap = new Map<
      string,
      {
        name: string;
        chapterOrder: string[];
        chapters: Map<
          string,
          { name: string; topicOrder: string[]; topics: Map<string, string> }
        >;
      }
    >();

    for (const rawSubject of rawSubjects) {
      const subjectName = normalizePlannerName(rawSubject?.name);
      if (!subjectName) {
        return res.status(400).json({ message: "Subject name is required" });
      }

      const rawChapters = Array.isArray(rawSubject?.chapters)
        ? rawSubject.chapters
        : null;
      if (!rawChapters || rawChapters.length === 0) {
        return res
          .status(400)
          .json({ message: "Chapters are required" });
      }

      const subjectKey = plannerNameKey(subjectName);
      let subjectEntry = subjectMap.get(subjectKey);
      if (!subjectEntry) {
        subjectEntry = {
          name: subjectName,
          chapterOrder: [],
          chapters: new Map(),
        };
        subjectMap.set(subjectKey, subjectEntry);
        subjectOrder.push(subjectKey);
      }

      for (const rawChapter of rawChapters) {
        const chapterName = normalizePlannerName(rawChapter?.name);
        if (!chapterName) {
          return res
            .status(400)
            .json({ message: "Chapter name is required" });
        }

        const rawTopics = Array.isArray(rawChapter?.topics)
          ? rawChapter.topics
          : null;
        if (!rawTopics || rawTopics.length === 0) {
          return res
            .status(400)
            .json({ message: "Topics are required" });
        }

        const chapterKey = plannerNameKey(chapterName);
        let chapterEntry = subjectEntry.chapters.get(chapterKey);
        if (!chapterEntry) {
          chapterEntry = {
            name: chapterName,
            topicOrder: [],
            topics: new Map(),
          };
          subjectEntry.chapters.set(chapterKey, chapterEntry);
          subjectEntry.chapterOrder.push(chapterKey);
        }

        for (const rawTopic of rawTopics) {
          const topicName = normalizePlannerName(
            typeof rawTopic === "string" ? rawTopic : rawTopic?.name,
          );
          if (!topicName) {
            return res
              .status(400)
              .json({ message: "Topic name is required" });
          }

          const topicKey = plannerNameKey(topicName);
          if (!chapterEntry.topics.has(topicKey)) {
            chapterEntry.topics.set(topicKey, topicName);
            chapterEntry.topicOrder.push(topicKey);
          }
        }
      }
    }

    const incomingSubjects = subjectOrder.map((subjectKey) => {
      const subjectEntry = subjectMap.get(subjectKey);
      if (!subjectEntry) return null;
      const chapters = subjectEntry.chapterOrder
        .map((chapterKey) => {
          const chapterEntry = subjectEntry.chapters.get(chapterKey);
          if (!chapterEntry) return null;
          const topics = chapterEntry.topicOrder
            .map((topicKey) => chapterEntry.topics.get(topicKey))
            .filter((topic): topic is string => Boolean(topic));
          return {
            name: chapterEntry.name,
            topics,
          };
        })
        .filter(
          (chapter): chapter is { name: string; topics: string[] } =>
            Boolean(chapter),
        );
      return {
        name: subjectEntry.name,
        chapters,
      };
    });

    const cleanedSubjects = incomingSubjects.filter(
      (subject): subject is { name: string; chapters: { name: string; topics: string[] }[] } =>
        Boolean(subject),
    );
    if (cleanedSubjects.length === 0) {
      return res
        .status(400)
        .json({ message: "subjects are required" });
    }

    const incomingTopicCount = cleanedSubjects.reduce((sum, subject) => {
      return (
        sum +
        subject.chapters.reduce((chapterSum, chapter) => {
          return chapterSum + chapter.topics.length;
        }, 0)
      );
    }, 0);

    if (mode === "replace") {
      plan.subjects = cleanedSubjects.map((subject, index) => {
        const chapters: StudyChapter[] = subject.chapters.map((chapter) => {
          const topics: StudyTopic[] = chapter.topics.map((topicName) => ({
            id: uuidv4(),
            name: topicName,
            status: "todo" as TopicStatus,
          }));

          return {
            id: uuidv4(),
            name: chapter.name,
            topics,
          };
        });

        return {
          id: uuidv4(),
          name: subject.name,
          color: SYLLABUS_SUBJECT_COLORS[index % SYLLABUS_SUBJECT_COLORS.length],
          chapters,
        };
      });
    } else {
      const subjectsByKey = new Map(
        plan.subjects.map((subject) => [
          plannerNameKey(subject.name),
          subject,
        ]),
      );
      let colorIndex = plan.subjects.length;

      for (const subject of cleanedSubjects) {
        const subjectKey = plannerNameKey(subject.name);
        let targetSubject = subjectsByKey.get(subjectKey);
        if (!targetSubject) {
          targetSubject = {
            id: uuidv4(),
            name: subject.name,
            color:
              SYLLABUS_SUBJECT_COLORS[
                colorIndex % SYLLABUS_SUBJECT_COLORS.length
              ],
            chapters: [],
          };
          colorIndex += 1;
          plan.subjects.push(targetSubject);
          subjectsByKey.set(subjectKey, targetSubject);
        }

        const chaptersByKey = new Map(
          targetSubject.chapters.map((chapter) => [
            plannerNameKey(chapter.name),
            chapter,
          ]),
        );

        for (const chapter of subject.chapters) {
          const chapterKey = plannerNameKey(chapter.name);
          let targetChapter = chaptersByKey.get(chapterKey);
          if (!targetChapter) {
            targetChapter = {
              id: uuidv4(),
              name: chapter.name,
              topics: [],
            };
            targetSubject.chapters.push(targetChapter);
            chaptersByKey.set(chapterKey, targetChapter);
          }

          const topicKeys = new Set(
            targetChapter.topics.map((topic) => plannerNameKey(topic.name)),
          );

          for (const topicName of chapter.topics) {
            const topicKey = plannerNameKey(topicName);
            if (topicKeys.has(topicKey)) continue;
            targetChapter.topics.push({
              id: uuidv4(),
              name: topicName,
              status: "todo" as TopicStatus,
            });
            topicKeys.add(topicKey);
          }
        }
      }
    }

    const previousUpdatedAt = plan.updatedAt;
    const newUpdatedAt = new Date().toISOString();

    const writeResult = await plansCollection().updateOne(
      { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
      { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
    );
    if (writeResult.matchedCount === 0) {
      return res.status(409).json({
        code: "CONFLICT",
        message: "Plan was modified by another request. Please refresh and retry.",
      });
    }
    plan.updatedAt = newUpdatedAt;

    return res.json(plan);
  } catch (error) {
    console.error("[PLANNER] Import syllabus failed:", error);
    return res.status(500).json({ message: "Failed to import syllabus" });
  }
});

// ── Delete Plan ──

router.delete("/:planId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { planId } = req.params;

    const plan = await plansCollection().findOne({ id: planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    await plansCollection().deleteOne({ id: planId, userId });
    logPlannerEvent(userId, planId, "plan_deleted", { title: plan.title });

    return res.json({ success: true });
  } catch (error) {
    console.error("[PLANNER] Delete plan failed:", error);
    return res.status(500).json({ message: "Failed to delete plan" });
  }
});

// ── Exam Templates ──

router.get("/templates", async (_req: Request, res: Response) => {
  try {
    const templates = getAvailableTemplates();
    return res.json(templates);
  } catch (error) {
    console.error("[PLANNER] List templates failed:", error);
    return res.status(500).json({ message: "Failed to fetch templates" });
  }
});

router.get("/templates/:templateId", async (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    return res.json(template);
  } catch (error) {
    console.error("[PLANNER] Get template failed:", error);
    return res.status(500).json({ message: "Failed to fetch template" });
  }
});

router.post("/from-template", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const { templateId, title, examDate, dailyGoal, offDays, autoDistribute } =
      req.body || {};

    if (!templateId) {
      return res.status(400).json({ message: "templateId is required" });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const plan = createPlanFromTemplate({
      userId,
      template,
      title,
      examDate,
      dailyGoal: dailyGoal ? Math.max(1, Number(dailyGoal)) : undefined,
      offDays,
      isPremium: true,
      autoDistribute: Boolean(autoDistribute),
    });

    await plansCollection().insertOne(plan);

    const progress = rollupProgress(plan);

    logPlannerEvent(userId, plan.id, "plan_created", {
      templateId,
      totalTopics: progress.totalTopics,
      autoDistribute: Boolean(autoDistribute),
    });

    return res.status(201).json({ ...plan, progress });
  } catch (error) {
    console.error("[PLANNER] Create from template failed:", error);
    return res
      .status(500)
      .json({ message: "Failed to create plan from template" });
  }
});

router.get("/:planId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const resolvedPlan = withPlannerPremium(plan);
    const progress = rollupProgress(resolvedPlan);
    return res.json({ ...resolvedPlan, progress });
  } catch (error) {
    console.error("[PLANNER] Fetch plan failed:", error);
    return res.status(500).json({ message: "Failed to fetch plan" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!req.body?.title || String(req.body.title).trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Plan title must be at least 3 characters" });
    }

    const plan = createDefaultPlan(userId, req.body);
    await plansCollection().insertOne(plan);

    return res.status(201).json(plan);
  } catch (error) {
    console.error("[PLANNER] Create plan failed:", error);
    return res.status(500).json({ message: "Failed to create plan" });
  }
});

router.patch("/:planId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const patch: Partial<StudyPlan> = {
      updatedAt: new Date().toISOString(),
    };

    if (req.body.title !== undefined)
      patch.title = String(req.body.title).trim();
    if (req.body.examType !== undefined)
      patch.examType = String(req.body.examType).trim() || undefined;
    if (req.body.description !== undefined)
      patch.description = String(req.body.description).trim();
    if (req.body.examDate !== undefined) {
      patch.examDate = req.body.examDate
        ? new Date(req.body.examDate).toISOString()
        : undefined;
    }
    if (req.body.dailyGoal !== undefined) {
      patch.dailyGoal = req.body.dailyGoal
        ? Math.max(1, Number(req.body.dailyGoal))
        : undefined;
    }
    if (req.body.offDays !== undefined) {
      patch.offDays = clampOffDays(req.body.offDays);
    }

    const result = await plansCollection().findOneAndUpdate(
      { id: req.params.planId, userId },
      { $set: patch },
      { returnDocument: "after" },
    );

    if (!result) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.json(result);
  } catch (error) {
    console.error("[PLANNER] Update plan failed:", error);
    return res.status(500).json({ message: "Failed to update plan" });
  }
});



router.post("/:planId/subjects", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) {
      return res
        .status(400)
        .json({ message: "Subject name must be at least 2 characters" });
    }

    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const subject: StudySubject = {
      id: uuidv4(),
      name,
      color: String(req.body?.color || "#0ea5e9"),
      weeklyTarget: req.body?.weeklyTarget
        ? Number(req.body.weeklyTarget)
        : undefined,
      monthlyTarget: req.body?.monthlyTarget
        ? Number(req.body.monthlyTarget)
        : undefined,
      chapters: [],
    };

    plan.subjects.push(subject);
    const previousUpdatedAt = plan.updatedAt;
    const newUpdatedAt = new Date().toISOString();

    const writeResult = await plansCollection().updateOne(
      { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
      { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
    );
    if (writeResult.matchedCount === 0) {
      return res.status(409).json({
        code: "CONFLICT",
        message: "Plan was modified by another request. Please refresh and retry.",
      });
    }
    plan.updatedAt = newUpdatedAt;

    return res.status(201).json(plan);
  } catch (error) {
    console.error("[PLANNER] Add subject failed:", error);
    return res.status(500).json({ message: "Failed to add subject" });
  }
});

router.patch(
  "/:planId/subjects/:subjectId",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const nextName =
        req.body?.name !== undefined ? String(req.body.name).trim() : undefined;

      if (nextName === undefined) {
        return res
          .status(400)
          .json({ message: "No subject updates were provided" });
      }

      if (nextName.length < 2) {
        return res
          .status(400)
          .json({ message: "Subject name must be at least 2 characters" });
      }

      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      subject.name = nextName;
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.json(plan);
    } catch (error) {
      console.error("[PLANNER] Update subject failed:", error);
      return res.status(500).json({ message: "Failed to update subject" });
    }
  },
);

router.delete(
  "/:planId/subjects/:subjectId",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      plan.subjects = plan.subjects.filter(
        (s) => s.id !== req.params.subjectId,
      );
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.json(plan);
    } catch (error) {
      console.error("[PLANNER] Delete subject failed:", error);
      return res.status(500).json({ message: "Failed to delete subject" });
    }
  },
);

router.post(
  "/:planId/subjects/:subjectId/chapters",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const name = String(req.body?.name || "").trim();
      if (name.length < 2) {
        return res
          .status(400)
          .json({ message: "Chapter name must be at least 2 characters" });
      }

      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const chapter: StudyChapter = {
        id: uuidv4(),
        name,
        topics: [],
      };

      subject.chapters.push(chapter);
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.status(201).json(plan);
    } catch (error) {
      console.error("[PLANNER] Add chapter failed:", error);
      return res.status(500).json({ message: "Failed to add chapter" });
    }
  },
);

router.patch(
  "/:planId/subjects/:subjectId/chapters/:chapterId",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const nextName =
        req.body?.name !== undefined ? String(req.body.name).trim() : undefined;

      if (nextName === undefined) {
        return res
          .status(400)
          .json({ message: "No chapter updates were provided" });
      }

      if (nextName.length < 2) {
        return res
          .status(400)
          .json({ message: "Chapter name must be at least 2 characters" });
      }

      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const chapter = subject.chapters.find(
        (c) => c.id === req.params.chapterId,
      );
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      chapter.name = nextName;
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.json(plan);
    } catch (error) {
      console.error("[PLANNER] Update chapter failed:", error);
      return res.status(500).json({ message: "Failed to update chapter" });
    }
  },
);

router.delete(
  "/:planId/subjects/:subjectId/chapters/:chapterId",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      subject.chapters = subject.chapters.filter(
        (c) => c.id !== req.params.chapterId,
      );
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.json(plan);
    } catch (error) {
      console.error("[PLANNER] Delete chapter failed:", error);
      return res.status(500).json({ message: "Failed to delete chapter" });
    }
  },
);

router.post(
  "/:planId/subjects/:subjectId/chapters/:chapterId/topics",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const name = String(req.body?.name || "").trim();
      if (name.length < 2) {
        return res
          .status(400)
          .json({ message: "Topic name must be at least 2 characters" });
      }

      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const chapter = subject.chapters.find(
        (c) => c.id === req.params.chapterId,
      );
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      let plannedDateIso: string | undefined;
      if (req.body?.plannedDate) {
        const parsedPlannedDate = new Date(req.body.plannedDate);
        if (Number.isNaN(parsedPlannedDate.getTime())) {
          return res.status(400).json({ message: "Invalid planned date" });
        }
        plannedDateIso = parsedPlannedDate.toISOString();
        const plannedDateKey = toIsoDateOnly(plannedDateIso);
        const dailyGoalLimit = getDailyGoalLimit(plan);
        const alreadyPlannedCount = countPlannedActiveTopicsOnDate(
          plan,
          plannedDateKey,
        );
        if (alreadyPlannedCount >= dailyGoalLimit) {
          return res.status(400).json({
            message: `Daily goal limit reached for ${plannedDateKey}. Limit: ${dailyGoalLimit}`,
          });
        }
      }

      const topic: StudyTopic = {
        id: uuidv4(),
        name,
        status: "todo",
        notes: req.body?.notes ? String(req.body.notes) : undefined,
        plannedDate: plannedDateIso,
      };

      chapter.topics.push(topic);
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.status(201).json(plan);
    } catch (error) {
      console.error("[PLANNER] Add topic failed:", error);
      return res.status(500).json({ message: "Failed to add topic" });
    }
  },
);

router.post(
  "/:planId/subjects/:subjectId/chapters/:chapterId/bulk-topics",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const topicsPayload = req.body?.topics;
      
      if (!Array.isArray(topicsPayload) || topicsPayload.length === 0) {
        return res.status(400).json({ message: "Topics array is required" });
      }

      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      const chapter = subject.chapters.find((c) => c.id === req.params.chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      const newTopics: StudyTopic[] = [];

      for (const t of topicsPayload) {
        const name = String(t.name || "").trim();
        if (name.length < 2) continue; // Skip invalid names

        let plannedDateIso: string | undefined;
        if (t.plannedDate) {
          const parsedPlannedDate = new Date(t.plannedDate);
          if (!Number.isNaN(parsedPlannedDate.getTime())) {
            plannedDateIso = parsedPlannedDate.toISOString();
          }
        }

        newTopics.push({
          id: uuidv4(),
          name,
          status: "todo",
          notes: t.notes ? String(t.notes) : undefined,
          plannedDate: plannedDateIso,
        });
      }

      if (newTopics.length === 0) {
        return res.status(400).json({ message: "No valid topics provided" });
      }

      chapter.topics.push(...newTopics);
      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.status(201).json(plan);
    } catch (error) {
      console.error("[PLANNER] Add bulk topics failed:", error);
      return res.status(500).json({ message: "Failed to add bulk topics" });
    }
  },
);

router.patch(
  "/:planId/topics/:topicId",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (req.body.status !== undefined && !isTopicStatus(req.body.status)) {
        return res.status(400).json({ message: "Invalid topic status" });
      }

      let nextName: string | undefined = undefined;
      if (req.body.name !== undefined) {
        nextName = String(req.body.name).trim();
        if (nextName.length < 2) {
          return res
            .status(400)
            .json({ message: "Topic name must be at least 2 characters" });
        }
      }

      let nextPlannedDate: string | "" | undefined = undefined;
      if (req.body.plannedDate !== undefined) {
        if (!req.body.plannedDate) {
          nextPlannedDate = "";
        } else {
          const parsedPlannedDate = new Date(req.body.plannedDate);
          if (Number.isNaN(parsedPlannedDate.getTime())) {
            return res.status(400).json({ message: "Invalid planned date" });
          }
          nextPlannedDate = parsedPlannedDate.toISOString();
        }
      }

      if (nextPlannedDate) {
        const topicToUpdate = findTopicById(plan, req.params.topicId);
        if (!topicToUpdate) {
          return res.status(404).json({ message: "Topic not found" });
        }

        const nextStatus = (req.body.status ??
          topicToUpdate.status) as TopicStatus;
        if (nextStatus !== "done") {
          const plannedDateKey = toIsoDateOnly(nextPlannedDate);
          const dailyGoalLimit = getDailyGoalLimit(plan);
          const alreadyPlannedCount = countPlannedActiveTopicsOnDate(
            plan,
            plannedDateKey,
            req.params.topicId,
          );
          if (alreadyPlannedCount >= dailyGoalLimit) {
            return res.status(400).json({
              message: `Daily goal limit reached for ${plannedDateKey}. Limit: ${dailyGoalLimit}`,
            });
          }
        }
      }

      const updated = updateTopicInPlan(plan, req.params.topicId, {
        name: nextName,
        status: req.body.status,
        plannedDate: nextPlannedDate,
        notes: req.body.notes,
      });

      if (!updated) {
        return res.status(404).json({ message: "Topic not found" });
      }

      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      // Event logging for status changes
      if (req.body.status !== undefined) {
        const eventType =
          req.body.status === "done"
            ? ("topic_completed" as const)
            : ("topic_status_changed" as const);
        logPlannerEvent(userId, plan.id, eventType, {
          topicId: req.params.topicId,
          newStatus: req.body.status,
        });
      }

      return res.json(plan);
    } catch (error) {
      console.error("[PLANNER] Update topic failed:", error);
      return res.status(500).json({ message: "Failed to update topic" });
    }
  },
);

router.delete(
  "/:planId/topics/:topicId",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const plan = await plansCollection().findOne({
        id: req.params.planId,
        userId,
      });
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      let removed = false;
      for (const subject of plan.subjects) {
        for (const chapter of subject.chapters) {
          const before = chapter.topics.length;
          chapter.topics = chapter.topics.filter(
            (topic) => topic.id !== req.params.topicId,
          );
          if (chapter.topics.length !== before) {
            removed = true;
            break;
          }
        }
        if (removed) break;
      }

      if (!removed) {
        return res.status(404).json({ message: "Topic not found" });
      }

      const previousUpdatedAt = plan.updatedAt;
      const newUpdatedAt = new Date().toISOString();

      const writeResult = await plansCollection().updateOne(
        { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
        { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
      );
      if (writeResult.matchedCount === 0) {
        return res.status(409).json({
          code: "CONFLICT",
          message: "Plan was modified by another request. Please refresh and retry.",
        });
      }
      plan.updatedAt = newUpdatedAt;

      return res.json(plan);
    } catch (error) {
      console.error("[PLANNER] Delete topic failed:", error);
      return res.status(500).json({ message: "Failed to delete topic" });
    }
  },
);

router.get("/:planId/calendar", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    return res.json(buildCalendarMap(plan));
  } catch (error) {
    console.error("[PLANNER] Build calendar failed:", error);
    return res.status(500).json({ message: "Failed to build calendar" });
  }
});

router.get("/:planId/analytics", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const progress = rollupProgress(plan);

    return res.json({ progress });
  } catch (error) {
    console.error("[PLANNER] Analytics failed:", error);
    return res.status(500).json({ message: "Failed to compute analytics" });
  }
});

router.post("/:planId/auto-distribute", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const result = autoDistributeTopics(plan, {
      fromDate: req.body?.fromDate,
      lockExistingDates: req.body?.lockExistingDates,
      includeRevisionNeeded: req.body?.includeRevisionNeeded,
      overloadMode: req.body?.overloadMode,
    });

    const previousUpdatedAt = plan.updatedAt;
    const newUpdatedAt = new Date().toISOString();

    const writeResult = await plansCollection().updateOne(
      { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
      { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
    );
    if (writeResult.matchedCount === 0) {
      return res.status(409).json({
        code: "CONFLICT",
        message: "Plan was modified by another request. Please refresh and retry.",
      });
    }
    plan.updatedAt = newUpdatedAt;

    logPlannerEvent(userId, plan.id, "reschedule_triggered", {
      assigned: result.assigned,
      skipped: result.skipped,
    });

    return res.json({
      message: "Auto distribution completed",
      assigned: result.assigned,
      skipped: result.skipped,
      plan,
    });
  } catch (error) {
    console.error("[PLANNER] Auto distribute failed:", error);
    return res
      .status(500)
      .json({ message: "Failed to auto-distribute topics" });
  }
});

router.post("/:planId/upgrade", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const previousUpdatedAt = plan.updatedAt;
    plan.features = {
      isPremium: true,
      unlockedAt: new Date().toISOString(),
    };
    const newUpdatedAt = new Date().toISOString();

    const writeResult = await plansCollection().updateOne(
      { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
      { $set: { features: plan.features, updatedAt: newUpdatedAt } },
    );
    if (writeResult.matchedCount === 0) {
      return res.status(409).json({
        code: "CONFLICT",
        message: "Plan was modified by another request. Please refresh and retry.",
      });
    }
    plan.updatedAt = newUpdatedAt;

    return res.json({
      message: "Planner premium unlocked",
      plan,
    });
  } catch (error) {
    console.error("[PLANNER] Upgrade failed:", error);
    return res.status(500).json({ message: "Failed to upgrade planner" });
  }
});

// AI Syllabus Import Integration
router.post("/:planId/syllabus-ai", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const { aiPreview } = req.body as { aiPreview?: { subjects?: any[] } };
    if (!aiPreview || !Array.isArray(aiPreview.subjects)) {
      return res.status(400).json({ message: "aiPreview and subjects are required" });
    }

    // Build the new subjects
    const newSubjects: StudySubject[] = aiPreview.subjects.map((s: any, idx: number) => {
      const chapters: StudyChapter[] = (s.chapters || []).map((c: any) => {
        const topics: StudyTopic[] = (c.topics || []).map((topicName: string) => ({
          id: uuidv4(),
          name: topicName.trim(),
          status: "todo" as TopicStatus,
        }));
        return {
          id: uuidv4(),
          name: c.name.trim(),
          topics,
        };
      });

      return {
        id: uuidv4(),
        name: s.name.trim(),
        color: SYLLABUS_SUBJECT_COLORS[idx % SYLLABUS_SUBJECT_COLORS.length],
        chapters,
      };
    });

    const previousUpdatedAt = plan.updatedAt;
    plan.subjects = newSubjects;

    // Auto-distribute
    autoDistributeTopics(plan, {
      lockExistingDates: false,
      includeRevisionNeeded: false,
    });

    const newUpdatedAt = new Date().toISOString();

    const writeResult = await plansCollection().updateOne(
      { id: req.params.planId, userId, updatedAt: previousUpdatedAt },
      { $set: { subjects: plan.subjects, updatedAt: newUpdatedAt } },
    );
    if (writeResult.matchedCount === 0) {
      return res.status(409).json({
        code: "CONFLICT",
        message: "Plan was modified by another request. Please refresh and retry.",
      });
    }
    plan.updatedAt = newUpdatedAt;

    return res.json({ success: true, plan });
  } catch (error) {
    console.error("[PLANNER] AI syllabus import failed:", error);
    return res.status(500).json({ message: "Failed to apply AI syllabus" });
  }
});

export default router;
