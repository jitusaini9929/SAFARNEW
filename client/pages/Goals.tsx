import React, { useState, useMemo, useEffect } from "react";
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
  diffISTDays
} from "@/utils/dateUtils";
import {
  Plus,
  Check,
  CheckCircle2,
  Edit2,
  Trash2,
  RotateCcw,
  Calendar,
  TrendingUp,
  Clock,
  BarChart3,
  HelpCircle,
  X,
  Info,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  CalendarClock,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { ekagraAnalyticsService } from "@/services/ekagraAnalyticsService";

import {
  UIGoal,
  GOAL_KIND_OPTIONS,
  formatTime,
  DAY_MS,
  parseValidDate,
  normalizeGoalKind,
  normalizeGoalUnitType,
  normalizeGoalStatus,
  normalizeCarryForwardMode,
  normalizeTargetValue,
  normalizeAchievedValue,
  getGoalKindBadgeLabel,
  getGoalKindTone,
  getGoalUnitBadgeLabel,
  getGoalUnitTone,
  getGoalStatusLabel,
  getGoalStatusTone,
  clampPercent,
  getGoalProgressPercent,
  getGoalAnchorDateKey,
  getStatusBucket,
  getGoalCompletedDate,
  isGoalCompleted,
  getGoalCreatedTime,
  getGoalHistoryDateKey,
  getDailyCompletionMetrics,
  LEGACY_ONE_TIME_GOAL_KIND_OPTION,
  LEGACY_REPEAT_GOAL_KIND_OPTION,
  isScheduledAndDormant,
  isGoalActiveForToday,
  getGoalScheduledInfo,
} from "@/utils/goalUtils";

const MAX_COMPLETED_DISPLAY = 5;

// ─── COMPONENTS ───────────────────────────────────────────────

const formatTimeInputFromISTDate = (date: Date) => {
  const totalMinutes = getISTMinutesSinceMidnight(date);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const FieldInfo = ({ text, children }: { text?: string, children?: React.ReactNode }) => (
  <span className="relative inline-flex items-center group/info normal-case tracking-normal">
    <span className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-help">
      <Info size={14} strokeWidth={2.5} />
    </span>
    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl border bg-background/95 backdrop-blur-md p-3.5 text-[11px] font-medium leading-relaxed text-foreground opacity-0 shadow-xl transition-all duration-150 group-hover/info:opacity-100 text-left scale-95 group-hover/info:scale-100">
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

const GoalCard = ({ goal, onToggle, onDelete, onEdit, onRepeat, hideActions = false, hideMeta = false, createdMeta }: any) => {
  const { t } = useTranslation();
  const completedAt = getGoalCompletedDate(goal);
  const completedDateLabel = completedAt ? formatDateLabel(completedAt.toISOString()) : "";
  const completedTimeLabel = completedAt ? formatTime(completedAt) : "";
  const goalKind = normalizeGoalKind(goal);
  const unitType = normalizeGoalUnitType(goal);
  const targetValue = normalizeTargetValue(goal);
  const achievedValue = normalizeAchievedValue(goal);
  const status = normalizeGoalStatus(goal);
  const showProgress = unitType !== "binary" && (unitType === "checklist" || targetValue !== null);
  const progressPercent = getGoalProgressPercent(goal);
  const kindTone = getGoalKindTone(goalKind);
  const unitTone = getGoalUnitTone(unitType);
  const statusTone = getGoalStatusTone(status);

  const primaryMeta = goal.completed
    ? completedTimeLabel
      ? t("goals.meta.completed_with_time", { date: completedDateLabel, time: completedTimeLabel })
      : t("goals.meta.completed", { date: completedDateLabel })
    : (goal.scheduledDate ? t("goals.meta.due", { date: formatDateLabel(goal.scheduledDate) }) : "");

  const studiedMins = Number(goal.studiedMinutes ?? (goal as any).studied_minutes ?? 0);
  const studiedLabel = studiedMins > 0
    ? `${Math.floor(studiedMins / 60) > 0 ? `${Math.floor(studiedMins / 60)}h ` : ''}${studiedMins % 60}m studied`
    : null;

  const metaPieces = [primaryMeta, createdMeta].filter(Boolean);
  const actionButtonClass = "ui-pressable flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground hover:bg-muted/70 hover:text-foreground";

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 rounded-[24px] border border-border/70 bg-card/78 p-4 transition-[transform,background-color,border-color,box-shadow] duration-200",
        "hover:border-border hover:bg-card hover:shadow-sm",
        goal.completed && "bg-muted/20 opacity-80",
      )}
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", goal.completed ? statusTone.softClassName : kindTone.softClassName)}>
        {goal.completed ? <CheckCircle2 size={18} strokeWidth={2.5} className={statusTone.accentClassName} /> : <Target size={18} strokeWidth={2.2} className={kindTone.accentClassName} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", kindTone.badgeClassName)}>
            {getGoalKindBadgeLabel(goalKind)}
          </span>
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", unitTone.badgeClassName)}>
            {getGoalUnitBadgeLabel(unitType)}
          </span>
          {status !== "completed" && status !== "not_started" && (
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]", statusTone.badgeClassName)}>
              {getGoalStatusLabel(status)}
            </span>
          )}
        </div>
        {goal.source === "ekagra" && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full border border-rose-500/15 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
              Ekagra mode task
            </span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <h4 className={cn("text-[15px] font-semibold leading-6 text-foreground", goal.completed && "line-through text-muted-foreground")}>
            {goal.title}
          </h4>
          {showProgress && <span className="shrink-0 text-xs font-semibold text-muted-foreground">{progressPercent}%</span>}
        </div>
        {goal.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {goal.description}
          </p>
        )}
        {showProgress && (
          <div className="mt-3 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {targetValue !== null
                ? `Progress ${achievedValue} / ${targetValue}${unitType === "duration_minutes" ? " min" : ""}`
                : `Progress ${achievedValue}${unitType === "duration_minutes" ? " min" : ""}`}
            </p>
          </div>
        )}
        {!hideMeta && metaPieces.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {metaPieces.join(" · ")}
            </span>
          </div>
        )}
        {goal.completed && studiedLabel && (
          <div className="mt-2 flex items-center gap-2">
            <BookOpen size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              {studiedLabel}
            </span>
          </div>
        )}
      </div>

      {!hideActions && (
        <div className="flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {!goal.completed && (
            <button onClick={() => onEdit(goal)} className={cn(actionButtonClass, "text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300")} title={t("goals.actions.edit")}>
              <Edit2 size={16} />
            </button>
          )}
          <button onClick={() => onRepeat(goal)} className={cn(actionButtonClass, "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300")} title={t("goals.actions.repeat_task")}>
            <RotateCcw size={16} />
          </button>
          {!goal.completed && (
            <>
              <button onClick={() => onDelete(goal.id)} className={cn(actionButtonClass, "text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300")} title={t("goals.actions.delete")}>
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => onToggle(goal.id, goal.completed)}
                className="ui-pressable flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-500/25 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-500/10"
                title={t("goals.actions.mark_done")}
              >
                <Check size={14} strokeWidth={3} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ScheduledTasksSection = ({ goals, onEdit, onDelete, t }: { goals: UIGoal[]; onEdit: (goal: UIGoal) => void; onDelete: (id: string) => void; t: any }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-[32px] border border-border/70 bg-card/88 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="ui-pressable flex w-full items-center justify-between p-6 text-left hover:bg-muted/20"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10">
            <CalendarClock size={18} className="text-violet-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Scheduled Tasks</h3>
            <p className="text-xs text-muted-foreground">These stay quiet until their scheduled date arrives.</p>
          </div>
          <span className="ml-1 rounded-full border border-violet-500/15 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            {goals.length} upcoming
          </span>
        </div>
        <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="divide-y divide-muted/50 border-t">
          {goals.map(goal => {
            const scheduledKey = goal.scheduledDate ?? (goal as any).scheduled_date ?? '';
            const scheduledInfo = getGoalScheduledInfo(scheduledKey);
            const scheduledDisplay = scheduledInfo.isValid ? scheduledInfo.display : 'Invalid date';

            return (
              <div key={goal.id} className="group flex items-center gap-4 p-5 transition-colors hover:bg-muted/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10">
                  <CalendarClock size={18} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{goal.title || goal.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-500/15 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                      {scheduledDisplay}
                    </span>
                    {goal.description && (
                      <span className="max-w-[220px] truncate text-[11px] text-muted-foreground">{goal.description}</span>
                    )}
                    {!scheduledInfo.isValid && scheduledInfo.rawHint && (
                      <span
                        className="max-w-[260px] truncate text-[11px] text-amber-700 dark:text-amber-400"
                        title={`Stored scheduled value: ${scheduledInfo.rawHint}`}
                      >
                        Stored: {scheduledInfo.rawHint}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => onEdit(goal)}
                    className="ui-pressable flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(goal.id)}
                    className="ui-pressable flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
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
    // In edit mode, preserve whatever kind was stored (including legacy ones)
    if (isEdit && (raw === "one_time" || raw === "today" || raw === "repeat" || raw === "scheduled")) {
      return raw as GoalKind;
    }
    return raw === "scheduled" ? "scheduled" : "today";
  });

  // Build the dropdown list for the Goal Type field:
  //  - new goal  → just Today + Scheduled
  //  - edit mode → prepend the legacy option if the stored kind is legacy
  const goalKindOptions = (() => {
    if (!isEdit) return GOAL_KIND_OPTIONS;
    const legacyPrepend =
      goalKind === "one_time" ? [LEGACY_ONE_TIME_GOAL_KIND_OPTION]
        : goalKind === "repeat" ? [LEGACY_REPEAT_GOAL_KIND_OPTION]
          : [];
    return [...legacyPrepend, ...GOAL_KIND_OPTIONS];
  })();
  const [unitType] = useState<GoalUnitType>(() => {
    const raw = String(goal?.unitType || goal?.unit_type || "").trim();
    return raw === "binary" || raw === "count" || raw === "duration_minutes" || raw === "checklist"
      ? (raw as GoalUnitType)
      : "binary";
  });
  const [targetValue] = useState(() => {
    const raw = goal?.targetValue ?? goal?.target_value;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? String(value) : "";
  });
  const [achievedValue] = useState(() => {
    const raw = goal?.achievedValue ?? goal?.achieved_value;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? String(value) : "";
  });
  const [status] = useState<GoalExecutionStatus>(() => {
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

  const tomorrowKey = useMemo(() => {
    const base = dateKeyToUtcDate(todayKey);
    return getISTDateKey(new Date(base.getTime() + DAY_MS));
  }, [todayKey]);

  useEffect(() => {
    if (goalKind === "today") {
      setDate(todayKey);
      if (!isEdit) setCarryForwardMode("none");
    } else if (goalKind === "scheduled") {
      if (!isEdit && date <= todayKey) setDate(tomorrowKey);
      if (!isEdit) setCarryForwardMode("none");
    } else if (goalKind === "repeat") {
      if (!isEdit) setCarryForwardMode("ask");
    } else if (goalKind === "one_time") {
      // Legacy kinds — preserve user's existing date; just set carry-forward
      if (!isEdit) setCarryForwardMode("none");
    }
  }, [goalKind, isEdit, todayKey, tomorrowKey]);



  const submit = () => {
    if (!title.trim()) return;
    const parsedTargetValue = Number(targetValue);
    const effectiveDurationTarget = Number.isFinite(parsedTargetValue) && parsedTargetValue > 0
      ? Math.round(parsedTargetValue)
      : null;
    if (unitType === "count" && (targetValue === "" || parsedTargetValue < 0)) return;
    const scheduleDateKey = goalKind === "today"
      ? todayKey
      : goalKind === "scheduled"
        ? date
        : goalKind === "one_time"
          ? (showDueDate ? date : undefined)
          : todayKey;
    const startedAt = isEdit
      ? (goal?.startedAt || goal?.started_at || null)
      : null;

    onSave({
      title: title.trim(),
      description: desc.trim(),
      scheduledDate: scheduleDateKey,
      startedAt,
      goalKind,
      unitType,
      executionMode: "manual",
      linkedFocusEnabled: false,
      plannedFocusMinutes: null,
      targetValue:
        unitType === "binary" || unitType === "checklist"
          ? null
          : unitType === "duration_minutes"
            ? effectiveDurationTarget
            : Number(targetValue),
      achievedValue: achievedValue ? Number(achievedValue) : 0,
      status: isCreate ? "not_started" : status,
      carryForwardMode: (goalKind === "one_time" || goalKind === "scheduled") ? "none" : carryForwardMode,
      subtasks: subtasks
        .map((item) => ({ ...item, text: item.text.trim() }))
        .filter((item) => item.text.length > 0),
    });
  };
  const requiresTarget = unitType === "count";
  const parsedTargetForValidation = Number(targetValue);
  const hasValidTarget = !requiresTarget
    || (targetValue !== "" && parsedTargetForValidation >= 0);

  const needsFutureDate = goalKind === "scheduled" && !isEdit;
  const hasFutureDate = !needsFutureDate || (date > todayKey);
  const canSubmit = Boolean(title.trim()) && hasValidTarget && hasFutureDate;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-3 backdrop-blur-[2px] animate-in fade-in duration-200 sm:items-center sm:p-4">
      <div className="ui-panel w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl flex flex-col animate-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)]">
        <div className="border-b border-border/70 bg-muted/20 p-5 relative overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="ui-pressable absolute right-3 top-3 z-20 rounded-full border border-border/70 bg-background/80 p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          >
            <X size={14} strokeWidth={3} />
          </button>
          <h2 className="relative z-10 flex items-center gap-2 text-lg font-bold text-foreground">
            <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-300" /> {isEdit ? t("goals.edit_goal") : t("goals.new_goal")}
          </h2>
        </div>

        <div className="overflow-y-auto overflow-x-hidden overscroll-contain p-5 sm:p-6 space-y-6">
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest pl-1 flex items-center gap-2 group-focus-within:text-emerald-600">
              What do you want to do?
              <FieldInfo>
                <div className="space-y-1">
                  <p>Yahan simple likho ki kaam kya hai.</p>
                  <p className="text-muted-foreground">Jaise: 'Maths ke 20 questions solve karne hain.'</p>
                </div>
              </FieldInfo>
            </label>
            <input
              className="w-full bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              placeholder={t("goals.modal.title_placeholder")}
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 rounded-2xl border bg-muted/20">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1 flex items-center gap-2">
                Goal type
              </label>
              <select
                className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                value={goalKind}
                onChange={(e) => setGoalKind(e.target.value as GoalKind)}
              >
                {goalKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>



          {unitType === "checklist" && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest pl-1 flex items-center gap-2">
                Checklist points
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
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
                  className="ui-pressable rounded-xl border border-emerald-500/20 bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500"
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
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <span className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground font-medium' : 'text-foreground font-medium'}`}>{item.text}</span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(item.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
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
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDueDate}
                  onChange={(e) => setShowDueDate(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500/20"
                />
                Add due date (optional)
              </label>
              {showDueDate && (
                <input
                  type="date"
                  className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all color-scheme-dark"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={todayKey}
                  max={maxDateKey}
                />
              )}
            </div>
          )}

          {goalKind === "scheduled" && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest pl-1 flex items-center gap-2">
                <CalendarClock size={14} /> When should this activate?
                <FieldInfo>
                  <div className="space-y-1">
                    <p>Yeh goal tab tak dormant rahega jab tak scheduled date nahi aa jaati.</p>
                    <p className="text-muted-foreground">Us din yeh automatically pending tasks mein show hoga.</p>
                  </div>
                </FieldInfo>
              </label>
              <input
                type="date"
                className="w-full bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={tomorrowKey}
              />
              {date && date > todayKey && (
                <p className="pl-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  This goal will activate on {getGoalScheduledInfo(date).display || new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest pl-1 flex items-center gap-2 group-focus-within:text-emerald-600">
              Add details (optional)
            </label>
            <textarea
              className="w-full bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all min-h-[90px] resize-none"
              placeholder={t("goals.modal.description_placeholder")}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onClose}
              className="ui-pressable rounded-xl border border-border/70 bg-background py-3.5 text-xs font-bold text-foreground hover:bg-muted/70"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="ui-pressable rounded-xl border border-emerald-500/20 bg-emerald-600 py-3.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isEdit ? t("goals.modal.save_changes") : t("goals.modal.create_goal")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudyDurationModal = ({ goalTitle, onConfirm, onClose }: {
  goalTitle: string;
  onConfirm: (minutes: number) => void;
  onClose: () => void;
}) => {
  const [hours, setHours] = useState("00");
  const [minutes, setMinutes] = useState("00");
  const [showWarning, setShowWarning] = useState(false);

  const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

  const handleSubmit = () => {
    if (totalMinutes > 1440 && !showWarning) {
      setShowWarning(true);
      return;
    }
    onConfirm(totalMinutes);
  };

  const handleSkip = () => {
    onConfirm(0);
  };

  const applyQuickSelect = (addMins: number) => {
    const newTotal = totalMinutes + addMins;
    const h = Math.floor(newTotal / 60);
    const m = newTotal % 60;
    setHours(h.toString().padStart(2, "0"));
    setMinutes(m.toString().padStart(2, "0"));
    setShowWarning(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleBlur = (type: "h" | "m", val: string) => {
    let num = parseInt(val) || 0;
    if (type === "m" && num > 59) num = 59;
    if (type === "h") setHours(num.toString().padStart(2, "0"));
    if (type === "m") setMinutes(num.toString().padStart(2, "0"));
  };

  const handleTimeChange = (type: "h" | "m", val: string) => {
    // Only allow digits up to length 2
    const clean = val.replace(/\D/g, "").slice(0, 2);
    if (type === "h") setHours(clean);
    else setMinutes(clean);
    setShowWarning(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="ui-panel w-full max-w-sm overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200">
        <div className="relative overflow-hidden border-b border-border/70 bg-muted/20 p-5">
          <button
            onClick={onClose}
            className="ui-pressable absolute right-3 top-3 z-20 rounded-full border border-border/70 bg-background/80 p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          >
            <X size={14} strokeWidth={3} />
          </button>
          <h2 className="relative z-10 text-lg font-bold text-foreground">
            How long did you study?
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2 group">
              <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest transition-colors group-focus-within:text-emerald-600">
                Hours
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={hours}
                onFocus={handleFocus}
                onBlur={e => handleBlur("h", e.target.value)}
                onChange={e => handleTimeChange("h", e.target.value)}
                className="w-24 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-2xl px-2 py-4 text-4xl font-black text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono"
              />
            </div>
            <div className="flex flex-col items-center pt-6">
              <span className="text-3xl font-black text-emerald-300 dark:text-emerald-800">:</span>
            </div>
            <div className="flex flex-col items-center gap-2 group">
              <label className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest transition-colors group-focus-within:text-emerald-600">
                Minutes
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={minutes}
                onFocus={handleFocus}
                onBlur={e => handleBlur("m", e.target.value)}
                onChange={e => handleTimeChange("m", e.target.value)}
                className="w-24 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900/50 rounded-2xl px-2 py-4 text-4xl font-black text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {[15, 30, 60, 120].map(mins => (
              <button
                key={mins}
                onClick={() => applyQuickSelect(mins)}
                className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/30 text-xs font-bold text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 dark:hover:border-emerald-500/30 transition-all active:scale-95"
              >
                +{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
              </button>
            ))}
            {totalMinutes > 0 && (
              <button
                onClick={() => { setHours("00"); setMinutes("00"); }}
                className="px-2 py-1.5 rounded-full text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors ml-1 uppercase hover:bg-destructive/10"
              >
                Clear
              </button>
            )}
          </div>

          {showWarning && (
            <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-in slide-in-from-top-2 duration-200">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                Over 24 hours study time. Are you sure? Click Done to confirm.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={onClose}
              className="ui-pressable rounded-xl border border-border/70 bg-background py-3 text-xs font-bold text-foreground hover:bg-muted/70"
            >
              Cancel
            </button>
            <button
              onClick={handleSkip}
              className="ui-pressable rounded-xl border border-emerald-500/15 bg-emerald-500/5 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              className="ui-pressable rounded-xl border border-emerald-500/20 bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500"
            >
              {showWarning ? 'Confirm' : 'Done'}
            </button>
          </div>
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
  const [durationModal, setDurationModal] = useState<{ goalId: string; goalTitle: string } | null>(null);
  const [ekagraFocusSessions, setEkagraFocusSessions] = useState<any[]>([]);
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
    ekagraAnalyticsService.getEkagraAnalytics().then(stats => {
      setEkagraFocusSessions(stats.focusSessions || []);
    }).catch(() => { });
    const interval = setInterval(() => setTodayKey(getISTDateKey(new Date())), 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleGoal = async (id: string, currentCompleted: boolean) => {
    if (currentCompleted) {
      toast.info(t("goals.toast.already_completed"));
      return;
    }
    const goal = goals.find(g => g.id === id);
    setDurationModal({ goalId: id, goalTitle: goal?.title || '' });
  };

  const confirmGoalCompletion = async (goalId: string, studiedMinutes: number) => {
    setDurationModal(null);
    const nowIso = new Date().toISOString();
    setGoals(gs => gs.map(g => g.id !== goalId ? g : { ...g, completed: true, completedAt: nowIso, studiedMinutes }));
    try {
      await dataService.updateGoal(goalId, true, nowIso, studiedMinutes);
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

  const handleRepeatGoal = async (goal: UIGoal) => {
    try {
      await dataService.addGoal({
        title: goal.title || goal.text || '',
        description: goal.description || '',
        scheduledDate: todayKey,
        startedAt: null,
        subtasks: Array.isArray(goal.subtasks)
          ? goal.subtasks.map((t: any) => ({ text: t.text, done: false, id: crypto.randomUUID() }))
          : [],
        goalKind: "repeat",
        unitType: goal.unitType || 'binary',
        executionMode: 'manual',
        linkedFocusEnabled: false,
        plannedFocusMinutes: null,
        targetValue: goal.targetValue ?? null,
        achievedValue: 0,
        status: 'not_started',
        carryForwardMode: 'ask',
      });
      toast.success(t("goals.toast.created"));
      fetchGoals();
    } catch (error) {
      console.error(error);
      toast.error(t("goals.toast.operation_failed"));
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
          executionMode: "manual",
          linkedFocusEnabled: false,
          plannedFocusMinutes: null,
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
        await dataService.addGoal({
          title: data.title,
          description: data.description,
          scheduledDate: data.scheduledDate,
          startedAt: data.startedAt,
          subtasks: data.subtasks || [],
          goalKind: data.goalKind,
          unitType: data.unitType,
          executionMode: "manual",
          linkedFocusEnabled: false,
          plannedFocusMinutes: null,
          targetValue: data.targetValue ?? null,
          achievedValue: data.achievedValue,
          status: data.status,
          carryForwardMode: data.carryForwardMode,
        });

        toast.success(t("goals.toast.created"));
      }
      fetchGoals();
    } catch (error) {
      toast.error(t("goals.toast.operation_failed"));
      fetchGoals();
    }
  };

  const standardGoals = useMemo(() => goals.filter(g => g.source !== "ekagra"), [goals]);
  const manualCompletedGoals = useMemo(
    () =>
      standardGoals.filter((goal) => {
        const completedViaFocus = Boolean((goal as any).completedViaFocus ?? (goal as any).completed_via_focus);
        return isGoalCompleted(goal) && !completedViaFocus;
      }),
    [standardGoals],
  );
  const historyGoals = useMemo(() => goals.filter((goal) => isGoalCompleted(goal)), [goals]);
  const pendingGoals = useMemo(
    () =>
      standardGoals
        .filter((goal) => !isGoalCompleted(goal) && !isScheduledAndDormant(goal, todayKey))
        .sort((a, b) => (a.scheduledDate || "") > (b.scheduledDate || "") ? 1 : -1),
    [standardGoals, todayKey],
  );
  const dormantScheduledGoals = useMemo(
    () =>
      standardGoals
        .filter((goal) => !isGoalCompleted(goal) && isScheduledAndDormant(goal, todayKey))
        .sort((a, b) => (a.scheduledDate || "") > (b.scheduledDate || "") ? 1 : -1),
    [standardGoals, todayKey],
  );
  const analyticsGoals = useMemo(
    () => standardGoals.filter((goal) => isGoalActiveForToday(goal, todayKey)),
    [standardGoals, todayKey],
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
  const effectiveHistoryDateFilter = historyDateFilter || todayKey;
  const filteredHistory = useMemo(
    () =>
      historyGoals
        .filter((goal) => getGoalHistoryDateKey(goal) === effectiveHistoryDateFilter)
        .sort((a, b) => {
          const aTime = getGoalCompletedDate(a)?.getTime() ?? getGoalCreatedTime(a);
          const bTime = getGoalCompletedDate(b)?.getTime() ?? getGoalCreatedTime(b);
          return bTime - aTime;
        }),
    [effectiveHistoryDateFilter, historyGoals],
  );
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

  const todayMetrics = useMemo(
    () => getDailyCompletionMetrics(manualCompletedGoals, todayKey),
    [manualCompletedGoals, todayKey],
  );
  const todaysManualGoals = useMemo(
    () =>
      standardGoals.filter((goal) => {
        const completedViaFocus = Boolean((goal as any).completedViaFocus ?? (goal as any).completed_via_focus);
        return !completedViaFocus && getGoalAnchorDateKey(goal) === todayKey;
      }),
    [standardGoals, todayKey],
  );
  const dailyProgressPercent = useMemo(() => {
    if (todaysManualGoals.length === 0) return 0;
    const completedCount = todaysManualGoals.filter((goal) => isGoalCompleted(goal)).length;
    return Math.round((completedCount / todaysManualGoals.length) * 100);
  }, [todaysManualGoals]);

  const completedLast7DaysCount = useMemo(() => manualCompletedLast7Days.length, [manualCompletedLast7Days]);
  const manualGoalsCount = useMemo(() => analyticsGoals.length, [analyticsGoals]);
  const manualCompletionRate = useMemo(
    () => (manualGoalsCount > 0 ? Math.round((manualCompletedGoals.length / manualGoalsCount) * 100) : 0),
    [manualCompletedGoals.length, manualGoalsCount],
  );
  const averageProgressPercent = useMemo(() => {
    if (analyticsGoals.length === 0) return 0;
    const sum = analyticsGoals.reduce((acc, goal) => acc + getGoalProgressPercent(goal), 0);
    return Math.round(sum / analyticsGoals.length);
  }, [analyticsGoals]);

  const focusTotalMinutes = useMemo(() => {
    return Math.round(
      ekagraFocusSessions
        .filter(s => s.associatedGoalId)
        .reduce((sum, s) => sum + (s.actualMinutes || 0), 0)
    );
  }, [ekagraFocusSessions]);

  const focusTodayMinutes = useMemo(() => {
    return Math.round(
      ekagraFocusSessions
        .filter(s => s.associatedGoalId && s.startedAt && getISTDateKey(new Date(s.startedAt)) === todayKey)
        .reduce((sum, s) => sum + (s.actualMinutes || 0), 0)
    );
  }, [ekagraFocusSessions, todayKey]);

  const todaysStudiedMinutes = useMemo(() => {
    return manualCompletedGoals
      .filter((goal) => {
        const completedAt = getGoalCompletedDate(goal);
        return completedAt && getISTDateKey(completedAt) === todayKey;
      })
      .reduce((acc, g) => acc + Number(g.studiedMinutes ?? (g as any).studied_minutes ?? 0), 0);
  }, [manualCompletedGoals, todayKey]);

  const totalStudiedMinutes = useMemo(
    () => manualCompletedGoals.reduce((acc, g) => acc + Number(g.studiedMinutes ?? (g as any).studied_minutes ?? 0), 0),
    [manualCompletedGoals],
  );
  const avgStudiedMinutes = useMemo(
    () => manualCompletedGoals.length > 0 ? Math.round(totalStudiedMinutes / manualCompletedGoals.length) : 0,
    [totalStudiedMinutes, manualCompletedGoals.length],
  );
  const formatStudyTime = (mins: number) => {
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  };

  const kindBreakdown = useMemo(() => {
    const counts: Record<GoalKind, number> = { today: 0, one_time: 0, repeat: 0, scheduled: 0 };
    for (const goal of analyticsGoals) counts[normalizeGoalKind(goal)] += 1;
    return counts;
  }, [analyticsGoals]);

  const unitBreakdown = useMemo(() => {
    const counts: Record<GoalUnitType, number> = { binary: 0, count: 0, duration_minutes: 0, checklist: 0 };
    for (const goal of analyticsGoals) counts[normalizeGoalUnitType(goal)] += 1;
    return counts;
  }, [analyticsGoals]);

  const statusBreakdown = useMemo(() => {
    const counts = { completed: 0, partial: 0, open: 0, missed: 0, cancelled: 0 };
    for (const goal of analyticsGoals) {
      const key = getStatusBucket(goal);
      counts[key] += 1;
    }
    return counts;
  }, [analyticsGoals]);

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
  return (
    <NishthaLayout>
      <div className="flex-1 min-h-screen bg-background/95 p-6 md:p-8 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto space-y-8">

          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10">
                  <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                </div>
                {t('goals.title')}
              </h1>
              <p className="text-muted-foreground font-medium pl-1">{t('goals.subtitle')}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowGoalsGuide(true)}
              className="ui-pressable inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/70"
              title="Goal Usage Guide"
            >
              <HelpCircle size={16} className="text-emerald-600" />
              Guide
            </button>
          </header>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="grid w-full grid-cols-2 items-center rounded-2xl border bg-muted/50 p-1 md:flex md:w-fit">
              {[
                { id: "goals", label: t('goals.tab_goals'), icon: Check },
                { id: "history", label: t('goals.tab_history'), icon: Clock },
              ].map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`min-w-0 flex items-center justify-center gap-2 rounded-[14px] px-3 py-3 text-sm font-bold transition-all sm:px-4 md:flex-none md:px-6
                    ${tab === tabItem.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <tabItem.icon size={16} />
                  <span className="truncate">{tabItem.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setModal({ mode: "add", goal: null })}
              data-tour="add-goal"
              className="ui-pressable flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-emerald-500 md:w-auto"
            >
              <Plus size={18} strokeWidth={3} /> {t('goals.add_goal')}
            </button>

            <button
              type="button"
              onClick={() => navigate("/nishtha/analytics?tab=goals")}
              className="ui-pressable flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-card px-6 py-3 font-bold text-primary shadow-sm hover:bg-muted/70 md:w-auto"
            >
              <TrendingUp size={18} strokeWidth={2.5} /> Goal Insights
            </button>
          </div>

          {tab === "goals" && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border border-border/70 bg-card/88 p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Done Today</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-black text-emerald-500">{todayMetrics.count}</p>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500/70" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Manual goals completed on today’s date.</p>
              </div>
              <div className="rounded-[28px] border border-border/70 bg-card/88 p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Open Now</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-black text-foreground">{pendingGoals.length}</p>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Active manual goals available to work on right now.</p>
              </div>
              <div className="rounded-[28px] border border-border/70 bg-card/88 p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Scheduled Ahead</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-black text-violet-500">{dormantScheduledGoals.length}</p>
                  <CalendarClock className="h-5 w-5 text-violet-500/70" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Future goals parked until their scheduled day arrives.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-7 space-y-6">

                {tab === "goals" && (
                  <div className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-sm" data-tour="goal-cards">
                    <div className="flex items-center justify-between border-b bg-muted/10 p-6">
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          <Check size={18} className="text-emerald-500" /> {t('goals.pending_section')}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">Only goals that are active today appear here.</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        {t("goals.pending_tasks", { count: pendingGoals.length })}
                      </span>
                    </div>

                    {pendingGoals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10">
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="mt-4 font-semibold text-foreground">{t("goals.all_caught_up")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Anything scheduled for later stays in the upcoming section below.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-muted/50">
                        {pendingGoals.map(g => (
                          <GoalCard key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(goal: any) => setModal({ mode: "edit", goal })} onRepeat={handleRepeatGoal} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === "goals" && dormantScheduledGoals.length > 0 && (
                  <ScheduledTasksSection
                    goals={dormantScheduledGoals}
                    onEdit={(goal: any) => setModal({ mode: "edit", goal })}
                    onDelete={deleteGoal}
                    t={t}
                  />
                )}

                {tab === "history" && (
                  <div className="bg-card border rounded-[32px] shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="p-6 border-b bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold flex items-center gap-2">
                          <Clock size={18} className="text-blue-500" /> {t("goals.archive")}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">Review what was completed on a specific day.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={historyDateFilter || todayKey}
                          onChange={e => setHistoryDateFilter(e.target.value)}
                          className="ui-field rounded-xl px-3 py-2 text-xs focus:outline-none color-scheme-dark"
                        />
                        <button onClick={() => setHistoryDateFilter(todayKey)} className="ui-pressable rounded-xl border border-border/70 p-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground">
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-muted/50">
                      {filteredHistory.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="font-medium text-muted-foreground">{t("goals.nothing_found_for_date")}</p>
                        </div>
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

              <div className="lg:col-span-5 space-y-6">
                <div className="p-8 bg-card border rounded-[32px] shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-bold opacity-60 uppercase tracking-widest mb-6">Today Pulse</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-2xl">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">{t("goals.focus_activity")}</p>
                          <p className="text-lg font-black">{t("goals.completed_count", { count: todayMetrics.count })}</p>
                          <p className="text-xs text-muted-foreground">
                            {pendingGoals.length} open manual goals
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {manualCompletionRate}% overall completion rate
                          </p>
                        </div>
                        <TrendingUp className="text-emerald-500 w-8 h-8 opacity-20" />
                      </div>

                      <div className="bg-muted/30 p-4 rounded-2xl space-y-3 shadow-sm border border-border/50">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-emerald-500" />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Study Time Today</p>
                        </div>
                        <p className="text-2xl font-black text-emerald-500">{formatStudyTime(todaysStudiedMinutes + focusTodayMinutes)}</p>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Manual</p>
                            <p className="text-sm font-bold text-foreground">{formatStudyTime(todaysStudiedMinutes)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Ekagra</p>
                            <p className="text-sm font-bold text-foreground">{formatStudyTime(focusTodayMinutes)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{t("goals.daily_progress")}</span>
                          <span className="text-primary">{dailyProgressPercent}%</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, dailyProgressPercent)}%` }} />
                        </div>
                      </div>

                      <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Time Studied</p>
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium flex items-center gap-2">
                              <Clock size={16} className="text-indigo-500" /> Ekagra Mode
                            </span>
                            <span className="font-black text-indigo-500 text-base">{formatStudyTime(focusTotalMinutes)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium flex items-center gap-2">
                              <BookOpen size={16} className="text-teal-500" /> Manual Goal
                            </span>
                            <span className="font-black text-teal-500 text-base">{formatStudyTime(totalStudiedMinutes)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-emerald-500/15 bg-card/88 p-8 shadow-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>
                  <h3 className="mb-2 font-bold">{t("goals.pro_tip_title")}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("goals.pro_tip_desc")}
                  </p>
                </div>
              </div>
            </div>
        </div>

        {showGoalsGuide && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
            <div className="ui-panel flex w-full max-w-3xl max-h-[85dvh] flex-col overflow-hidden rounded-3xl">
              <div className="px-5 py-4 border-b bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Goal System Detailed Guide</h2>
                  <p className="text-xs text-muted-foreground mt-1">Har option ka meaning + kaise use karein, step by step.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoalsGuide(false)}
                  className="ui-pressable rounded-lg p-2 hover:bg-muted/70"
                  title="Close guide"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-sm leading-relaxed">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-foreground">
                  <h3 className="text-sm font-bold mb-2">What changed (quick recap)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Goals are for planning, editing, and manual completion.</li>
                    <li>Ekagra time is assigned to a goal after the timer ends.</li>
                    <li>Goal insights use saved manual progress and saved goal-linked focus sessions.</li>
                  </ul>
                </div>
                <section className="space-y-2">
                  <h3 className="font-bold text-base">1. Basic setup</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li><strong>What do you want to do?</strong>: Write the goal in simple words.</li>
                    <li><strong>Goal Type</strong>: Pick Today or Repeat.</li>
                    <li><strong>How will you track it?</strong>: Use Done / Not done for normal goal completion.</li>
                  </ol>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">2. Goal Type ka matlab</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Today</strong>: use this for something you want to finish today.</li>
                    <li><strong>Repeat</strong>: use this for a habit or a goal that comes back regularly.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">3. Tracking Method ka matlab</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Done / Not done</strong>: good for goals where you care whether the work got done.</li>
                    <li><strong>Study time</strong>: enter it when manually completing a goal, or assign Ekagra time after ending a timer.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">4. Conditional fields ka use</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Repeat setting</strong>: this decides how the goal behaves on the next day if it is a repeating goal.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">5. More options (advanced)</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Add details</strong>: add notes if the goal needs extra context.</li>
                    <li><strong>What if you do not finish?</strong>: choose what should happen next for repeating goals.</li>
                    <li><strong>Already started?</strong>: use this only if you have already made some progress before saving.</li>
                    <li><strong>Start time (IST)</strong>: optional planning time if you want to start later in the day.</li>
                    <li><strong>Execution status</strong>: mainly useful while editing an existing goal.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-base">6. Recommended flow</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Write the goal title.</li>
                    <li>Pick Today or Repeat.</li>
                    <li>Create the goal and manage it here.</li>
                    <li>When you use Ekagra, assign the finished timer session to this goal from the timer save popup.</li>
                  </ol>
                </section>
              </div>
            </div>
          </div>
        )}

        {modal && <GoalModal goal={modal.goal} mode={modal.mode} onSave={saveGoal} onClose={() => setModal(null)} todayKey={todayKey} maxDateKey={maxDateKey} />}

        {durationModal && (
          <StudyDurationModal
            goalTitle={durationModal.goalTitle}
            onConfirm={(mins) => confirmGoalCompletion(durationModal.goalId, mins)}
            onClose={() => setDurationModal(null)}
          />
        )}
      </div>
    </NishthaLayout>
  );
}
