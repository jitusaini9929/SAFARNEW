import { Router, Request, Response } from "express";
import { collections } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";

export const mehfilInteractionRoutes = Router();

mehfilInteractionRoutes.use(requireAuth);

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

        await collections.mehfilReports().insertOne({
            id: uuidv4(),
            thought_id: thoughtId,
            reporter_id: userId,
            reason,
            status: "pending",
            created_at: new Date(),
        });

        res.json({ reported: true });
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
