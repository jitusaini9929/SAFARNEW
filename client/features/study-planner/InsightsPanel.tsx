import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type InsightTrackStatus =
  | "on_track"
  | "at_risk"
  | "behind"
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
  recommendationLines: string[];
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
    className:
      "bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
  },
  at_risk: {
    label: "At risk",
    className:
      "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400",
  },
  behind: {
    label: "Behind",
    className:
      "bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400",
  },
  ahead: {
    label: "Ahead",
    className:
      "bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-400",
  },
  needs_data: {
    label: "Set exam date",
    className:
      "bg-muted text-muted-foreground border-border",
  },
};

function subjectMeterGradient(subjectIndex: number, totalSubjects: number) {
  const n = Math.max(1, totalSubjects);
  const hue = (subjectIndex * (360 / n)) % 360;
  const h2 = (hue + 28) % 360;
  return `linear-gradient(to right, hsl(${hue} 72% 52%), hsl(${h2} 82% 44%))`;
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
  let className = "text-muted-foreground";

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
        text = `You need about ${s.requiredTopicsPerStudyDay.toFixed(1)} topics per study day to finish on time.`;
      }
      break;
    case "buffer":
      if (s.daysBuffer == null) {
        text =
          "Finish more planned days to see how many buffer days you have before the exam.";
      } else if (s.daysBuffer >= 0) {
        text = `${s.daysBuffer} study-day buffer before the exam — room to breathe.`;
        className = "text-primary font-semibold";
      } else {
        text = `Behind by ${-s.daysBuffer} study days — accelerate pace or reschedule topics.`;
        className = "text-destructive font-semibold";
      }
      break;
    default:
      text = "";
  }

  return (
    <p className={cn("text-xs leading-snug", className)} key={focus}>
      {text}
    </p>
  );
}

export function InsightsPanel({
  planId,
  plan,
  insights,
  rollup,
}: {
  planId: string;
  plan: {
    dailyGoal?: number;
    subjects: Array<{ id: string }>;
  };
  insights: PlannerInsights;
  rollup: { doneTopics: number; totalTopics: number };
}) {
  const [focus, setFocus] = useState<InsightSummaryFocus>("complete");
  const dailyGoal = Math.max(1, plan.dailyGoal || 1);
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

  const doneFraction =
    rollup.totalTopics > 0 ? rollup.doneTopics / rollup.totalTopics : 0;
  const remainingCount = Math.max(
    0,
    rollup.totalTopics - rollup.doneTopics,
  );

  const badge = INSIGHT_BADGE[s.onTrackStatus];

  const paceValue =
    s.requiredTopicsPerStudyDay == null
      ? "—"
      : s.requiredTopicsPerStudyDay.toFixed(1);
  const examValue =
    s.daysUntilExam == null ? "—" : `${s.daysUntilExam}d`;
  const bufferValue =
    s.daysBuffer == null
      ? "—"
      : s.daysBuffer >= 0
        ? `+${s.daysBuffer}d`
        : `${s.daysBuffer}d`;

  const doneBarHighlight = focus === "bar_done";
  const remBarHighlight = focus === "bar_remaining";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest",
                badge.className,
              )}
            >
              {badge.label}
            </Badge>
            <span className="truncate text-sm font-bold sm:text-base">
              {s.remainingTopics} topics left
            </span>
          </div>

          {rollup.totalTopics <= 0 ? (
            <p className="text-xs text-muted-foreground">No topics yet</p>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                className={cn(
                  "relative h-12 w-full overflow-hidden rounded-2xl border text-left transition-colors",
                  remBarHighlight
                    ? "border-muted-foreground/40 bg-neutral-300 dark:bg-neutral-600"
                    : "border-transparent bg-neutral-200 dark:bg-neutral-700",
                )}
                onClick={() => setFocus("bar_remaining")}
                aria-label="Remaining portion"
              >
                <motion.div
                  layout
                  className={cn(
                    "absolute inset-y-0 left-0 z-[1] rounded-l-2xl bg-gradient-to-r from-green-600 to-green-500",
                    doneBarHighlight && "from-green-500 to-emerald-400",
                  )}
                  initial={false}
                  animate={{ width: `${doneFraction * 100}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocus("bar_done");
                  }}
                  role="presentation"
                />
                <div className="pointer-events-none relative z-[2] flex h-full items-center justify-between px-3">
                  <span className="text-xs font-bold text-neutral-900 drop-shadow-sm dark:text-neutral-100">
                    {s.completionPercent}% done
                  </span>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    {remainingCount} left
                  </span>
                </div>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                {
                  key: "complete" as const,
                  label: "Complete",
                  value: `${s.completionPercent}%`,
                },
                { key: "exam" as const, label: "Exam", value: examValue },
                {
                  key: "pace" as const,
                  label: "Pace/day",
                  value: paceValue,
                },
                {
                  key: "buffer" as const,
                  label: "Buffer",
                  value: bufferValue,
                },
              ] as const
            ).map((pill) => (
              <Button
                key={pill.key}
                type="button"
                size="sm"
                variant={focus === pill.key ? "default" : "secondary"}
                className="h-auto flex-col gap-0.5 py-2.5 text-center"
                onClick={() => setFocus(pill.key)}
              >
                <span className="text-base font-extrabold leading-none">
                  {pill.value}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">
                  {pill.label}
                </span>
              </Button>
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
        </CardContent>
      </Card>

      <div className="space-y-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
          Coverage
        </h3>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">
          Subjects
        </p>
      </div>

      <div className="space-y-2">
        {insights.subjectRows.map((row) => {
          const colorIdx =
            subjectIndexById[row.subjectId] ?? 0;
          const fill = subjectMeterGradient(colorIdx, subjectCount);
          return (
            <Card key={row.subjectId} className="border-border/80 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.subjectName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {row.remainingTopics} left · {row.overdueTopics} overdue ·{" "}
                    {row.revisionTopics} revision
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <div className="h-2 w-[108px] overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${row.completionPercent}%`,
                        background:
                          row.color && row.color.startsWith("#")
                            ? row.color
                            : fill,
                      }}
                    />
                  </div>
                  <span className="min-w-[2.25rem] text-end text-sm font-bold text-primary">
                    {row.completionPercent}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recommendations</CardTitle>
          <CardDescription className="text-xs">
            Based on your current plan and schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {insights.recommendationLines.map((line, i) => (
            <p
              key={`${i}-${line.slice(0, 24)}`}
              className="text-[13px] leading-relaxed text-foreground/90"
            >
              <span className="mr-1 text-muted-foreground">•</span>
              {line}
            </p>
          ))}
        </CardContent>
      </Card>
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
  if (requiredPerDay <= dailyGoal * 1.15) return "at_risk";
  if (requiredPerDay > dailyGoal * 1.15) return "behind";
  return "on_track";
}

/** Mirrors `PlannerInsightsCalculator.buildRecommendations` (Android). */
export function buildAndroidRecommendationLines(
  summary: PlannerInsightsSummary,
  overloadDays: number,
  overdueTotal: number,
  unplannedUnfinished: number,
  remainingTopicCount: number,
): string[] {
  const out: string[] = [];
  if (remainingTopicCount === 0) {
    out.push(
      "Plan complete — keep revision cadence if exams are still ahead.",
    );
  }
  if (summary.daysBuffer != null && summary.daysBuffer < 0) {
    out.push(
      "Forecast finishes after your exam date — raise daily pace or reschedule.",
    );
  }
  if (overloadDays >= 3) {
    out.push(
      "Several upcoming days look overloaded — redistribute topics from Syllabus or reschedule.",
    );
  }
  if (overdueTotal > 0) {
    out.push(`Clear ${overdueTotal} overdue topics first (Today tab).`);
  }
  if (unplannedUnfinished > 0) {
    out.push(
      `${unplannedUnfinished} topics still need dates — run Build Schedule or assign manually.`,
    );
  }
  if (out.length === 0) {
    out.push(
      "Stay consistent with your daily goal and review Insights after schedule changes.",
    );
  }
  return [...new Set(out)];
}
