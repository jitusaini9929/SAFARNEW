import { Goal, GoalSubtask, GoalKind, GoalUnitType, GoalExecutionStatus, GoalCarryForwardMode } from "@shared/api";
import { 
  getISTDateKey, 
  formatDateLabel, 
  formatISTDate, 
  getISTMinutesSinceMidnight, 
} from "@/utils/dateUtils";

// ─── TYPES ────────────────────────────────────────────────────
export interface UIGoal extends Goal {
  title: string;
}

export interface GoalVisualTone {
  badgeClassName: string;
  softClassName: string;
  accentClassName: string;
}

export interface GoalScheduledInfo {
  isValid: boolean;
  date: Date | null;
  dateKey: string | null;
  display: string;
  rawHint: string;
}

// Goal type options shown when CREATING a new goal.
// 'one_time' and 'repeat' are legacy — they only appear in EDIT mode via the guards below.
export const GOAL_KIND_OPTIONS: Array<{ value: GoalKind; label: string; hint: string }> = [
  { value: "today",  label: "Today",  hint: "A task for today only. Disappears tomorrow." },
  { value: "scheduled", label: "Scheduled", hint: "Set a goal for a future date." },
];

// Shown in edit mode only, for goals that were created before the options were simplified.
export const LEGACY_ONE_TIME_GOAL_KIND_OPTION: { value: GoalKind; label: string; hint: string } = {
  value: "one_time",
  label: "One-time (legacy)",
  hint: "No fixed day. Complete it whenever.",
};
export const LEGACY_REPEAT_GOAL_KIND_OPTION: { value: GoalKind; label: string; hint: string } = {
  value: "repeat",
  label: "Repeat (legacy)",
  hint: "Recurs daily. Carries forward if not completed.",
};

export const GOAL_CARRY_FORWARD_OPTIONS: Array<{ value: GoalCarryForwardMode; label: string }> = [
  { value: "none", label: "End for this day" },
  { value: "remaining", label: "Carry remaining to next day" },
  { value: "full", label: "Repeat full target next day" },
  { value: "ask", label: "Ask me next day" },
];

export const GOAL_STATUS_OPTIONS: Array<{ value: GoalExecutionStatus; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "partial", label: "Partially done" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
];

// ─── HELPERS ─────────────────────────────────────────────────
export const formatTime = (date?: Date | null) => {
  if (!date || !Number.isFinite(date.getTime())) return "";
  return formatISTDate(date, { hour: "numeric", minute: "2-digit" });
};
export const DAY_MS = 24 * 60 * 60 * 1000;

export const parseValidDate = (raw: unknown) => {
  if (!raw) return null;
  const parsed = new Date(String(raw));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const normalizeGoalKind = (goal: UIGoal): GoalKind => {
  const raw = String(goal.goalKind || (goal as any).goal_kind || "").trim();
  if (raw === "one_time" || raw === "today" || raw === "repeat" || raw === "scheduled") return raw as GoalKind;
  return "today";
};

export const normalizeGoalUnitType = (goal: UIGoal): GoalUnitType => {
  const raw = String(goal.unitType || (goal as any).unit_type || "").trim();
  if (raw === "binary" || raw === "count" || raw === "duration_minutes" || raw === "checklist") return raw as GoalUnitType;
  return "binary";
};

export const normalizeGoalStatus = (goal: UIGoal): GoalExecutionStatus => {
  if (isGoalCompleted(goal)) return "completed";
  const raw = String(goal.status || (goal as any).status_value || "").trim();
  if (
    raw === "not_started" ||
    raw === "in_progress" ||
    raw === "completed" ||
    raw === "partial" ||
    raw === "missed" ||
    raw === "cancelled" ||
    raw === "expired" ||
    raw === "rolled_over"
  ) {
    return raw as GoalExecutionStatus;
  }
  return "not_started";
};

export const normalizeCarryForwardMode = (goal: UIGoal): GoalCarryForwardMode => {
  const raw = String(goal.carryForwardMode || (goal as any).carry_forward_mode || "").trim();
  if (raw === "none" || raw === "remaining" || raw === "full" || raw === "ask") return raw as GoalCarryForwardMode;
  return normalizeGoalKind(goal) === "repeat" ? "ask" : "none";
};

export const normalizeTargetValue = (goal: UIGoal): number | null => {
  const raw = (goal.targetValue ?? (goal as any).target_value) as unknown;
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
};

export const normalizeAchievedValue = (goal: UIGoal): number => {
  const raw = (goal.achievedValue ?? (goal as any).achieved_value) as unknown;
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0) return value;
  return isGoalCompleted(goal) ? 1 : 0;
};

export const getGoalKindBadgeLabel = (kind: GoalKind) => {
  if (kind === "one_time") return "One-time";
  if (kind === "repeat") return "Repeat";
  if (kind === "scheduled") return "Scheduled";
  return "Today";
};

export const getGoalKindTone = (kind: GoalKind): GoalVisualTone => {
  if (kind === "scheduled") {
    return {
      badgeClassName: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/15",
      softClassName: "bg-violet-500/8 border-violet-500/15",
      accentClassName: "text-violet-600 dark:text-violet-300",
    };
  }

  if (kind === "repeat") {
    return {
      badgeClassName: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/15",
      softClassName: "bg-sky-500/8 border-sky-500/15",
      accentClassName: "text-sky-600 dark:text-sky-300",
    };
  }

  return {
    badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/15",
    softClassName: "bg-emerald-500/8 border-emerald-500/15",
    accentClassName: "text-emerald-600 dark:text-emerald-300",
  };
};

export const isScheduledAndDormant = (goal: UIGoal, todayKey: string): boolean => {
  const kind = normalizeGoalKind(goal);
  if (kind !== "scheduled") return false;
  const scheduledKey = goal.scheduledDate || (goal as any).scheduled_date || null;
  if (!scheduledKey) return false;
  const dateKey = typeof scheduledKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scheduledKey)
    ? scheduledKey
    : (() => { const d = new Date(scheduledKey); return Number.isFinite(d.getTime()) ? getISTDateKey(d) : null; })();
  if (!dateKey) return false;
  return dateKey > todayKey;
};

export const getGoalUnitTone = (unit: GoalUnitType): GoalVisualTone => {
  if (unit === "duration_minutes") {
    return {
      badgeClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/15",
      softClassName: "bg-amber-500/8 border-amber-500/15",
      accentClassName: "text-amber-600 dark:text-amber-300",
    };
  }

  if (unit === "checklist") {
    return {
      badgeClassName: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/15",
      softClassName: "bg-indigo-500/8 border-indigo-500/15",
      accentClassName: "text-indigo-600 dark:text-indigo-300",
    };
  }

  if (unit === "count") {
    return {
      badgeClassName: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/15",
      softClassName: "bg-cyan-500/8 border-cyan-500/15",
      accentClassName: "text-cyan-600 dark:text-cyan-300",
    };
  }

  return {
    badgeClassName: "bg-muted text-muted-foreground border border-border/70",
    softClassName: "bg-muted/50 border-border/60",
    accentClassName: "text-foreground",
  };
};

export const getGoalUnitBadgeLabel = (unit: GoalUnitType) => {
  if (unit === "duration_minutes") return "Time";
  if (unit === "count") return "Count";
  if (unit === "checklist") return "Checklist";
  return "Done/Not done";
};

export const getGoalStatusLabel = (status: GoalExecutionStatus) => {
  const entry = GOAL_STATUS_OPTIONS.find((option) => option.value === status);
  return entry?.label || status.replace(/_/g, " ");
};

export const getGoalStatusTone = (status: GoalExecutionStatus): GoalVisualTone => {
  if (status === "completed") {
    return {
      badgeClassName: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/15",
      softClassName: "bg-emerald-500/8 border-emerald-500/15",
      accentClassName: "text-emerald-600 dark:text-emerald-300",
    };
  }

  if (status === "in_progress" || status === "partial") {
    return {
      badgeClassName: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/15",
      softClassName: "bg-amber-500/8 border-amber-500/15",
      accentClassName: "text-amber-600 dark:text-amber-300",
    };
  }

  if (status === "missed" || status === "expired" || status === "cancelled") {
    return {
      badgeClassName: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/15",
      softClassName: "bg-rose-500/8 border-rose-500/15",
      accentClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  return {
    badgeClassName: "bg-muted text-muted-foreground border border-border/70",
    softClassName: "bg-muted/50 border-border/60",
    accentClassName: "text-foreground",
  };
};

export const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export const getGoalProgressPercent = (goal: UIGoal) => {
  const unitType = normalizeGoalUnitType(goal);
  const status = normalizeGoalStatus(goal);
  const target = normalizeTargetValue(goal);
  const achieved = normalizeAchievedValue(goal);
  const isCompleted = status === "completed" || isGoalCompleted(goal);

  if (unitType === "binary") {
    return isCompleted ? 100 : achieved > 0 ? 100 : 0;
  }

  if (unitType === "checklist") {
    const subtasks = Array.isArray(goal.subtasks) ? goal.subtasks : [];
    if (subtasks.length === 0) return isCompleted ? 100 : 0;
    const doneCount = subtasks.filter((item) => item.done).length;
    return clampPercent((doneCount / subtasks.length) * 100);
  }

  if (typeof target === "number" && target > 0) {
    return clampPercent((achieved / target) * 100);
  }

  return isCompleted ? 100 : 0;
};

export const getGoalScheduledInfo = (raw: unknown): GoalScheduledInfo => {
  if (raw === null || raw === undefined || raw === "") {
    return { isValid: false, date: null, dateKey: null, display: "", rawHint: "" };
  }

  if (raw instanceof Date) {
    if (!Number.isFinite(raw.getTime())) {
      return { isValid: false, date: null, dateKey: null, display: "", rawHint: "Invalid Date" };
    }

    return {
      isValid: true,
      date: raw,
      dateKey: getISTDateKey(raw),
      display: formatDateLabel(raw.toISOString()),
      rawHint: raw.toISOString(),
    };
  }

  if (typeof raw === "number") {
    const ms = raw < 1_000_000_000_000 ? raw * 1000 : raw;
    const parsed = new Date(ms);
    if (!Number.isFinite(parsed.getTime())) {
      return { isValid: false, date: null, dateKey: null, display: "", rawHint: String(raw) };
    }

    return {
      isValid: true,
      date: parsed,
      dateKey: getISTDateKey(parsed),
      display: formatDateLabel(parsed.toISOString()),
      rawHint: String(raw),
    };
  }

  if (typeof raw === "object" && raw) {
    const maybeTimestamp = raw as { seconds?: unknown };
    if (typeof maybeTimestamp.seconds === "number") {
      const parsed = new Date(maybeTimestamp.seconds * 1000);
      if (Number.isFinite(parsed.getTime())) {
        const rawHint = (() => {
          try {
            return JSON.stringify(raw);
          } catch {
            return String(raw);
          }
        })();

        return {
          isValid: true,
          date: parsed,
          dateKey: getISTDateKey(parsed),
          display: formatDateLabel(parsed.toISOString()),
          rawHint,
        };
      }
    }
  }

  const rawText = typeof raw === "string" ? raw.trim() : String(raw);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rawText)
    ? new Date(`${rawText}T00:00:00`)
    : parseValidDate(rawText);

  if (!parsed || !Number.isFinite(parsed.getTime())) {
    return { isValid: false, date: null, dateKey: null, display: "", rawHint: rawText };
  }

  return {
    isValid: true,
    date: parsed,
    dateKey: getISTDateKey(parsed),
    display: formatDateLabel(parsed.toISOString()),
    rawHint: rawText,
  };
};

export const isGoalActiveForToday = (goal: UIGoal, todayKey: string) =>
  !isScheduledAndDormant(goal, todayKey);

export const getGoalAnchorDateKey = (goal: UIGoal) => {
  const scheduled = goal.scheduledDate ? parseValidDate(goal.scheduledDate) : null;
  if (scheduled) return getISTDateKey(scheduled);
  return getGoalCreatedDateKey(goal);
};

export const getStatusBucket = (goal: UIGoal) => {
  const status = normalizeGoalStatus(goal);
  if (status === "cancelled") return "cancelled";
  if (status === "missed" || status === "expired") return "missed";
  if (status === "partial") return "partial";
  if (status === "completed" || isGoalCompleted(goal)) return "completed";
  return "open";
};

export const getGoalCompletedDate = (goal: UIGoal) =>
  parseValidDate(goal.completedAt || (goal as any).completed_at);

export const isGoalCompleted = (goal: UIGoal) =>
  Boolean(goal.completed || getGoalCompletedDate(goal));

export const getGoalHistoryDateKey = (goal: UIGoal) => {
  const completedAt = getGoalCompletedDate(goal);
  if (completedAt) return getISTDateKey(completedAt);
  return getGoalAnchorDateKey(goal);
};

export const getGoalCreatedTime = (goal: UIGoal) => {
  const raw = (goal as any).createdAt || (goal as any).created_at || goal.scheduledDate;
  const created = raw ? new Date(raw) : null;
  return created && Number.isFinite(created.getTime()) ? created.getTime() : 0;
};

export const getGoalCreatedDateKey = (goal: UIGoal) => {
  const raw = (goal as any).createdAt || (goal as any).created_at || (goal as any).startedAt || (goal as any).started_at || goal.scheduledDate;
  const created = raw ? new Date(raw) : null;
  return created && Number.isFinite(created.getTime()) ? getISTDateKey(created) : null;
};

export const getDailyCompletionMetrics = (
  completedGoals: UIGoal[],
  dayKey: string,
) => {
  const dayGoals = completedGoals.filter((goal) => {
    const completedAt = getGoalCompletedDate(goal);
    return Boolean(completedAt && getISTDateKey(completedAt) === dayKey);
  });
  return { count: dayGoals.length };
};
