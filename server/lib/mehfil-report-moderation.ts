import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { getMehfilNamespace } from '../routes/mehfil-socket';

export const SERIOUS_REPORT_CATEGORIES = ['spam', 'harassment', 'inappropriate'] as const;
export type SeriousReportCategory = (typeof SERIOUS_REPORT_CATEGORIES)[number];
export type ReportCategory = SeriousReportCategory | 'other';

export const REPORTS_TO_BAN = Math.max(2, Number(process.env.MEHFIL_REPORTS_TO_BAN || 3));
export const REPORTS_TO_HIDE = Math.max(1, Number(process.env.MEHFIL_REPORTS_TO_HIDE || 2));
/** Minimum unique reporters using spam/harassment/inappropriate before auto-ban. */
export const REPORTS_SERIOUS_FOR_BAN = Math.min(
  REPORTS_TO_BAN,
  Math.max(2, Number(process.env.MEHFIL_REPORTS_SERIOUS_FOR_BAN || 2)),
);
export const MAX_REPORTS_PER_USER_PER_DAY = Math.max(
  5,
  Number(process.env.MEHFIL_MAX_REPORTS_PER_USER_PER_DAY || 15),
);

const BAN_MESSAGE = 'you have been banned from posting messages';
const BAN_2_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const BAN_7_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type MehfilBanState = {
  isActive: boolean;
  isPermanent: boolean;
  banLevel: number;
  bannedUntil: Date | null;
  message: string;
};

export function parseReportCategory(reason: string): ReportCategory {
  const normalized = String(reason || '').trim().toLowerCase();
  if (normalized.startsWith('other:')) return 'other';
  if ((SERIOUS_REPORT_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as SeriousReportCategory;
  }
  return 'other';
}

export function buildReportReason(category: ReportCategory, details?: string): string {
  if (category === 'other') {
    return `other: ${String(details || '').trim()}`;
  }
  return category;
}

export type ReportStats = {
  uniqueReporters: number;
  seriousReporters: number;
  otherReporters: number;
};

export async function getReportStatsForThought(thoughtId: string): Promise<ReportStats> {
  const reports = await collections
    .mehfilReports()
    .find({ thought_id: thoughtId })
    .project({ reporter_id: 1, reason: 1, category: 1 })
    .toArray();

  const byReporter = new Map<string, ReportCategory>();
  for (const report of reports) {
    const category =
      report.category && typeof report.category === 'string'
        ? (report.category as ReportCategory)
        : parseReportCategory(String(report.reason || ''));
    byReporter.set(String(report.reporter_id), category);
  }

  let seriousReporters = 0;
  let otherReporters = 0;
  for (const category of byReporter.values()) {
    if (category === 'other') otherReporters += 1;
    else seriousReporters += 1;
  }

  return {
    uniqueReporters: byReporter.size,
    seriousReporters,
    otherReporters,
  };
}

export type ReportModerationDecision = {
  shouldHide: boolean;
  shouldBan: boolean;
  needsReview: boolean;
};

export function evaluateReportModeration(stats: ReportStats): ReportModerationDecision {
  const shouldHide = stats.uniqueReporters >= REPORTS_TO_HIDE;
  const shouldBan =
    stats.uniqueReporters >= REPORTS_TO_BAN && stats.seriousReporters >= REPORTS_SERIOUS_FOR_BAN;
  const needsReview =
    stats.uniqueReporters >= REPORTS_TO_BAN && shouldHide && !shouldBan;

  return { shouldHide, shouldBan, needsReview };
}

export async function countReporterSubmissionsLast24h(reporterId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return collections.mehfilReports().countDocuments({
    reporter_id: reporterId,
    created_at: { $gte: since },
  });
}

export async function getOrApplyReportBan(userId: string): Promise<MehfilBanState> {
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
          mehfil_banned_reason: 'report',
          mehfil_banned_at: now,
        },
      },
    );

    const banState: MehfilBanState = {
      isActive: true,
      isPermanent: true,
      banLevel: 3,
      bannedUntil: null,
      message: BAN_MESSAGE,
    };

    emitPostingBanStatus(userId, banState);
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
        mehfil_banned_reason: 'report',
        mehfil_banned_at: now,
      },
    },
  );

  const banState: MehfilBanState = {
    isActive: true,
    isPermanent: false,
    banLevel: nextLevel,
    bannedUntil: nextBannedUntil,
    message: BAN_MESSAGE,
  };

  emitPostingBanStatus(userId, banState);
  return banState;
}

function emitPostingBanStatus(userId: string, banState: MehfilBanState) {
  const mehfil = getMehfilNamespace();
  if (!mehfil) return;
  mehfil.to(`user:${userId}`).emit('postingBanStatus', {
    isActive: banState.isActive,
    isPermanent: banState.isPermanent,
    bannedUntil: banState.bannedUntil ? banState.bannedUntil.toISOString() : null,
    message: banState.message,
  });
}

export async function sendMehfilBanEmail(toEmail: string, userName: string, banState: MehfilBanState) {
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
    ? banState.bannedUntil.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : null;

  const durationLine = isPermanent
    ? '<strong>This ban is permanent.</strong>'
    : bannedUntilText
      ? `Your posting restriction will be lifted on <strong>${bannedUntilText} IST</strong>.`
      : 'A posting restriction has been applied to your account.';

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

export async function hideThoughtFromFeed(
  thoughtId: string,
  removedReason: 'community_reports' | 'community_reports_review' | 'admin_action',
) {
  const thought = await collections.mehfilThoughts().findOne(
    { id: thoughtId },
    { projection: { status: 1 } },
  );
  if (!thought || thought.status === 'removed') return false;

  await collections.mehfilThoughts().updateOne(
    { id: thoughtId },
    {
      $set: {
        status: 'removed',
        removed_at: new Date(),
        removed_reason: removedReason,
      },
    },
  );

  const mehfil = getMehfilNamespace();
  if (mehfil) {
    mehfil.emit('thoughtDeleted', { thoughtId });
  }
  return true;
}

export async function restoreThoughtToFeed(thoughtId: string) {
  const result = await collections.mehfilThoughts().updateOne(
    { id: thoughtId, status: 'removed' },
    {
      $set: { status: 'approved' },
      $unset: { removed_at: '', removed_reason: '' },
    },
  );
  return result.modifiedCount > 0;
}

export async function clearUserMehfilBan(userId: string) {
  await collections.users().updateOne(
    { id: userId },
    {
      $set: {
        mehfil_ban_level: 0,
        mehfil_banned_forever: false,
        mehfil_banned_until: null,
        mehfil_banned_reason: '',
        mehfil_banned_at: '',
      },
    },
  );

  const mehfil = getMehfilNamespace();
  if (mehfil) {
    mehfil.to(`user:${userId}`).emit('postingBanStatus', {
      isActive: false,
      isPermanent: false,
      bannedUntil: null,
      message: BAN_MESSAGE,
    });
  }
}

export type ProcessReportResult = {
  stats: ReportStats;
  decision: ReportModerationDecision;
  postHidden: boolean;
  banApplied: boolean;
  queuedForReview: boolean;
  banState: MehfilBanState | null;
};

export async function processReportModerationForThought(
  thoughtId: string,
  reportedUserId: string,
): Promise<ProcessReportResult> {
  const stats = await getReportStatsForThought(thoughtId);
  const decision = evaluateReportModeration(stats);

  let postHidden = false;
  let banApplied = false;
  let queuedForReview = false;
  let banState: MehfilBanState | null = null;

  if (decision.shouldHide) {
    const removedReason = decision.needsReview
      ? 'community_reports_review'
      : 'community_reports';
    postHidden = await hideThoughtFromFeed(thoughtId, removedReason);
  }

  if (decision.needsReview) {
    queuedForReview = true;
    await collections.mehfilReports().updateMany(
      { thought_id: thoughtId, status: 'pending' },
      { $set: { status: 'review_needed' } },
    );
  }

  if (decision.shouldBan) {
    banState = await getOrApplyReportBan(reportedUserId);
    banApplied = banState.isActive;

    if (banApplied) {
      await collections.mehfilReports().updateMany(
        { thought_id: thoughtId },
        { $set: { status: 'actioned' } },
      );

      if (!postHidden) {
        postHidden = await hideThoughtFromFeed(thoughtId, 'community_reports');
      }

      try {
        const bannedUser = await collections.users().findOne(
          { id: reportedUserId },
          { projection: { email: 1, name: 1 } },
        );
        if (bannedUser?.email) {
          await sendMehfilBanEmail(
            String(bannedUser.email),
            String(bannedUser.name || 'User'),
            banState,
          );
        }
      } catch (emailErr) {
        console.error('[MEHFIL] Ban email failed (non-fatal):', emailErr);
      }
    }
  }

  return {
    stats,
    decision,
    postHidden,
    banApplied,
    queuedForReview,
    banState,
  };
}

export function createReportDocument(input: {
  thoughtId: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  category: ReportCategory;
}) {
  return {
    id: uuidv4(),
    thought_id: input.thoughtId,
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    reason: input.reason,
    category: input.category,
    status: 'pending' as const,
    created_at: new Date(),
  };
}
