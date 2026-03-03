import { Router, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { collections } from "../db";
import { isDmUserOnline } from "./dm-presence";

export const dmRoutes = Router();

dmRoutes.use(requireAuth);

function sanitizeHandle(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const stripped = raw.replace(/^@+/, "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!stripped) return null;
  return stripped.slice(0, 64);
}

dmRoutes.get("/status", async (req: any, res: Response) => {
  const targetUserId = String(req.query.targetUserId || "").trim();
  if (!targetUserId) {
    return res.status(400).json({ message: "targetUserId is required" });
  }

  return res.json({ online: isDmUserOnline(targetUserId) });
});

dmRoutes.post("/handles", async (req: any, res: Response) => {
  try {
    const userId = String(req.session.userId || "").trim();
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const linkedin = sanitizeHandle(req.body?.linkedin);
    const instagram = sanitizeHandle(req.body?.instagram);
    const discord = sanitizeHandle(req.body?.discord);

    const now = new Date();
    await collections.userSocialHandles().updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          linkedin,
          instagram,
          discord,
          updated_at: now,
        },
        $setOnInsert: {
          id: `${userId}:${now.getTime()}`,
          created_at: now,
        },
      },
      { upsert: true },
    );

    return res.json({ linkedin, instagram, discord });
  } catch (error) {
    console.error("[DM] Failed to save handles:", error);
    return res.status(500).json({ message: "Failed to save handles" });
  }
});

dmRoutes.get("/handles/me", async (req: any, res: Response) => {
  try {
    const userId = String(req.session.userId || "").trim();
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const doc = await collections.userSocialHandles().findOne(
      { user_id: userId },
      { projection: { _id: 0, linkedin: 1, instagram: 1, discord: 1 } },
    );

    return res.json({
      linkedin: doc?.linkedin || null,
      instagram: doc?.instagram || null,
      discord: doc?.discord || null,
    });
  } catch (error) {
    console.error("[DM] Failed to load handles:", error);
    return res.status(500).json({ message: "Failed to load handles" });
  }
});
