import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { dataService } from "@/utils/dataService";
import { focusService } from "@/utils/focusService";
import { Goal, GoalSubtask } from "@shared/api";
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
  X
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────
interface UIGoal extends Goal {
  title: string;
}

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

const getGoalDurationMs = (goal: UIGoal) => {
  if (!goal.completedAt || !(goal as any).startedAt) return null;
  const end = new Date(goal.completedAt);
  const start = new Date((goal as any).startedAt);
  if (!Number.isFinite(end.getTime()) || !Number.isFinite(start.getTime())) return null;
  if (end.getTime() < start.getTime()) return null;
  return end.getTime() - start.getTime();
};

const getGoalCreatedTime = (goal: UIGoal) => {
  const raw = (goal as any).createdAt || (goal as any).created_at || goal.scheduledDate;
  const created = raw ? new Date(raw) : null;
  return created && Number.isFinite(created.getTime()) ? created.getTime() : 0;
};

const getGoalCreatedDateKey = (goal: UIGoal) => {
  const raw = (goal as any).createdAt || (goal as any).created_at || goal.scheduledDate;
  const created = raw ? new Date(raw) : null;
  return created && Number.isFinite(created.getTime()) ? getISTDateKey(created) : null;
};

const getDailyCompletionMetrics = (
  completedGoals: UIGoal[],
  dayKey: string,
  goalFocusTimes: Record<string, { totalMinutes: number }> = {},
) => {
  const dayGoals = completedGoals.filter(g => g.completedAt && getISTDateKey(new Date(g.completedAt)) === dayKey);
  const durations = dayGoals
    .map((goal) => {
      const trackedDuration = getGoalDurationMs(goal);
      if (typeof trackedDuration === "number" && Number.isFinite(trackedDuration) && trackedDuration > 0) {
        return trackedDuration;
      }

      const focusMinutes = goalFocusTimes[goal.id]?.totalMinutes;
      if (typeof focusMinutes === "number" && Number.isFinite(focusMinutes) && focusMinutes > 0) {
        return focusMinutes * 60000;
      }

      return null;
    })
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
  const totalDuration = durations.reduce((sum, v) => sum + v, 0);
  const avgDuration = durations.length ? totalDuration / durations.length : 0;
  const completionMinutes = dayGoals
    .map(g => g.completedAt ? getISTMinutesSinceMidnight(new Date(g.completedAt)) : null)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const avgCompletionMinutes = completionMinutes.length
    ? completionMinutes.reduce((sum, v) => sum + v, 0) / completionMinutes.length
    : null;
  return { count: dayGoals.length, totalDuration, avgDuration, avgCompletionMinutes };
};

// ─── COMPONENTS ───────────────────────────────────────────────

const WeekChart = ({ goals }: { goals: UIGoal[] }) => {
  const todayKey = getISTDateKey(new Date());
  const base = dateKeyToUtcDate(todayKey);
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getTime() - (6 - i) * (24 * 60 * 60 * 1000));
    const ds = getISTDateKey(d);
    return {
      day: formatISTDate(d, { weekday: "short" })[0],
      count: goals.filter(g => g.completed && g.completedAt && getISTDateKey(new Date(g.completedAt)).startsWith(ds)).length,
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

const GoalCard = ({ goal, onToggle, onDelete, onEdit, onRepeat, onFocus, focusMinutes, hideActions = false, createdMeta }: any) => {
  const { t } = useTranslation();
  const durationMs = getGoalDurationMs(goal);
  const completedAt = goal.completedAt ? new Date(goal.completedAt) : null;
  const completedDateLabel = completedAt ? formatDateLabel(completedAt.toISOString()) : "";
  const completedTimeLabel = completedAt ? formatTime(completedAt) : "";
  
  const primaryMeta = goal.completed
    ? completedTimeLabel
      ? t("goals.meta.completed_with_time", { date: completedDateLabel, time: completedTimeLabel })
      : t("goals.meta.completed", { date: completedDateLabel })
    : (goal.scheduledDate ? t("goals.meta.due", { date: formatDateLabel(goal.scheduledDate) }) : "");
    
  const focusDurationLabel = typeof focusMinutes === 'number' && focusMinutes > 0
    ? t("goals.meta.focused", { duration: formatDuration(focusMinutes * 60000) })
    : null;
    
  const secondaryMeta = goal.completed && durationMs && !focusDurationLabel
    ? t("goals.meta.took", { duration: formatDuration(durationMs) })
    : "";
  const metaPieces = [primaryMeta, focusDurationLabel || secondaryMeta, createdMeta].filter(Boolean);

  return (
    <div className={`p-4 rounded-xl transition-all duration-200 group flex items-start gap-4 
      ${goal.completed ? 'opacity-60 bg-muted/30' : 'hover:bg-muted/50'}`}>
      
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
        ${goal.completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
        {goal.completed ? <Check size={20} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-primary/40" />}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-bold truncate ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {goal.title}
        </h4>
        {goal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
            {goal.description}
          </p>
        )}
        {metaPieces.length > 0 && (
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
  const [title, setTitle] = useState(goal?.title || "");
  const [desc, setDesc] = useState(goal?.description || "");
  const [date, setDate] = useState(goal?.scheduledDate ? getISTDateKey(new Date(goal.scheduledDate)) : todayKey);
  const [startTime, setStartTime] = useState("");
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

  const submit = () => {
    if (!title.trim()) return;
    let startedAt: string | null = null;
    if (startTime) {
      const [hh, mm] = startTime.split(":").map(Number);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const utcMs = new Date(`${date}T00:00:00.000Z`).getTime() + hh * 3600000 + mm * 60000 - istOffsetMs;
      startedAt = new Date(utcMs).toISOString();
    }
    onSave({
      title: title.trim(),
      description: desc.trim(),
      scheduledDate: date,
      startedAt,
      subtasks: subtasks
        .map((item) => ({ ...item, text: item.text.trim() }))
        .filter((item) => item.text.length > 0),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5" /> {isEdit ? t("goals.edit_goal") : t("goals.new_goal")}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t("goals.modal.title")}</label>
            <input 
              className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder={t("goals.modal.title_placeholder")}
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t("goals.modal.description_optional")}</label>
            <textarea 
              className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-h-[100px] resize-none"
              placeholder={t("goals.modal.description_placeholder")}
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t("goals.modal.subtasks_optional")}</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t("goals.modal.target_date")}</label>
              <input 
                type="date"
                className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all color-scheme-dark"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={todayKey}
                max={maxDateKey}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">{t("goals.modal.start_time_ist")}</label>
              <input 
                type="time"
                className="w-full bg-muted/50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all color-scheme-dark"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!title.trim()}
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
  const [tab, setTab] = useState("goals");
  const [todayKey, setTodayKey] = useState(() => getISTDateKey(new Date()));
  const [historyDateFilter, setHistoryDateFilter] = useState(() => getISTDateKey(new Date()));
  const [goalFocusTimes, setGoalFocusTimes] = useState<Record<string, { totalMinutes: number }>>({});
  const [todayGoalFocusTimes, setTodayGoalFocusTimes] = useState<Record<string, { totalMinutes: number }>>({});

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

      const allIds = data.map(g => g.id).filter(Boolean);
      if (allIds.length > 0) {
        focusService.getGoalsFocusTimes(allIds).then(times => {
          setGoalFocusTimes(times);
        }).catch(() => {});

        focusService.getGoalsFocusTimes(allIds, { dayKey: todayKey }).then(times => {
          setTodayGoalFocusTimes(times);
        }).catch(() => {});
      } else {
        setGoalFocusTimes({});
        setTodayGoalFocusTimes({});
      }
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
        });
        const oldKey = getISTDateKey(new Date(modal.goal.scheduledDate));
        if (oldKey !== data.scheduledDate) {
          await dataService.rescheduleGoal(modal.goal.id, new Date(data.scheduledDate));
        }
        toast.success(t("goals.toast.updated"));
      } else {
        await dataService.addGoal({
          title: data.title,
          description: data.description,
          scheduledDate: data.scheduledDate,
          startedAt: data.startedAt,
          subtasks: data.subtasks || [],
        });
        toast.success(t("goals.toast.created"));
      }
      fetchGoals();
    } catch (error) {
      toast.error(t("goals.toast.operation_failed"));
      fetchGoals();
    }
  };

  const pendingGoals = useMemo(() => goals.filter(g => !g.completed).sort((a,b) => (a.scheduledDate || "") > (b.scheduledDate || "") ? 1 : -1), [goals]);
  const completedRecent = useMemo(() => goals.filter(g => g.completed).sort((a,b) => (b.completedAt || "") > (a.completedAt || "") ? 1 : -1).slice(0, MAX_COMPLETED_DISPLAY), [goals]);
  const historyDateKeys = useMemo(() => Array.from(new Set(goals.map(getGoalCreatedDateKey).filter(Boolean))).sort() as string[], [goals]);
  const filteredHistory = useMemo(() => historyDateFilter ? goals.filter(g => getGoalCreatedDateKey(g) === historyDateFilter) : goals, [goals, historyDateFilter]);

  const todayMetrics = useMemo(
    () => getDailyCompletionMetrics(goals.filter(g => g.completed), todayKey, todayGoalFocusTimes),
    [goals, todayKey, todayGoalFocusTimes],
  );

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
              onClick={() => setModal({ mode: "add", goal: null })}
              className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all w-full md:w-auto"
            >
              <Plus size={20} strokeWidth={3} /> {t('goals.add_goal')}
            </button>
          </header>

          <div className="flex items-center p-1 bg-muted/50 rounded-2xl border w-full md:w-fit">
            {[
              { id: "goals", label: t('goals.tab_goals'), icon: Check },
              { id: "history", label: t('goals.tab_history'), icon: Clock },
              { id: "analytics", label: t('goals.tab_analytics'), icon: TrendingUp }
            ].map((tabItem) => (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-[14px] text-sm font-bold transition-all
                  ${tab === tabItem.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <tabItem.icon size={16} />
                {tabItem.label}
              </button>
            ))}
          </div>

          {tab === "analytics" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="lg:col-span-2 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-card border rounded-3xl shadow-sm">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{t("goals.analytics.completed_7d")}</h4>
                       <span className="text-4xl font-black text-emerald-500">{goals.filter(g => g.completed).length}</span>
                    </div>
                    <div className="p-6 bg-card border rounded-3xl shadow-sm">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">{t("goals.analytics.total_focus_time")}</h4>
                       <span className="text-4xl font-black text-amber-500">
                         {formatDuration(Object.values(goalFocusTimes).reduce((acc, curr) => acc + (curr.totalMinutes * 60000), 0)) || "0m"}
                       </span>
                    </div>
                 </div>
                 <div className="p-8 bg-card border rounded-[32px] shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold flex items-center gap-2"><Calendar className="text-primary w-4 h-4" /> {t("goals.analytics.weekly_pulse")}</h3>
                        <span className="text-xs text-muted-foreground">{t("goals.analytics.completion_velocity")}</span>
                    </div>
                    <WeekChart goals={goals} />
                 </div>
              </div>
              <div className="p-8 bg-card border rounded-[32px] shadow-sm">
                   <h3 className="font-bold mb-6">{t("goals.analytics.daily_breakdown")}</h3>
                <div className="space-y-4">
                  {Array.from({length: 7}, (_, i) => {
                    const d = new Date(dateKeyToUtcDate(todayKey).getTime() - (6-i) * (24*60*60*1000));
                    const key = getISTDateKey(d);
                    const metrics = getDailyCompletionMetrics(goals.filter(g => g.completed), key);
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <span className="text-xs font-bold w-12">{formatISTDate(d, { weekday: "short" })}</span>
                        <div className="flex-1 px-4">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden w-full">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (metrics.count / 5) * 100)}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground w-12 text-right">{t("goals.analytics.done_count", { count: metrics.count })}</span>
                      </div>
                    );
                  })}
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
                          <GoalCard key={g.id} goal={g} onToggle={toggleGoal} onDelete={deleteGoal} onEdit={(goal: any) => setModal({ mode: "edit", goal })} onRepeat={(goal: any) => setModal({ mode: "repeat", goal })} onFocus={() => navigate(`/study?goalId=${g.id}&goalTitle=${g.title}`)} focusMinutes={goalFocusTimes[g.id]?.totalMinutes} />
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
        {modal && <GoalModal goal={modal.goal} mode={modal.mode} onSave={saveGoal} onClose={() => setModal(null)} todayKey={todayKey} maxDateKey={maxDateKey} />}
      </div>
    </NishthaLayout>
  );
}
