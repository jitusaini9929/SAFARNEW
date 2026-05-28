import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 3;

const normalizeText = (value: unknown, maxLength = MAX_MESSAGE_LENGTH) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

router.use(requireAuth);

router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const rawMessage = req.body?.message;
    const message = normalizeText(rawMessage);
    const rawType = req.body?.type;
    const type = normalizeText(rawType, 64).toLowerCase() || "general";

    const rating =
      typeof req.body?.rating === "number"
        ? Math.max(1, Math.min(5, Math.round(req.body.rating)))
        : undefined;

    const page = normalizeText(req.body?.page, 256) || null;
    const feature = normalizeText(req.body?.feature, 128) || null;
    const trigger = normalizeText(req.body?.trigger, 64) || null;

    const context =
      req.body?.context && typeof req.body.context === "object"
        ? req.body.context
        : undefined;

    if (!message || message.length < MIN_MESSAGE_LENGTH) {
      return res
        .status(400)
        .json({ message: "Feedback must be at least 3 characters." });
    }

    const user = await collections
      .users()
      .findOne(
        { id: userId },
        { projection: { _id: 0, id: 1, name: 1, email: 1 } },
      );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const now = new Date();

    const document: any = {
      id: uuidv4(),
      user_id: userId,
      user_name: String(user.name || "User"),
      user_email: String(user.email || ""),
      message,
      type,
      rating: typeof rating === "number" ? rating : null,
      page,
      feature,
      trigger,
      context: context ?? null,
      created_at: now,
      updated_at: now,
    };

    await collections.feedbackEntries().insertOne(document);

    return res.status(201).json({
      feedback: {
        id: String(document.id),
        message: document.message,
        type: document.type,
        rating: document.rating,
        page: document.page,
        feature: document.feature,
        trigger: document.trigger,
        createdAt: document.created_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create feedback entry error:", error);
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
});

export const feedbackRoutes = router;

