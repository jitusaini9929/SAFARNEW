import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLANNER_PRESS_EASE = "motion-safe:ease-\\[cubic-bezier(0.23,1,0.32,1)\\]";
const PLANNER_PRESSABLE = `motion-safe:transition-[transform,box-shadow,background-color,border-color,color,opacity] motion-safe:duration-150 ${PLANNER_PRESS_EASE} motion-reduce:transition-colors active:scale-[0.98] disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005bbf]/35`;

export type MergedPlanTopicStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "revision_needed";

/** Row shape matches flattened planner topics (runtime carries full subject/chapter). */
export type MergedPlanTopic = {
  id: string;
  name: string;
  status: MergedPlanTopicStatus;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
  subject: { id: string; name: string };
  chapter: { id: string; name: string };
};

const STATUS_ROW: Record<
  MergedPlanTopicStatus,
  { label: string; color: string; bg: string; darkBg?: string; border: string }
> = {
  todo: {
    label: "Not started",
    color: "#475569",
    bg: "#f1f5f9",
    darkBg: "#1e293b",
    border: "#e2e8f0",
  },
  in_progress: {
    label: "In progress",
    color: "#0369a1",
    bg: "#e0f2fe",
    darkBg: "#0c4a6e",
    border: "#bae6fd",
  },
  done: {
    label: "Done",
    color: "#047857",
    bg: "#d1fae5",
    darkBg: "#064e3b",
    border: "#a7f3d0",
  },
  revision_needed: {
    label: "Revision",
    color: "#6d28d9",
    bg: "#ede9fe",
    darkBg: "#3b0764",
    border: "#ddd6fe",
  },
};

function plannerCard(isDarkMode: boolean, className = "") {
  return `rounded-2xl border transition-colors duration-300 ${
    isDarkMode
      ? "bg-[#141618] border-[#2e3338] shadow-[0_1px_0_rgba(255,255,255,0.04)]"
      : "bg-white border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
  } ${className}`;
}

function ProgressRing({
  percent,
  isDarkMode,
}: {
  percent: number;
  isDarkMode: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 88 88"
      className="shrink-0"
      aria-hidden
    >
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke={isDarkMode ? "#2e3338" : "#eceef1"}
        strokeWidth="8"
      />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="#005bbf"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 44 44)"
        className="transition-[stroke-dashoffset] duration-500"
      />
      <text
        x="44"
        y="46"
        textAnchor="middle"
        className="fill-[#005bbf] text-[17px] font-bold"
        style={{ fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif" }}
      >
        {clamped}%
      </text>
    </svg>
  );
}

export type MergedPlanTabProps = {
  isDarkMode: boolean;
  hasExamDate: boolean;
  hasTopics: boolean;
  hasScheduledTopics: boolean;
  onScrollToBasics: () => void;
  onOpenSyllabus: () => void;
  onBuildSchedule: () => void;
  onOpenCalendar: () => void;
  progressPercent: number;
  progressDone: number;
  progressTotal: number;
  requiredPacePerDay: number;
  onAddTopics: () => void;
  planTitleDraft: string;
  onPlanTitleChange: (v: string) => void;
  examType: string;
  onExamTypeChange: (v: string) => void;
  examDateField: ReactNode;
  onSaveBasics: () => void;
  dailyGoalDraft: number;
  onDailyGoalChange: (v: number) => void;
  offDaysDraft: number[];
  onToggleOffDay: (day: number) => void;
  onSaveCapacity: () => void;
  todayTopics: MergedPlanTopic[];
  todayDoneCount?: number;
  todayTotalCount?: number;
  bonusDoneCount?: number;
  bonusTopics?: MergedPlanTopic[];
  overdueTopics: MergedPlanTopic[];
  upcomingTopics: MergedPlanTopic[];
  completedTopics: MergedPlanTopic[];
  formatPlannedDate: (iso?: string) => string;
  daysOverdue: (plannedIso: string, todayKey: string) => number;
  todayKey: string;
  patchTopic: (
    id: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
  onTopicOpen: (topic: MergedPlanTopic) => void;
  emptySyllabus: boolean;
  onGoSyllabusFromEmpty: () => void;
  onRequestResetPlan: () => void;
  onExport?: () => void;
  focusRequest?: PlanFocusRequest | null;
  onFocusRequestHandled?: () => void;
};

const OFF_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type TaskTab = "today" | "overdue" | "upcoming" | "completed";

type PlanFocusRequest = {
  taskTab?: TaskTab;
  settingsSection?: "capacity" | "basics";
  scrollTo?: "tasks" | "settings";
};

export default function MergedPlanTab({
  isDarkMode,
  progressPercent,
  progressDone,
  progressTotal,
  requiredPacePerDay,
  onAddTopics,
  planTitleDraft,
  onPlanTitleChange,
  examType,
  onExamTypeChange,
  examDateField,
  onSaveBasics,
  dailyGoalDraft,
  onDailyGoalChange,
  offDaysDraft,
  onToggleOffDay,
  onSaveCapacity,
  todayTopics,
  todayDoneCount = 0,
  todayTotalCount = 0,
  bonusDoneCount = 0,
  bonusTopics = [],
  overdueTopics,
  upcomingTopics,
  completedTopics,
  formatPlannedDate,
  daysOverdue,
  todayKey,
  patchTopic,
  onTopicOpen,
  emptySyllabus,
  onGoSyllabusFromEmpty,
  onRequestResetPlan,
  onExport,
  focusRequest,
  onFocusRequestHandled,
}: MergedPlanTabProps) {

  const [taskTab, setTaskTab] = useState<TaskTab>("today");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFlowModeActive, setIsFlowModeActive] = useState(false);
  const [flowSaving, setFlowSaving] = useState(false);
  const tasksRef = useRef<HTMLDivElement | null>(null);
  const basicsRef = useRef<HTMLDivElement | null>(null);
  const capacityRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.taskTab) {
      setTaskTab(focusRequest.taskTab);
    }
    if (focusRequest.settingsSection) {
      setSettingsOpen(true);
    }

    if (focusRequest.scrollTo === "tasks") {
      tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (focusRequest.scrollTo === "settings") {
      const targetRef =
        focusRequest.settingsSection === "capacity" ? capacityRef : basicsRef;
      window.setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }

    onFocusRequestHandled?.();
  }, [focusRequest, onFocusRequestHandled]);

  const flowQueue = useMemo(() => {
    const seen = new Set<string>();
    const queue: MergedPlanTopic[] = [];
    for (const topic of [...todayTopics, ...overdueTopics]) {
      if (topic.status === "done" || seen.has(topic.id)) continue;
      seen.add(topic.id);
      queue.push(topic);
    }
    if (queue.length > 0) return queue;
    return bonusTopics.filter((topic) => topic.status !== "done");
  }, [todayTopics, overdueTopics, bonusTopics]);

  const activeFlowTopic = flowQueue[0] ?? null;

  useEffect(() => {
    if (isFlowModeActive && !activeFlowTopic) {
      setIsFlowModeActive(false);
    }
  }, [isFlowModeActive, activeFlowTopic]);

  const overdueShown = overdueTopics.slice(0, 12);

  const textPrimary = isDarkMode ? "text-[#f1f5f9]" : "text-[#191c1d]";
  const textMuted = isDarkMode ? "text-[#94a3b8]" : "text-[#5c6370]";
  const textLabel = isDarkMode ? "text-[#64748b]" : "text-[#727785]";

  const primaryBtn = `${PLANNER_PRESSABLE} inline-flex items-center justify-center gap-2 rounded-full bg-[#005bbf] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,91,191,0.28)] hover:bg-[#004da3]`;
  const secondaryBtn = `${PLANNER_PRESSABLE} inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold ${
    isDarkMode
      ? "border-[#3d444d] bg-[#1c1f22] text-[#e2e8f0] hover:bg-[#25292e]"
      : "border-[#c1c6d6] bg-white text-[#191c1d] hover:bg-[#f8fafb]"
  }`;

  const fieldClass = `w-full rounded-xl border px-3.5 py-2.5 text-[14px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#005bbf]/30 ${
    isDarkMode
      ? "border-[#3d444d] bg-[#0e1012] text-[#f1f5f9] placeholder:text-[#64748b]"
      : "border-[#d8dce6] bg-[#f8fafb] text-[#191c1d] placeholder:text-[#94a3b8]"
  }`;

  function TopicRow({ topic }: { topic: MergedPlanTopic; variant?: "overdue" }) {
    const ui = STATUS_ROW[topic.status];
    return (
      <div
        className={`w-full text-left rounded-xl p-3 border shadow-sm transition-colors ${
          isDarkMode
            ? "bg-[#232628] border-[#3a3d42] hover:bg-[#2a2d32]"
            : "bg-white border-[#d1d5db] hover:bg-slate-50/80"
        }`}
      >
        <button
          type="button"
          onClick={() => onTopicOpen(topic)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className={`text-[14px] sm:text-[15px] font-bold leading-snug ${isDarkMode ? "text-white" : "text-[#1a202c]"}`}
              >
                {topic.name}
              </div>
              <div
                className={`text-[11px] font-bold tracking-wider mt-0.5 uppercase ${isDarkMode ? "text-[#9aa2ae]" : "text-[#64748b]"}`}
              >
                {topic.subject.name}
                {topic.chapter?.name ? ` · ${topic.chapter.name}` : ""}
              </div>
              {topic.status === "done" ? (
                <div
                  className={`text-[11px] font-semibold mt-1 flex flex-wrap items-center gap-1.5 ${
                    isDarkMode ? "text-[#94a3b8]" : "text-[#64748b]"
                  }`}
                >
                  {topic.plannedDate && (
                    <span>
                      Set for: <span className={isDarkMode ? "text-[#e2e8f0]" : "text-[#1e293b]"}>{formatPlannedDate(topic.plannedDate)}</span>
                    </span>
                  )}
                  {topic.plannedDate && topic.completedDate && <span className="opacity-40">•</span>}
                  {topic.completedDate && (
                    <span className="text-primary font-bold">
                      Completed: {formatPlannedDate(topic.completedDate)}
                    </span>
                  )}
                </div>
              ) : topic.plannedDate ? (
                <div
                  className={`text-[11px] font-semibold mt-0.5 ${isDarkMode ? "text-[#93c5fd]" : "text-[#1d4ed8]"}`}
                >
                  {formatPlannedDate(topic.plannedDate)}
                </div>
              ) : null}
              {topic.notes?.trim() ? (
                <div
                  className={`text-[12px] font-medium mt-1 leading-snug ${isDarkMode ? "text-[#cbd5e1]" : "text-[#475569]"}`}
                >
                  {topic.notes}
                </div>
              ) : null}
            </div>
            <span
              className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border"
              style={{
                color: isDarkMode ? "#f8fafc" : ui.color,
                backgroundColor: isDarkMode ? ui.color : ui.bg,
                borderColor: isDarkMode ? `${ui.color}99` : ui.border,
              }}
            >
              {ui.label}
            </span>
          </div>
        </button>
        {topic.status !== "done" ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void patchTopic(topic.id, { status: "done" })}
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary text-primary-foreground ${PLANNER_PRESSABLE}`}
            >
              Mark Done
            </button>
            <button
              type="button"
              onClick={() => void patchTopic(topic.id, { status: "revision_needed" })}
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-600 text-white ${PLANNER_PRESSABLE}`}
            >
              Revision
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void patchTopic(topic.id, { status: "todo" })}
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 dark:bg-[#2a2d32] dark:text-slate-400 ${PLANNER_PRESSABLE}`}
            >
              Undo
            </button>
          </div>
        )}
      </div>
    );
  }

  if (emptySyllabus) {
    return (
      <div className={`${plannerCard(isDarkMode, "flex flex-col items-center justify-center p-8 text-center sm:p-12")}`}>
        <div className="mb-4 text-[40px]">📚</div>
        <h3 className={`mb-2 text-[18px] font-bold ${textPrimary}`}>Your syllabus is empty</h3>
        <p className={`mb-6 max-w-md text-[14px] ${textMuted}`}>
          Start by adding subjects, chapters, and topics to your syllabus. Once you have topics, you can track them here.
        </p>
        <button type="button" onClick={onGoSyllabusFromEmpty} className={primaryBtn}>
          Go to Syllabus Setup
        </button>
      </div>
    );
  }

  if (isFlowModeActive && activeFlowTopic) {
    return (
      <div className={`relative flex min-h-[500px] flex-col items-center justify-center rounded-2xl p-4 sm:p-8 ${isDarkMode ? "bg-[#0e1012] border border-[#2e3338]" : "bg-white border border-[#e2e8f0]"}`}>
        <button 
          type="button"
          onClick={() => setIsFlowModeActive(false)}
          className={`absolute left-4 top-4 flex items-center gap-1 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition-colors ${isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Exit Flow
        </button>
        
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFlowTopic.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
            >
              <div className="mb-6 animate-pulse text-[13px] font-black uppercase tracking-widest text-[#005bbf]">
                Active Focus Session
              </div>
              <h2 className={`mb-4 text-4xl font-bold leading-tight sm:text-5xl ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                {activeFlowTopic.name}
              </h2>
              <div className="mb-12 text-[14px] font-bold uppercase tracking-widest text-slate-500">
                {activeFlowTopic.subject.name} {activeFlowTopic.chapter?.name ? `· ${activeFlowTopic.chapter.name}` : ""}
              </div>
              
              <button
                type="button"
                disabled={flowSaving}
                onClick={() => {
                  void (async () => {
                    if (!activeFlowTopic || flowSaving) return;
                    setFlowSaving(true);
                    try {
                      await Promise.resolve(
                        patchTopic(activeFlowTopic.id, { status: "done" }),
                      );
                    } finally {
                      setFlowSaving(false);
                    }
                  })();
                }}
                className={`flex w-full items-center justify-center gap-3 rounded-full safar-btn-primary px-12 py-5 text-[18px] font-black uppercase tracking-widest hover:shadow-2xl active:scale-95 sm:w-auto disabled:opacity-60 disabled:active:scale-100`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {flowSaving ? "Saving..." : "Mark as Done"}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const taskScrollClass =
    "min-h-0 max-h-[min(42dvh,420px)] overflow-y-auto overscroll-contain scroll-smooth pr-1";

  return (
    <motion.div
      data-tour="planner-merged-home"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-4"
    >
      {/* Hero: progress + setup + quick actions */}
      <div
        className={`${plannerCard(isDarkMode, "overflow-hidden")} grid lg:grid-cols-[1fr_auto] lg:items-stretch`}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:border-r lg:border-[#e2e8f0] dark:lg:border-[#2e3338]">
          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
            <ProgressRing percent={progressPercent} isDarkMode={isDarkMode} />
            <div className="min-w-0 flex-1">
              <p className={`text-[12px] font-semibold uppercase tracking-wider ${textLabel}`}>
                Plan progress
              </p>
              <p className={`mt-1 text-[15px] font-semibold ${textPrimary}`}>
                {progressDone} of {progressTotal} topics complete
              </p>
              <p className={`mt-0.5 text-[13px] ${textMuted}`}>
                Target pace · {requiredPacePerDay} topics / study day
              </p>
              <div
                className={`mt-3 h-1.5 overflow-hidden rounded-full ${
                  isDarkMode ? "bg-[#2e3338]" : "bg-[#eceef1]"
                }`}
              >
                <div
                  className="h-full rounded-full bg-[#005bbf] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          data-tour="planner-merged-progress"
          className={`flex flex-col justify-center gap-2 border-t p-4 sm:p-5 lg:w-[200px] lg:border-t-0 lg:border-l ${
            isDarkMode ? "border-[#2e3338] bg-[#0e1012]/50" : "border-[#e2e8f0] bg-[#f8fafb]/80"
          }`}
        >
          <button
            type="button"
            data-tour="planner-merged-add-topics"
            onClick={onAddTopics}
            className={`${primaryBtn} w-full`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Add topics
          </button>
          {onExport ? (
            <button type="button" onClick={onExport} className={`${secondaryBtn} w-full`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          ) : null}
        </div>
      </div>

      {/* Collapsible plan settings */}
      <div className={plannerCard(isDarkMode, "overflow-hidden")}>
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${PLANNER_PRESSABLE} ${
            isDarkMode ? "hover:bg-[#1c1f22]" : "hover:bg-[#f8fafb]"
          }`}
        >
          <span className={`text-[15px] font-semibold ${textPrimary}`}>Plan settings</span>
          <span className={`flex items-center gap-2 text-[13px] font-medium ${textMuted}`}>
            Basics & capacity
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${settingsOpen ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {settingsOpen ? (
          <div
            className={`grid gap-4 border-t px-4 pb-4 pt-2 sm:grid-cols-2 sm:px-5 sm:pb-5 ${
              isDarkMode ? "border-[#2e3338]" : "border-[#e2e8f0]"
            }`}
          >
            <div
              ref={basicsRef}
              data-tour="planner-merged-basics"
              className="flex flex-col gap-3"
            >
              <h4 className={`text-[13px] font-semibold uppercase tracking-wider ${textLabel}`}>
                Basics
              </h4>
              <input
                value={planTitleDraft}
                onChange={(e) => onPlanTitleChange(e.target.value)}
                placeholder="Plan title"
                className={fieldClass}
              />
              <input
                value={examType}
                onChange={(e) => onExamTypeChange(e.target.value)}
                placeholder="Exam type"
                className={fieldClass}
              />
              <div>
                <label className={`mb-1.5 block text-[12px] font-semibold ${textLabel}`}>
                  Exam date
                </label>
                {examDateField}
              </div>
              <button type="button" onClick={() => onSaveBasics()} className={`${primaryBtn} w-full sm:w-auto`}>
                Save basics
              </button>
            </div>

            <div
              ref={capacityRef}
              data-tour="planner-merged-capacity"
              className="flex flex-col gap-3"
            >
              <h4 className={`text-[13px] font-semibold uppercase tracking-wider ${textLabel}`}>
                Study capacity
              </h4>
              <div>
                <label className={`mb-1.5 block text-[12px] font-semibold ${textLabel}`}>
                  Daily goal (topics)
                </label>
                <input
                  type="number"
                  min={1}
                  value={dailyGoalDraft}
                  onChange={(e) => onDailyGoalChange(Number(e.target.value))}
                  className={`${fieldClass} max-w-[120px] text-center`}
                />
              </div>
              <div>
                <label className={`mb-2 block text-[12px] font-semibold ${textLabel}`}>
                  Off days
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {OFF_LABELS.map((label, idx) => {
                    const active = offDaysDraft.includes(idx);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onToggleOffDay(idx)}
                        className={`${PLANNER_PRESSABLE} rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          active
                            ? "bg-[#005bbf] text-white shadow-sm"
                            : isDarkMode
                              ? "border border-[#3d444d] text-[#94a3b8] hover:bg-[#1c1f22]"
                              : "border border-[#c1c6d6] text-[#5c6370] hover:bg-[#f8fafb]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button type="button" onClick={() => onSaveCapacity()} className={`${primaryBtn} w-full sm:w-auto`}>
                Save capacity
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div
        ref={tasksRef}
        className={`${plannerCard(isDarkMode, "flex min-h-0 flex-col")}`}
      >
        {(todayTotalCount > 0 || bonusDoneCount > 0) && (
          <div className={`px-4 pt-4 pb-2 ${isDarkMode ? "border-[#2e3338]" : "border-[#e2e8f0]"}`}>
            <div className="flex items-center justify-between text-[13px] font-semibold">
              <span className={textPrimary}>Day Progress</span>
              <span className={textMuted}>
                {todayTotalCount > 0 ? `${todayDoneCount}/${todayTotalCount} done` : "0 planned"}
                {bonusDoneCount > 0 && <span className="ml-1 text-primary font-bold">(+{bonusDoneCount} bonus)</span>}
              </span>
            </div>
            {todayTotalCount > 0 && (
              <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${isDarkMode ? "bg-[#2e3338]" : "bg-[#eceef1]"}`}>
                <div 
                  className="h-full rounded-full bg-primary transition-all duration-500" 
                  style={{ width: `${Math.round((todayDoneCount / todayTotalCount) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-3 py-3 sm:px-4 ${
            isDarkMode ? "border-[#2e3338] bg-[#0e1012]/40" : "border-[#e2e8f0] bg-[#f2f4f5]/60"
          }`}
        >
          <h3 className={`text-[16px] font-bold shrink-0 ${textPrimary}`} style={{ fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif" }}>
            Today&apos;s queue
          </h3>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-1 rounded-full p-1">
            {(todayTopics.length > 0 || bonusTopics.length > 0) && (
              <button 
                type="button"
                onClick={() => setIsFlowModeActive(true)}
                className="mr-2 flex shrink-0 items-center gap-1.5 rounded-full bg-[#005bbf] px-4 py-1.5 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#004a9f] active:scale-95"
              >
                <span className="text-[14px]">▶</span> Start Studying
              </button>
            )}
            {(
              [
                ["today", "Today", todayTopics.length],
                ["overdue", "Overdue", overdueTopics.length],
                ["upcoming", "Upcoming", upcomingTopics.length],
                ["completed", "Completed", completedTopics.length],
              ] as const
            ).map(([tab, label, count]) => {
              const active = taskTab === tab;
              return (
              <button
                key={tab}
                type="button"
                data-tour={
                  tab === "today"
                    ? "planner-merged-today"
                    : tab === "overdue"
                      ? "planner-merged-overdue"
                      : tab === "completed"
                        ? "planner-merged-completed"
                        : "planner-merged-upcoming"
                }
                onClick={() => setTaskTab(tab)}
                className={`${PLANNER_PRESSABLE} flex min-w-[4.25rem] flex-col items-center gap-1.5 px-1 py-1 sm:min-w-[4.75rem]`}
              >
                <span
                  className={`text-[11px] font-semibold leading-tight whitespace-nowrap ${
                    active
                      ? isDarkMode
                        ? "text-[#f8fafc]"
                        : "text-[#0f172a]"
                      : textMuted
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums ${
                    active
                      ? isDarkMode
                        ? "bg-[#38bdf8] text-[#0f172a] shadow-sm"
                        : "bg-[#0f172a] text-white shadow-sm"
                      : isDarkMode
                        ? "border border-[#334155] bg-[#1a1d20] text-[#e2e8f0]"
                        : "border border-[#e2e8f0] bg-white text-[#475569]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
            })}
          </div>
        </div>

        <div className={`p-3 sm:p-4 ${taskScrollClass}`}>
          {taskTab === "today" &&
            (todayTopics.length === 0 ? (
              bonusTopics.length > 0 ? (
                <div className="flex flex-col gap-3 py-2">
                  <div className="text-center bg-[#f0fdf4] dark:bg-[#064e3b]/30 p-4 rounded-xl border border-[#bbf7d0] dark:border-[#065f46]">
                    <h4 className="text-[15px] font-bold text-[#166534] dark:text-[#34d399] mb-1">
                      {todayTotalCount > 0 ? "🎉 You finished today's plan!" : "🎉 You have no tasks today!"}
                    </h4>
                    <p className="text-[13px] text-[#15803d] dark:text-[#6ee7b7] opacity-90">Want to do more? Here are some bonus topics to get ahead.</p>
                  </div>
                  <div className="mt-2 text-[12px] font-bold uppercase tracking-widest text-[#64748b] dark:text-[#94a3b8] px-1">
                    {overdueTopics.length > 0 ? "Pick up where you left off" : "Get ahead for tomorrow"}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <AnimatePresence initial={false}>
                      {bonusTopics.map((topic) => (
                        <TopicRow key={topic.id} topic={topic} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <EmptyTasks isDarkMode={isDarkMode} message="No tasks planned for today." />
              )
            ) : (
              <div className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {todayTopics.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} />
                  ))}
                </AnimatePresence>
              </div>
            ))}

          {taskTab === "overdue" &&
            (overdueShown.length === 0 ? (
              <EmptyTasks isDarkMode={isDarkMode} message="You're caught up — no overdue topics." />
            ) : (
              <div className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {overdueShown.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} variant="overdue" />
                  ))}
                </AnimatePresence>
              </div>
            ))}

          {taskTab === "upcoming" &&
            (upcomingTopics.length === 0 ? (
              <EmptyTasks isDarkMode={isDarkMode} message="Nothing scheduled ahead yet." />
            ) : (
              <div className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {upcomingTopics.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} />
                  ))}
                </AnimatePresence>
              </div>
            ))}

          {taskTab === "completed" &&
            (completedTopics.length === 0 ? (
              <EmptyTasks isDarkMode={isDarkMode} message="No completed tasks yet." />
            ) : (
              <div className="flex flex-col gap-1.5">
                <AnimatePresence initial={false}>
                  {completedTopics.map((topic) => (
                    <TopicRow key={topic.id} topic={topic} />
                  ))}
                </AnimatePresence>
              </div>
            ))}
        </div>
      </div>

      {false && (
        <div className={plannerCard(isDarkMode, "flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between")}>
          <span className="text-[13px] font-semibold text-red-600">Danger zone</span>
          <button type="button" onClick={onRequestResetPlan} className={secondaryBtn}>
            Reset entire plan
          </button>
        </div>
      )}
    </motion.div>
  );
}

function EmptyTasks({
  isDarkMode,
  message,
}: {
  isDarkMode: boolean;
  message: string;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed px-4 py-10 text-center text-[13px] font-medium ${
        isDarkMode
          ? "border-[#3d444d] bg-[#0e1012]/50 text-[#94a3b8]"
          : "border-[#d8dce6] bg-[#f8fafb] text-[#64748b]"
      }`}
    >
      {message}
    </div>
  );
}
