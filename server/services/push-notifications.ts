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
  bypassPreferences?: boolean;
  /** When set (YYYY-MM-DD), the same payload is sent at most once per user for that calendar day. */
  dedupeDayKey?: string;
  /** When true, only the most recently updated device token receives the push (default for sendNotificationToUser). */
  latestTokenOnly?: boolean;
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

function buildDedupeKey(payload: PushPayload, options: Pick<PushSendOptions, "dedupeDayKey"> = {}): string {
  const windowPart = options.dedupeDayKey
    ? `day:${options.dedupeDayKey}`
    : `slot:${Math.floor(Date.now() / DEDUPE_WINDOW_MS)}`;
  return crypto
    .createHash("sha256")
    .update(
      `${windowPart}|${payload.type}|${payload.channel}|${payload.title}|${payload.body}|${payload.deepLink}`,
    )
    .digest("hex");
}

async function tryClaimUserDedupe(
  userId: string,
  dedupeKey: string,
  payload: PushPayload,
): Promise<boolean> {
  try {
    await collections.notificationDeliveryLog().insertOne({
      user_id: userId,
      type: payload.type,
      channel: payload.channel,
      dedupe_key: dedupeKey,
      token: null,
      token_preview: "user_claim",
      created_at: new Date(),
    });
    return true;
  } catch (error: any) {
    if (error?.code === 11000) return false;
    const existing = await collections.notificationDeliveryLog().findOne({
      user_id: userId,
      dedupe_key: dedupeKey,
    });
    return !existing;
  }
}

async function evaluatePolicy(userId: string, payload: PushPayload, options: PushSendOptions = {}) {
  const preferences = await getSavedNotificationPreferences(userId);
  const preferenceField = TYPE_TO_PREF[payload.type] || TYPE_TO_PREF[payload.channel];

  if (!options.bypassPreferences && preferenceField && preferences[preferenceField] === false) {
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
    const dedupeKey = buildDedupeKey(payload, options);
    const existing = await collections.notificationDeliveryLog().findOne({
      user_id: userId,
      dedupe_key: dedupeKey,
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

async function deliverPushToken(
  tokenRow: any,
  payload: PushPayload,
  dedupeKey: string,
  userName?: string
) {
  const token = String(tokenRow.token || "");
  const userId = String(tokenRow.user_id || "");
  const preview = tokenPreview(token);

  if (!token || !userId || tokenRow.revoked_at || tokenRow.notifications_enabled !== true) {
    return { tokenPreview: preview, success: false, error: "token_inactive" };
  }

  try {
    const flavor = normalizeFlavor(tokenRow.flavor);
    const app = getFirebaseApp(flavor);

    let nameToUse = userName;
    if (nameToUse === undefined && userId) {
      const user = await collections.users().findOne({ id: userId }, { projection: { name: 1 } });
      nameToUse = user?.name || "";
    }
    const resolvedName = (nameToUse || "").trim() || "User";

    // Replace the <name> placeholder case-insensitively in title and body
    const title = payload.title.replace(/<name>/gi, resolvedName);
    const body = payload.body.replace(/<name>/gi, resolvedName);

    const message: any = {
      token,
      data: {
        type: String(payload.type),
        title,
        body,
        channel: String(payload.channel),
        deepLink: String(payload.deepLink),
        priority: String(payload.priority),
      },
    };

    message.android = {
      priority: payload.priority === "high" ? "high" : "normal",
    };

    const response = await getMessaging(app).send(message);

    const deliveryUpdate = await collections.notificationDeliveryLog().updateOne(
      { user_id: userId, dedupe_key: dedupeKey, token_preview: "user_claim" },
      {
        $set: {
          token,
          token_preview: preview,
          type: payload.type,
          channel: payload.channel,
          message_id: response,
          delivered_at: new Date(),
        },
      },
    );
    if (deliveryUpdate.matchedCount === 0) {
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
    }

    return { tokenPreview: preview, success: true, messageId: response };
  } catch (error: any) {
    await collections.notificationDeliveryLog()
      .deleteOne({ user_id: userId, dedupe_key: dedupeKey, token_preview: "user_claim" })
      .catch(() => undefined);
    console.error("Error in deliverPushToken:", error);
    const code = String(error?.code || "");
    if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
      await markInvalidToken(token);
    }
    return {
      tokenPreview: preview,
      success: false,
      error: error?.code || error?.message || "send_failed",
    };
  }
}

export async function sendPushToTokens(tokens: any[], payload: PushPayload, options: PushSendOptions = {}) {
  const results: any[] = [];
  const dedupeKey = buildDedupeKey(payload, options);
  const tokensByUser = new Map<string, any[]>();

  for (const tokenRow of tokens) {
    const userId = String(tokenRow.user_id || "").trim();
    if (!userId) {
      results.push({
        tokenPreview: tokenPreview(String(tokenRow.token || "")),
        success: false,
        error: "token_inactive",
      });
      continue;
    }
    const bucket = tokensByUser.get(userId) || [];
    bucket.push(tokenRow);
    tokensByUser.set(userId, bucket);
  }

  const userIds = Array.from(tokensByUser.keys());
  const users =
    userIds.length > 0
      ? await collections.users().find({ id: { $in: userIds } }).project({ id: 1, name: 1 }).toArray()
      : [];
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  for (const [userId, userTokens] of tokensByUser) {
    const sortedTokens = [...userTokens].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
    );
    const deliverTokens = options.latestTokenOnly ? sortedTokens.slice(0, 1) : sortedTokens;

    const policy = await evaluatePolicy(userId, payload, options);
    if (!policy.allowed) {
      for (const tokenRow of deliverTokens) {
        results.push({
          tokenPreview: tokenPreview(String(tokenRow.token || "")),
          success: false,
          error: policy.reason,
        });
      }
      continue;
    }

    if (!options.bypassDedupe) {
      const claimed = await tryClaimUserDedupe(userId, dedupeKey, payload);
      if (!claimed) {
        for (const tokenRow of deliverTokens) {
          results.push({
            tokenPreview: tokenPreview(String(tokenRow.token || "")),
            success: false,
            error: "deduped",
          });
        }
        continue;
      }
    }

    const userName = userMap.get(userId);
    for (const tokenRow of deliverTokens) {
      results.push(await deliverPushToken(tokenRow, payload, dedupeKey, userName));
    }
  }

  return results;
}

export async function sendPushToTokensBatched(
  tokens: any[],
  payload: PushPayload,
  chunkSize = 200,
  options: PushSendOptions = {},
) {
  const results: any[] = [];
  for (let index = 0; index < tokens.length; index += chunkSize) {
    const chunk = tokens.slice(index, index + chunkSize);
    const chunkResults = await sendPushToTokens(chunk, payload, options);
    results.push(...chunkResults);
  }
  return results;
}

export async function sendNotificationToUser(userId: string, payload: PushPayload, options: PushSendOptions = {}) {
  const tokens = await collections.deviceTokens()
    .find({
      user_id: userId,
      platform: "android",
      notifications_enabled: true,
      revoked_at: null,
    })
    .sort({ updated_at: -1 })
    .toArray();

  return sendPushToTokens(tokens, payload, {
    ...options,
    latestTokenOnly: options.latestTokenOnly ?? true,
  });
}

export async function sendAnnouncementToActiveTokens(payload: PushPayload, flavor?: NotificationFlavor) {
  const query: any = {
    platform: "android",
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
