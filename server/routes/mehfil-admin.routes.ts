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
            reporter_ids: { $addToSet: '$reporter_id' },
            reasons: {
              $push: {
                reason: '$reason',
                category: '$category',
                status: '$status',
              },
            },
            reports: {
              $push: {
                id: '$id',
                reporterId: '$reporter_id',
                reason: '$reason',
                category: '$category',
                status: '$status',
                createdAt: '$created_at',
                moderatorVerdict: '$moderator_verdict',
                moderatorVerdictAt: '$moderator_verdict_at',
                moderatorVerdictBy: '$moderator_verdict_by',
              },
            },
          },
        },
        { $sort: { latest_at: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .maxTimeMS(QUERY_FAST_TIMEOUT_MS)
      .toArray();

    const thoughtIds = grouped.map((g) => g._id).filter(Boolean);
    const reportedUserIds = grouped.map((g) => g.reported_user_id).filter(Boolean);
    const reporterIds = grouped.flatMap((g) => (Array.isArray(g.reporter_ids) ? g.reporter_ids : [])).filter(Boolean);
    const userIds = [...new Set([...reportedUserIds, ...reporterIds])];

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
            .project({
              id: 1,
              email: 1,
              name: 1,
              mehfil_banned_until: 1,
              mehfil_banned_forever: 1,
              mehfil_false_report_strike_count: 1,
              last_mehfil_false_report_strike_at: 1,
              mehfil_reporting_warning_count: 1,
              last_mehfil_reporting_warning_at: 1,
              mehfil_reporting_banned: 1,
              mehfil_reporting_banned_at: 1,
            })
            .toArray()
        : [],
    ]);

    const thoughtMap = new Map(thoughts.map((t) => [String(t.id), t] as const));
    const userMap = new Map(users.map((u) => [String(u.id), u] as const));

    const items = grouped.map((group) => {
      const thought = thoughtMap.get(group._id);
      const user = userMap.get(group.reported_user_id);
      const rawReports = Array.isArray(group.reports) ? group.reports : [];
      const reports = rawReports
        .map((report: any) => {
          const reporterId = String(report?.reporterId || '');
          const reporter = userMap.get(reporterId);
          return {
            id: report?.id,
            reporterId,
            reason: report?.reason,
            category: report?.category,
            status: report?.status,
            createdAt: report?.createdAt,
            moderatorVerdict: report?.moderatorVerdict,
            moderatorVerdictAt: report?.moderatorVerdictAt,
            moderatorVerdictBy: report?.moderatorVerdictBy,
            reporter: reporter
              ? {
                  id: reporter.id,
                  email: reporter.email,
                  name: reporter.name,
                  falseReportStrikes: Number(reporter.mehfil_false_report_strike_count || 0),
                  lastFalseReportStrikeAt: reporter.last_mehfil_false_report_strike_at || null,
                  warningCount: Number(reporter.mehfil_reporting_warning_count || 0),
                  lastWarningAt: reporter.last_mehfil_reporting_warning_at || null,
                  reportingBanned: Boolean(reporter.mehfil_reporting_banned),
                  reportingBannedAt: reporter.mehfil_reporting_banned_at || null,
                }
              : {
                  id: reporterId,
                  email: null,
                  name: null,
                  falseReportStrikes: 0,
                  lastFalseReportStrikeAt: null,
                  warningCount: 0,
                  lastWarningAt: null,
                  reportingBanned: false,
                  reportingBannedAt: null,
                },
          };
        })
        .filter((r: any) => Boolean(r.id) && Boolean(r.reporterId));

      return {
        thoughtId: group._id,
        reportCount: group.report_count,
        statuses: group.statuses,
        reasons: group.reasons,
        reports,
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

/** Warn a reporter (enables the client-side/server-side warning acknowledgement gate). */
mehfilAdminRoutes.post('/reporters/:reporterId/warn', async (req: Request, res: Response) => {
  try {
    const reporterId = String(req.params.reporterId || '').trim();
    const moderatorUserId = req.user?.userId;
    const note = req.body?.note ? String(req.body.note).slice(0, 2000) : null;

    if (!moderatorUserId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (!reporterId) {
      return res.status(400).json({ error: 'reporterId is required' });
    }

    const existing = await collections.users().findOne({ id: reporterId }, { projection: { id: 1 } });
    if (!existing?.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    await collections.users().updateOne(
      { id: reporterId },
      {
        $inc: { mehfil_reporting_warning_count: 1 },
        $set: {
          last_mehfil_reporting_warning_at: new Date(),
          last_mehfil_reporting_warning_by: moderatorUserId,
          ...(note ? { mehfil_reporting_warning_note: note } : {}),
        },
      },
    );

    const updated = await collections.users().findOne(
      { id: reporterId },
      {
        projection: {
          mehfil_reporting_warning_count: 1,
          last_mehfil_reporting_warning_at: 1,
          mehfil_reporting_banned: 1,
          mehfil_reporting_banned_at: 1,
          mehfil_false_report_strike_count: 1,
        },
      },
    );

    return res.json({
      success: true,
      reporterId,
      warningCount: Number(updated?.mehfil_reporting_warning_count || 0),
      lastWarningAt: updated?.last_mehfil_reporting_warning_at || null,
      reportingBanned: Boolean(updated?.mehfil_reporting_banned),
      reportingBannedAt: updated?.mehfil_reporting_banned_at || null,
      falseReportStrikes: Number(updated?.mehfil_false_report_strike_count || 0),
    });
  } catch (error) {
    console.error('[MEHFIL ADMIN] warn reporter failed:', error);
    res.status(500).json({ error: 'Failed to warn reporter' });
  }
});

/** Ban a user from reporting (does NOT affect posting/commenting/reacting). */
mehfilAdminRoutes.post('/reporters/:reporterId/ban-reporting', async (req: Request, res: Response) => {
  try {
    const reporterId = String(req.params.reporterId || '').trim();
    const moderatorUserId = req.user?.userId;
    const reason = req.body?.reason ? String(req.body.reason).slice(0, 2000) : null;

    if (!moderatorUserId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (!reporterId) {
      return res.status(400).json({ error: 'reporterId is required' });
    }

    const existing = await collections.users().findOne(
      { id: reporterId },
      { projection: { id: 1, mehfil_reporting_banned: 1 } },
    );
    if (!existing?.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (Boolean(existing.mehfil_reporting_banned)) {
      return res.json({ success: true, alreadyBanned: true, reporterId, reportingBanned: true });
    }

    await collections.users().updateOne(
      { id: reporterId },
      {
        $set: {
          mehfil_reporting_banned: true,
          mehfil_reporting_banned_at: new Date(),
          mehfil_reporting_banned_by: moderatorUserId,
          ...(reason ? { mehfil_reporting_banned_reason: reason } : {}),
        },
      },
    );

    const updated = await collections.users().findOne(
      { id: reporterId },
      { projection: { mehfil_reporting_banned: 1, mehfil_reporting_banned_at: 1 } },
    );

    return res.json({
      success: true,
      reporterId,
      reportingBanned: Boolean(updated?.mehfil_reporting_banned),
      reportingBannedAt: updated?.mehfil_reporting_banned_at || null,
    });
  } catch (error) {
    console.error('[MEHFIL ADMIN] ban reporter from reporting failed:', error);
    res.status(500).json({ error: 'Failed to ban reporter from reporting' });
  }
});

/** Mark a single report as fake/malicious and apply a strike to the reporter. */
mehfilAdminRoutes.post('/reports/:reportId/mark-fake', async (req: Request, res: Response) => {
  try {
    const reportId = String(req.params.reportId || '').trim();
    const moderatorUserId = req.user?.userId;
    const note = req.body?.note ? String(req.body.note).slice(0, 2000) : null;

    if (!moderatorUserId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required' });
    }

    const report = await collections.mehfilReports().findOne(
      { id: reportId },
      { projection: { id: 1, reporter_id: 1, thought_id: 1, moderator_verdict: 1 } },
    );

    if (!report?.id || !report.reporter_id) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (String(report.moderator_verdict || '').toLowerCase() === 'fake') {
      const reporter = await collections.users().findOne(
        { id: String(report.reporter_id) },
        { projection: { mehfil_false_report_strike_count: 1 } },
      );
      return res.json({
        success: true,
        alreadyMarked: true,
        reportId,
        thoughtId: report.thought_id,
        reporterId: report.reporter_id,
        falseReportStrikes: Number(reporter?.mehfil_false_report_strike_count || 0),
      });
    }

    await collections.mehfilReports().updateOne(
      { id: reportId },
      {
        $set: {
          moderator_verdict: 'fake',
          moderator_verdict_at: new Date(),
          moderator_verdict_by: moderatorUserId,
          status: 'dismissed',
          resolved_at: new Date(),
          ...(note ? { moderator_note: note } : {}),
        },
      },
    );

    await collections.users().updateOne(
      { id: String(report.reporter_id) },
      {
        $inc: { mehfil_false_report_strike_count: 1 },
        $set: { last_mehfil_false_report_strike_at: new Date() },
      },
    );

    const reporter = await collections.users().findOne(
      { id: String(report.reporter_id) },
      { projection: { mehfil_false_report_strike_count: 1 } },
    );

    return res.json({
      success: true,
      reportId,
      thoughtId: report.thought_id,
      reporterId: report.reporter_id,
      falseReportStrikes: Number(reporter?.mehfil_false_report_strike_count || 0),
    });
  } catch (error) {
    console.error('[MEHFIL ADMIN] mark fake report failed:', error);
    res.status(500).json({ error: 'Failed to mark fake report' });
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

    let reportedUserId = '';
    const thought = await collections.mehfilThoughts().findOne(
      { id: thoughtId },
      { projection: { id: 1, user_id: 1 } },
    );

    if (thought?.user_id) {
      reportedUserId = String(thought.user_id);
    } else {
      const report = await collections.mehfilReports().findOne(
        { thought_id: thoughtId },
        { projection: { reported_user_id: 1 } }
      );
      if (report?.reported_user_id) {
        reportedUserId = String(report.reported_user_id);
      } else {
        return res.status(404).json({ error: 'Thought not found' });
      }
    }

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
