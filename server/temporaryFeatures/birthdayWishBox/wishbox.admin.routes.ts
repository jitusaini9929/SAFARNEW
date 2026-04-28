import { Router, Request, Response } from "express";
import { collections } from "../../db";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { QUERY_FAST_TIMEOUT_MS } from "../../utils/queryDefaults";
import { WISHBOX_CONFIG, isWishBoxAdminWindowOpen } from "./wishbox.config";
import {
  invalidateWishboxPublicCaches,
  invalidateWishboxStatsCache,
} from "./wishbox.cache";

export const wishboxAdminRoutes = Router();

wishboxAdminRoutes.use(requireAuth, requireAdmin);

function ensureAdminWindowOpen(res: Response): boolean {
  if (isWishBoxAdminWindowOpen()) return true;
  res.status(403).json({ success: false, message: "Wish Box admin window is closed." });
  return false;
}

wishboxAdminRoutes.get("/wishes", async (req: Request, res: Response) => {
  if (!ensureAdminWindowOpen(res)) return;

  const status = String(req.query.status || "pending").trim().toLowerCase();
  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 50)));
  const skip = (page - 1) * limit;

  const filters: any = { eventKey: WISHBOX_CONFIG.eventKey };
  if (status !== "all") {
    filters.status = status;
  }

  const wishes = await collections.birthdayWishes()
    .find(filters, {
      projection: {
        _id: 0,
        id: 1,
        userId: 1,
        displayName: 1,
        isAnonymous: 1,
        message: 1,
        status: 1,
        moderation: 1,
        createdAt: 1,
      },
      maxTimeMS: QUERY_FAST_TIMEOUT_MS,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const userIds = [...new Set(wishes.map((wish) => wish.userId))];
  const users = userIds.length
    ? await collections.users()
        .find({ id: { $in: userIds } }, { projection: { id: 1, email: 1, name: 1 } })
        .toArray()
    : [];

  const userMap = new Map(users.map((user) => [user.id, user]));

  const payload = wishes.map((wish) => {
    const user = userMap.get(wish.userId);
    return {
      ...wish,
      user: user
        ? { id: user.id, name: user.name, email: user.email }
        : { id: wish.userId, name: null, email: null },
    };
  });

  return res.json({ wishes: payload, page, hasMore: wishes.length === limit });
});

wishboxAdminRoutes.patch("/wishes/:wishId/status", async (req: Request, res: Response) => {
  if (!ensureAdminWindowOpen(res)) return;

  const wishId = String(req.params.wishId || "").trim();
  const status = String(req.body?.status || "").trim().toLowerCase();
  const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 280) : null;
  const validStatuses = new Set(["approved", "rejected", "flagged"]);

  if (!wishId) {
    return res.status(400).json({ success: false, message: "Wish id is required." });
  }

  if (!validStatuses.has(status)) {
    return res.status(400).json({ success: false, message: "Invalid status." });
  }

  const wish = await collections.birthdayWishes().findOne(
    { id: wishId, eventKey: WISHBOX_CONFIG.eventKey },
    { projection: { _id: 0, id: 1, isAnonymous: 1 } },
  );

  if (!wish) {
    return res.status(404).json({ success: false, message: "Wish not found." });
  }

  const now = new Date();
  const shouldPublic = status === "approved" && !wish.isAnonymous;

  await collections.birthdayWishes().updateOne(
    { id: wishId, eventKey: WISHBOX_CONFIG.eventKey },
    {
      $set: {
        status,
        publicVisible: shouldPublic,
        updatedAt: now,
        moderation: {
          method: "manual",
          language: "unknown",
          toxicityScore: 0,
          categories: [],
          reason,
          checkedAt: now,
        },
      },
    },
  );

  await invalidateWishboxStatsCache();
  await invalidateWishboxPublicCaches();

  return res.json({ success: true });
});
