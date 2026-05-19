import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

const PLANNER_PRESS_EASE = "motion-safe:ease-\\[cubic-bezier(0.23,1,0.32,1)\\]";
const PLANNER_PRESSABLE = `motion-safe:transition-[transform,box-shadow,background-color,border-color,color,opacity] motion-safe:duration-150 ${PLANNER_PRESS_EASE} motion-reduce:transition-colors active:scale-[0.97] active:translate-y-[1px] disabled:active:scale-100 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40`;

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
  { label: string; color: string; bg: string; darkBg?: string }
> = {
  todo: {
    label: "Not Started",
    color: "#64748b",
    bg: "#f1f5f9",
    darkBg: "#1e293b",
  },
  in_progress: {
    label: "In Progress",
    color: "#00b8d4",
    bg: "#e0f7fa",
    darkBg: "#00363d",
  },
  done: {
    label: "Done",
    color: "#0284c7",
    bg: "#e0f2fe",
    darkBg: "#0c4a6e",
  },
  revision_needed: {
    label: "Needs Revision",
    color: "#7c3aed",
    bg: "#f3e8ff",
    darkBg: "#3b0764",
  },
};

function surfaceCard(isDarkMode: boolean, dense = true) {
  const pad = dense ? "p-3 sm:p-4" : "p-5 sm:p-6";
  return `rounded-2xl sm:rounded-3xl ${pad} transition-colors duration-500 ${
    isDarkMode
      ? "bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#2b2c2c]"
      : "bg-[#f0f0f5] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] border border-[#c0c4d1]"
  }`;
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
  overdueTopics: MergedPlanTopic[];
  upcomingTopics: MergedPlanTopic[];
  formatPlannedDate: (iso?: string) => string;
  daysOverdue: (plannedIso: string, todayKey: string) => number;
  todayKey: string;
  patchTopic: (id: string, patch: Record<string, unknown>) => void;
  onTopicOpen: (topic: MergedPlanTopic) => void;
  emptySyllabus: boolean;
  onGoSyllabusFromEmpty: () => void;
  onRequestResetPlan: () => void;
  onExport?: () => void;
};

const OFF_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type TaskTab = "today" | "overdue" | "upcoming";

export default function MergedPlanTab({
  isDarkMode,
  hasExamDate,
  hasTopics,
  hasScheduledTopics,
  onScrollToBasics,
  onOpenSyllabus,
  onBuildSchedule,
  onOpenCalendar,
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
  overdueTopics,
  upcomingTopics,
  formatPlannedDate,
  daysOverdue,
  todayKey,
  patchTopic,
  onTopicOpen,
  emptySyllabus,
  onGoSyllabusFromEmpty,
  onRequestResetPlan,
  onExport,
}: MergedPlanTabProps) {
  const overdueShown = overdueTopics.slice(0, 8);
  const [taskTab, setTaskTab] = useState<TaskTab>("today");

  const cleanPillBase = `inline-flex items-center justify-center rounded-full px-3 py-2 text-[12px] sm:text-[13px] font-semibold tracking-[0.01em] leading-none ${PLANNER_PRESSABLE} disabled:opacity-60 disabled:cursor-not-allowed`;
  const cleanPrimaryPill = `${cleanPillBase} bg-[#3b82f6] text-white shadow-[0_8px_18px_rgba(37,99,235,0.32)] hover:bg-[#2563eb]`;
  const cleanSecondaryPill = `${cleanPillBase} border ${
    isDarkMode
      ? "bg-[#343840] border-[#4a4e55] text-[#e2e8f0] hover:bg-[#3b4048]"
      : "bg-white/95 border-[#cfd6e2] text-[#1f2937] hover:bg-white"
  } shadow-[0_4px_10px_rgba(15,23,42,0.14)]`;

  const inputClass = `w-full bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold text-[13px]`;

  const guideBtn = `flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] sm:text-[12px] font-semibold leading-tight ${isDarkMode ? "hover:bg-white/5" : "hover:bg-black/5"}`;

  function TopicRow({ topic }: { topic: MergedPlanTopic }) {
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
              {topic.plannedDate && topic.status !== "done" ? (
                <div
                  className={`text-[11px] font-semibold mt-0.5 ${isDarkMode ? "text-[#93c5fd]" : "text-[#1d4ed8]"}`}
                >
                  {formatPlannedDate(topic.plannedDate)}
                </div>
              ) : null}
            </div>
            <span
              className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap"
              style={{
                color: ui.color,
                background: isDarkMode ? ui.darkBg || ui.bg : ui.bg,
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
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-600 text-white ${PLANNER_PRESSABLE}`}
            >
              Done
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (emptySyllabus) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-tour="planner-merged-home"
        className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] flex flex-col items-center text-center gap-4 max-w-2xl mx-auto"
      >
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-[#2d333b] dark:text-[#e7e5e5] mb-2">
            Step 1: Build Your Syllabus
          </h3>
          <p className="text-xs sm:text-sm font-bold text-[#4b5563] dark:text-[#9ca3af] max-w-sm mx-auto leading-relaxed">
            Add subjects and topics in Syllabus, then return here to pace and
            track your study plan.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoSyllabusFromEmpty}
          className="text-[12px] sm:text-[14px] font-black uppercase tracking-widest px-8 py-3.5 sm:py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.39)] transition-transform hover:scale-105 active:scale-95"
        >
          Go to Syllabus Builder
        </button>
      </motion.div>
    );
  }

  /** One scroll region for tasks so the main page stays short; fits typical laptop below header/tabs. */
  const taskScrollClass =
    "min-h-0 max-h-[min(32dvh,280px)] sm:max-h-[min(34dvh,320px)] lg:max-h-[min(38dvh,360px)] overflow-y-auto overscroll-contain pr-0.5";

  return (
    <motion.div
      data-tour="planner-merged-home"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-7xl mx-auto flex flex-col gap-2 sm:gap-3"
    >
      {/* Top dashboard: 4 columns on xl — uses horizontal space, less vertical stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2 sm:gap-3 shrink-0">
        <div
          data-tour="planner-merged-guide"
          className={`${surfaceCard(isDarkMode)} xl:col-span-2`}
        >
          <div className="text-[13px] sm:text-[14px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2">
            Setup Guide
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={onScrollToBasics}
              className={guideBtn}
            >
              <span
                className={hasExamDate ? "text-emerald-600" : "text-slate-400"}
              >
                {hasExamDate ? "✓" : "→"}
              </span>
              <span className="min-w-0">Exam date</span>
            </button>
            <button type="button" onClick={onOpenSyllabus} className={guideBtn}>
              <span
                className={hasTopics ? "text-emerald-600" : "text-slate-400"}
              >
                {hasTopics ? "✓" : "→"}
              </span>
              <span className="min-w-0">Topics</span>
            </button>
            <button
              type="button"
              onClick={onBuildSchedule}
              className={guideBtn}
            >
              <span
                className={
                  hasScheduledTopics ? "text-emerald-600" : "text-slate-400"
                }
              >
                {hasScheduledTopics ? "✓" : "→"}
              </span>
              <span className="min-w-0">Schedule</span>
            </button>
            <button type="button" onClick={onOpenCalendar} className={guideBtn}>
              <span className="text-slate-400">→</span>
              <span className="min-w-0">Calendar</span>
            </button>
          </div>
        </div>

        <div
          data-tour="planner-merged-progress"
          className={`${surfaceCard(isDarkMode)} md:col-span-1 xl:col-span-4`}
        >
          <div className="flex flex-col sm:flex-row sm:items-stretch sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-end gap-2">
                <span className="text-[26px] sm:text-[30px] font-extrabold text-blue-600 dark:text-blue-400 leading-none">
                  {progressPercent}%
                </span>
                <span className="text-[12px] font-semibold text-[#64748b] dark:text-[#9aa2ae] pb-0.5">
                  complete
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[12px] sm:text-[13px] font-semibold text-[#2d333b] dark:text-[#e7e5e5] leading-tight">
                {progressDone} / {progressTotal} topics done
              </p>
              <p className="mt-0.5 text-[11px] sm:text-[12px] text-[#64748b] dark:text-[#9aa2ae]">
                Pace: {requiredPacePerDay} topics/day
              </p>
            </div>
            <div className="flex sm:flex-col justify-stretch sm:justify-center shrink-0 gap-2">
              <button
                type="button"
                data-tour="planner-merged-add-topics"
                onClick={onAddTopics}
                className={`${cleanPrimaryPill} w-full sm:w-auto py-2.5 px-4 text-[11px] sm:text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                Add Topics
              </button>
              {onExport && (
                <button
                  type="button"
                  onClick={onExport}
                  className={`${cleanSecondaryPill} w-full sm:w-auto py-2.5 px-4 text-[11px] sm:text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          data-tour="planner-merged-basics"
          className={`${surfaceCard(isDarkMode)} md:col-span-1 xl:col-span-3`}
        >
          <div className="text-[13px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2">
            Basics
          </div>
          <div className="grid gap-2">
            <input
              value={planTitleDraft}
              onChange={(e) => onPlanTitleChange(e.target.value)}
              placeholder="Plan title"
              className={inputClass}
            />
            <input
              value={examType}
              onChange={(e) => onExamTypeChange(e.target.value)}
              placeholder="Exam type"
              className={inputClass}
            />
            <div>
              <div className="text-[10px] font-bold text-[#64748b] dark:text-[#9aa2ae] mb-1">
                Exam date
              </div>
              <div className="scale-95 origin-top-left">{examDateField}</div>
            </div>
            <button
              type="button"
              onClick={() => onSaveBasics()}
              className={`${cleanPrimaryPill} py-2 text-[11px] font-black uppercase tracking-widest w-full`}
            >
              Save Basics
            </button>
          </div>
        </div>

        <div
          data-tour="planner-merged-capacity"
          className={`${surfaceCard(isDarkMode)} md:col-span-2 xl:col-span-3`}
        >
          <div className="text-[13px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2">
            Study Capacity
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#64748b] dark:text-[#9aa2ae]">
                Daily goal
              </label>
              <input
                type="number"
                min={1}
                value={dailyGoalDraft}
                onChange={(e) => onDailyGoalChange(Number(e.target.value))}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#64748b] dark:text-[#9aa2ae] mb-1">
                Off days
              </div>
              <div className="flex flex-wrap gap-1">
                {OFF_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onToggleOffDay(idx)}
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${
                      offDaysDraft.includes(idx)
                        ? "bg-[#3b82f6] text-white border-[#2563eb]"
                        : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSaveCapacity()}
            className={`${cleanPrimaryPill} py-2 text-[11px] font-black uppercase tracking-widest w-full mt-2`}
          >
            Save Capacity
          </button>
        </div>
      </div>

      {/* Tasks: tabs replace three stacked sections — same content, less height */}
      <div className={`${surfaceCard(isDarkMode)} flex flex-col min-h-0`}>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1]/60 dark:border-[#2b2c2c]">
          <button
            type="button"
            data-tour="planner-merged-today"
            onClick={() => setTaskTab("today")}
            className={`flex-1 min-w-[5.5rem] rounded-lg px-2 py-1.5 text-[11px] sm:text-[12px] font-bold transition-colors ${
              taskTab === "today"
                ? "bg-white dark:bg-[#1a1c1e] text-[#1e293b] dark:text-[#e7e5e5] shadow-sm"
                : "text-[#64748b] dark:text-[#9aa2ae]"
            }`}
          >
            Today ({todayTopics.length})
          </button>
          <button
            type="button"
            data-tour="planner-merged-overdue"
            onClick={() => setTaskTab("overdue")}
            className={`flex-1 min-w-[5.5rem] rounded-lg px-2 py-1.5 text-[11px] sm:text-[12px] font-bold transition-colors ${
              taskTab === "overdue"
                ? "bg-white dark:bg-[#1a1c1e] text-[#1e293b] dark:text-[#e7e5e5] shadow-sm"
                : "text-[#64748b] dark:text-[#9aa2ae]"
            }`}
          >
            Overdue ({overdueTopics.length})
          </button>
          <button
            type="button"
            data-tour="planner-merged-upcoming"
            onClick={() => setTaskTab("upcoming")}
            className={`flex-1 min-w-[5.5rem] rounded-lg px-2 py-1.5 text-[11px] sm:text-[12px] font-bold transition-colors ${
              taskTab === "upcoming"
                ? "bg-white dark:bg-[#1a1c1e] text-[#1e293b] dark:text-[#e7e5e5] shadow-sm"
                : "text-[#64748b] dark:text-[#9aa2ae]"
            }`}
          >
            Upcoming ({upcomingTopics.length})
          </button>
        </div>

        <div className={`mt-2 ${taskScrollClass}`}>
          {taskTab === "today" ? (
            todayTopics.length === 0 ? (
              <div
                className={`text-center py-6 text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] rounded-xl border border-dashed ${isDarkMode ? "border-[#2b2c2c] bg-[#131416]/50" : "border-[#d9dbe2] bg-[#e6e7ee]/50"}`}
              >
                No tasks planned for today.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {todayTopics.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} />
                ))}
              </div>
            )
          ) : null}

          {taskTab === "overdue" ? (
            overdueShown.length === 0 ? (
              <div
                className={`text-center py-6 text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] rounded-xl border border-dashed ${isDarkMode ? "border-[#2b2c2c] bg-[#131416]/50" : "border-[#d9dbe2] bg-[#e6e7ee]/50"}`}
              >
                No overdue topics.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {overdueShown.map((topic) => (
                  <div
                    key={topic.id}
                    className="rounded-xl p-3 bg-[#fee2e2] dark:bg-[#2a1216] border border-[#fecaca] dark:border-[#7f1d1d]"
                  >
                    <button
                      type="button"
                      onClick={() => onTopicOpen(topic)}
                      className="w-full text-left"
                    >
                      <div className="text-[13px] font-bold text-[#7f1d1d] dark:text-[#fecaca] leading-snug">
                        {topic.name}
                      </div>
                      <div className="text-[10px] font-extrabold tracking-wide text-[#b91c1c] dark:text-[#fca5a5] mt-0.5 uppercase">
                        {topic.subject.name}
                        {topic.chapter?.name ? ` · ${topic.chapter.name}` : ""}
                      </div>
                      {topic.plannedDate ? (
                        <div className="text-[10px] font-black tracking-wide text-[#b91c1c] dark:text-[#fca5a5] mt-1">
                          {daysOverdue(topic.plannedDate, todayKey)} days
                          overdue
                        </div>
                      ) : null}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void patchTopic(topic.id, { status: "done" })
                        }
                        className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-600 text-white"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}

          {taskTab === "upcoming" ? (
            upcomingTopics.length === 0 ? (
              <div
                className={`text-center py-6 text-[12px] font-bold text-[#64748b] dark:text-[#9aa2ae] rounded-xl border border-dashed ${isDarkMode ? "border-[#2b2c2c] bg-[#131416]/50" : "border-[#d9dbe2] bg-[#e6e7ee]/50"}`}
              >
                No upcoming topics.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {upcomingTopics.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} />
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>

      <div
        className={`${surfaceCard(isDarkMode)} shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3`}
      >
        <div className="text-[12px] sm:text-[13px] font-bold text-red-600 dark:text-red-400">
          Danger Zone
        </div>
        <button
          type="button"
          onClick={onRequestResetPlan}
          className={`${cleanSecondaryPill} w-full sm:w-auto py-2 px-4 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-[11px] font-black uppercase tracking-widest`}
        >
          Reset Entire Plan
        </button>
      </div>
    </motion.div>
  );
}
