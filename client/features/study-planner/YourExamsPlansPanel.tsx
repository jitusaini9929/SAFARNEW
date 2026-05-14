import { motion, AnimatePresence } from "framer-motion";
import { PremiumEmoji } from "@/components/PremiumEmoji";
import {
  STUDY_PLANNER_PRESSABLE_BUTTON,
  STUDY_PLANNER_PRESSABLE_CARD,
  STUDY_PLANNER_PRESSABLE_TEXT,
} from "@/features/study-planner/StudyPlannerQuickStart";

export interface StudyPlannerPlanSummary {
  id: string;
  title: string;
  examDate?: string;
  examType?: string;
  description?: string;
  subjectCount?: number;
  completionPercent?: number;
  totalTopics?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type YourExamsPlansPanelVariant = "page" | "embedded";

export function YourExamsPlansPanel({
  plans,
  variant,
  onOpenPlan,
  onNewPlan,
  onRequestDelete,
  onRefresh,
  planToDelete,
  onDismissDelete,
  onConfirmDelete,
  isDeletingPlan,
}: {
  plans: StudyPlannerPlanSummary[];
  variant: YourExamsPlansPanelVariant;
  onOpenPlan: (planId: string) => void;
  onNewPlan: () => void;
  onRequestDelete: (plan: StudyPlannerPlanSummary) => void;
  onRefresh?: () => void;
  planToDelete: StudyPlannerPlanSummary | null;
  onDismissDelete: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeletingPlan: boolean;
}) {
  const isEmbedded = variant === "embedded";
  const title = isEmbedded ? "Study Planner" : "Study Plans";
  const subtitle = isEmbedded
    ? "Plans, syllabus, calendar, settings, and insights in one place."
    : plans.length === 0
      ? "Create your first plan to get started."
      : `${plans.length} active plan${plans.length !== 1 ? "s" : ""}`;

  return (
    <div className={isEmbedded ? "" : "min-h-[80dvh] px-6 py-8 max-w-5xl mx-auto"}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div
          className={`flex flex-wrap items-end justify-between gap-4 ${isEmbedded ? "mb-6" : "mb-8"}`}
        >
          <div className="min-w-0 flex-1">
            <h1
              className={`font-bold text-[#0f172a] dark:text-white tracking-tight ${
                isEmbedded ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
              }`}
              style={{
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "-0.03em",
                wordSpacing: "0.1em",
              }}
            >
              {title}
            </h1>
            <p
              className={`text-[#64748b] dark:text-[#94a3b8] mt-1 ${
                isEmbedded ? "text-[13px] max-w-xl" : "text-[13px]"
              }`}
            >
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onRefresh ? (
              <button
                type="button"
                onClick={() => onRefresh()}
                className={`px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 ${STUDY_PLANNER_PRESSABLE_BUTTON}`}
              >
                Refresh
              </button>
            ) : null}
            <button
              type="button"
              onClick={onNewPlan}
              className={`rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] ${STUDY_PLANNER_PRESSABLE_BUTTON} ${
                isEmbedded ? "px-5 py-2.5 text-[13px]" : "px-6 py-3 text-[14px]"
              }`}
            >
              {isEmbedded ? "+ New" : "+ New Plan"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan, idx) => {
            const daysLeft = plan.examDate
              ? Math.ceil(
                  (new Date(plan.examDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                )
              : null;
            const percent = plan.completionPercent ?? 0;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                onClick={() => onOpenPlan(plan.id)}
                className={`group cursor-pointer rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141518] hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg hover:scale-[1.01] relative ${STUDY_PLANNER_PRESSABLE_CARD}`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete(plan);
                  }}
                  className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-[12px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 ${STUDY_PLANNER_PRESSABLE_TEXT}`}
                >
                  Delete
                </button>

                {plan.examType && (
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#64748b] dark:text-[#94a3b8] mb-3 inline-block">
                    {plan.examType}
                  </span>
                )}

                <h3 className="text-[18px] font-bold text-[#0f172a] dark:text-white mb-1 pr-12">
                  {plan.title}
                </h3>

                {plan.description && (
                  <p className="text-[14px] text-[#64748b] dark:text-[#94a3b8] mb-3 line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8] mb-4">
                  {plan.subjectCount !== undefined && (
                    <span>
                      {plan.subjectCount} subject{plan.subjectCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {plan.totalTopics !== undefined && plan.totalTopics > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{plan.totalTopics} topics</span>
                    </>
                  )}
                  {daysLeft !== null && daysLeft > 0 && (
                    <>
                      <span>&middot;</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {daysLeft}d left
                      </span>
                    </>
                  )}
                  {daysLeft !== null && daysLeft <= 0 && (
                    <>
                      <span>&middot;</span>
                      <span className="text-red-500">
                        {daysLeft === 0 ? "Today!" : "Passed"}
                      </span>
                    </>
                  )}
                </div>

                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, percent)}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.06 + 0.3 }}
                    className={`h-full rounded-full ${
                      percent >= 100
                        ? "bg-emerald-500"
                        : percent >= 50
                          ? "bg-blue-500"
                          : "bg-amber-500"
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] font-bold text-[#64748b] dark:text-[#94a3b8]">
                    {Math.round(percent)}% complete
                  </span>
                  <span className="text-[12px] font-bold text-[#64748b] dark:text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </div>
              </motion.div>
            );
          })}

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: plans.length * 0.06 }}
            onClick={onNewPlan}
            className={`rounded-2xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:scale-[1.01] bg-white/50 dark:bg-[#141518]/50 text-left min-h-[180px] flex flex-col items-center justify-center ${STUDY_PLANNER_PRESSABLE_CARD}`}
          >
            <div className="text-4xl mb-3 opacity-60">+</div>
            <div className="text-[14px] font-bold text-[#0f172a] dark:text-white mb-1">
              Create New Plan
            </div>
            <div className="text-[13px] text-[#64748b] dark:text-[#94a3b8] text-center">
              JEE, NEET, SSC, Custom & more
            </div>
          </motion.button>
        </div>

        {plans.length === 0 && (
          <div className={`text-center ${isEmbedded ? "mt-10" : "mt-16"}`}>
            <PremiumEmoji name="library" alt="" className="h-16 w-16 mb-6 mx-auto opacity-80" />
            <h2
              className="text-2xl font-bold text-[#0f172a] dark:text-white mb-3"
              style={{
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "-0.03em",
                wordSpacing: "0.1em",
              }}
            >
              No plans yet
            </h2>
            <p className="text-[14px] text-[#64748b] dark:text-[#94a3b8] mb-6 max-w-sm mx-auto">
              {isEmbedded
                ? "Create one from an exam template or start with a custom syllabus."
                : "Pick an exam template and get a personalized study schedule in under a minute."}
            </p>
            <button
              type="button"
              onClick={onNewPlan}
              className={`px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[13px] font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] ${STUDY_PLANNER_PRESSABLE_BUTTON}`}
            >
              {isEmbedded ? "Create Plan" : "Get Started →"}
            </button>
            {!isEmbedded ? (
              <p className="text-[13px] text-[#64748b] mt-4">
                Pre-loaded syllabuses for JEE, NEET, SSC, Railway & more.
              </p>
            ) : null}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {planToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onDismissDelete}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141518] shadow-2xl p-7"
            >
              <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] mb-3">
                Delete Plan
              </div>
              <p className="text-[15px] font-bold mb-2 text-[#0f172a] dark:text-white">
                Are you sure you want to delete &quot;{planToDelete.title}&quot;?
              </p>
              <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] mb-7">
                This will permanently remove all subjects, chapters, topics, and schedule data. This
                action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onDismissDelete}
                  disabled={isDeletingPlan}
                  className={`px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 ${STUDY_PLANNER_PRESSABLE_BUTTON}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingPlan}
                  onClick={() => void onConfirmDelete()}
                  className={`px-5 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold uppercase tracking-widest shadow-md disabled:opacity-50 ${STUDY_PLANNER_PRESSABLE_BUTTON}`}
                >
                  {isDeletingPlan ? "Deleting..." : "Delete Plan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
