import { collections } from "../db";
import {
  getDefaultNotificationPreferences,
  getSavedNotificationPreferences,
  isValidTimezone,
  sendNotificationToUser,
} from "./push-notifications";

const HOURLY_INTERVAL_MS = 60 * 60 * 1000;

function parseHourEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw < 0 || raw > 23) return fallback;
  return Math.floor(raw);
}

const MORNING_HOUR = parseHourEnv("NOTIFICATION_MORNING_HOUR", 9);
const EVENING_HOUR = parseHourEnv("NOTIFICATION_EVENING_HOUR", 19);

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let schedulerInterval: NodeJS.Timeout | null = null;
let alignTimeout: NodeJS.Timeout | null = null;

function getLocalHour(timezone: string, at = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  return Number(parts.find((part) => part.type === "hour")?.value || "0");
}

function msUntilNextHour(at = new Date()): number {
  const next = new Date(at);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return Math.max(0, next.getTime() - at.getTime());
}

function toISTDate(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function getISTDateKey(date: Date): string {
  return toISTDate(date).toISOString().split("T")[0];
}

function getStartOfISTDayUTC(date: Date): Date {
  const istKey = getISTDateKey(date);
  const startUTC = new Date(`${istKey}T00:00:00.000Z`);
  startUTC.setTime(startUTC.getTime() - IST_OFFSET_MS);
  return startUTC;
}

async function getActiveUserIds(): Promise<string[]> {
  return collections.deviceTokens().distinct("user_id", {
    notifications_enabled: true,
    revoked_at: null,
  });
}

async function countMoodsForDay(userId: string, date: Date): Promise<number> {
  const start = getStartOfISTDayUTC(date);
  const end = new Date(start.getTime() + DAY_MS);
  return collections.moods().countDocuments({
    user_id: userId,
    timestamp: { $gte: start, $lt: end },
  });
}

async function countGoals(userId: string, query: Record<string, any>): Promise<number> {
  return collections.goals().countDocuments({ user_id: userId, ...query });
}

async function sendMorningReminders(userId: string, now: Date) {
  const dedupeDayKey = getISTDateKey(now);
  const todayStart = getStartOfISTDayUTC(now);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const yesterdayEnd = todayStart;

  const scheduledCount = await countGoals(userId, {
    goal_kind: "scheduled",
    scheduled_date: { $gte: todayStart, $lt: todayEnd },
    status_value: { $ne: "completed" },
    lifecycle_status: { $nin: ["abandoned", "rolled_over"] },
  });

  if (scheduledCount > 0) {
    await sendNotificationToUser(
      userId,
      {
        type: "study_reminders",
        title: "Scheduled goals due today",
        body:
          scheduledCount === 1
            ? "You have 1 goal scheduled for today."
            : `You have ${scheduledCount} goals scheduled for today.`,
        channel: "study_reminders",
        deepLink: "safar://nishtha/goals",
        priority: "normal",
      },
      { dedupeDayKey },
    );
  }

  const missedTodayCount = await countGoals(userId, {
    goal_kind: "today",
    scheduled_date: { $gte: yesterdayStart, $lt: yesterdayEnd },
    status_value: { $ne: "completed" },
    lifecycle_status: { $nin: ["abandoned", "rolled_over"] },
  });

  if (missedTodayCount > 0) {
    await sendNotificationToUser(
      userId,
      {
        type: "study_reminders",
        title: "You missed a goal yesterday",
        body:
          missedTodayCount === 1
            ? "You missed 1 goal yesterday. Start again today."
            : `You missed ${missedTodayCount} goals yesterday. Start again today.`,
        channel: "study_reminders",
        deepLink: "safar://nishtha/goals",
        priority: "normal",
      },
      { dedupeDayKey },
    );
  }

  const moodToday = await countMoodsForDay(userId, now);
  if (moodToday > 0) return;

  const moodYesterday = await countMoodsForDay(userId, new Date(now.getTime() - DAY_MS));
  if (moodYesterday === 0) {
    await sendNotificationToUser(
      userId,
      {
        type: "streak",
        title: "Restart your Check-in Streak",
        body: "You missed yesterday's check-in. Start again today.",
        channel: "study_reminders",
        deepLink: "safar://streaks",
        priority: "normal",
      },
      { dedupeDayKey },
    );
  }
}

async function sendEveningCheckInReminder(userId: string, now: Date) {
  const moodToday = await countMoodsForDay(userId, now);
  if (moodToday > 0) return;

  await sendNotificationToUser(
    userId,
    {
      type: "streak",
      title: "Keep your streak alive",
      body: "Log your emotional check-in before the day ends.",
      channel: "study_reminders",
      deepLink: "safar://streaks",
      priority: "normal",
    },
    { dedupeDayKey: getISTDateKey(now) },
  );
}

export async function runSchedulerTick() {
  const now = new Date();
  const userIds = await getActiveUserIds();
  let morningRuns = 0;
  let eveningRuns = 0;

  for (const userId of userIds) {
    if (!userId) continue;

    const preferences = await getSavedNotificationPreferences(userId);
    const timezone = isValidTimezone(preferences.timezone)
      ? preferences.timezone
      : getDefaultNotificationPreferences().timezone;

    const localHour = getLocalHour(timezone, now);

    if (localHour === MORNING_HOUR) {
      morningRuns += 1;
      await sendMorningReminders(userId, now);
    }

    if (localHour === EVENING_HOUR) {
      eveningRuns += 1;
      await sendEveningCheckInReminder(userId, now);
    }
  }

  console.info(
    `[NOTIFICATION SCHEDULER] tick users=${userIds.length} morningRuns=${morningRuns} eveningRuns=${eveningRuns} morningHour=${MORNING_HOUR} eveningHour=${EVENING_HOUR}`,
  );
}

function runTickSafe() {
  runSchedulerTick().catch((error) => {
    console.error("[NOTIFICATION SCHEDULER] Tick failed:", error);
  });
}

function scheduleAlignedHourlyTicks() {
  const delayMs = msUntilNextHour();
  console.info(
    `[NOTIFICATION SCHEDULER] hourly mode intervalMs=${HOURLY_INTERVAL_MS} nextTickInMs=${delayMs} morningHour=${MORNING_HOUR} eveningHour=${EVENING_HOUR}`,
  );

  alignTimeout = setTimeout(() => {
    alignTimeout = null;
    runTickSafe();
    schedulerInterval = setInterval(runTickSafe, HOURLY_INTERVAL_MS);
  }, delayMs);
}

export function startNotificationScheduler() {
  if (schedulerInterval || alignTimeout) return;

  scheduleAlignedHourlyTicks();

  if (process.env.NOTIFICATION_SCHEDULER_RUN_ON_START === "true") {
    runTickSafe();
  }
}

export function stopNotificationScheduler() {
  if (alignTimeout) {
    clearTimeout(alignTimeout);
    alignTimeout = null;
  }
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
