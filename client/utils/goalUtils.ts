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

export const GOAL_KIND_OPTIONS: Array<{ value: Exclude<GoalKind, "one_time">; label: string; hint: string }> = [
  { value: "today", label: "Today", hint: "Only for today." },
  { value: "repeat", label: "Repeat", hint: "Do this regularly." },
];

export const LEGACY_ONE_TIME_GOAL_KIND_OPTION: { value: GoalKind; label: string; hint: string } = {
  value: "one_time",
  label: "One-time",
  hint: "No fixed day. Complete it when done.",
};

export const GOAL_UNIT_OPTIONS: Array<{ value: GoalUnitType; label: string }> = [
  { value: "binary", label: "Done / Not done" },
  { value: "duration_minutes", label: "Track by focused time" },
];

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
  if (raw === "one_time" || raw === "today" || raw === "repeat") return raw as GoalKind;
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
  return "Today";
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
