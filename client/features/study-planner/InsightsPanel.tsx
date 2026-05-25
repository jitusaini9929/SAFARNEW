import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type InsightTrackStatus =
  | "on_track"
  | "at_risk"
  | "behind"
  | "broken"
  | "ahead"
  | "needs_data";

export interface PlannerInsightsSummary {
  completionPercent: number;
  remainingTopics: number;
  daysUntilExam: number | null;
  availableStudyDays: number | null;
  requiredTopicsPerStudyDay: number | null;
  onTrackStatus: InsightTrackStatus;
  forecastCompletionDate: string | null;
  daysBuffer: number | null;
  scheduleCoveragePercent: number | null;
}

export interface PlannerInsightSubjectRow {
  subjectId: string;
  subjectName: string;
  color: string;
  completionPercent: number;
  remainingTopics: number;
  overdueTopics: number;
  revisionTopics: number;
  scheduledTopics: number;
}

export interface PlannerInsights {
  summary: PlannerInsightsSummary;
  subjectRows: PlannerInsightSubjectRow[];
}

export type RecommendationActionTone = "primary" | "secondary";

export interface PlannerRecommendationAction {
  label: string;
  onClick: () => void;
  tone?: RecommendationActionTone;
}

export interface PlannerRecommendation {
  id: string;
  title: string;
  message: string;
  action: PlannerRecommendationAction;
}

type InsightSummaryFocus =
  | "bar_done"
  | "bar_remaining"
  | "complete"
  | "exam"
  | "pace"
  | "buffer";

const INSIGHT_BADGE: Record<
  InsightTrackStatus,
  { label: string; className: string }
> = {
  on_track: {
    label: "On track",
    className: "bg-[#d1fae5] text-[#047857] border-[#a7f3d0]",
  },
  at_risk: {
    label: "Tight Schedule",
    className: "bg-[#fef08a] text-[#854d0e] border-[#fde047]",
  },
  behind: {
    label: "Overloaded",
    className: "bg-[#ffdad6] text-[#ba1a1a] border-[#fecaca]",
  },
  broken: {
    label: "Broken Plan",
    className: "bg-[#ba1a1a] text-white border-[#93000a]",
  },
  ahead: {
    label: "Ahead",
    className: "bg-[#d8e2ff] text-[#004493] border-[#adc7ff]",
  },
  needs_data: {
    label: "Set exam date",
    className: "bg-[#eceeef] text-[#727785] border-[#c1c6d6]",
  },
};

function subjectBarColor(
  subjectIndex: number,
  totalSubjects: number,
  hex?: string,
) {
  if (hex && hex.startsWith("#")) return hex;
  const n = Math.max(1, totalSubjects);
  const hue = (subjectIndex * (360 / n)) % 360;
  return `hsl(${hue} 72% 52%)`;
}

function InsightSummaryCaption({
  focus,
  insights,
  rollup,
}: {
  focus: InsightSummaryFocus;
  insights: PlannerInsights;
  rollup: { doneTopics: number; totalTopics: number };
}) {
  const s = insights.summary;
  const remaining = Math.max(0, rollup.totalTopics - rollup.doneTopics);

  let text: string;
  let className = "text-[#727785] dark:text-[#94a3b8]";

  switch (focus) {
    case "bar_done":
      text = `Done: ${rollup.doneTopics} topics marked complete.`;
      break;
    case "bar_remaining":
      text = `Remaining: ${remaining} topics still to finish.`;
      break;
    case "complete":
      text = `${s.completionPercent}% of your syllabus is complete (${rollup.doneTopics} / ${rollup.totalTopics} topics).`;
      break;
    case "exam":
      if (s.daysUntilExam == null) {
        text = "Set an exam date in Plan to see the countdown.";
      } else {
        text = `Exam is in ${s.daysUntilExam} day${s.daysUntilExam === 1 ? "" : "s"}.`;
      }
      break;
    case "pace":
      if (s.requiredTopicsPerStudyDay == null) {
        text = "Add topics and an exam date to estimate daily pace.";
      } else {
        text = `You need about ${Math.round(s.requiredTopicsPerStudyDay)} topics per study day to finish on time.`;
      }
      break;
    case "buffer":
      if (s.daysBuffer == null) {
        text =
          "Finish more planned days to see how many buffer days you have before the exam.";
        text = `You have ${s.daysBuffer} spare days before the exam \u2014 room to breathe.`;
        className = "text-[#005bbf] dark:text-[#adc7ff] font-semibold";
      } else {
        text = `You are running ${-s.daysBuffer} days short \u2014 accelerate pace or reschedule topics.`;
        className = "text-[#ba1a1a] dark:text-[#fca5a5] font-semibold";
      }
      break;
    default:
      text = "";
  }

  return (
    <p className={cn("text-xs leading-snug text-center", className)} key={focus}>
      {text}
    </p>
  );
}

function RecommendationIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-[#727785] mt-0.5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

const insightCard =
  "rounded-[24px] border border-[#e6e8e9] dark:border-[#2e3338] bg-white dark:bg-[#141618] shadow-[0_2px_10px_rgba(0,0,0,0.03)]";

export function InsightsPanel({
  planId,
  plan,
  insights,
  rollup,
  recommendations,
}: {
  planId: string;
  plan: {
    dailyGoal?: number;
    subjects: Array<{ id: string }>;
  };
  insights: PlannerInsights;
  rollup: { doneTopics: number; totalTopics: number };
  recommendations: PlannerRecommendation[];
}) {
  const [focus, setFocus] = useState<InsightSummaryFocus>("complete");
  const s = insights.summary;

  useEffect(() => {
    setFocus("complete");
  }, [planId]);

  const subjectIndexById = useMemo(() => {
    return Object.fromEntries(
      [...plan.subjects]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((sub, index) => [sub.id, index]),
    );
  }, [plan.subjects]);

  const subjectCount = Math.max(1, plan.subjects.length);
  const remainingCount = Math.max(0, rollup.totalTopics - rollup.doneTopics);
  const badge = INSIGHT_BADGE[s.onTrackStatus];
  const progressFill = Math.min(100, Math.max(2, s.completionPercent));

  const paceValue =
    s.requiredTopicsPerStudyDay == null
      ? "\u2014"
      : Math.round(s.requiredTopicsPerStudyDay).toString();
  const examValue = s.daysUntilExam == null ? "\u2014" : `${s.daysUntilExam}d`;
  const bufferValue =
    s.daysBuffer == null
      ? "\u2014"
      : `${Math.abs(s.daysBuffer)}d`;
  const bufferIsNegative = s.daysBuffer != null && s.daysBuffer < 0;
  const bufferLabel = bufferIsNegative ? "Shortfall" : "Spare Days";

  const statTiles = [
    {
      key: "complete" as const,
      label: "Complete",
      value: `${s.completionPercent}%`,
      primary: true,
    },
    { key: "exam" as const, label: "Exam", value: examValue, primary: false },
    { key: "pace" as const, label: "Pace/Day", value: paceValue, primary: false },
    {
      key: "buffer" as const,
      label: bufferLabel,
      value: bufferValue,
      primary: false,
      danger: bufferIsNegative,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full"
    >
      {/* Progress hero */}
      <div
        className={`${insightCard} md:col-span-2 lg:col-span-2 flex flex-col justify-between min-h-[280px] p-6`}
      >
        <div>
          <div className="flex justify-between items-center mb-6">
            <span
              className={cn(
                "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border",
                badge.className,
              )}
            >
              {badge.label}
            </span>
            <span className="text-base font-medium text-[#191c1d] dark:text-[#f1f5f9]">
              {s.remainingTopics} topics left
            </span>
          </div>

          {rollup.totalTopics <= 0 ? (
            <p className="text-sm text-[#727785]">No topics yet</p>
          ) : (
            <button
              type="button"
              className="relative w-full h-10 rounded-xl bg-[#eceeef] dark:bg-[#2e3338] overflow-hidden mb-6 flex items-center px-4 text-left"
              onClick={() =>
                setFocus((f) =>
                  f === "bar_remaining" ? "bar_done" : "bar_remaining",
                )
              }
              aria-label="Toggle progress breakdown"
            >
              <div
                className="absolute left-0 top-0 h-full bg-[#1a73e8]/25 dark:bg-[#1a73e8]/35 transition-all duration-500"
                style={{ width: `${progressFill}%` }}
              />
              <div className="relative z-10 flex justify-between w-full">
                <span className="text-sm font-bold text-[#191c1d] dark:text-[#f1f5f9]">
                  {s.completionPercent}% done
                </span>
                <span className="text-sm text-[#414754] dark:text-[#94a3b8]">
                  {remainingCount} left
                </span>
              </div>
            </button>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {statTiles.map((tile) => (
              <button
                key={tile.key}
                type="button"
                onClick={() => setFocus(tile.key)}
                className={cn(
                  "rounded-xl p-4 flex flex-col items-center justify-center transition-all",
                  tile.primary
                    ? "bg-[#005bbf] text-white shadow-sm"
                    : "bg-[#f2f4f5] dark:bg-[#1c1f22] border border-[#e1e3e4] dark:border-[#2e3338]",
                  focus === tile.key &&
                    !tile.primary &&
                    "ring-2 ring-[#005bbf]/40",
                )}
              >
                <span
                  className={cn(
                    "text-2xl font-bold leading-none",
                    tile.danger
                      ? "text-[#ba1a1a]"
                      : tile.primary
                        ? "text-white"
                        : "text-[#191c1d] dark:text-[#f1f5f9]",
                  )}
                >
                  {tile.value}
                </span>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider mt-1",
                    tile.primary
                      ? "text-white/80"
                      : "text-[#727785] dark:text-[#94a3b8]",
                  )}
                >
                  {tile.label}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={focus}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <InsightSummaryCaption
                focus={focus}
                insights={insights}
                rollup={rollup}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Recommendations */}
      <div
        className={`${insightCard} md:col-span-2 lg:col-span-2 flex flex-col p-6`}
      >
        <h3 className="text-base font-bold text-[#191c1d] dark:text-[#f1f5f9] mb-1">
          Next best actions
        </h3>
        <p className="text-sm text-[#727785] dark:text-[#94a3b8] mb-6">
          Based on your current plan and pace
        </p>
        <ul className="space-y-4 mt-auto">
          {recommendations.map((rec) => (
            <li
              key={rec.id}
              className="flex flex-col gap-4 p-4 rounded-xl bg-[#f2f4f5] dark:bg-[#1c1f22] border border-[#e1e3e4] dark:border-[#2e3338]"
            >
              <div className="flex items-start gap-4">
                <RecommendationIcon />
                <div>
                  <div className="text-sm font-semibold text-[#191c1d] dark:text-[#e2e8f0]">
                    {rec.title}
                  </div>
                  <p className="text-sm text-[#4b5563] dark:text-[#94a3b8] leading-relaxed">
                    {rec.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={rec.action.onClick}
                className={`self-start rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-widest transition-colors ${
                  rec.action.tone === "secondary"
                    ? "border border-[#c1c6d6] bg-white text-[#1f2937] hover:bg-[#f8fafb] dark:border-[#3d444d] dark:bg-[#1c1f22] dark:text-[#e2e8f0] dark:hover:bg-[#25292e]"
                    : "bg-[#005bbf] text-white shadow-[0_4px_14px_rgba(0,91,191,0.28)] hover:bg-[#004da3]"
                }`}
              >
                {rec.action.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Coverage header */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2 -mb-1">
        <h2 className="text-xs uppercase text-[#727785] tracking-widest mb-1">
          Coverage
        </h2>
        <h3 className="text-sm font-bold text-[#414754] dark:text-[#94a3b8] uppercase">
          Subjects
        </h3>
      </div>

      {/* Subject cards */}
      {insights.subjectRows.map((row) => {
        const colorIdx = subjectIndexById[row.subjectId] ?? 0;
        const barColor = subjectBarColor(
          colorIdx,
          subjectCount,
          row.color,
        );
        const fill = Math.min(100, Math.max(2, row.completionPercent));
        return (
          <div
            key={row.subjectId}
            className={`${insightCard} md:col-span-1 lg:col-span-1 flex flex-col justify-between gap-6 min-h-[160px] p-6 hover:shadow-[0_4px_12px_rgba(26,115,232,0.08)] transition-shadow`}
          >
            <div>
              <h4 className="text-base font-bold text-[#191c1d] dark:text-[#f1f5f9] mb-2 leading-tight">
                {row.subjectName}
              </h4>
              <p className="text-xs text-[#727785] dark:text-[#94a3b8]">
                {row.remainingTopics} left · {row.overdueTopics} overdue ·{" "}
                {row.revisionTopics} revision
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-auto">
              <span className="text-sm font-bold text-[#005bbf]">
                {row.completionPercent}%
              </span>
              <div className="w-full bg-[#eceeef] dark:bg-[#2e3338] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${fill}%`, background: barColor }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

/** Mirrors `PlannerInsightsCalculator.computeOnTrackStatus` (Android). */
export function computeAndroidOnTrackStatus(
  requiredPerDay: number | null | undefined,
  dailyGoal: number,
  daysBuffer: number | null,
  remaining: number,
): InsightTrackStatus {
  if (remaining === 0) return "on_track";
  if (requiredPerDay == null || daysBuffer == null) return "needs_data";
  if (requiredPerDay <= dailyGoal && (daysBuffer ?? 0) >= 0) return "on_track";
  if (requiredPerDay <= dailyGoal * 1.5) return "at_risk";
  if (requiredPerDay <= dailyGoal * 2.5) return "behind";
  return "broken";
}

