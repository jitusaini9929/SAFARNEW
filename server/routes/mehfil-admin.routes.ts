import { Router, Request, Response } from 'express';
import { collections } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireMehfilModerator } from '../middleware/mehfil-moderator';
import { QUERY_FAST_TIMEOUT_MS } from '../utils/queryDefaults';
import {
  clearUserMehfilBan,
  getOrApplyReportBan,
  hideThoughtFromFeed,
  processReportModerationForThought,
  restoreThoughtToFeed,
  sendMehfilBanEmail,
} from '../lib/mehfil-report-moderation';

export const mehfilAdminRoutes = Router();

mehfilAdminRoutes.use(requireAuth, requireMehfilModerator);

/** List reported thoughts grouped for admin review. */
mehfilAdminRoutes.get('/reports', async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || 'review_needed').trim().toLowerCase();
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit) || 30)));
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (status === 'open') {
      match.status = { $in: ['pending', 'review_needed'] };
    } else if (status !== 'all') {
      match.status = status;
    }

    const grouped = await collections
      .mehfilReports()
      .aggregate([
        { $match: match },
        { $sort: { created_at: -1 } },
        {
          $group: {
            _id: '$thought_id',
            reported_user_id: { $first: '$reported_user_id' },
            latest_at: { $max: '$created_at' },
            report_count: { $sum: 1 },
            statuses: { $addToSet: '$status' },
            reasons: { $push: { reason: '$reason', category: '$category', status: '$status' } },
          },
        },
        { $sort: { latest_at: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .maxTimeMS(QUERY_FAST_TIMEOUT_MS)
      .toArray();

    const thoughtIds = grouped.map((g) => g._id).filter(Boolean);
    const userIds = [...new Set(grouped.map((g) => g.reported_user_id).filter(Boolean))];

    const [thoughts, users] = await Promise.all([
      thoughtIds.length
        ? collections
            .mehfilThoughts()
            .find({ id: { $in: thoughtIds } })
            .project({
              id: 1,
              content: 1,
              status: 1,
              removed_reason: 1,
              created_at: 1,
              user_id: 1,
              category: 1,
            })
            .toArray()
        : [],
      userIds.length
        ? collections
            .users()
            .find({ id: { $in: userIds } })
            .project({ id: 1, email: 1, name: 1, mehfil_banned_until: 1, mehfil_banned_forever: 1 })
            .toArray()
        : [],
    ]);

    const thoughtMap = new Map(thoughts.map((t) => [String(t.id), t] as const));
    const userMap = new Map(users.map((u) => [String(u.id), u] as const));

    const items = grouped.map((group) => {
      const thought = thoughtMap.get(group._id);
      const user = userMap.get(group.reported_user_id);
      return {
        thoughtId: group._id,
        reportCount: group.report_count,
        statuses: group.statuses,
        reasons: group.reasons,
        latestAt: group.latest_at,
        thought: thought
          ? {
              id: thought.id,
              content: thought.content,
              status: thought.status,
              removedReason: thought.removed_reason,
              createdAt: thought.created_at,
              category: thought.category,
            }
          : null,
        reportedUser: user
          ? {
              id: user.id,
              email: user.email,
              name: user.name,
              mehfilBannedUntil: user.mehfil_banned_until,
              mehfilBannedForever: user.mehfil_banned_forever,
            }
          : { id: group.reported_user_id, email: null, name: null },
      };
    });

    res.json({ reports: items, page, hasMore: grouped.length === limit });
  } catch (error) {
    console.error('[MEHFIL ADMIN] list reports failed:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * Resolve a reported thought:
 * - dismiss: clear reports, restore post, lift ban if any
 * - ban_user: apply posting ban + keep post hidden
 * - restore_post: restore post only (no ban change)
 */
mehfilAdminRoutes.post('/reports/thoughts/:thoughtId/resolve', async (req: Request, res: Response) => {
  try {
    const thoughtId = String(req.params.thoughtId || '').trim();
    const action = String(req.body?.action || '').trim().toLowerCase();

    if (!thoughtId) {
      return res.status(400).json({ error: 'thoughtId is required' });
    }

    const validActions = new Set(['dismiss', 'ban_user', 'restore_post']);
    if (!validActions.has(action)) {
      return res.status(400).json({ error: 'action must be dismiss, ban_user, or restore_post' });
    }

    const thought = await collections.mehfilThoughts().findOne(
      { id: thoughtId },
      { projection: { id: 1, user_id: 1 } },
    );
    if (!thought?.user_id) {
      return res.status(404).json({ error: 'Thought not found' });
    }

    const reportedUserId = String(thought.user_id);

    if (action === 'dismiss') {
      await collections.mehfilReports().updateMany(
        { thought_id: thoughtId },
        { $set: { status: 'dismissed', resolved_at: new Date() } },
      );
      await restoreThoughtToFeed(thoughtId);
      await clearUserMehfilBan(reportedUserId);
      return res.json({ success: true, action: 'dismiss' });
    }

    if (action === 'restore_post') {
      await restoreThoughtToFeed(thoughtId);
      await collections.mehfilReports().updateMany(
        { thought_id: thoughtId, status: { $in: ['pending', 'review_needed'] } },
        { $set: { status: 'dismissed', resolved_at: new Date() } },
      );
      return res.json({ success: true, action: 'restore_post' });
    }

    // ban_user
    const banState = await getOrApplyReportBan(reportedUserId);
    await hideThoughtFromFeed(thoughtId, 'admin_action');
    await collections.mehfilReports().updateMany(
      { thought_id: thoughtId },
      { $set: { status: 'actioned', resolved_at: new Date() } },
    );

    if (banState.isActive) {
      try {
        const user = await collections.users().findOne(
          { id: reportedUserId },
          { projection: { email: 1, name: 1 } },
        );
        if (user?.email) {
          await sendMehfilBanEmail(String(user.email), String(user.name || 'User'), banState);
        }
      } catch (emailErr) {
        console.error('[MEHFIL ADMIN] ban email failed:', emailErr);
      }
    }

    return res.json({
      success: true,
      action: 'ban_user',
      ban: {
        isActive: banState.isActive,
        isPermanent: banState.isPermanent,
        bannedUntil: banState.bannedUntil ? banState.bannedUntil.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('[MEHFIL ADMIN] resolve report failed:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

/** Re-run automatic moderation rules after manual review (e.g. confirm ban). */
mehfilAdminRoutes.post('/reports/thoughts/:thoughtId/apply-auto', async (req: Request, res: Response) => {
  try {
    const thoughtId = String(req.params.thoughtId || '').trim();
    const thought = await collections.mehfilThoughts().findOne(
      { id: thoughtId },
      { projection: { id: 1, user_id: 1 } },
    );
    if (!thought?.user_id) {
      return res.status(404).json({ error: 'Thought not found' });
    }

    const result = await processReportModerationForThought(thoughtId, String(thought.user_id));
    res.json({
      success: true,
      uniqueReporters: result.stats.uniqueReporters,
      postHidden: result.postHidden,
      banApplied: result.banApplied,
      queuedForReview: result.queuedForReview,
    });
  } catch (error) {
    console.error('[MEHFIL ADMIN] apply-auto failed:', error);
    res.status(500).json({ error: 'Failed to apply moderation' });
  }
});
