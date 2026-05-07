import { collections } from "../db";
import {
  getDefaultNotificationPreferences,
  getSavedNotificationPreferences,
  isValidTimeString,
  isValidTimezone,
  sendNotificationToUser,
} from "./push-notifications";

const CHECK_INTERVAL_MS = Number(process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS || 5 * 60 * 1000);
const MORNING_TARGET = "09:00";
const EVENING_TARGET = "19:00";
const WINDOW_MINUTES = 10;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let schedulerTimer: NodeJS.Timeout | null = null;

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

function isWithinWindow(currentMinutes: number, targetMinutes: number, windowMinutes: number): boolean {
  const diff = (currentMinutes - targetMinutes + 1440) % 1440;
  return diff >= 0 && diff < windowMinutes;
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
    await sendNotificationToUser(userId, {
      type: "study_reminders",
      title: "Scheduled goals due today",
      body:
        scheduledCount === 1
          ? "You have 1 goal scheduled for today."
          : `You have ${scheduledCount} goals scheduled for today.`,
      channel: "study_reminders",
      deepLink: "safar://nishtha/goals",
      priority: "normal",
    });
  }

  const missedTodayCount = await countGoals(userId, {
    goal_kind: "today",
    scheduled_date: { $gte: yesterdayStart, $lt: yesterdayEnd },
    status_value: { $ne: "completed" },
    lifecycle_status: { $nin: ["abandoned", "rolled_over"] },
  });

  if (missedTodayCount > 0) {
    await sendNotificationToUser(userId, {
      type: "study_reminders",
      title: "You missed a goal yesterday",
      body:
        missedTodayCount === 1
          ? "You missed 1 goal yesterday. Start again today."
          : `You missed ${missedTodayCount} goals yesterday. Start again today.`,
      channel: "study_reminders",
      deepLink: "safar://nishtha/goals",
      priority: "normal",
    });
  }

  const moodToday = await countMoodsForDay(userId, now);
  if (moodToday > 0) return;

  const moodYesterday = await countMoodsForDay(userId, new Date(now.getTime() - DAY_MS));
  if (moodYesterday === 0) {
    await sendNotificationToUser(userId, {
      type: "streak",
      title: "Restart your streak",
      body: "You missed yesterday's check-in. Start again today.",
      channel: "study_reminders",
      deepLink: "safar://streaks",
      priority: "normal",
    });
  }
}

async function sendEveningCheckInReminder(userId: string, now: Date) {
  const moodToday = await countMoodsForDay(userId, now);
  if (moodToday > 0) return;

  await sendNotificationToUser(userId, {
    type: "streak",
    title: "Keep your streak alive",
    body: "Log your emotional check-in before the day ends.",
    channel: "study_reminders",
    deepLink: "safar://streaks",
    priority: "normal",
  });
}

async function runSchedulerTick() {
  const now = new Date();
  const userIds = await getActiveUserIds();

  for (const userId of userIds) {
    if (!userId) continue;

    const preferences = await getSavedNotificationPreferences(userId);
    const timezone = isValidTimezone(preferences.timezone)
      ? preferences.timezone
      : getDefaultNotificationPreferences().timezone;

    const currentMinutes = getLocalMinutes(timezone, now);

    if (isWithinWindow(currentMinutes, minutesFromHHmm(MORNING_TARGET), WINDOW_MINUTES)) {
      await sendMorningReminders(userId, now);
    }

    if (isWithinWindow(currentMinutes, minutesFromHHmm(EVENING_TARGET), WINDOW_MINUTES)) {
      await sendEveningCheckInReminder(userId, now);
    }
  }
}

export function startNotificationScheduler() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    runSchedulerTick().catch((error) => {
      console.error("[NOTIFICATION SCHEDULER] Tick failed:", error);
    });
  }, CHECK_INTERVAL_MS);

  runSchedulerTick().catch((error) => {
    console.error("[NOTIFICATION SCHEDULER] Initial tick failed:", error);
  });
}

export function stopNotificationScheduler() {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
}
