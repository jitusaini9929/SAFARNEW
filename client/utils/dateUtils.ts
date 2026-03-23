// ─── IST DATE UTILITIES ───────────────────────────────────────────
// Centralized logic for handling Indian Standard Time (UTC+5:30)
// to ensure consistency across wellness tracking features.

const IST_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Formats a date object to a string using IST timezone and specified options.
 */
export const formatISTDate = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: IST_TIME_ZONE, ...options }).format(date);

/**
 * Returns an ISO date string (YYYY-MM-DD) representing the date in IST.
 */
export const getISTDateKey = (date: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  
  const year = parts.find(p => p.type === "year")?.value || "1970";
  const month = parts.find(p => p.type === "month")?.value || "01";
  const day = parts.find(p => p.type === "day")?.value || "01";
  
  return `${year}-${month}-${day}`;
};

/**
 * Converts a YYYY-MM-DD date key from IST to a UTC Date object (at midnight UTC).
 */
export const dateKeyToUtcDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);

/**
 * Calculates the difference in days between two IST date keys.
 */
export const diffISTDays = (aKey: string, bKey: string) =>
  Math.round((dateKeyToUtcDate(aKey).getTime() - dateKeyToUtcDate(bKey).getTime()) / DAY_MS);

/**
 * Returns a human-friendly label (Today, Tomorrow, Yesterday, or formatted date)
 * for a given ISO date string.
 */
export const formatDateLabel = (str?: string) => {
  if (!str) return "";
  const d = new Date(str);
  const dateKey = getISTDateKey(d);
  const todayKey = getISTDateKey(new Date());
  const diff = diffISTDays(dateKey, todayKey);
  
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff < 7) return formatISTDate(d, { weekday: "short", month: "short", day: "numeric" });
  return formatISTDate(d, { month: "short", day: "numeric", year: "numeric" });
};

/**
 * Returns the minutes since midnight in IST for a given date.
 */
export const getISTMinutesSinceMidnight = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  
  const hours = Number(parts.find(p => p.type === "hour")?.value || 0);
  const minutes = Number(parts.find(p => p.type === "minute")?.value || 0);
  
  return hours * 60 + minutes;
};

/**
 * Formats minutes since midnight into a 12-hour AM/PM string.
 */
export const formatTimeFromMinutes = (minutes?: number | null) => {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${String(mins).padStart(2, "0")} ${ampm}`;
};
