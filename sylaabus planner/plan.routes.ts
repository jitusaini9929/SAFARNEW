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
  updateTopicInPlan,
} from "./plan.model";

const router = Router();
router.use(requireAuth);

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
  return ["todo", "in_progress", "done", "revision_needed"].includes(String(input));
}

async function canUsePremiumPlanner(userId: string): Promise<boolean> {
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return false;

  const user = await usersCollection().findOne(
    { _id: userObjectId },
    {
      projection: {
        is_premium: 1,
        subscription_tier: 1,
        paid_features: 1,
        premium_until: 1,
      },
    }
  );

  if (!user) return false;

  const hasTier = ["premium", "pro", "plus"].includes(String((user as any).subscription_tier || "").toLowerCase());
  const hasFlag = Boolean((user as any).is_premium);
  const hasFeature = Array.isArray((user as any).paid_features)
    ? (user as any).paid_features.includes("study_planner_100k")
    : false;

  const premiumUntil = (user as any).premium_until ? new Date((user as any).premium_until) : null;
  const isStillPremium = premiumUntil ? premiumUntil.getTime() > Date.now() : false;

  return hasTier || hasFlag || hasFeature || isStillPremium;
}

function createDefaultPlan(userId: string, payload: any, isPremium: boolean): StudyPlan {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    userId,
    title: String(payload.title || "Untitled Plan").trim(),
    examType: payload.examType ? String(payload.examType).trim() : undefined,
    examDate: payload.examDate ? new Date(payload.examDate).toISOString() : undefined,
    description: payload.description ? String(payload.description).trim() : undefined,
    dailyGoal: payload.dailyGoal ? Math.max(1, Number(payload.dailyGoal)) : undefined,
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
    const plans = await plansCollection()
      .find({ userId })
      .project({
        id: 1,
        title: 1,
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
      const progress = rollupProgress(plan as StudyPlan);
      return {
        ...plan,
        subjectCount: plan.subjects?.length || 0,
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

router.get("/:planId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });

    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const progress = rollupProgress(plan);
    return res.json({ ...plan, progress });
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
        message: "Free tier supports only 1 active plan. Upgrade to premium for unlimited plans.",
      });
    }

    if (!req.body?.title || String(req.body.title).trim().length < 3) {
      return res.status(400).json({ message: "Plan title must be at least 3 characters" });
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

    if (req.body.title !== undefined) patch.title = String(req.body.title).trim();
    if (req.body.examType !== undefined) patch.examType = String(req.body.examType).trim() || undefined;
    if (req.body.description !== undefined) patch.description = String(req.body.description).trim();
    if (req.body.examDate !== undefined) {
      patch.examDate = req.body.examDate ? new Date(req.body.examDate).toISOString() : undefined;
    }
    if (req.body.dailyGoal !== undefined) {
      patch.dailyGoal = req.body.dailyGoal ? Math.max(1, Number(req.body.dailyGoal)) : undefined;
    }
    if (req.body.offDays !== undefined) {
      patch.offDays = clampOffDays(req.body.offDays);
    }

    const result = await plansCollection().findOneAndUpdate(
      { id: req.params.planId, userId },
      { $set: patch },
      { returnDocument: "after" }
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
      return res.status(400).json({ message: "Subject name must be at least 2 characters" });
    }

    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const subject: StudySubject = {
      id: uuidv4(),
      name,
      color: String(req.body?.color || "#0ea5e9"),
      weeklyTarget: req.body?.weeklyTarget ? Number(req.body.weeklyTarget) : undefined,
      monthlyTarget: req.body?.monthlyTarget ? Number(req.body.monthlyTarget) : undefined,
      chapters: [],
    };

    plan.subjects.push(subject);
    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.status(201).json(plan);
  } catch (error) {
    console.error("[PLANNER] Add subject failed:", error);
    return res.status(500).json({ message: "Failed to add subject" });
  }
});

router.delete("/:planId/subjects/:subjectId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    plan.subjects = plan.subjects.filter((s) => s.id !== req.params.subjectId);
    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.json(plan);
  } catch (error) {
    console.error("[PLANNER] Delete subject failed:", error);
    return res.status(500).json({ message: "Failed to delete subject" });
  }
});

router.post("/:planId/subjects/:subjectId/chapters", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) {
      return res.status(400).json({ message: "Chapter name must be at least 2 characters" });
    }

    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
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
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.status(201).json(plan);
  } catch (error) {
    console.error("[PLANNER] Add chapter failed:", error);
    return res.status(500).json({ message: "Failed to add chapter" });
  }
});

router.delete("/:planId/subjects/:subjectId/chapters/:chapterId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const subject = plan.subjects.find((s) => s.id === req.params.subjectId);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    subject.chapters = subject.chapters.filter((c) => c.id !== req.params.chapterId);
    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.json(plan);
  } catch (error) {
    console.error("[PLANNER] Delete chapter failed:", error);
    return res.status(500).json({ message: "Failed to delete chapter" });
  }
});

router.post("/:planId/subjects/:subjectId/chapters/:chapterId/topics", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const name = String(req.body?.name || "").trim();
    if (name.length < 2) {
      return res.status(400).json({ message: "Topic name must be at least 2 characters" });
    }

    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
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

    const topic: StudyTopic = {
      id: uuidv4(),
      name,
      status: "todo",
      notes: req.body?.notes ? String(req.body.notes) : undefined,
      plannedDate: req.body?.plannedDate ? new Date(req.body.plannedDate).toISOString() : undefined,
    };

    chapter.topics.push(topic);
    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.status(201).json(plan);
  } catch (error) {
    console.error("[PLANNER] Add topic failed:", error);
    return res.status(500).json({ message: "Failed to add topic" });
  }
});

router.patch("/:planId/topics/:topicId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (req.body.status !== undefined && !isTopicStatus(req.body.status)) {
      return res.status(400).json({ message: "Invalid topic status" });
    }

    const updated = updateTopicInPlan(plan, req.params.topicId, {
      status: req.body.status,
      plannedDate:
        req.body.plannedDate !== undefined
          ? req.body.plannedDate
            ? new Date(req.body.plannedDate).toISOString()
            : ""
          : undefined,
      notes: req.body.notes,
    });

    if (!updated) {
      return res.status(404).json({ message: "Topic not found" });
    }

    plan.updatedAt = new Date().toISOString();

    await plansCollection().updateOne(
      { id: req.params.planId, userId },
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.json(plan);
  } catch (error) {
    console.error("[PLANNER] Update topic failed:", error);
    return res.status(500).json({ message: "Failed to update topic" });
  }
});

router.delete("/:planId/topics/:topicId", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    let removed = false;
    for (const subject of plan.subjects) {
      for (const chapter of subject.chapters) {
        const before = chapter.topics.length;
        chapter.topics = chapter.topics.filter((topic) => topic.id !== req.params.topicId);
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
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.json(plan);
  } catch (error) {
    console.error("[PLANNER] Delete topic failed:", error);
    return res.status(500).json({ message: "Failed to delete topic" });
  }
});

router.get("/:planId/calendar", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
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
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (!plan.features?.isPremium) {
      return res.status(403).json({ message: "Analytics is available in paid tier only." });
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
    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (!plan.features?.isPremium) {
      return res.status(403).json({
        message: "Auto distribution is a paid feature. Upgrade to unlock this 100k celebration feature.",
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
      { $set: { subjects: plan.subjects, updatedAt: plan.updatedAt } }
    );

    return res.json({
      message: "Auto distribution completed",
      assigned: result.assigned,
      skipped: result.skipped,
      plan,
    });
  } catch (error) {
    console.error("[PLANNER] Auto distribute failed:", error);
    return res.status(500).json({ message: "Failed to auto-distribute topics" });
  }
});

router.post("/:planId/upgrade", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    const plan = await plansCollection().findOne({ id: req.params.planId, userId });
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
      { $set: { features: plan.features, updatedAt: plan.updatedAt } }
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

export default router;
