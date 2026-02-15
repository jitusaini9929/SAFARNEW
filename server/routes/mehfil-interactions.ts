import { Router, Request, Response } from "express";
import { collections } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";

export const mehfilInteractionRoutes = Router();

mehfilInteractionRoutes.use(requireAuth);

const REPORTS_TO_BAN = Math.max(1, Number(process.env.MEHFIL_REPORTS_TO_BAN || 1));
const BAN_MESSAGE = "you have been banned from posting messages";
const BAN_2_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const BAN_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type MehfilBanState = {
    isActive: boolean;
    isPermanent: boolean;
    banLevel: number;
    bannedUntil: Date | null;
    message: string;
};

async function getOrApplyReportBan(userId: string): Promise<MehfilBanState> {
    const now = new Date();
    const user = await collections.users().findOne(
        { id: userId },
        {
            projection: {
                id: 1,
                mehfil_ban_level: 1,
                mehfil_banned_until: 1,
                mehfil_banned_forever: 1,
                mehfil_moderation_exempt: 1,
            },
        },
    );

    if (!user) {
        return {
            isActive: false,
            isPermanent: false,
            banLevel: 0,
            bannedUntil: null,
            message: BAN_MESSAGE,
        };
    }

    if (user.mehfil_moderation_exempt) {
        return {
            isActive: false,
            isPermanent: false,
            banLevel: Number(user.mehfil_ban_level || 0),
            bannedUntil: null,
            message: BAN_MESSAGE,
        };
    }

    const currentLevel = Number(user.mehfil_ban_level || 0);
    const bannedForever = Boolean(user.mehfil_banned_forever);
    const bannedUntil = user.mehfil_banned_until ? new Date(user.mehfil_banned_until) : null;

    if (bannedForever) {
        return {
            isActive: true,
            isPermanent: true,
            banLevel: 3,
            bannedUntil: null,
            message: BAN_MESSAGE,
        };
    }

    if (bannedUntil && bannedUntil.getTime() > now.getTime()) {
        return {
            isActive: true,
            isPermanent: false,
            banLevel: Math.max(currentLevel, 1),
            bannedUntil,
            message: BAN_MESSAGE,
        };
    }

    const nextLevel = Math.min(3, currentLevel + 1);
    if (nextLevel >= 3) {
        await collections.users().updateOne(
            { id: userId },
            {
                $set: {
                    mehfil_ban_level: 3,
                    mehfil_banned_forever: true,
                    mehfil_banned_until: null,
                    mehfil_banned_reason: "report",
                    mehfil_banned_at: now,
                },
            },
        );

        return {
            isActive: true,
            isPermanent: true,
            banLevel: 3,
            bannedUntil: null,
            message: BAN_MESSAGE,
        };
    }

    const durationMs = nextLevel === 1 ? BAN_2_DAYS_MS : BAN_7_DAYS_MS;
    const nextBannedUntil = new Date(now.getTime() + durationMs);

    await collections.users().updateOne(
        { id: userId },
        {
            $set: {
                mehfil_ban_level: nextLevel,
                mehfil_banned_forever: false,
                mehfil_banned_until: nextBannedUntil,
                mehfil_banned_reason: "report",
                mehfil_banned_at: now,
            },
        },
    );

    return {
        isActive: true,
        isPermanent: false,
        banLevel: nextLevel,
        bannedUntil: nextBannedUntil,
        message: BAN_MESSAGE,
    };
}

// ═══════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════

// Get comments for a thought
mehfilInteractionRoutes.get("/comments/:thoughtId", async (req: any, res: Response) => {
    try {
        const { thoughtId } = req.params;

        const comments = await collections.mehfilComments()
            .find({ thought_id: thoughtId })
            .sort({ created_at: 1 })
            .toArray();

        // Fetch user info for each comment
        const userIds = [...new Set(comments.map(c => c.user_id))];
        const users = await collections.users()
            .find({ id: { $in: userIds } })
            .project({ id: 1, name: 1, avatar: 1 })
            .toArray();
        const userMap = new Map(users.map(u => [u.id, u]));

        const result = comments.map(c => {
            const user = userMap.get(c.user_id);
            return {
                id: c.id,
                thoughtId: c.thought_id,
                userId: c.user_id,
                authorName: user?.name || "Unknown",
                authorAvatar: user?.avatar || null,
                content: c.content,
                createdAt: c.created_at,
            };
        });

        res.json({ comments: result });
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// Post a comment
mehfilInteractionRoutes.post("/comments", async (req: any, res: Response) => {
    try {
        const userId = req.session.userId;
        const { thoughtId, content } = req.body;

        if (!thoughtId || !content) {
            return res.status(400).json({ error: "ThoughtId and content are required" });
        }

        const id = uuidv4();
        const now = new Date();

        await collections.mehfilComments().insertOne({
            id,
            thought_id: thoughtId,
            user_id: userId,
            content,
            created_at: now,
        });

        // Get user info
        const user = await collections.users().findOne(
            { id: userId },
            { projection: { name: 1, avatar: 1 } }
        );

        res.status(201).json({
            comment: {
                id,
                thoughtId,
                userId,
                authorName: user?.name || "Unknown",
                authorAvatar: user?.avatar || null,
                content,
                createdAt: now,
            },
        });
    } catch (error) {
        console.error("Error posting comment:", error);
        res.status(500).json({ error: "Failed to post comment" });
    }
});

// ═══════════════════════════════════════════════════════════
// SAVES / BOOKMARKS
// ═══════════════════════════════════════════════════════════

// Toggle save
mehfilInteractionRoutes.post("/save", async (req: any, res: Response) => {
    try {
        const userId = req.session.userId;
        const { thoughtId } = req.body;

        if (!thoughtId) return res.status(400).json({ error: "ThoughtId is required" });

        const existing = await collections.mehfilSaves().findOne({
            user_id: userId, thought_id: thoughtId
        });

        if (existing) {
            await collections.mehfilSaves().deleteOne({ user_id: userId, thought_id: thoughtId });
            res.json({ saved: false });
        } else {
            await collections.mehfilSaves().insertOne({
                user_id: userId,
                thought_id: thoughtId,
                created_at: new Date(),
            });
            res.json({ saved: true });
        }
    } catch (error) {
        console.error("Error toggling save:", error);
        res.status(500).json({ error: "Failed to toggle save" });
    }
});

// Check if saved
mehfilInteractionRoutes.get("/save/:thoughtId", async (req: any, res: Response) => {
    try {
        const userId = req.session.userId;
        const { thoughtId } = req.params;

        const existing = await collections.mehfilSaves().findOne({
            user_id: userId, thought_id: thoughtId
        });

        res.json({ saved: !!existing });
    } catch (error) {
        console.error("Error checking save:", error);
        res.status(500).json({ error: "Failed to check save status" });
    }
});

// ═══════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════

mehfilInteractionRoutes.post("/report", async (req: any, res: Response) => {
    try {
        const userId = req.session.userId;
        const { thoughtId, reason } = req.body;

        if (!thoughtId || !reason) {
            return res.status(400).json({ error: "ThoughtId and reason are required" });
        }

        const thought = await collections.mehfilThoughts().findOne(
            { id: thoughtId },
            { projection: { id: 1, user_id: 1 } }
        );

        if (!thought?.id || !thought.user_id) {
            return res.status(404).json({ error: "Thought not found" });
        }

        if (thought.user_id === userId) {
            return res.status(400).json({ error: "You cannot report your own post" });
        }

        const existing = await collections.mehfilReports().findOne({
            thought_id: thoughtId,
            reporter_id: userId,
        });

        if (existing) {
            return res.json({ reported: true, alreadyReported: true });
        }

        await collections.mehfilReports().insertOne({
            id: uuidv4(),
            thought_id: thoughtId,
            reporter_id: userId,
            reported_user_id: thought.user_id,
            reason,
            status: "pending",
            created_at: new Date(),
        });

        const reporterGroups = await collections.mehfilReports()
            .aggregate([
                { $match: { thought_id: thoughtId } },
                { $group: { _id: "$reporter_id" } },
                { $count: "count" },
            ])
            .toArray();

        const uniqueReporters = Number(reporterGroups?.[0]?.count || 0);
        let ban: MehfilBanState | null = null;

        if (uniqueReporters >= REPORTS_TO_BAN) {
            ban = await getOrApplyReportBan(thought.user_id);
            if (ban.isActive) {
                await collections.mehfilReports().updateMany(
                    { thought_id: thoughtId, status: "pending" },
                    {
                        $set: {
                            status: "actioned",
                            action: "auto_ban",
                            actioned_at: new Date(),
                        },
                    },
                );
            }
        }

        res.json({
            reported: true,
            uniqueReporters,
            banApplied: Boolean(ban?.isActive),
            ban: ban
                ? {
                    isActive: ban.isActive,
                    isPermanent: ban.isPermanent,
                    banLevel: ban.banLevel,
                    bannedUntil: ban.bannedUntil,
                    message: ban.message,
                }
                : null,
        });
    } catch (error) {
        console.error("Error reporting:", error);
        res.status(500).json({ error: "Failed to submit report" });
    }
});

// ═══════════════════════════════════════════════════════════
// SHARES
// ═══════════════════════════════════════════════════════════

mehfilInteractionRoutes.post("/share", async (req: any, res: Response) => {
    try {
        const userId = req.session.userId;
        const { thoughtId, platform } = req.body;

        if (!thoughtId) return res.status(400).json({ error: "ThoughtId is required" });

        await collections.mehfilShares().insertOne({
            id: uuidv4(),
            thought_id: thoughtId,
            user_id: userId,
            platform: platform || null,
            created_at: new Date(),
        });

        res.json({ shared: true });
    } catch (error) {
        console.error("Error logging share:", error);
        res.status(500).json({ error: "Failed to log share" });
    }
});

export default mehfilInteractionRoutes;
