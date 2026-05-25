import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import StudyPlanner from "@/features/study-planner/StudyPlanner";
import { QuickStart } from "@/features/study-planner/StudyPlannerQuickStart";
import {
  YourExamsPlansPanel,
  type StudyPlannerPlanSummary,
} from "@/features/study-planner/YourExamsPlansPanel";

type PlannerSection =
  | "your-exams"
  | "syllabus"
  | "calendar"
  | "plan"
  | "insights";

function normalizeSection(section?: string): PlannerSection {
  if (section === "today") {
    return "plan";
  }
  if (
    section === "your-exams" ||
    section === "syllabus" ||
    section === "calendar" ||
    section === "plan" ||
    section === "insights"
  ) {
    return section;
  }
  return "plan";
}

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const { planId, section } = useParams<{ planId?: string; section?: string }>();
  const resolvedSection = normalizeSection(section);

  const [loading, setLoading] = useState(!planId);
  const [error, setError] = useState("");
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [plans, setPlans] = useState<StudyPlannerPlanSummary[]>([]);
  const [planToDelete, setPlanToDelete] = useState<StudyPlannerPlanSummary | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  useEffect(() => {
    if (!planId) return;
    if (section === resolvedSection) return;
    navigate(`/study/planner/${planId}/${resolvedSection}`, { replace: true });
  }, [planId, section, resolvedSection, navigate]);

  useEffect(() => {
    if (planId) return;

    const bootstrap = async () => {
      try {
        setLoading(true);

        const listRes = await apiFetch(`${API_BASE}/plans`, { method: "GET" });
        if (!listRes.ok) {
          const payload = await listRes.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to fetch plans");
        }

        const list = (await listRes.json()) as StudyPlannerPlanSummary[];
        setPlans(list);
      } catch (err: any) {
        setError(err?.message || "Unable to open planner");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [planId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70dvh]">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-12 h-12 rounded-full border-[4px] border-slate-200 dark:border-slate-700 border-t-blue-500"
          />
          <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[#94a3b8]">
            Preparing your planner...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-red-600 dark:text-red-400 font-bold">
        {error}
      </div>
    );
  }

  if (!planId) {
    if (showQuickStart) {
      return (
        <QuickStart
          onCancel={() => setShowQuickStart(false)}
          onComplete={(id) => navigate(`/study/planner/${id}/syllabus`, { replace: true })}
        />
      );
    }

    return (
      <YourExamsPlansPanel
        plans={plans}
        variant="page"
        onOpenPlan={(id) => navigate(`/study/planner/${id}/plan`)}
        onNewPlan={() => setShowQuickStart(true)}
        onRequestDelete={setPlanToDelete}
        planToDelete={planToDelete}
        onDismissDelete={() => setPlanToDelete(null)}
        onConfirmDelete={async () => {
          if (!planToDelete) return;
          setIsDeletingPlan(true);
          try {
            const res = await apiFetch(`${API_BASE}/plans/${planToDelete.id}`, {
              method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete plan");
            setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
            setPlanToDelete(null);
          } catch {
            // Stay on modal
          } finally {
            setIsDeletingPlan(false);
          }
        }}
        isDeletingPlan={isDeletingPlan}
      />
    );
  }

  return <StudyPlanner planId={planId} initialView={resolvedSection} />;
}
