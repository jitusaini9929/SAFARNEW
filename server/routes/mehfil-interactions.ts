import { Router, Request, Response } from "express";
import { collections } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";
import { validateBlockedWords } from "../utils/contentFilter";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/redis-cache";
import { queueCommunityCommentNotification } from "../services/community-activity-aggregator";
import {
    countReporterSubmissionsLast24h,
    createReportDocument,
    MAX_REPORTS_PER_USER_PER_DAY,
    parseReportCategory,
    processReportModerationForThought,
    REPORTS_TO_BAN,
} from "../lib/mehfil-report-moderation";

export const mehfilInteractionRoutes = Router();

mehfilInteractionRoutes.use(requireAuth);

// ═══════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════

// Get comments for a thought (paginated + cached)
mehfilInteractionRoutes.get("/comments/:thoughtId", async (req: any, res: Response) => {
    try {
        const { thoughtId } = req.params;
        const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
        const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 30)));
        const skip = (page - 1) * limit;
        const cacheKey = `mehfil:comments:${thoughtId}:p${page}:l${limit}`;

        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const comments = await collections.mehfilComments()
            .find({ thought_id: thoughtId })
            .sort({ created_at: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Fetch user info for each comment
        const userIds = [...new Set(comments.map(c => c.user_id))];
        const users = userIds.length > 0
            ? await collections.users()
                .find({ id: { $in: userIds } })
                .project({ id: 1, name: 1, avatar: 1 })
                .toArray()
            : [];
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

        const payload = { comments: result, page, hasMore: comments.length === limit };
        await cacheSet(cacheKey, payload, 30); // 30s TTL
        res.json(payload);
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

        if (validateBlockedWords(content).isBlocked) {
            return res.status(400).json({ error: "Comment contains blocked language. Please remove abusive words and try again." });
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

        // Increment comments_count on the thought
        await collections.mehfilThoughts().updateOne(
            { id: thoughtId },
            { $inc: { comments_count: 1 } }
        );

        // Invalidate comment cache for this thought
        await cacheInvalidate(`mehfil:comments:${thoughtId}:*`);

        // Get user info
        const user = await collections.users().findOne(
            { id: userId },
            { projection: { name: 1, avatar: 1 } }
        );

        const thought = await collections.mehfilThoughts().findOne(
            { id: thoughtId },
            { projection: { user_id: 1 } },
        );

        if (thought?.user_id && thought.user_id !== userId) {
            queueCommunityCommentNotification(thought.user_id, user?.name || "Someone");
        }

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

// Delete a comment (own comments only)
mehfilInteractionRoutes.delete("/comments/:commentId", async (req: any, res: Response) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const { commentId } = req.params;

        const comment = await collections.mehfilComments().findOne({ id: commentId });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }
        if (comment.user_id !== userId) {
            return res.status(403).json({ error: "Not authorised to delete this comment" });
        }

        await collections.mehfilComments().deleteOne({ id: commentId });

        // Decrement comments_count on the thought
        await collections.mehfilThoughts().updateOne(
            { id: comment.thought_id },
            { $inc: { comments_count: -1 } }
        );

        // Invalidate comment cache for this thought
        await cacheInvalidate(`mehfil:comments:${comment.thought_id}:*`);

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Failed to delete comment" });
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
        const { thoughtId, reason, ackFakeReportingWarning } = req.body;

        const reporter = await collections.users().findOne(
            { id: userId },
            {
                projection: {
                    id: 1,
                    mehfil_reporting_banned: 1,
                    mehfil_false_report_strike_count: 1,
                    mehfil_reporting_warning_count: 1,
                },
            },
        );

        if (Boolean(reporter?.mehfil_reporting_banned)) {
            return res.status(403).json({
                code: "REPORTING_BANNED",
                error: "You are banned from reporting.",
            });
        }

        const falseStrikes = Number(reporter?.mehfil_false_report_strike_count || 0);
        const warnings = Number(reporter?.mehfil_reporting_warning_count || 0);
        const isFlaggedReporter = falseStrikes > 0 || warnings > 0;

        if (isFlaggedReporter && ackFakeReportingWarning !== true) {
            return res.status(409).json({
                code: "FAKE_REPORTING_WARNING_REQUIRED",
                message:
                    "You have been flagged for Fake Reporting an Innocent post . Continuing this will result in permanent suspension for  Reporting.",
                error:
                    "You have been flagged for Fake Reporting an Innocent post . Continuing this will result in permanent suspension for  Reporting.",
            });
        }

        if (!thoughtId || !reason) {
            return res.status(400).json({ error: "ThoughtId and reason are required" });
        }

        const category = parseReportCategory(String(reason));

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

        const reportsToday = await countReporterSubmissionsLast24h(userId);
        if (reportsToday >= MAX_REPORTS_PER_USER_PER_DAY) {
            return res.status(429).json({
                error: "You have reached the daily report limit. Please try again later.",
            });
        }

        const existing = await collections.mehfilReports().findOne({
            thought_id: thoughtId,
            reporter_id: userId,
        });

        if (existing) {
            return res.json({ reported: true, alreadyReported: true });
        }

        await collections.mehfilReports().insertOne(
            createReportDocument({
                thoughtId,
                reporterId: userId,
                reportedUserId: thought.user_id,
                reason: String(reason),
                category,
            }),
        );

        const moderation = await processReportModerationForThought(thoughtId, thought.user_id);

        res.json({
            reported: true,
            uniqueReporters: moderation.stats.uniqueReporters,
            seriousReporters: moderation.stats.seriousReporters,
            reportsRequiredForBan: REPORTS_TO_BAN,
            postHidden: moderation.postHidden,
            banApplied: moderation.banApplied,
            queuedForReview: moderation.queuedForReview,
            ban: moderation.banState
                ? {
                    isActive: moderation.banState.isActive,
                    isPermanent: moderation.banState.isPermanent,
                    bannedUntil: moderation.banState.bannedUntil
                        ? moderation.banState.bannedUntil.toISOString()
                        : null,
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
