import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/utils/apiFetch";
import StudyPlanner from "../../sylaabus planner/StudyPlanner";

interface PlanSummary {
  id: string;
  title: string;
}

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId?: string }>();

  const [loading, setLoading] = useState(!planId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (planId) return;

    const bootstrap = async () => {
      try {
        setLoading(true);

        const listRes = await apiFetch("/api/plans", { method: "GET" });
        if (!listRes.ok) {
          const payload = await listRes.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to fetch plans");
        }

        const plans = (await listRes.json()) as PlanSummary[];
        if (plans.length > 0) {
          navigate(`/study/planner/${plans[0].id}`, { replace: true });
          return;
        }

        const createRes = await apiFetch("/api/plans", {
          method: "POST",
          body: JSON.stringify({
            title: "My Study Plan",
            description: "Syllabus Planner",
            dailyGoal: 3,
          }),
        });

        if (!createRes.ok) {
          const payload = await createRes.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to create starter plan");
        }

        const created = (await createRes.json()) as PlanSummary;
        navigate(`/study/planner/${created.id}`, { replace: true });
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
      <div className="flex items-center justify-center h-[70dvh] text-muted-foreground">
        Preparing your study planner...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!planId) {
    return (
      <div className="flex items-center justify-center h-[70dvh] text-muted-foreground">
        Loading planner...
      </div>
    );
  }

  return (
    <StudyPlanner planId={planId} />
  );
}
