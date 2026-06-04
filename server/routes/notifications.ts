import { Router, type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAdmin, requireAuth } from "../middleware/auth";
import {
  ALLOWED_CHANNELS,
  getDefaultNotificationPreferences,
  isValidTimeString,
  isValidTimezone,
  normalizeFlavor,
  sendNotificationToUser,
  sendPushToTokensBatched,
  sendPushToTokens,
  validatePushPayload,
} from "../services/push-notifications";

export const notificationRoutes = Router();

const PREFERENCE_KEYS = [
  "focus_timer_enabled",
  "daily_study_enabled",
  "streak_enabled",
  "course_updates_enabled",
  "achievements_enabled",
  "community_enabled",
  "account_system_enabled",
  "announcements_enabled",
  "weekly_summary_enabled",
] as const;

function getAuthenticatedUserId(req: Request): string {
  return String(req.user?.userId || req.session?.userId || "").trim();
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function serializePreferences(preferences: any) {
  return {
    userId: preferences.user_id,
    focusTimerEnabled: preferences.focus_timer_enabled,
    dailyStudyEnabled: preferences.daily_study_enabled,
    streakEnabled: preferences.streak_enabled,
    courseUpdatesEnabled: preferences.course_updates_enabled,
    achievementsEnabled: preferences.achievements_enabled,
    communityEnabled: preferences.community_enabled,
    accountSystemEnabled: preferences.account_system_enabled,
    announcementsEnabled: preferences.announcements_enabled,
    weeklySummaryEnabled: preferences.weekly_summary_enabled,
    quietHoursStart: preferences.quiet_hours_start,
    quietHoursEnd: preferences.quiet_hours_end,
    timezone: preferences.timezone,
    createdAt: preferences.created_at,
    updatedAt: preferences.updated_at,
  };
}

function readPreferenceBodyValue(body: any, snakeKey: string) {
  const camelKey = snakeKey.replace(/_([a-z])/g, (_match, char) => char.toUpperCase());
  return body?.[snakeKey] ?? body?.[camelKey];
}

notificationRoutes.post("/device-tokens", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const body = req.body || {};
    const bodyUserId = body.userId ? String(body.userId).trim() : "";
    const token = String(body.deviceToken || "").trim();
    const platform = String(body.platform || "android").trim().toLowerCase();
    const now = new Date();
    const VALID_PLATFORMS = ["android"];

    if (!userId) return res.status(401).json({ error: "unauthenticated" });
    if (bodyUserId && bodyUserId !== userId) return res.status(403).json({ error: "user_mismatch" });
    if (!token) return res.status(400).json({ message: "deviceToken is required" });
    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ message: "platform must be android" });
    }

    await collections.deviceTokens().updateOne(
      { token },
      {
        $set: {
          user_id: userId,
          token,
          platform,
          app_version: body.appVersion ? String(body.appVersion) : null,
          flavor: normalizeFlavor(body.flavor),
          language: body.language ? String(body.language) : null,
          notifications_enabled: body.notificationsEnabled !== false,
          last_seen_at: now,
          updated_at: now,
          revoked_at: null,
        },
        $setOnInsert: {
          id: uuidv4(),
          created_at: now,
        },
      },
      { upsert: true },
    );

    // Keep one active Android token per account so stale reinstall tokens do not multiply pushes.
    await collections.deviceTokens().updateMany(
      { user_id: userId, platform, token: { $ne: token }, revoked_at: null },
      {
        $set: {
          notifications_enabled: false,
          revoked_at: now,
          updated_at: now,
        },
      },
    );

    return res.json({ success: true, message: "device_token_registered" });
  } catch (error: any) {
    console.error("Register device token error:", error);
    return res.status(500).json({ message: "Failed to register device token" });
  }
});

notificationRoutes.patch("/device-tokens/revoke", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const token = String(req.body?.deviceToken || "").trim();
    const now = new Date();

    if (!userId) return res.status(401).json({ error: "unauthenticated" });
    if (!token) return res.status(400).json({ message: "deviceToken is required" });

    const result = await collections.deviceTokens().updateOne(
      { user_id: userId, token },
      {
        $set: {
          notifications_enabled: false,
          revoked_at: now,
          updated_at: now,
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Device token not found" });
    }

    return res.json({ success: true, message: "device_token_revoked" });
  } catch (error: any) {
    console.error("Revoke device token error:", error);
    return res.status(500).json({ message: "Failed to revoke device token" });
  }
});

notificationRoutes.patch("/notification-preferences", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const body = req.body || {};
    const defaults = getDefaultNotificationPreferences();
    const now = new Date();

    if (!userId) return res.status(401).json({ error: "unauthenticated" });

    const quietHoursStart = String(body.quietHoursStart ?? body.quiet_hours_start ?? defaults.quiet_hours_start);
    const quietHoursEnd = String(body.quietHoursEnd ?? body.quiet_hours_end ?? defaults.quiet_hours_end);
    const timezone = String(body.timezone ?? defaults.timezone);

    if (!isValidTimeString(quietHoursStart) || !isValidTimeString(quietHoursEnd)) {
      return res.status(400).json({ message: "quiet hours must be HH:mm" });
    }
    if (!isValidTimezone(timezone)) {
      return res.status(400).json({ message: "Invalid timezone" });
    }

    const update: any = {
      user_id: userId,
      quiet_hours_start: quietHoursStart,
      quiet_hours_end: quietHoursEnd,
      timezone,
      updated_at: now,
    };

    for (const key of PREFERENCE_KEYS) {
      update[key] = pickBoolean(readPreferenceBodyValue(body, key), (defaults as any)[key]);
    }

    await collections.notificationPreferences().updateOne(
      { user_id: userId },
      {
        $set: update,
        $setOnInsert: {
          id: uuidv4(),
          created_at: now,
        },
      },
      { upsert: true },
    );

    const saved = await collections.notificationPreferences().findOne({ user_id: userId });
    return res.json({ success: true, preferences: serializePreferences(saved) });
  } catch (error: any) {
    console.error("Save notification preferences error:", error);
    return res.status(500).json({ message: "Failed to save notification preferences" });
  }
});

notificationRoutes.post("/notifications/test", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { payload, error } = validatePushPayload(req.body || {});

    if (!userId) return res.status(401).json({ error: "unauthenticated" });
    if (error || !payload) return res.status(400).json({ message: error });

    const results = await sendNotificationToUser(userId, payload, {
      ignoreQuietHours: req.body?.ignoreQuietHours !== false,
      bypassDedupe: req.body?.bypassDedupe !== false,
      bypassPreferences: req.body?.bypassPreferences !== false,
    });

    return res.json({
      message: results.some((result) => result.success) ? "sent" : "not_sent",
      results,
    });
  } catch (error: any) {
    console.error("Test notification error:", error);
    return res.status(500).json({ message: "Failed to send test notification" });
  }
});

notificationRoutes.post(
  "/admin/notifications/broadcast",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { payload, error } = validatePushPayload(req.body || {});
      if (error || !payload) return res.status(400).json({ message: error });
      if (!ALLOWED_CHANNELS.includes(payload.channel)) {
        return res.status(400).json({ message: "Invalid notification channel" });
      }

      const targetFlavor = req.body?.flavor ? normalizeFlavor(req.body.flavor) : null;
      const query: any = {
        platform: "android",
        notifications_enabled: true,
        revoked_at: null,
      };
      if (targetFlavor) query.flavor = targetFlavor;

      const tokens = await collections.deviceTokens().find(query).toArray();
      const results = await sendPushToTokensBatched(tokens, payload, 200);

      return res.json({
        message: results.some((result) => result.success) ? "sent" : "not_sent",
        count: tokens.length,
        results,
      });
    } catch (error: any) {
      console.error("Admin notification broadcast error:", error);
      return res.status(500).json({ message: "Failed to broadcast notifications" });
    }
  },
);

notificationRoutes.post(
  "/admin/notifications/send",
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { payload, error } = validatePushPayload(req.body || {});
      if (error || !payload) return res.status(400).json({ message: error });
      if (!ALLOWED_CHANNELS.includes(payload.channel)) {
        return res.status(400).json({ message: "Invalid notification channel" });
      }

      const targetUserId = req.body?.userId ? String(req.body.userId).trim() : "";
      const targetFlavor = req.body?.flavor ? normalizeFlavor(req.body.flavor) : null;
      const broadcast = req.body?.broadcast === true;

      let tokens: any[] = [];
      if (targetUserId) {
        tokens = await collections.deviceTokens()
          .find({
            user_id: targetUserId,
            platform: "android",
            notifications_enabled: true,
            revoked_at: null,
          })
          .toArray();
      } else if (broadcast || targetFlavor) {
        const query: any = {
          platform: "android",
          notifications_enabled: true,
          revoked_at: null,
        };
        if (targetFlavor) query.flavor = targetFlavor;
        tokens = await collections.deviceTokens().find(query).toArray();
      } else {
        return res.status(400).json({ message: "Provide userId, flavor, or broadcast=true" });
      }

      const results = await sendPushToTokens(tokens, payload, {
        ignoreQuietHours: req.body?.ignoreQuietHours === true && payload.channel === "account_system",
        bypassDedupe: req.body?.bypassDedupe === true,
      });

      return res.json({
        message: results.some((result) => result.success) ? "sent" : "not_sent",
        results,
      });
    } catch (error: any) {
      console.error("Admin notification send error:", error);
      return res.status(500).json({ message: "Failed to send notifications" });
    }
  },
);
