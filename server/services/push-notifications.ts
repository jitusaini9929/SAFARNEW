import crypto from "crypto";
import type { App } from "firebase-admin/app";
import { cert, getApp, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { collections } from "../db";

export type NotificationFlavor = "qa" | "prod";
export type NotificationChannel =
  | "focus_timer"
  | "study_reminders"
  | "course_updates"
  | "achievements"
  | "community"
  | "account_system"
  | "announcements";

export type PushPayload = {
  type: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  deepLink: string;
  priority: string;
};

export type PushSendOptions = {
  ignoreQuietHours?: boolean;
  bypassDedupe?: boolean;
};

export const ALLOWED_CHANNELS: NotificationChannel[] = [
  "focus_timer",
  "study_reminders",
  "course_updates",
  "achievements",
  "community",
  "account_system",
  "announcements",
];

const DEFAULT_PREFERENCES = {
  focus_timer_enabled: false,
  daily_study_enabled: false,
  streak_enabled: true,
  course_updates_enabled: true,
  achievements_enabled: false,
  community_enabled: false,
  account_system_enabled: true,
  announcements_enabled: false,
  weekly_summary_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: "Asia/Kolkata",
};

const TYPE_TO_PREF: Record<string, string> = {
  focus_timer: "focus_timer_enabled",
  course_updates: "course_updates_enabled",
  community: "community_enabled",
  account_system: "account_system_enabled",
  announcements: "announcements_enabled",
  achievements: "achievements_enabled",
  daily_study: "daily_study_enabled",
  study_reminders: "daily_study_enabled",
  streak: "streak_enabled",
  weekly_summary: "weekly_summary_enabled",
  live_session: "course_updates_enabled",
};

const DEDUPE_WINDOW_MS = Number(process.env.PUSH_DEDUPE_WINDOW_MS || 10 * 60 * 1000);

const firebaseApps = new Map<NotificationFlavor, App>();

export function getDefaultNotificationPreferences() {
  return { ...DEFAULT_PREFERENCES };
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeFlavor(value: unknown): NotificationFlavor {
  return value === "prod" ? "prod" : "qa";
}

export function tokenPreview(token: string): string {
  if (token.length <= 10) return "***";
  return `${token.slice(0, 3)}...${token.slice(-3)}`;
}

export function validatePushPayload(body: any): { payload?: PushPayload; error?: string } {
  const payload = {
    type: String(body?.type || "").trim(),
    title: String(body?.title || "").trim(),
    body: String(body?.body || "").trim(),
    channel: String(body?.channel || "").trim() as NotificationChannel,
    deepLink: String(body?.deepLink || "").trim(),
    priority: String(body?.priority || "high").trim(),
  };

  if (!payload.type || !payload.title || !payload.body || !payload.channel || !payload.deepLink) {
    return { error: "type, title, body, channel, and deepLink are required" };
  }
  if (!ALLOWED_CHANNELS.includes(payload.channel)) {
    return { error: "Invalid notification channel" };
  }

  return { payload };
}

export async function getSavedNotificationPreferences(userId: string) {
  const saved = await collections.notificationPreferences().findOne({ user_id: userId });
  return {
    ...DEFAULT_PREFERENCES,
    ...(saved || {}),
    user_id: userId,
  };
}

function getFirebaseApp(flavor: NotificationFlavor): App {
  const cached = firebaseApps.get(flavor);
  if (cached) return cached;

  const appName = `safar-${flavor}`;
  try {
    const existing = getApp(appName);
    firebaseApps.set(flavor, existing);
    return existing;
  } catch {
    // Continue with initialization.
  }

  const envName =
    flavor === "prod" ? "FIREBASE_SERVICE_ACCOUNT_PROD_JSON" : "FIREBASE_SERVICE_ACCOUNT_QA_JSON";
  const rawJson = process.env[envName];
  if (!rawJson) {
    throw new Error(`${envName} is not configured`);
  }

  const serviceAccount = JSON.parse(rawJson);
  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }

  const app = initializeApp({ credential: cert(serviceAccount) }, appName);
  firebaseApps.set(flavor, app);
  return app;
}

function minutesFromHHmm(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getLocalMinutes(timezone: string, at = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value || "0");
  return hour * 60 + minute;
}

function isInsideQuietHours(preferences: any, at = new Date()): boolean {
  const start = preferences.quiet_hours_start;
  const end = preferences.quiet_hours_end;
  const timezone = preferences.timezone || DEFAULT_PREFERENCES.timezone;
  if (!isValidTimeString(start) || !isValidTimeString(end) || !isValidTimezone(timezone)) return false;

  const current = getLocalMinutes(timezone, at);
  const startMinutes = minutesFromHHmm(start);
  const endMinutes = minutesFromHHmm(end);

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return current >= startMinutes && current < endMinutes;
  }
  return current >= startMinutes || current < endMinutes;
}

function buildDedupeKey(payload: PushPayload): string {
  return crypto
    .createHash("sha256")
    .update(`${payload.type}|${payload.channel}|${payload.title}|${payload.body}|${payload.deepLink}`)
    .digest("hex");
}

async function evaluatePolicy(userId: string, payload: PushPayload, options: PushSendOptions = {}) {
  const preferences = await getSavedNotificationPreferences(userId);
  const preferenceField = TYPE_TO_PREF[payload.type] || TYPE_TO_PREF[payload.channel];

  if (preferenceField && preferences[preferenceField] === false) {
    return { allowed: false, reason: "preference_disabled" };
  }

  if (
    payload.channel !== "account_system" &&
    payload.type !== "account_system" &&
    !options.ignoreQuietHours &&
    isInsideQuietHours(preferences)
  ) {
    return { allowed: false, reason: "quiet_hours" };
  }

  if (!options.bypassDedupe) {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
    const existing = await collections.notificationDeliveryLog().findOne({
      user_id: userId,
      type: payload.type,
      dedupe_key: buildDedupeKey(payload),
      created_at: { $gte: since },
    });
    if (existing) {
      return { allowed: false, reason: "deduped" };
    }
  }

  return { allowed: true, reason: "allowed" };
}

async function markInvalidToken(token: string) {
  await collections.deviceTokens().updateOne(
    { token },
    {
      $set: {
        notifications_enabled: false,
        revoked_at: new Date(),
        updated_at: new Date(),
      },
    },
  );
}

export async function sendPushToTokens(tokens: any[], payload: PushPayload, options: PushSendOptions = {}) {
  const results = [];
  const dedupeKey = buildDedupeKey(payload);

  for (const tokenRow of tokens) {
    const token = String(tokenRow.token || "");
    const userId = String(tokenRow.user_id || "");
    const preview = tokenPreview(token);

    if (!token || !userId || tokenRow.revoked_at || tokenRow.notifications_enabled !== true) {
      results.push({ tokenPreview: preview, success: false, error: "token_inactive" });
      continue;
    }

    const policy = await evaluatePolicy(userId, payload, options);
    if (!policy.allowed) {
      results.push({ tokenPreview: preview, success: false, error: policy.reason });
      continue;
    }

    try {
      const flavor = normalizeFlavor(tokenRow.flavor);
      const app = getFirebaseApp(flavor);
      const isWebToken = String(tokenRow.platform || "") === "web";

      const message: any = {
        token,
        data: {
          type: String(payload.type),
          title: String(payload.title),
          body: String(payload.body),
          channel: String(payload.channel),
          deepLink: String(payload.deepLink),
          priority: String(payload.priority),
        },
      };

      if (isWebToken) {
        message.webpush = {
          notification: {
            title: String(payload.title),
            body: String(payload.body),
            icon: "/favicon.svg",
          },
          fcmOptions: {
            link: String(payload.deepLink || "/"),
          },
        };
      } else {
        message.android = {
          priority: payload.priority === "high" ? "high" : "normal",
        };
      }

      const response = await getMessaging(app).send(message);

      await collections.notificationDeliveryLog().insertOne({
        user_id: userId,
        token,
        token_preview: preview,
        type: payload.type,
        channel: payload.channel,
        dedupe_key: dedupeKey,
        message_id: response,
        created_at: new Date(),
      });

      results.push({ tokenPreview: preview, success: true, messageId: response });
    } catch (error: any) {
      const code = String(error?.code || "");
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
        await markInvalidToken(token);
      }
      results.push({
        tokenPreview: preview,
        success: false,
        error: code || "send_failed",
      });
    }
  }

  return results;
}

export async function sendNotificationToUser(userId: string, payload: PushPayload, options: PushSendOptions = {}) {
  const tokens = await collections.deviceTokens()
    .find({
      user_id: userId,
      platform: { $in: ["android", "web"] },
      notifications_enabled: true,
      revoked_at: null,
    })
    .sort({ updated_at: -1 })
    .toArray();

  return sendPushToTokens(tokens, payload, options);
}

export async function sendAnnouncementToActiveTokens(payload: PushPayload, flavor?: NotificationFlavor) {
  const query: any = {
    platform: { $in: ["android", "web"] },
    notifications_enabled: true,
    revoked_at: null,
  };
  if (flavor) query.flavor = flavor;

  const tokens = await collections.deviceTokens().find(query).toArray();
  return sendPushToTokens(tokens, payload);
}

export async function notifyLiveSessionStarted(params: {
  sessionId: string;
  sessionTitle: string;
  hostName: string;
}) {
  const deepLink = `safar://live/session/${encodeURIComponent(params.sessionId)}`;
  return sendAnnouncementToActiveTokens({
    type: "live_session",
    title: `${params.hostName} is live`,
    body: `Join now: ${params.sessionTitle}`,
    channel: "course_updates",
    deepLink,
    priority: "high",
  });
}
