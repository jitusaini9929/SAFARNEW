import { Router, Request, Response } from "express";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";
import { cacheGet, cacheSet } from "../lib/redis-cache";

export const mehfilSocialRouter = Router();

const sanitizeSnippet = (input: unknown, maxLength = 180) => {
  const text = String(input ?? "").replace(/<[^>]*>/g, " ");
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
};

const MEDITATION_VIDEO_SETTING_KEY = "meditation_latest_video";
const DEFAULT_MEDITATION_VIDEO_URL = "https://youtu.be/Ts6H9bbVt1Y";
const LEGACY_MEDITATION_VIDEO_IDS = new Set(["vWWrcQA6JdU", "rXGlSKg_IOE"]);
const FALLBACK_ADMIN_EMAILS = ["steve123@gmail.com"];
const MEHFIL_PAUSED = process.env.MEHFIL_PAUSED === "true";
const MEHFIL_PAUSED_MESSAGE =
  process.env.MEHFIL_PAUSED_MESSAGE ||
  "Due to irrelevant and spam posts . Mehfil is currently not accessible . We are working on it and notify shortly";

const getAdminEmailSet = () => {
  const configured = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...configured, ...FALLBACK_ADMIN_EMAILS]);
};

const getYoutubeVideoId = (url: string) => {
  const match = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
};

// ═══════════════════════════════════════════════════════════
// SAVED POSTS
// ═══════════════════════════════════════════════════════════

mehfilSocialRouter.get("/meditation-video", async (_req: any, res: Response) => {
  try {
    const setting = await collections.appSettings().findOne({ key: MEDITATION_VIDEO_SETTING_KEY });
    const configuredUrl = typeof setting?.value === "string" ? setting.value : "";
    const configuredId = getYoutubeVideoId(configuredUrl);
    const defaultId = getYoutubeVideoId(DEFAULT_MEDITATION_VIDEO_URL);

    // Canonicalize legacy/default-equivalent values to the new public URL.
    const shouldUseDefault =
      !configuredId ||
      configuredId === defaultId ||
      LEGACY_MEDITATION_VIDEO_IDS.has(configuredId);

    const videoUrl = shouldUseDefault ? DEFAULT_MEDITATION_VIDEO_URL : configuredUrl;

    res.json({ videoUrl });
  } catch (error) {
    console.error("Error fetching meditation video setting:", error);
    res.status(500).json({ error: "Failed to fetch meditation video setting" });
  }
});

mehfilSocialRouter.get("/", async (_req: Request, res: Response) => {
  if (MEHFIL_PAUSED) {
    return res.status(503).json({ message: MEHFIL_PAUSED_MESSAGE });
  }

  return res.json({ paused: false });
});

mehfilSocialRouter.use(requireAuth);

mehfilSocialRouter.post("/meditation-video", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const user = await collections.users().findOne(
      { id: userId },
      { projection: { id: 1, email: 1 } },
    );
    const email = String(user?.email || "").toLowerCase();
    const adminEmails = getAdminEmailSet();

    if (!email || !adminEmails.has(email)) {
      return res.status(403).json({ error: "Unauthorized: Admin access required" });
    }

    const candidateUrl = String(req.body?.videoUrl || "").trim();
    if (!getYoutubeVideoId(candidateUrl)) {
      return res.status(400).json({ error: "Please provide a valid YouTube video link." });
    }

    const now = new Date();
    await collections.appSettings().updateOne(
      { key: MEDITATION_VIDEO_SETTING_KEY },
      {
        $set: {
          key: MEDITATION_VIDEO_SETTING_KEY,
          value: candidateUrl,
          updated_at: now,
          updated_by: userId,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );

    res.json({ success: true, videoUrl: candidateUrl });
  } catch (error) {
    console.error("Error updating meditation video setting:", error);
    res.status(500).json({ error: "Failed to update meditation video setting" });
  }
});

mehfilSocialRouter.get("/saved-posts", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(req.query.limit) || 20)));
    const skip = (page - 1) * limit;
    const cacheKey = `mehfil:saved:${userId}:p${page}:l${limit}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Get saved thought IDs (paginated)
    const saves = await collections.mehfilSaves()
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const thoughtIds = saves.map(s => s.thought_id);

    if (thoughtIds.length === 0) {
      const payload = { posts: [], reactedThoughtIds: [], page, hasMore: false };
      await cacheSet(cacheKey, payload, 60);
      return res.json(payload);
    }

    // Get thoughts
    const thoughts = await collections.mehfilThoughts()
      .find({
        id: { $in: thoughtIds },
        $and: [
          { $or: [{ status: 'approved' }, { status: { $exists: false } }] },
          { $or: [{ expires_at: { $exists: false } }, { expires_at: null }, { expires_at: { $gt: new Date() } }] },
        ],
      })
      .toArray();
    const thoughtMap = new Map(thoughts.map(t => [t.id, t]));

    // Build posts in save order
    const posts = saves
      .map(s => {
        const t = thoughtMap.get(s.thought_id);
        if (!t) return null;
        return {
          id: t.id,
          userId: t.is_anonymous ? '' : t.user_id,
          isAnonymous: Boolean(t.is_anonymous),
          authorName: t.is_anonymous ? 'Anonymous User' : t.author_name,
          authorAvatar: t.is_anonymous ? null : t.author_avatar,
          content: t.content,
          imageUrl: t.image_url,
          relatableCount: t.relatable_count || 0,
          createdAt: t.created_at,
          category: t.category || 'ACADEMIC',
          aiTags: Array.isArray(t.ai_tags) ? t.ai_tags : [],
          aiScore: typeof t.ai_score === 'number' ? t.ai_score : null,
          savedAt: s.created_at,
        };
      })
      .filter(Boolean);

    // Get user's reactions
    const reactions = await collections.mehfilReactions()
      .find({ user_id: userId, thought_id: { $in: thoughtIds } })
      .toArray();
    const reactedThoughtIds = reactions.map(r => r.thought_id);

    const payload = { posts, reactedThoughtIds, page, hasMore: saves.length === limit };
    await cacheSet(cacheKey, payload, 60);
    res.json(payload);
  } catch (error) {
    console.error("Error fetching saved posts:", error);
    res.status(500).json({ error: "Failed to fetch saved posts" });
  }
});

// ═══════════════════════════════════════════════════════════
// USER ANALYTICS
// ═══════════════════════════════════════════════════════════

// USER ACTIVITY
mehfilSocialRouter.get("/activity", async (req: any, res: Response) => {
  try {
    const userId = req.session.userId;
    const cacheKey = `mehfil:activity:${userId}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [thoughts, comments, reactions] = await Promise.all([
      collections.mehfilThoughts().find({ user_id: userId }).sort({ created_at: -1 }).limit(30).toArray(),
      collections.mehfilComments().find({ user_id: userId }).sort({ created_at: -1 }).limit(30).toArray(),
      collections.mehfilReactions().find({ user_id: userId }).sort({ created_at: -1 }).limit(30).toArray(),
    ]);

    const relatedThoughtIds = Array.from(new Set([
      ...comments.map((c) => c.thought_id),
      ...reactions.map((r) => r.thought_id),
    ])).filter(Boolean);

    const relatedThoughts = relatedThoughtIds.length
      ? await collections.mehfilThoughts().find({ id: { $in: relatedThoughtIds } }).toArray()
      : [];

    const thoughtMap = new Map(relatedThoughts.map((t) => [t.id, t]));

    const items = [
      ...thoughts.map((t) => ({
        type: "post",
        createdAt: t.created_at,
        thoughtId: t.id,
        thought: {
          id: t.id,
          authorName: t.is_anonymous ? "Anonymous User" : t.author_name,
          category: t.category || "ACADEMIC",
          content: sanitizeSnippet(t.content),
        },
      })),
      ...comments.map((c) => {
        const t = thoughtMap.get(c.thought_id);
        return {
          type: "comment",
          createdAt: c.created_at,
          thoughtId: c.thought_id,
          comment: sanitizeSnippet(c.content, 140),
          thought: t
            ? {
              id: t.id,
              authorName: t.is_anonymous ? "Anonymous User" : t.author_name,
              category: t.category || "ACADEMIC",
              content: sanitizeSnippet(t.content),
            }
            : null,
        };
      }),
      ...reactions.map((r) => {
        const t = thoughtMap.get(r.thought_id);
        return {
          type: "like",
          createdAt: r.created_at,
          thoughtId: r.thought_id,
          thought: t
            ? {
              id: t.id,
              authorName: t.is_anonymous ? "Anonymous User" : t.author_name,
              category: t.category || "ACADEMIC",
              content: sanitizeSnippet(t.content),
            }
            : null,
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const payload = { items: items.slice(0, 60) };
    await cacheSet(cacheKey, payload, 60); // 1 min TTL
    res.json(payload);
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default mehfilSocialRouter;
