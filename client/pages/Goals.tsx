import React, { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { dataService } from "@/utils/dataService";
import { Goal, GoalSubtask, GoalKind, GoalUnitType, GoalExecutionStatus, GoalCarryForwardMode } from "@shared/api";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { 
  getISTDateKey, 
  dateKeyToUtcDate, 
  formatDateLabel, 
  formatISTDate, 
  getISTMinutesSinceMidnight, 
  formatTimeFromMinutes,
  diffISTDays
} from "@/utils/dateUtils";
import { 
  Plus, 
  Check, 
  Edit2, 
  Trash2, 
  Play, 
  RotateCcw, 
  Calendar, 
  TrendingUp, 
  Clock, 
  BarChart3,
  HelpCircle,
  X,
  Info
} from "lucide-react";
import ChartErrorBoundary from "@/components/charts/ChartErrorBoundary";

const StreaksConsistencyChart = lazy(() => import("@/components/charts/StreaksConsistencyChart"));

// ─── TYPES ────────────────────────────────────────────────────
interface UIGoal extends Goal {
  title: string;
}

const GOAL_KIND_OPTIONS: Array<{ value: GoalKind; label: string; hint: string }> = [
  { value: "one_time", label: "One-time", hint: "No fixed day. Complete it when done." },
  { value: "today", label: "Today", hint: "Only for today." },
  { value: "repeat", label: "Repeat", hint: "Do this regularly." },
];

const GOAL_UNIT_OPTIONS: Array<{ value: GoalUnitType; label: string }> = [
  { value: "binary", label: "Done / Not done" },
  { value: "count", label: "By number (count)" },
  { value: "duration_minutes", label: "Track by focused time" },
  { value: "checklist", label: "Checklist points" },
];

const GOAL_CARRY_FORWARD_OPTIONS: Array<{ value: GoalCarryForwardMode; label: string }> = [
  { value: "none", label: "End for this day" },
  { value: "remaining", label: "Carry remaining to next day" },
  { value: "full", label: "Repeat full target next day" },
  { value: "ask", label: "Ask me next day" },
];

const GOAL_STATUS_OPTIONS: Array<{ value: GoalExecutionStatus; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "partial", label: "Partially done" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "cancelled", label: "Cancelled" },
];

const MAX_COMPLETED_DISPLAY = 5;

// ─── HELPERS ─────────────────────────────────────────────────
const formatTime = (date?: Date | null) => {
  if (!date || !Number.isFinite(date.getTime())) return "";
  return formatISTDate(date, { hour: "numeric", minute: "2-digit" });
};

const formatDuration = (ms?: number | null) => {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const MAX_DAILY_GOAL_DURATION_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const parseValidDate = (raw: unknown) => {
  if (!raw) return null;
  const parsed = new Date(String(raw));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const normalizeGoalKind = (goal: UIGoal): GoalKind => {
  const raw = String(goal.goalKind || (goal as any).goal_kind || "").trim();
  if (raw === "one_time" || raw === "today" || raw === "repeat") return raw as GoalKind;
  return "today";
};

const normalizeGoalUnitType = (goal: UIGoal): GoalUnitType => {
  const raw = String(goal.unitType || (goal as any).unit_type || "").trim();
  if (raw === "binary" || raw === "count" || raw === "duration_minutes" || raw === "checklist") return raw as GoalUnitType;
  return "binary";
};

const normalizeGoalStatus = (goal: UIGoal): GoalExecutionStatus => {
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
  return isGoalCompleted(goal) ? "completed" : "not_started";
};

const normalizeCarryForwardMode = (goal: UIGoal): GoalCarryForwardMode => {
  const raw = String(goal.carryForwardMode || (goal as any).carry_forward_mode || "").trim();
  if (raw === "none" || raw === "remaining" || raw === "full" || raw === "ask") return raw as GoalCarryForwardMode;
  return normalizeGoalKind(goal) === "repeat" ? "ask" : "none";
};

const normalizeTargetValue = (goal: UIGoal): number | null => {
  const raw = (goal.targetValue ?? (goal as any).target_value) as unknown;
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
};

const normalizeAchievedValue = (goal: UIGoal): number => {
  const raw = (goal.achievedValue ?? (goal as any).achieved_value) as unknown;
  const value = Number(raw);
  if (Number.isFinite(value) && value >= 0) return value;
  return isGoalCompleted(goal) ? 1 : 0;
};

const getGoalKindBadgeLabel = (kind: GoalKind) => {
  if (kind === "one_time") return "One-time";
  if (kind === "repeat") return "Repeat";
  return "Today";
};

const getGoalUnitBadgeLabel = (unit: GoalUnitType) => {
  if (unit === "duration_minutes") return "Time";
  if (unit === "count") return "Count";
  if (unit === "checklist") return "Checklist";
  return "Done/Not done";
};

const getGoalStatusLabel = (status: GoalExecutionStatus) => {
  const entry = GOAL_STATUS_OPTIONS.find((option) => option.value === status);
  return entry?.label || status.replace(/_/g, " ");
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const getGoalProgressPercent = (goal: UIGoal) => {
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

const getGoalAnchorDateKey = (goal: UIGoal) => {
  const scheduled = goal.scheduledDate ? parseValidDate(goal.scheduledDate) : null;
  if (scheduled) return getISTDateKey(scheduled);
  return getGoalCreatedDateKey(goal);
};

const getStatusBucket = (goal: UIGoal) => {
  const status = normalizeGoalStatus(goal);
  if (status === "cancelled") return "cancelled";
  if (status === "missed" || status === "expired") return "missed";
  if (status === "partial") return "partial";
  if (status === "completed" || isGoalCompleted(goal)) return "completed";
  return "open";
};

const getGoalCompletedDate = (goal: UIGoal) =>
  parseValidDate(goal.completedAt || (goal as any).completed_at);

const isGoalCompleted = (goal: UIGoal) =>
  Boolean(goal.completed || getGoalCompletedDate(goal));

const getGoalLifecycleDurationMs = (goal: UIGoal) => {
  const completedAt = getGoalCompletedDate(goal);
  if (!completedAt) return null;

  const rawStart = (goal as any).startedAt || (goal as any).started_at || (goal as any).createdAt || (goal as any).created_at;
  const startAt = parseValidDate(rawStart);
  if (!startAt) return null;

  const completedMs = completedAt.getTime();
  const istMinutesSinceMidnight = getISTMinutesSinceMidnight(completedAt);
  const istDayStartMs = completedMs - (istMinutesSinceMidnight * 60 * 1000);
  const normalizedStartMs = Math.max(startAt.getTime(), istDayStartMs);
  const rawDuration = completedMs - normalizedStartMs;

  if (!Number.isFinite(rawDuration) || rawDuration <= 0) return null;
  return Math.min(rawDuration, MAX_DAILY_GOAL_DURATION_MS);
};

const getGoalCreatedTime = (goal: UIGoal) => {
  const raw = (goal as any).createdAt || (goal as any).created_at || goal.scheduledDate;
  const created = raw ? new Date(raw) : null;
  return created && Number.isFinite(created.getTime()) ? created.getTime() : 0;
};

const getGoalCreatedDateKey = (goal: UIGoal) => {
  const raw = (goal as any).createdAt || (goal as any).created_at || (goal as any).startedAt || (goal as any).started_at || goal.scheduledDate;
  const created = raw ? new Date(raw) : null;
  return created && Number.isFinite(created.getTime()) ? getISTDateKey(created) : null;
};

const getDailyCompletionMetrics = (
  completedGoals: UIGoal[],
  dayKey: string,
) => {
  const dayGoals = completedGoals.filter((goal) => {
    const completedAt = getGoalCompletedDate(goal);
    return Boolean(completedAt && getISTDateKey(completedAt) === dayKey);
  });
  const durations = dayGoals
    .map((goal) => getGoalLifecycleDurationMs(goal))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  const totalDuration = durations.reduce((sum, v) => sum + v, 0);
  const avgDuration = durations.length ? totalDuration / durations.length : 0;
  const completionMinutes = dayGoals
    .map((goal) => {
      const completedAt = getGoalCompletedDate(goal);
      return completedAt ? getISTMinutesSinceMidnight(completedAt) : null;
    })
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const avgCompletionMinutes = completionMinutes.length
    ? completionMinutes.reduce((sum, v) => sum + v, 0) / completionMinutes.length
    : null;
  return { count: dayGoals.length, totalDuration, avgDuration, avgCompletionMinutes };
};

// ─── COMPONENTS ───────────────────────────────────────────────

const formatTimeInputFromISTDate = (date: Date) => {
  const totalMinutes = getISTMinutesSinceMidnight(date);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const FieldInfo = ({ text, children }: { text?: string, children?: React.ReactNode }) => (
  <span className="relative inline-flex items-center group normal-case tracking-normal">
    <span className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-help">
      <Info size={14} strokeWidth={2.5} />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border bg-background/95 backdrop-blur-md p-3.5 text-[11px] font-medium leading-relaxed text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 text-left">
      {children || text}
    </span>
  </span>
);

const WeekChart = ({ goals }: { goals: UIGoal[] }) => {
  const todayKey = getISTDateKey(new Date());
  const base = dateKeyToUtcDate(todayKey);
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getTime() - (6 - i) * (24 * 60 * 60 * 1000));
    const ds = getISTDateKey(d);
    return {
      day: formatISTDate(d, { weekday: "short" })[0],
      count: goals.filter((goal) => {
        const completedAt = getGoalCompletedDate(goal);
        return Boolean(completedAt && getISTDateKey(completedAt) === ds);
      }).length,
    };
  });
  const max = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
          <div className="flex-1 flex items-end w-full">
            <div 
              className={`w-full min-h-[4px] rounded-t-md transition-all duration-500 relative group
                ${d.count > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-muted'}`}
              style={{ height: `${(d.count / max) * 100}%` }}
            >
              {d.count > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.count}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-bold uppercase">{d.day}</span>
        </div>
      ))}
    </div>
  );
};

const GoalCard = ({ goal, onToggle, onDelete, onEdit, onRepeat, onFocus, hideActions = false, hideMeta = false, createdMeta }: any) => {
  const { t } = useTranslation();
  const durationMs = goal.source !== "ekagra" ? getGoalLifecycleDurationMs(goal) : null;
  const completedAt = getGoalCompletedDate(goal);
  const completedDateLabel = completedAt ? formatDateLabel(completedAt.toISOString()) : "";
  const completedTimeLabel = completedAt ? formatTime(completedAt) : "";
  const goalKind = normalizeGoalKind(goal);
  const unitType = normalizeGoalUnitType(goal);
  const targetValue = normalizeTargetValue(goal);
  const achievedValue = normalizeAchievedValue(goal);
  const status = normalizeGoalStatus(goal);
  const linkedFocusEnabled = Boolean(goal.linkedFocusEnabled ?? (goal as any).linked_focus_enabled);
  
  const primaryMeta = goal.completed
    ? completedTimeLabel
      ? t("goals.meta.completed_with_time", { date: completedDateLabel, time: completedTimeLabel })
      : t("goals.meta.completed", { date: completedDateLabel })
    : (goal.scheduledDate ? t("goals.meta.due", { date: formatDateLabel(goal.scheduledDate) }) : "");

  const secondaryMeta = goal.completed && durationMs
    ? t("goals.meta.took", { duration: formatDuration(durationMs) })
    : "";
  const metaPieces = [primaryMeta, secondaryMeta, createdMeta].filter(Boolean);

  return (
    <div className={`p-4 rounded-xl transition-all duration-200 group flex items-start gap-4 
      ${goal.completed ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'}`}>
      
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
        ${goal.completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
        {goal.completed ? <Check size={20} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-primary/40" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {getGoalKindBadgeLabel(goalKind)}
          </span>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {getGoalUnitBadgeLabel(unitType)}
          </span>
          {status !== "completed" && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
              {getGoalStatusLabel(status)}
            </span>
          )}
        </div>
        {goal.source === "ekagra" && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-[#800020]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#800020] dark:bg-[#800020]/20 dark:text-[#ff85a2]">
              Ekagra mode task
            </span>
          </div>
        )}
        {linkedFocusEnabled && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Timer linked
            </span>
          </div>
        )}
        <h4 className={`text-sm font-bold truncate ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {goal.title}
        </h4>
        {goal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {goal.description}
          </p>
        )}
        {unitType !== "binary" && (
          <p className="text-[11px] text-muted-foreground mt-2">
            {targetValue !== null
              ? `Progress ${achievedValue} / ${targetValue}${unitType === "duration_minutes" ? " min" : ""}`
              : `Progress ${achievedValue}${unitType === "duration_minutes" ? " min" : ""}`}
          </p>
        )}
        {!hideMeta && metaPieces.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {metaPieces.join(" · ")}
            </span>
          </div>
        )}
      </div>

      {!hideActions && (
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!goal.completed && (
            <>
              <button onClick={() => onFocus(goal)} className="p-2 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors" title={t("goals.actions.start_focus")}>
                <Play size={16} fill="currentColor" />
              </button>
              <button onClick={() => onEdit(goal)} className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors" title={t("goals.actions.edit")}>
                <Edit2 size={16} />
              </button>
            </>
          )}
          <button onClick={() => onRepeat(goal)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors" title={t("goals.actions.repeat_task")}>
            <RotateCcw size={16} />
          </button>
          {!goal.completed && (
            <>
              <button onClick={() => onDelete(goal.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-colors" title={t("goals.actions.delete")}>
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => onToggle(goal.id, goal.completed)}
                className="w-8 h-8 rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                title={t("goals.actions.mark_done")}
              >
                <div className="w-4 h-4 rounded-full border-2 border-transparent hover:border-primary/50" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const GoalModal = ({ goal, mode, onSave, onClose, todayKey, maxDateKey }: any) => {
  const { t } = useTranslation();
  const isEdit = mode === "edit";
  const isCreate = !isEdit;
  const [title, setTitle] = useState(goal?.title || "");
  const [desc, setDesc] = useState(goal?.description || "");
  const [goalKind, setGoalKind] = useState<GoalKind>(() => {
    const raw = String(goal?.goalKind || goal?.goal_kind || "").trim();
    return raw === "one_time" || raw === "today" || raw === "repeat" ? (raw as GoalKind) : "today";
  });
  const [unitType, setUnitType] = useState<GoalUnitType>(() => {
    const raw = String(goal?.unitType || goal?.unit_type || "").trim();
    return raw === "binary" || raw === "count" || raw === "duration_minutes" || raw === "checklist"
      ? (raw as GoalUnitType)
      : "binary";
  });
  const [linkedFocusEnabled, setLinkedFocusEnabled] = useState(() => {
    const raw = goal?.linkedFocusEnabled ?? goal?.linked_focus_enabled;
    if (typeof raw === "boolean") return raw;
    const rawUnit = String(goal?.unitType || goal?.unit_type || "").trim();
    return rawUnit === "duration_minutes";
  });
  const [repeatRule, setRepeatRule] = useState<"daily" | "weekdays" | "custom">("daily");
  const [targetValue, setTargetValue] = useState(() => {
    const raw = goal?.targetValue ?? goal?.target_value;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? String(value) : "";
  });
  const [achievedValue, setAchievedValue] = useState(() => {
    const raw = goal?.achievedValue ?? goal?.achieved_value;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? String(value) : "";
  });
  const [status, setStatus] = useState<GoalExecutionStatus>(() => {
    const raw = String(goal?.status || goal?.status_value || "").trim();
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
    return goal?.completed ? "completed" : "not_started";
  });
  const [carryForwardMode, setCarryForwardMode] = useState<GoalCarryForwardMode>(() => {
    const raw = String(goal?.carryForwardMode || goal?.carry_forward_mode || "").trim();
    if (raw === "none" || raw === "remaining" || raw === "full" || raw === "ask") return raw as GoalCarryForwardMode;
    return goalKind === "repeat" ? "ask" : "none";
  });
  const [date, setDate] = useState(goal?.scheduledDate ? getISTDateKey(new Date(goal.scheduledDate)) : todayKey);
  const [showDueDate, setShowDueDate] = useState(Boolean(isEdit && goalKind === "one_time"));
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [subtasks, setSubtasks] = useState<GoalSubtask[]>(() => {
    const initial = Array.isArray(goal?.subtasks) ? goal.subtasks : [];
    return initial
      .map((entry: any) => ({
        id: String(entry?.id || crypto.randomUUID()),
        text: String(entry?.text || "").trim(),
        done: Boolean(entry?.done),
      }))
      .filter((entry: GoalSubtask) => entry.text.length > 0);
  });

  const addSubtask = () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), text, done: false }]);
    setNewSubtaskText("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleSubtaskDone = (id: string) => {
    setSubtasks((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  useEffect(() => {
    if (goalKind === "today") {
      setDate(todayKey);
      if (!isEdit) setCarryForwardMode("none");
    } else if (goalKind === "repeat") {
      if (!isEdit) setCarryForwardMode("ask");
    } else if (goalKind === "one_time") {
      if (!isEdit) setCarryForwardMode("none");
    }
  }, [goalKind, isEdit, todayKey]);

  useEffect(() => {
    if (unitType !== "duration_minutes") {
      setLinkedFocusEnabled(false);
      return;
    }

    if (!isEdit) {
      setLinkedFocusEnabled(true);
    }
  }, [unitType, isEdit]);

  const submit = () => {
    if (!title.trim()) return;
    const parsedTargetValue = Number(targetValue);
    const effectiveDurationTarget = Number.isFinite(parsedTargetValue) && parsedTargetValue > 0
      ? Math.round(parsedTargetValue)
      : null;

    if (unitType === "count" && (targetValue === "" || parsedTargetValue < 0)) return;
    if (unitType === "duration_minutes" && effectiveDurationTarget === null) return;
    const scheduleDateKey = goalKind === "today"
      ? todayKey
      : goalKind === "one_time"
        ? (showDueDate ? date : undefined)
        : todayKey;
    const startedAt = isEdit
      ? (goal?.startedAt || goal?.started_at || null)
      : null;

    const plannedFocusMinutes = unitType === "duration_minutes"
      ? Number.isFinite(parsedTargetValue) && parsedTargetValue > 0
        ? Math.round(parsedTargetValue)
        : null
      : null;

    onSave({
      title: title.trim(),
      description: desc.trim(),
      scheduledDate: scheduleDateKey,
      startedAt,
      goalKind,
      unitType,
      executionMode: unitType === "duration_minutes" && linkedFocusEnabled ? "timed" : "manual",
      linkedFocusEnabled: unitType === "duration_minutes" ? linkedFocusEnabled : false,
      plannedFocusMinutes,
      targetValue:
        unitType === "binary" || unitType === "checklist"
          ? null
          : unitType === "duration_minutes"
            ? effectiveDurationTarget
            : Number(targetValue),
      achievedValue: achievedValue ? Number(achievedValue) : 0,
      status: isCreate ? "not_started" : status,
      carryForwardMode: goalKind === "one_time" ? "none" : carryForwardMode,
      subtasks: subtasks
        .map((item) => ({ ...item, text: item.text.trim() }))
        .filter((item) => item.text.length > 0),
    });
  };
  const requiresTarget = unitType === "count" || unitType === "duration_minutes";
  const parsedTargetForValidation = Number(targetValue);
  const hasValidTarget = !requiresTarget
    || (unitType === "duration_minutes"
      ? Number.isFinite(parsedTargetForValidation) && parsedTargetForValidation > 0
      : targetValue !== "" && parsedTargetForValidation >= 0);
  const canSubmit = Boolean(title.trim()) && hasValidTarget;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-lg bg-card border shadow-2xl rounded-3xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5" /> {isEdit ? t("goals.edit_goal") : t("goals.new_goal")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
              What do you want to do?
              <FieldInfo>
                <div className="space-y-1">
                  <p>Yahan simple likho ki kaam kya hai.</p>
                  <p className="text-muted-foreground">Jaise: 'Maths ke 20 questions solve karne hain.'</p>
                </div>
              </FieldInfo>
            </label>
            <input 
              className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder={t("goals.modal.title_placeholder")}
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl border bg-muted/20">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                Goal type
                <FieldInfo>
                  <ul className="list-disc pl-3 space-y-1 text-muted-foreground">
                    <li><strong className="text-foreground">Today:</strong> sirf aaj ke liye.</li>
                    <li><strong className="text-foreground">One-time:</strong> jab complete ho tab.</li>
                    <li><strong className="text-foreground">Repeat:</strong> regular basis par karna hai.</li>
                  </ul>
                </FieldInfo>
              </label>
              <select
                className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={goalKind}
                onChange={(e) => setGoalKind(e.target.value as GoalKind)}
              >
                {GOAL_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground pl-1">
                {GOAL_KIND_OPTIONS.find((option) => option.value === goalKind)?.hint}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                How will you track it?
                <FieldInfo>
                  <ul className="list-disc pl-3 space-y-1.5 text-muted-foreground">
                    <li><strong className="text-foreground">Done/Not done:</strong> bas complete mark.</li>
                    <li><strong className="text-foreground">Number:</strong> count track hoga.</li>
                    <li><strong className="text-foreground">Time:</strong> minutes track honge.</li>
                    <li><strong className="text-foreground">Checklist:</strong> points-wise track.</li>
                  </ul>
                </FieldInfo>
              </label>
              <select
                className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as GoalUnitType)}
              >
                {GOAL_UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(unitType === "count" || unitType === "duration_minutes") && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                {unitType === "count" ? "Target number" : "Target time (minutes)"}
                <FieldInfo>
                  <p>{unitType === "count" ? "Total kitna karna hai wo number do." : "Total focus/study minutes do."}</p>
                  <p className="text-muted-foreground mt-1">
                    {unitType === "count" ? "Jaise: 20" : "Jaise: 90 ya 120"}
                  </p>
                </FieldInfo>
              </label>
              <input
                type="number"
                min={0}
                className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder={unitType === "count" ? "For example, 20" : "For example, 120"}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
          )}

          {unitType === "duration_minutes" && (
            <div className="space-y-3 rounded-2xl border bg-amber-500/5 border-amber-500/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Work on this with a timer</p>
                <p className="text-xs text-muted-foreground">Goal alag rahega, focus sessions alag rahengi, but session is goal ke saath link hogi.</p>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={linkedFocusEnabled}
                  onChange={(e) => setLinkedFocusEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Enable linked focus sessions
              </label>
            </div>
          )}

          {unitType === "checklist" && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                Checklist points
                <FieldInfo>
                  <p>Bade goal ko chhote steps mein tod do.</p>
                  <p className="text-muted-foreground mt-1">Har step tick karke progress track hoga.</p>
                </FieldInfo>
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder={t("goals.modal.subtask_placeholder")}
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                >
                  {t("goals.modal.add")}
                </button>
              </div>
              {subtasks.length > 0 && (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {subtasks.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 bg-muted/40 border rounded-xl px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleSubtaskDone(item.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${item.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-border text-transparent'}`}
                        title={t("goals.modal.toggle_subtask")}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <span className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.text}</span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(item.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={t("goals.modal.remove_subtask")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {goalKind === "one_time" && (
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={showDueDate}
                  onChange={(e) => setShowDueDate(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Add due date (optional)
                <FieldInfo>
                  <p>Agar is goal ki deadline fix karni hai to date select karo.</p>
                  <p className="text-muted-foreground mt-1">Optional hai.</p>
                </FieldInfo>
              </label>
              {showDueDate && (
                <input
                  type="date"
                  className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all color-scheme-dark"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={todayKey}
                  max={maxDateKey}
                />
              )}
            </div>
          )}

          {goalKind === "repeat" && (
            <div className="space-y-2 rounded-2xl border bg-muted/20 p-4">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                Repeat setting
                <FieldInfo>
                  <p>Ye batata hai goal kitni baar automatically aayega.</p>
                  <p className="text-muted-foreground mt-1">Abhi Daily active hai.</p>
                </FieldInfo>
              </label>
              <select
                className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={repeatRule}
                onChange={(e) => setRepeatRule(e.target.value as "daily" | "weekdays" | "custom")}
              >
                <option value="daily">Daily</option>
                <option value="weekdays" disabled>Weekdays only (coming soon)</option>
                <option value="custom" disabled>Custom days (coming soon)</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
              Add details (optional)
              <FieldInfo>
                <p>Goal ke extra notes likh sakte ho.</p>
                <p className="text-muted-foreground mt-1">Jaise topic, context ya reminder.</p>
              </FieldInfo>
            </label>
            <textarea
              className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[90px] resize-none"
              placeholder={t("goals.modal.description_placeholder")}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] mt-2"
          >
            {isEdit ? t("goals.modal.save_changes") : t("goals.modal.create_goal")}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────
export default function Goals() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [goals, setGoals] = useState<UIGoal[]>([]);
  const [modal, setModal] = useState<any>(null);
  const [showGoalsGuide, setShowGoalsGuide] = useState(false);
  const [tab, setTab] = useState("goals");
  const [todayKey, setTodayKey] = useState(() => getISTDateKey(new Date()));
  const [historyDateFilter, setHistoryDateFilter] = useState(() => getISTDateKey(new Date()));

  const maxDateKey = useMemo(() => {
    const base = dateKeyToUtcDate(todayKey);
    return getISTDateKey(new Date(base.getTime() + 7 * (24 * 60 * 60 * 1000)));
  }, [todayKey]);

  const fetchGoals = async () => {
    try {
      const res = await dataService.getGoals();
      const data: UIGoal[] = (res || []).map(g => ({
        ...g,
        title: g.title || g.text || '',
      }));
      setGoals(data);
    } catch (error) {
      console.error(error);
      toast.error(t("goals.toast.load_failed"));
    }
  };

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(() => setTodayKey(getISTDateKey(new Date())), 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleGoal = async (id: string, currentCompleted: boolean) => {
    if (currentCompleted) {
      toast.info(t("goals.toast.already_completed"));
      return;
    }
    const nowIso = new Date().toISOString();
    setGoals(gs => gs.map(g => g.id !== id ? g : { ...g, completed: true, completedAt: nowIso }));
    try {
      await dataService.updateGoal(id, true, nowIso);
      toast.success(t("goals.toast.completed"));
    } catch (error) {
      toast.error(t("goals.toast.update_failed"));
      fetchGoals();
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals(gs => gs.filter(g => g.id !== id));
    try {
      await dataService.deleteGoal(id);
      toast.success(t("goals.toast.deleted"));
    } catch (error) {
      toast.error(t("goals.toast.delete_failed"));
      fetchGoals();
    }
  };

  const saveGoal = async (data: any) => {
    setModal(null);
    try {
      if (modal?.mode === "edit") {
        await dataService.updateGoalDetails(modal.goal.id, {
          title: data.title,
          description: data.description,
          subtasks: data.subtasks || [],
          goalKind: data.goalKind,
          unitType: data.unitType,
          executionMode: data.executionMode,
          linkedFocusEnabled: data.linkedFocusEnabled,
          plannedFocusMinutes: data.plannedFocusMinutes,
          targetValue: data.targetValue ?? null,
          achievedValue: data.achievedValue,
          status: data.status,
          carryForwardMode: data.carryForwardMode,
        });
        const oldKey = getISTDateKey(new Date(modal.goal.scheduledDate));
        if (oldKey !== data.scheduledDate) {
          await dataService.rescheduleGoal(modal.goal.id, new Date(data.scheduledDate));
        }
        await dataService.updateGoalStartTime(modal.goal.id, data.startedAt ?? null);
        toast.success(t("goals.toast.updated"));
      } else {
        const createdGoal = await dataService.addGoal({
          title: data.title,
          description: data.description,
          scheduledDate: data.scheduledDate,
          startedAt: data.startedAt,
          subtasks: data.subtasks || [],
          goalKind: data.goalKind,
          unitType: data.unitType,
          executionMode: data.executionMode,
          linkedFocusEnabled: data.linkedFocusEnabled,
          plannedFocusMinutes: data.plannedFocusMinutes,
          targetValue: data.targetValue ?? null,
          achievedValue: data.achievedValue,
          status: data.status,
          carryForwardMode: data.carryForwardMode,
        });

        if (data.unitType === "duration_minutes" && data.linkedFocusEnabled && createdGoal?.id) {
          toast.success("Goal created. Use Start Focus on the goal card to begin linked timer sessions.");
        } else {
          toast.success(t("goals.toast.created"));
        }
      }
      fetchGoals();
    } catch (error) {
      toast.error(t("goals.toast.operation_failed"));
      fetchGoals();
    }
  };

  const standardGoals = useMemo(() => goals.filter(g => g.source !== "ekagra"), [goals]);
  const manualCompletedGoals = useMemo(
    () => standardGoals.filter((goal) => isGoalCompleted(goal)),
    [standardGoals],
  );
  const historyGoals = useMemo(() => goals.filter(g => isGoalCompleted(g) || g.source === "ekagra"), [goals]);
  const pendingGoals = useMemo(
    () =>
      standardGoals
        .filter((goal) => !isGoalCompleted(goal))
        .sort((a, b) => (a.scheduledDate || "") > (b.scheduledDate || "") ? 1 : -1),
    [standardGoals],
  );
  const completedRecent = useMemo(
    () =>
      standardGoals
        .filter((goal) => isGoalCompleted(goal))
        .sort((a, b) => {
          const aCompletedAt = getGoalCompletedDate(a)?.getTime() || 0;
          const bCompletedAt = getGoalCompletedDate(b)?.getTime() || 0;
          return bCompletedAt - aCompletedAt;
        })
        .slice(0, MAX_COMPLETED_DISPLAY),
    [standardGoals],
  );
  const filteredHistory = useMemo(() => historyDateFilter ? historyGoals.filter(g => getGoalCreatedDateKey(g) === historyDateFilter) : historyGoals, [historyGoals, historyDateFilter]);
  const manualCompletedLast7Days = useMemo(
    () =>
      manualCompletedGoals.filter((goal) => {
        const completedAt = getGoalCompletedDate(goal);
        if (!completedAt) return false;
        const completedKey = getISTDateKey(completedAt);
        const diff = diffISTDays(completedKey, todayKey);
        return diff <= 0 && diff >= -6;
      }),
    [manualCompletedGoals, todayKey],
  );
  const manualTotalLifecycleDurationMs = useMemo(
    () => manualCompletedLast7Days
      .map((goal) => getGoalLifecycleDurationMs(goal))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0)
      .reduce((sum, value) => sum + value, 0),
    [manualCompletedLast7Days],
  );

  const handleFocusGoal = async (goal: UIGoal) => {
    const linkedFocusEnabled = Boolean(goal.linkedFocusEnabled ?? (goal as any).linked_focus_enabled);
    const goalTitle = goal.title || goal.text || "Focus session";

    if (goal.source === "ekagra" || linkedFocusEnabled || normalizeGoalUnitType(goal) === "duration_minutes") {
      navigate(`/study?goalId=${encodeURIComponent(goal.id)}&goalTitle=${encodeURIComponent(goalTitle)}`);
      return;
    }

    try {
      const transferredGoal = await dataService.transferGoalToEkagra(goal.id);
      setGoals((prev) => prev.map((entry) => entry.id === goal.id
        ? {
            ...entry,
            source: "ekagra",
            importedFromGoal: Boolean((transferredGoal as any).importedFromGoal ?? (transferredGoal as any).imported_from_goal),
          }
        : entry));
      const transferTitle = transferredGoal.title || transferredGoal.text || goal.title;
      navigate(`/study?goalId=${encodeURIComponent(transferredGoal.id)}&goalTitle=${encodeURIComponent(transferTitle)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("goals.toast.operation_failed");
      toast.error(message);
    }
  };

  const todayMetrics = useMemo(
    () => getDailyCompletionMetrics(manualCompletedGoals, todayKey),
    [manualCompletedGoals, todayKey],
  );

  const completedLast7DaysCount = useMemo(() => manualCompletedLast7Days.length, [manualCompletedLast7Days]);
  const manualGoalsCount = useMemo(() => standardGoals.length, [standardGoals]);
  const manualCompletionRate = useMemo(
    () => (manualGoalsCount > 0 ? Math.round((manualCompletedGoals.length / manualGoalsCount) * 100) : 0),
    [manualCompletedGoals.length, manualGoalsCount],
  );
  const averageProgressPercent = useMemo(() => {
    if (standardGoals.length === 0) return 0;
    const sum = standardGoals.reduce((acc, goal) => acc + getGoalProgressPercent(goal), 0);
    return Math.round(sum / standardGoals.length);
  }, [standardGoals]);

  const kindBreakdown = useMemo(() => {
    const counts: Record<GoalKind, number> = { today: 0, one_time: 0, repeat: 0 };
    for (const goal of standardGoals) counts[normalizeGoalKind(goal)] += 1;
    return counts;
  }, [standardGoals]);

  const unitBreakdown = useMemo(() => {
    const counts: Record<GoalUnitType, number> = { binary: 0, count: 0, duration_minutes: 0, checklist: 0 };
    for (const goal of standardGoals) counts[normalizeGoalUnitType(goal)] += 1;
    return counts;
  }, [standardGoals]);

  const statusBreakdown = useMemo(() => {
    const counts = { completed: 0, partial: 0, open: 0, missed: 0, cancelled: 0 };
    for (const goal of standardGoals) {
      const key = getStatusBucket(goal);
      counts[key] += 1;
    }
    return counts;
  }, [standardGoals]);

  const sevenDaySeries = useMemo(() => {
    const base = dateKeyToUtcDate(todayKey);
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(base.getTime() - (6 - i) * DAY_MS);
      const dayKey = getISTDateKey(dayDate);
      const dayGoals = standardGoals.filter((goal) => getGoalAnchorDateKey(goal) === dayKey);
      const completed = dayGoals.filter((goal) => getStatusBucket(goal) === "completed").length;
      const avgProgress = dayGoals.length > 0
        ? Math.round(dayGoals.reduce((sum, goal) => sum + getGoalProgressPercent(goal), 0) / dayGoals.length)
        : 0;
      return {
        dayKey,
        dayLabel: formatISTDate(dayDate, { weekday: "short" }),
        total: dayGoals.length,
        completed,
        avgProgress,
      };
    });
  }, [standardGoals, todayKey]);

  const consistencyDays = useMemo(
    () => sevenDaySeries.filter((entry) => entry.completed > 0).length,
    [sevenDaySeries],
  );

  const currentCompletionStreak = useMemo(() => {
    let streak = 0;
    for (let i = sevenDaySeries.length - 1; i >= 0; i -= 1) {
      if (sevenDaySeries[i].completed > 0) streak += 1;
      else break;
    }
    return streak;
  }, [sevenDaySeries]);

  const averageDailyCompletionThisWeek = useMemo(() => {
    if (sevenDaySeries.length === 0) return 0;
    const total = sevenDaySeries.reduce((sum, entry) => sum + entry.completed, 0);
    return Number((total / sevenDaySeries.length).toFixed(1));
  }, [sevenDaySeries]);

  const consistencyTrendData = useMemo(
    () =>
      sevenDaySeries.map((entry) => ({
        day: entry.dayLabel,
        score: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
      })),
    [sevenDaySeries],
  );

  const averageCompletionDuration = useMemo(() => {
    const values = manualCompletedGoals
      .map((goal) => getGoalLifecycleDurationMs(goal))
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [manualCompletedGoals]);

  return (
    <NishthaLayout>
      <div className="flex-1 min-h-screen bg-background/95 p-6 md:p-8 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <div className="p-2.5 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                  <BarChart3 className="text-white w-6 h-6" />
                </div>
                {t('goals.title')}
              </h1>
              <p className="text-muted-foreground font-medium pl-1">{t('goals.subtitle')}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowGoalsGuide(true)}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              title="Goal Usage Guide"
            >
              <HelpCircle size={16} className="text-emerald-600" />
              Guide
            </button>
          </header>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center p-1 bg-muted/50 rounded-2xl border w-full md:w-fit overflow-x-auto no-scrollbar">
              {[
                { id: "goals", label: t('goals.tab_goals'), icon: Check },
                { id: "history", label: t('goals.tab_history'), icon: Clock },
                { id: "analytics", label: t('goals.tab_analytics'), icon: TrendingUp }
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-[14px] text-sm font-bold transition-all whitespace-nowrap
                    ${tab === tabItem.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <tabItem.icon size={16} />
                  {tabItem.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModal({ mode: "add", goal: null })}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all w-full md:w-auto"
            >
              <Plus size={18} strokeWidth={3} /> {t('goals.add_goal')}
            </button>
          </div>

          {tab === "analytics" ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="p-6 bg-card border rounded-3xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Completion Rate</p>
                  <p className="text-4xl font-black text-emerald-500">{manualCompletionRate}%</p>
                  <p className="text-xs text-muted-foreground mt-2">{manualCompletedGoals.length} of {manualGoalsCount} manual goals completed</p>
                </div>
                <div className="p-6 bg-card border rounded-3xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Average Progress</p>
                  <p className="text-4xl font-black text-blue-500">{averageProgressPercent}%</p>
                  <p className="text-xs text-muted-foreground mt-2">Across all manual goals (active + completed)</p>
                </div>
                <div className="p-6 bg-card border rounded-3xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Consistency (7 Days)</p>
                  <p className="text-4xl font-black text-violet-500">{consistencyDays}/7</p>
                  <p className="text-xs text-muted-foreground mt-2">Days with at least one completed manual goal</p>
                </div>
                <div className="p-6 bg-card border rounded-3xl shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Current Streak</p>
                  <p className="text-4xl font-black text-amber-500">{currentCompletionStreak}d</p>
                  <p className="text-xs text-muted-foreground mt-2">Consecutive days with completions</p>
                </div>
              </div>

              <div className="bg-card border rounded-[32px] p-8 shadow-sm" data-tour="consistency-chart">
                <div className="mb-6">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <TrendingUp size={24} className="text-emerald-500" /> Goal Consistency Trend
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Your goal completion over the last 7 days</p>
                </div>
                <div className="h-[250px] w-full">
                  <ChartErrorBoundary>
                    <Suspense fallback={<div className="h-full w-full" />}>
                      <StreaksConsistencyChart data={consistencyTrendData} />
                    </Suspense>
                  </ChartErrorBoundary>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 p-8 bg-card border rounded-[32px] shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2"><Calendar className="text-primary w-4 h-4" /> Weekly Growth Pulse</h3>
                    <span className="text-xs text-muted-foreground">{averageDailyCompletionThisWeek} avg completions/day</span>
                  </div>
                  <div className="space-y-3">
                    {sevenDaySeries.map((entry) => (
                      <div key={entry.dayKey} className="rounded-2xl border bg-muted/20 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold mb-2">
                          <span>{entry.dayLabel}</span>
                          <span className="text-muted-foreground">{entry.completed}/{entry.total || 0} done</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">Average progress: {entry.avgProgress}%</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className="p-6 bg-card border rounded-[28px] shadow-sm">
                    <h4 className="font-bold mb-4">Status Split</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>Completed</span><span className="font-bold">{statusBreakdown.completed}</span></div>
                      <div className="flex items-center justify-between"><span>In progress / Open</span><span className="font-bold">{statusBreakdown.open}</span></div>
                      <div className="flex items-center justify-between"><span>Partial</span><span className="font-bold">{statusBreakdown.partial}</span></div>
                      <div className="flex items-center justify-between"><span>Missed</span><span className="font-bold">{statusBreakdown.missed}</span></div>
                      <div className="flex items-center justify-between"><span>Cancelled</span><span className="font-bold">{statusBreakdown.cancelled}</span></div>
                    </div>
                  </div>

                  <div className="p-6 bg-card border rounded-[28px] shadow-sm">
                    <h4 className="font-bold mb-4">Goal Type Mix</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>Today</span><span className="font-bold">{kindBreakdown.today}</span></div>
                      <div className="flex items-center justify-between"><span>One-time</span><span className="font-bold">{kindBreakdown.one_time}</span></div>
                      <div className="flex items-center justify-between"><span>Repeat</span><span className="font-bold">{kindBreakdown.repeat}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-card border rounded-[28px] shadow-sm">
                  <h4 className="font-bold mb-4">Tracking Method Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span>Done / Not done</span><span className="font-bold">{unitBreakdown.binary}</span></div>
                    <div className="flex items-center justify-between"><span>Number based</span><span className="font-bold">{unitBreakdown.count}</span></div>
                    <div className="flex items-center justify-between"><span>Time based</span><span className="font-bold">{unitBreakdown.duration_minutes}</span></div>
                    <div className="flex items-center justify-between"><span>Checklist based</span><span className="font-bold">{unitBreakdown.checklist}</span></div>
                  </div>
                </div>

                <div className="p-6 bg-card border rounded-[28px] shadow-sm">
                  <h4 className="font-bold mb-4">Effort & Rhythm</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span>Completed in last 7 days</span><span className="font-bold">{completedLast7DaysCount}</span></div>
                    <div className="flex items-center justify-between"><span>Total lifecycle duration (7 days)</span><span className="font-bold">{formatDuration(manualTotalLifecycleDurationMs) || "0m"}</span></div>
                    <div className="flex items-center justify-between"><span>Average completion duration</span><span className="font-bold">{formatDuration(averageCompletionDuration) || "0m"}</span></div>
                    <div className="flex items-center justify-between"><span>Today's completions</span><span className="font-bold">{todayMetrics.count}</span></div>
                    <div className="flex items-center justify-between"><span>Today's avg completion time</span><span className="font-bold">{todayMetrics.avgCompletionMinutes !== null ? formatTimeFromMinutes(todayMetrics.avgCompletionMinutes) : "-"}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-8 space-y-6">
                
                {tab === "goals" && (
                  <div className="bg-card border rounded-[32px] shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-muted/10 flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2">
                        <Check size={18} className="text-emerald-500" /> {t('goals.pending_section')}
                      </h3>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold">
                        {t("goals.pending_tasks", { count: pendingGoals.length })}
                      </span>
                    </div>
                    
                    {pendingGoals.length === 0 ? (
                      <div className="py-20 text-center space-y-2">
                        <div className="text-4xl">🎉</div>
                        <p className="font-bold text-muted-foreground">{t("goals.all_caught_up")}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-muted/50">
                        {pendingGoals.map(g => (
                          <GoalCard key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(goal: any) => setModal({ mode: "edit", goal })} onRepeat={(goal: any) => setModal({ mode: "repeat", goal })} onFocus={() => handleFocusGoal(g)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "history" && (
                  <div className="bg-card border rounded-[32px] shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="p-6 border-b bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Clock size={18} className="text-blue-500" /> {t("goals.archive")}
                      </h3>
                      <div className="flex items-center gap-2">
                        <input 
                          type="date"
                          value={historyDateFilter}
                          onChange={e => setHistoryDateFilter(e.target.value)}
                          className="bg-muted border rounded-xl px-3 py-2 text-xs focus:outline-none color-scheme-dark"
                        />
                        <button onClick={() => setHistoryDateFilter("")} className="p-2 text-muted-foreground hover:text-foreground">
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto divide-y divide-muted/50">
                      {filteredHistory.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground italic">{t("goals.nothing_found_for_date")}</div>
                      ) : (
                        filteredHistory.map(g => (
                          <GoalCard key={g.id} goal={g} hideActions hideMeta createdMeta={formatDateLabel(g.scheduledDate)} />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {tab === "goals" && completedRecent.length > 0 && (
                  <div className="bg-card/50 border rounded-[32px] shadow-sm overflow-hidden">
                    <div className="p-6 border-b bg-muted/5 flex items-center justify-between">
                      <h3 className="font-bold text-sm text-muted-foreground">{t('goals.completed_section')}</h3>
                    </div>
                    <div className="divide-y divide-muted/50">
                      {completedRecent.map(g => (
                        <GoalCard key={g.id} goal={g} hideActions />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="p-8 bg-card border rounded-[32px] shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-6">{t("goals.live_pulse")}</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-2xl">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{t("goals.focus_activity")}</p>
                          <p className="text-lg font-black">{t("goals.completed_count", { count: todayMetrics.count })}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("goals.total_duration", { duration: formatDuration(todayMetrics.totalDuration) || "0m" })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("goals.avg_completion_time", { time: todayMetrics.avgCompletionMinutes !== null ? formatTimeFromMinutes(todayMetrics.avgCompletionMinutes) : "-" })}
                          </p>
                        </div>
                        <TrendingUp className="text-emerald-500 w-8 h-8 opacity-20" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{t("goals.daily_progress")}</span>
                          <span className="text-primary">{Math.round((todayMetrics.count / 5) * 100)}%</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (todayMetrics.count / 5) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gradient-to-br from-emerald-600/10 to-teal-500/10 border border-emerald-500/20 rounded-[32px] shadow-sm relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                  <h3 className="font-bold mb-2">{t("goals.pro_tip_title")}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("goals.pro_tip_desc")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {showGoalsGuide && (
          <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-3xl max-h-[85dvh] rounded-3xl border bg-card shadow-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Goal System Detailed Guide</h2>
                  <p className="text-xs text-muted-foreground mt-1">Har option ka meaning + kaise use karein, step by step.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoalsGuide(false)}
                  className="p-2 rounded-lg hover:bg-muted"
                  title="Close guide"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-sm leading-relaxed">
                <section className="space-y-2">
                  <h3 className="font-bold text-base">1. Basic setup</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li><strong>What do you want to do?</strong>: Goal title likho. Clear action likho.</li>
                    <li><strong>Goal Type</strong>: Today, One-time, Repeat me se choose karo.</li>
                    <li><strong>How will you track it?</strong>: Done, Number, Time, ya Checklist choose karo.</li>
                  </ol>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">2. Goal Type ka matlab</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Today</strong>: sirf aaj ke liye relevant task.</li>
                    <li><strong>One-time</strong>: ek baar complete hone wala task, optional due date ke saath.</li>
                    <li><strong>Repeat</strong>: daily ya recurring behavior build karne ke liye.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">3. Tracking Method ka matlab</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Done / Not done</strong>: binary completion.</li>
                    <li><strong>By number (count)</strong>: jaise 20 questions, 5 pages.</li>
                    <li><strong>Track by focused time</strong>: total minutes target set hota hai.</li>
                    <li><strong>Checklist points</strong>: task ko small subtasks me tod do.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">4. Conditional fields ka use</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Target number/time</strong>: count aur time mode me mandatory.</li>
                    <li><strong>Enable linked focus sessions</strong>: sirf time-based goals ke liye. Ekagra timer sessions goal ke saath link honge.</li>
                    <li><strong>Checklist points</strong>: har point add karo, complete hone par tick karo.</li>
                    <li><strong>Add due date</strong>: one-time goal me optional deadline.</li>
                    <li><strong>Repeat setting</strong>: recurring goal behavior define karta hai.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">5. More options (advanced)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Add details</strong>: context/notes likho.</li>
                    <li><strong>What if you do not finish?</strong>: carry-forward behavior set karo.</li>
                    <li><strong>Already started?</strong>: existing progress number enter karo.</li>
                    <li><strong>Start time (IST)</strong>: optional start-time stamp.</li>
                    <li><strong>Execution status</strong>: edit mode me workflow status manage karo.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">6. Recommended flow</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Title + Type + Tracking method set karo.</li>
                    <li>Target fill karo (agar required ho).</li>
                    <li>Time-based goal ho to linked focus ON rakho.</li>
                    <li>Create Goal dabao.</li>
                    <li>Goal card se Start Focus dabakar Ekagra session start karo.</li>
                  </ol>
                </section>
              </div>
            </div>
          </div>
        )}

        {modal && <GoalModal goal={modal.goal} mode={modal.mode} onSave={saveGoal} onClose={() => setModal(null)} todayKey={todayKey} maxDateKey={maxDateKey} />}
      </div>
    </NishthaLayout>
  );
}
