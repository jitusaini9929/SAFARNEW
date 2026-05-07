import { Router, Request, Response } from "express";
import nodemailer from "nodemailer";
import { collections } from "../db";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "../middleware/auth";
import { getMehfilNamespace } from "./mehfil-socket";
import { validateBlockedWords } from "../utils/contentFilter";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/redis-cache";
import { queueCommunityCommentNotification } from "../services/community-activity-aggregator";

// ─── Email helper ────────────────────────────────────────────────────────────
async function sendMehfilBanEmail(toEmail: string, userName: string, banState: MehfilBanState) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const gmailFrom = process.env.GMAIL_FROM_EMAIL || `SAFAR Support <${gmailUser}>`;
    const smtpHost = process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.GMAIL_SMTP_PORT || 465);
    const appUrl = (process.env.APP_BASE_URL || 'https://safar.parmarssc.in').replace(/\/+$/, '');

    if (!gmailUser || !gmailPass) {
        console.warn('[MEHFIL BAN EMAIL] Gmail credentials missing — skipping ban email.');
        return;
    }

    const isPermanent = banState.isPermanent;
    const bannedUntilText = banState.bannedUntil
        ? banState.bannedUntil.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })
        : null;

    const durationLine = isPermanent
        ? `<strong>This ban is permanent.</strong>`
        : bannedUntilText
            ? `Your posting restriction will be lifted on <strong>${bannedUntilText} IST</strong>.`
            : `A posting restriction has been applied to your account.`;

    const subject = isPermanent
        ? '⛔ Your SAFAR Mehfil account has been permanently banned'
        : '⚠️ Your SAFAR Mehfil posting access has been temporarily restricted';

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 32px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff;">
  <h2 style="color: #1e293b; margin-bottom: 8px;">Mehfil Community Notice</h2>
  <p style="color: #475569;">Hi <strong>${userName}</strong>,</p>
  <p style="color: #475569;">
    Your account has been reported by multiple community members for posting content that violates 
    the <strong>Mehfil Community Guidelines</strong>. As a result, your ability to post in Mehfil 
    has been restricted.
  </p>
  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #991b1b; font-weight: bold;">Action Taken</p>
    <p style="margin: 8px 0 0; color: #7f1d1d;">${durationLine}</p>
  </div>
  <p style="color: #475569;">Our community exists to support students through their journey. Please ensure all posts respect fellow members.</p>
  <p style="color: #475569;">If you believe this was a mistake, you can reply to this email.</p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="color: #94a3b8; font-size: 12px;">SAFAR &mdash; <a href="${appUrl}" style="color: #6366f1;">safar.parmarssc.in</a></p>
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
            text: `Hi ${userName},\n\nYour Mehfil posting access has been restricted due to community reports.\n${durationLine.replace(/<[^>]*>/g, '')}\n\nSAFAR Support`,
        });
        console.log('[MEHFIL BAN EMAIL] Sent to', toEmail, '— messageId:', info.messageId);
    } catch (err) {
        console.error('[MEHFIL BAN EMAIL] Failed to send:', err);
    }
}

export const mehfilInteractionRoutes = Router();

mehfilInteractionRoutes.use(requireAuth);

const REPORTS_TO_BAN = Math.max(1, Number(process.env.MEHFIL_REPORTS_TO_BAN || 3));
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

        const banState = {
            isActive: true,
            isPermanent: true,
            banLevel: 3,
            bannedUntil: null,
            message: BAN_MESSAGE,
        };

        const mehfil = getMehfilNamespace();
        if (mehfil) {
            mehfil.to(`user:${userId}`).emit('postingBanStatus', {
                ...banState,
                bannedUntil: null,
            });
        }

        return banState;
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

    const banState = {
        isActive: true,
        isPermanent: false,
        banLevel: nextLevel,
        bannedUntil: nextBannedUntil,
        message: BAN_MESSAGE,
    };

    const mehfil = getMehfilNamespace();
    if (mehfil) {
        mehfil.to(`user:${userId}`).emit('postingBanStatus', {
            ...banState,
            bannedUntil: nextBannedUntil.toISOString(),
        });
    }

    return banState;
}

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
                { $match: { thought_id: thoughtId } },
                { $group: { _id: "$reporter_id" } },
                { $count: "count" },
            ])
            .toArray();

        const uniqueReporters = Number(reporterGroups?.[0]?.count || 0);

        // ── Trigger ban once the report threshold is crossed ──────────────────
        let banApplied = false;
        let banState: MehfilBanState | null = null;

        if (uniqueReporters >= REPORTS_TO_BAN) {
            banState = await getOrApplyReportBan(thought.user_id);
            banApplied = banState.isActive;

            if (banApplied) {
                // Remove the reported thought from the public feed immediately
                await collections.mehfilThoughts().updateOne(
                    { id: thoughtId },
                    { $set: { status: 'removed', removed_at: new Date(), removed_reason: 'community_reports' } }
                );

                // Real-time socket notification to the banned user
                const mehfil = getMehfilNamespace();
                if (mehfil) {
                    mehfil.to(`user:${thought.user_id}`).emit('postingBanStatus', {
                        isActive: true,
                        isPermanent: banState.isPermanent,
                        bannedUntil: banState.bannedUntil ? banState.bannedUntil.toISOString() : null,
                        message: banState.message,
                    });
                    // Also remove the thought from all viewers' feeds
                    mehfil.emit('thoughtDeleted', { thoughtId });
                }

                // Email notification (best-effort — does not block the response)
                try {
                    const bannedUser = await collections.users().findOne(
                        { id: thought.user_id },
                        { projection: { email: 1, name: 1 } }
                    );
                    if (bannedUser?.email) {
                        await sendMehfilBanEmail(
                            String(bannedUser.email),
                            String(bannedUser.name || 'User'),
                            banState
                        );
                    }
                } catch (emailErr) {
                    console.error('[MEHFIL] Ban email failed (non-fatal):', emailErr);
                }
            }
        }

        res.json({
            reported: true,
            uniqueReporters,
            banApplied,
            ban: banState ? {
                isActive: banState.isActive,
                isPermanent: banState.isPermanent,
                bannedUntil: banState.bannedUntil ? banState.bannedUntil.toISOString() : null,
            } : null,
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
