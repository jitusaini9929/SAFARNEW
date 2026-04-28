import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../../db";
import { requireAuth } from "../../middleware/auth";
import { cacheGet, cacheSet } from "../../lib/redis-cache";
import { QUERY_FAST_TIMEOUT_MS } from "../../utils/queryDefaults";
import { redisRateLimit } from "../../middleware/redis-rate-limit";
import {
  WISHBOX_CONFIG,
  getWishBoxInactiveMessage,
  getWishBoxPurgeAt,
  isWishBoxActive,
} from "./wishbox.config";
import {
  getPublicWishesCacheKey,
  getWishboxStatsCacheKey,
  invalidateWishboxPublicCaches,
  invalidateWishboxStatsCache,
} from "./wishbox.cache";
import {
  getLocalModerationDecision,
  hashNormalizedMessage,
  normalizeText,
  validateWishMessage,
} from "./wishbox.moderation";

export const wishboxRoutes = Router();

const MAX_PUBLIC_PAGE_SIZE = 30;
const wishboxSubmitLimiter = redisRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: `wishbox:${WISHBOX_CONFIG.eventKey}:submit`,
});

function ensureWishboxActive(res: Response): boolean {
  if (isWishBoxActive()) return true;
  res.status(403).json({ success: false, message: getWishBoxInactiveMessage() });
  return false;
}

function sanitizeDisplayName(value: unknown, fallback?: string | null): string | null {
  const cleaned = String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned && fallback) return fallback;
  if (!cleaned) return null;
  return cleaned.slice(0, 64);
}

wishboxRoutes.post("/wishes", requireAuth, wishboxSubmitLimiter, async (req: any, res: Response) => {
  if (!ensureWishboxActive(res)) return;

  const userId = req.user?.userId || req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Login required." });
  }

  const rawMessage = String(req.body?.message || "");
  const validationError = validateWishMessage(rawMessage);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const normalized = normalizeText(rawMessage);
  const normalizedHash = hashNormalizedMessage(normalized);

  const isAnonymous = Boolean(req.body?.isAnonymous);
  const requestedDisplayName = req.body?.displayName;

  let userDisplayName: string | null = null;
  try {
    const user = await collections.users().findOne(
      { id: userId },
      { projection: { name: 1 }, maxTimeMS: QUERY_FAST_TIMEOUT_MS },
    );
    userDisplayName = user?.name ? String(user.name) : null;
  } catch {
    userDisplayName = null;
  }

  const displayName = isAnonymous ? null : sanitizeDisplayName(requestedDisplayName, userDisplayName);

  const localDecision = getLocalModerationDecision(rawMessage);
  const now = new Date();

  const wishBase: any = {
    id: uuidv4(),
    eventKey: WISHBOX_CONFIG.eventKey,
    displayName,
    isAnonymous,
    message: rawMessage.trim(),
    normalizedMessageHash: normalizedHash,
    createdAt: now,
    updatedAt: now,
  };

  const wish = {
    ...wishBase,
    userId,
    status: localDecision ? 'rejected' : 'pending',
    publicVisible: false,
    moderation: localDecision
      ? {
          method: 'local',
          language: localDecision.language,
          toxicityScore: localDecision.toxicityScore,
          categories: localDecision.categories,
          reason: localDecision.reason,
          checkedAt: now,
        }
      : {
          method: 'none',
          language: 'unknown',
          toxicityScore: 0,
          categories: [],
          reason: null,
          checkedAt: null,
        },
    purgeAt: getWishBoxPurgeAt(),
  };

  try {
    await collections.birthdayWishes().insertOne(wish);
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already submitted a wish." });
    }
    console.error("[WISHBOX] Failed to save wish:", error);
    return res.status(500).json({ success: false, message: "Failed to submit wish." });
  }

  await invalidateWishboxStatsCache();
  if (wish.status === "approved" && wish.publicVisible) {
    await invalidateWishboxPublicCaches();
  }

  return res.json({
    success: true,
    message: 'Your wish has been submitted. It will appear after review.',
  });
});

wishboxRoutes.get("/my-wish", requireAuth, async (req: any, res: Response) => {
  if (!ensureWishboxActive(res)) return;

  const userId = req.user?.userId || req.session?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Login required." });
  }

  const wish = await collections.birthdayWishes().findOne(
    { eventKey: WISHBOX_CONFIG.eventKey, userId },
    { projection: { _id: 0, id: 1, message: 1, isAnonymous: 1, status: 1, createdAt: 1 }, sort: { createdAt: -1 } as any },
  );

  if (!wish) {
    return res.json({ hasSubmitted: false, wish: null });
  }

  return res.json({
    hasSubmitted: true,
    wish: {
      id: wish.id,
      message: wish.message,
      isAnonymous: Boolean(wish.isAnonymous),
      status: wish.status,
      createdAt: wish.createdAt,
    },
  });
});

wishboxRoutes.get("/wishes/public", async (req: Request, res: Response) => {
  if (!ensureWishboxActive(res)) return;

  const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
  const limit = Math.min(MAX_PUBLIC_PAGE_SIZE, Math.max(1, Math.floor(Number(req.query.limit) || 20)));
  const cacheKey = getPublicWishesCacheKey(page, limit);

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const wishes = await collections.birthdayWishes()
    .find(
      {
        eventKey: WISHBOX_CONFIG.eventKey,
        status: "approved",
        publicVisible: true,
        isAnonymous: false,
      },
      { projection: { _id: 0, id: 1, message: 1, displayName: 1, createdAt: 1 } },
    )
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  const payload = {
    wishes,
    page,
    hasMore: wishes.length === limit,
  };

  await cacheSet(cacheKey, payload, WISHBOX_CONFIG.cacheTTLSeconds);
  return res.json(payload);
});

wishboxRoutes.get("/stats", async (_req: Request, res: Response) => {
  if (!ensureWishboxActive(res)) return;

  const cacheKey = getWishboxStatsCacheKey();
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const [totalWishes, publicWishes, anonymousWishes] = await Promise.all([
    collections.birthdayWishes().countDocuments({ eventKey: WISHBOX_CONFIG.eventKey }),
    collections.birthdayWishes().countDocuments({
      eventKey: WISHBOX_CONFIG.eventKey,
      publicVisible: true,
      status: "approved",
    }),
    collections.birthdayWishes().countDocuments({
      eventKey: WISHBOX_CONFIG.eventKey,
      isAnonymous: true,
    }),
  ]);

  const payload = { totalWishes, publicWishes, anonymousWishes };
  await cacheSet(cacheKey, payload, WISHBOX_CONFIG.cacheTTLSeconds);
  return res.json(payload);
});
