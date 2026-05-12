import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import { collections } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";
import { validateBlockedWords } from "../utils/contentFilter";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/redis-cache";
import { queueCommunityCommentNotification } from "../services/community-activity-aggregator";

// ─── Email helper ────────────────────────────────────────────────────────────
async function sendMehfilReportEmail(toEmail: string, userName: string, reportCount: number) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const gmailFrom = process.env.GMAIL_FROM_EMAIL || `SAFAR Support <${gmailUser}>`;
    const smtpHost = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.GMAIL_SMTP_PORT || 465);
    const appUrl = (process.env.APP_BASE_URL || 'https://safar.parmarssc.in').replace(/\/+$/, '');

    if (!gmailUser || !gmailPass) {
        console.warn('[MEHFIL REPORT EMAIL] Gmail credentials missing - skipping report email.');
        return;
    }

    const subject = 'SAFAR Mehfil report notice';
    const reportText = `${reportCount} ${reportCount === 1 ? 'person has' : 'people have'}`;

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff;">
  <h2 style="color: #1e293b; margin-bottom: 8px;">Mehfil Community Notice</h2>
  <p style="color: #475569;">Hi <strong>${userName}</strong>,</p>
  <p style="color: #475569;">
    Your Mehfil post has been reported by <strong>${reportText}</strong>. This is a notice only.
    Your account and posting access have not been restricted.
  </p>
  <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #1e40af; font-weight: bold;">Reports Received</p>
    <p style="margin: 8px 0 0; color: #1e3a8a;">${reportText} reported this post.</p>
  </div>
  <p style="color: #475569;">Our community exists to support students through their journey. Please ensure all posts respect fellow members.</p>
  <p style="color: #475569;">If you have questions, you can reply to this email.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">SAFAR - <a href="${appUrl}" style="color: #6366f1;">safar.parmarssc.in</a></p>
</div>`;

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: gmailUser, pass: gmailPass },
    });

    try {
        const info = await transporter.sendMail({
            from: gmailFrom,
            to: toEmail,
            subject,
            html,
            text: `Hi ${userName},\n\nYour Mehfil post has been reported by ${reportText}. This is a notice only; your account and posting access have not been restricted.\n\nSAFAR Support`,
        });
        console.log('[MEHFIL REPORT EMAIL] Sent to', toEmail, '- messageId:', info.messageId);
    } catch (err) {
        console.error('[MEHFIL REPORT EMAIL] Failed to send:', err);
    }
}

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
                { $match: { thought_id: thoughtId, status: "pending" } },
                { $group: { _id: "$reporter_id" } },
                { $count: "count" },
            ])
            .toArray();

        const uniqueReporters = Number(reporterGroups?.[0]?.count || 0);

        // Email notification (best-effort - does not block the response)
        try {
            const reportedUser = await collections.users().findOne(
                { id: thought.user_id },
                { projection: { email: 1, name: 1 } }
            );
            if (reportedUser?.email) {
                await sendMehfilReportEmail(
                    String(reportedUser.email),
                    String(reportedUser.name || 'User'),
                    uniqueReporters
                );
            }
        } catch (emailErr) {
            console.error('[MEHFIL] Report email failed (non-fatal):', emailErr);
        }

        res.json({
            reported: true,
            uniqueReporters,
            banApplied: false,
            ban: null,
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
