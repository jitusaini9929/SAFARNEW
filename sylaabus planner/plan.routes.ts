import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../server/db";
import { requireAuth } from "../server/middleware/auth";
import {
  StudyPlan,
  StudySubject,
  StudyChapter,
  StudyTopic,
  TopicStatus,
  autoDistributeTopics,
  buildCalendarMap,
  buildStudyHeatmap,
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

const FREE_TIER_TOPIC_LIMIT = 30;

function countAllTopics(plan: StudyPlan): number {
  let total = 0;
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      total += chapter.topics.length;
    }
  }
  return total;
}

async function canUsePremiumPlanner(userId: string): Promise<boolean> {
  const projection = {
    id: 1,
    email: 1,
    is_premium: 1,
    subscription_tier: 1,
    paid_features: 1,
    premium_until: 1,
  };

  // App auth uses a UUID string stored in `users.id` as the JWT subject.
  // Keep backward compatibility with ObjectId-based subjects by trying both.
  let user = await usersCollection().findOne(
    { id: userId },
    {
      projection,
    },
  );

  if (!user) {
    const userObjectId = toObjectId(userId);
    if (userObjectId) {
      user = await usersCollection().findOne(
        { _id: userObjectId },
        {
          projection,
        },
      );
    }
  }

  if (!user) return false;

  // Explicit account-level bypass for planner premium.
  const email = String((user as any).email || "")
    .trim()
    .toLowerCase();
  const devPremiumEmails = String(
    process.env.DEV_PREMIUM_EMAILS || PLANNER_PREMIUM_BYPASS_EMAILS.join(","),
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (email && devPremiumEmails.includes(email)) {
    return true;
  }

  const hasTier = ["premium", "pro", "plus"].includes(
    String((user as any).subscription_tier || "").toLowerCase(),
  );
  const hasFlag = Boolean((user as any).is_premium);
  const hasFeature = Array.isArray((user as any).paid_features)
    ? (user as any).paid_features.includes("study_planner_100k")
    : false;

  const premiumUntil = (user as any).premium_until
    ? new Date((user as any).premium_until)
    : null;
  const isStillPremium = premiumUntil
    ? premiumUntil.getTime() > Date.now()
    : false;

  return hasTier || hasFlag || hasFeature || isStillPremium;
}

function withResolvedPlannerPremium(
  plan: StudyPlan,
  isPremium: boolean,
): StudyPlan {
  if (!isPremium || plan.features?.isPremium) {
    return plan;
  }

  return {
    ...plan,
    features: {
      isPremium: true,
      unlockedAt: plan.features?.unlockedAt || new Date().toISOString(),
    },
  };
}

function createDefaultPlan(
  userId: string,
  payload: any,
  isPremium: boolean,
): StudyPlan {
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
      isPremium,
      unlockedAt: isPremium ? now : undefined,
    },
    createdAt: now,
    updatedAt: now,
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const isPremium = await canUsePremiumPlanner(userId);
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
      const resolvedPlan = withResolvedPlannerPremium(
        plan as StudyPlan,
        isPremium,
      );
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
    const isPremium = await canUsePremiumPlanner(userId);

    const activePlanCount = await plansCollection().countDocuments({ userId });
    if (!isPremium && activePlanCount >= 1) {
      return res.status(403).json({
        message:
          "Free tier supports only 1 active plan. Upgrade to premium for unlimited plans.",
      });
    }

    const { templateId, title, examDate, dailyGoal, offDays, autoDistribute } =
      req.body || {};

    if (!templateId) {
      return res.status(400).json({ message: "templateId is required" });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Free tier: only allow CGL template
    if (!isPremium && templateId !== "ssc-cgl-tier1") {
      return res.status(403).json({
        message:
          "This template is available for Pro users. Upgrade to unlock all exam templates.",
      });
    }

    const plan = createPlanFromTemplate({
      userId,
      template,
      title,
      examDate,
      dailyGoal: dailyGoal ? Math.max(1, Number(dailyGoal)) : undefined,
      offDays,
      isPremium,
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

    const isPremium = await canUsePremiumPlanner(userId);
    const resolvedPlan = withResolvedPlannerPremium(plan, isPremium);
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
    const isPremium = await canUsePremiumPlanner(userId);

    const activePlanCount = await plansCollection().countDocuments({ userId });
    if (!isPremium && activePlanCount >= 1) {
      return res.status(403).json({
        message:
          "Free tier supports only 1 active plan. Upgrade to premium for unlimited plans.",
      });
    }

    if (!req.body?.title || String(req.body.title).trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Plan title must be at least 3 characters" });
    }

    const plan = createDefaultPlan(userId, req.body, isPremium);
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

router.delete("/:planId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await plansCollection().deleteOne({ id: req.params.planId, userId });
    return res.json({ ok: true });
  } catch (error) {
    console.error("[PLANNER] Delete plan failed:", error);
    return res.status(500).json({ message: "Failed to delete plan" });
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
    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
    );

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
      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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
      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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
      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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
      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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
      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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
      const isPremium = await canUsePremiumPlanner(userId);
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

      // ── Free tier: 30-topic limit ──
      if (!(plan.features?.isPremium || isPremium)) {
        const currentTopicCount = countAllTopics(plan);
        if (currentTopicCount >= FREE_TIER_TOPIC_LIMIT) {
          return res.status(403).json({
            code: "TOPIC_LIMIT",
            message: `Free plans support up to ${FREE_TIER_TOPIC_LIMIT} topics. Upgrade to Premium for unlimited topics.`,
            currentCount: currentTopicCount,
            limit: FREE_TIER_TOPIC_LIMIT,
          });
        }
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
      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

      return res.status(201).json(plan);
    } catch (error) {
      console.error("[PLANNER] Add topic failed:", error);
      return res.status(500).json({ message: "Failed to add topic" });
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

      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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

      plan.updatedAt = new Date().toISOString();

      await plansCollection().updateOne(
        { id: req.params.planId, userId },
        { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
      );

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
    const heatmap = buildStudyHeatmap(plan);

    return res.json({ progress, heatmap });
  } catch (error) {
    console.error("[PLANNER] Analytics failed:", error);
    return res.status(500).json({ message: "Failed to compute analytics" });
  }
});

router.post("/:planId/auto-distribute", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const isPremium = await canUsePremiumPlanner(userId);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // ── Free tier: Auto-Schedule is premium only ──
    if (!(plan.features?.isPremium || isPremium)) {
      return res.status(403).json({
        code: "PREMIUM_REQUIRED",
        message:
          "Auto-Schedule is a Premium feature. Upgrade to build your study calendar in one click.",
      });
    }

    const result = autoDistributeTopics(plan, {
      fromDate: req.body?.fromDate,
      lockExistingDates: req.body?.lockExistingDates,
      includeRevisionNeeded: req.body?.includeRevisionNeeded,
    });

    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } },
    );

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

    plan.features = {
      isPremium: true,
      unlockedAt: new Date().toISOString(),
    };
    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { features: plan.features, updatedAt: plan.updatedAt } },
    );

    return res.json({
      message: "Planner premium unlocked",
      plan,
    });
  } catch (error) {
    console.error("[PLANNER] Upgrade failed:", error);
    return res.status(500).json({ message: "Failed to upgrade planner" });
  }
});

// ── Daily Check-in ──

router.post("/:planId/checkin", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({
      id: req.params.planId,
      userId,
    });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    logPlannerEvent(userId, plan.id, "daily_checkin", {
      date: new Date().toISOString().split("T")[0],
    });

    return res.json({ ok: true, message: "Check-in recorded" });
  } catch (error) {
    console.error("[PLANNER] Daily checkin failed:", error);
    return res.status(500).json({ message: "Failed to record check-in" });
  }
});

export default router;
