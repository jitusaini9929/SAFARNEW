import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { GoalInsightsPanel } from "@/components/analytics/GoalInsightsPanel";
import { FocusAnalyticsPanel } from "@/components/analytics/FocusAnalyticsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { dataService } from "@/utils/dataService";
import { ekagraAnalyticsService } from "@/services/ekagraAnalyticsService";
import { getGoalAnchorDateKey, getGoalCompletedDate, isGoalCompleted, UIGoal } from "@/utils/goalUtils";
import { getISTDateKey } from "@/utils/dateUtils";
import { EkagraAnalyticsStats, Goal, MonthlyReport } from "@shared/api";
import {
  BarChart3,
  Brain,
  Calendar,
  ChevronRight,
  Heart,
  Medal,
  RefreshCw,
  Search,
  Target,
  Zap,
  Clock,
  ListChecks,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ChartErrorBoundary from "@/components/charts/ChartErrorBoundary";

const AnalyticsRadarChart = lazy(() => import("@/components/charts/AnalyticsRadarChart"));

type AnalyticsTab = "overview" | "goals" | "focus" | "sessions" | "monthly";

const tabs: { id: AnalyticsTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "goals", label: "Goals", icon: Target },
  { id: "focus", label: "Focus", icon: Clock },
  { id: "sessions", label: "Sessions", icon: ListChecks },
  { id: "monthly", label: "Monthly Review", icon: Calendar },
];

const achievementImages: Record<string, string> = {
  G001: "/Achievments/Badges/Badge (1).webp",
  G002: "/Achievments/Badges/Badge (2).webp",
  G003: "/Achievments/Badges/Badge (3).webp",
  G004: "/Achievments/Badges/Badge (4).webp",
  F001: "/Achievments/Badges/Special_Badge (2).webp",
  F002: "/Achievments/Badges/Special_Badge (5).webp",
  F003: "/Achievments/Badges/Special_Badge (4).webp",
  F004: "/Achievments/Badges/Badge (6).webp",
  F005: "/Achievments/Badges/Badge (7).webp",
  S001: "/Achievments/Badges/Badge (8).webp",
  S002: "/Achievments/Badges/Special_Badge (1).webp",
  ET006: "/Achievments/Badges/Special_Badge (3).webp",
  T005: "/Achievments/Titles/Title (5).webp",
  T006: "/Achievments/Titles/Title (3).webp",
  T007: "/Achievments/Titles/Title (7).webp",
  T008: "/Achievments/Titles/Title (6).webp",
  T001: "/Achievments/Titles/Title (8).webp",
  T002: "/Achievments/Titles/Title (2).webp",
  T003: "/Achievments/Titles/Title (1).webp",
  T004: "/Achievments/Titles/Title (4).webp",
  ET001: "/Achievments/Titles/Special_Title (3).webp",
  ET002: "/Achievments/Titles/Special_Title (2).webp",
  ET003: "/Achievments/Titles/Special_Title (1).webp",
  ET004: "/Achievments/Titles/Special_Title (4).webp",
  ET005: "/Achievments/Titles/Special_Title (5).webp",
  T009: "/Achievments/svgviewer-output.svg",
};

const intensityClass = (intensity: number) => {
  if (intensity >= 4) return "bg-emerald-600 scale-110 shadow-lg shadow-emerald-500/20";
  if (intensity === 3) return "bg-emerald-500 scale-105";
  if (intensity === 2) return "bg-emerald-400";
  if (intensity === 1) return "bg-emerald-200 opacity-60";
  return "bg-muted/50";
};

const formatMinutes = (value: number | null | undefined) => {
  const minutes = Math.max(0, Math.round(Number(value || 0)));
  if (minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

function MetricCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[28px] border bg-card p-6 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focusStats, setFocusStats] = useState<EkagraAnalyticsStats | null>(null);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notGenerated, setNotGenerated] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const activeTab = useMemo<AnalyticsTab>(() => {
    const requested = searchParams.get("tab") as AnalyticsTab | null;
    return tabs.some((tab) => tab.id === requested) ? requested! : "overview";
  }, [searchParams]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const monthLabel = useMemo(() => {
    const source = month || report?.month;
    if (!source) return "Latest review";
    if (source === "last-30-days") return "Last 30 days";
    if (source === "all-time") return "All time";

    if (source.startsWith("range:")) {
      const [start, end] = source.replace("range:", "").split("..");
      if (start && end) {
        const startDate = new Date(`${start}T00:00:00Z`);
        const endDate = new Date(`${end}T00:00:00Z`);
        if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
          return `${startDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
        }
      }
    }

    const [year, monthNum] = source.split("-");
    const date = new Date(Number(year), Number(monthNum) - 1, 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [month, report?.month]);

  const loadReport = async (targetMonth?: string) => {
    try {
      setLoading(true);
      setNotGenerated(false);
      const data = await dataService.getMonthlyReport(targetMonth);
      setReport(data);
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("not generated")) {
        setNotGenerated(true);
        setReport(null);
      } else {
        toast.error(message || "Failed to load monthly review");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContext = async () => {
    try {
      const [goalsData, focusData, achievementData] = await Promise.all([
        dataService.getGoals(),
        ekagraAnalyticsService.getEkagraAnalytics(),
        dataService.getAllAchievements(),
      ]);
      setGoals(goalsData || []);
      setFocusStats(focusData);
      setAchievements(achievementData.achievements || []);
    } catch (error) {
      console.error("Failed to fetch analytics context", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadReport();
    fetchContext();
  }, [user?.id]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const data = await dataService.generateMonthlyReport(month || undefined);
      setReport(data);
      setNotGenerated(false);
      toast.success("Monthly review generated");
    } catch (error: any) {
      toast.error(error?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const setTab = (tab: AnalyticsTab) => {
    setSearchParams({ tab });
  };

  const overview = useMemo(() => {
    const todayKey = getISTDateKey(new Date());
    const uiGoals = goals as UIGoal[];
    const todaysGoals = uiGoals.filter((goal) => {
      if (getGoalAnchorDateKey(goal) === todayKey) return true;
      const completedDate = getGoalCompletedDate(goal);
      return completedDate && getISTDateKey(completedDate) === todayKey;
    });
    const completedToday = todaysGoals.filter((goal) => isGoalCompleted(goal)).length;
    const focusTodayMinutes = Math.round(
      (focusStats?.focusSessions || [])
        .filter((session) => session.startedAt && getISTDateKey(new Date(session.startedAt)) === todayKey)
        .reduce((sum, session) => sum + Number(session.actualMinutes || 0), 0),
    );

    return {
      completedToday,
      todaysGoalCount: todaysGoals.length,
      focusTodayMinutes,
      monthlyScore: report?.executiveSummary?.consistencyScore ?? null,
      completionRate: report?.executiveSummary?.completionRate ?? null,
      focusDepth: report?.executiveSummary?.focusDepth ?? null,
      mainProblem: report?.insights?.sundayScaries?.message || "Generate a monthly review to surface the main pattern.",
    };
  }, [focusStats?.focusSessions, goals, report]);

  if (!user) return null;

  const earnedAchievements = achievements.filter((achievement) => achievement.earned).slice(0, 3);

  return (
    <NishthaLayout userName={user?.name} userAvatar={user?.avatar}>
      <div className="flex-1 bg-background p-6 font-sans animate-in fade-in duration-700 md:p-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="space-y-2">
              <h1 className="flex items-center gap-4 text-4xl font-black tracking-tight md:text-5xl">
                <div className="rounded-[20px] bg-primary p-3 shadow-xl shadow-primary/20">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                Analytics
              </h1>
              <p className="pl-1 text-lg font-bold text-muted-foreground md:text-xl">
                One home for progress patterns, session history, and monthly reflection.
              </p>
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto rounded-[24px] border bg-muted/40 p-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-[18px] px-4 py-3 text-sm font-black transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "overview" && (
            <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Focus Today"
                  value={formatMinutes(overview.focusTodayMinutes)}
                  sub="Ekagra focus completed today"
                  icon={Clock}
                />
                <MetricCard
                  label="Goals Today"
                  value={`${overview.completedToday}/${overview.todaysGoalCount}`}
                  sub="Completed against today's goals"
                  icon={Target}
                />
                <MetricCard
                  label="Consistency"
                  value={overview.monthlyScore === null ? "-" : `${overview.monthlyScore}%`}
                  sub={`${monthLabel} preview`}
                  icon={Zap}
                />
                <MetricCard
                  label="Focus Depth"
                  value={overview.focusDepth === null ? "-" : `${overview.focusDepth}m/day`}
                  sub="From the monthly review"
                  icon={Brain}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="rounded-[32px] border bg-card p-8 shadow-sm lg:col-span-7">
                  <h2 className="text-xl font-black">Progress Summary</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This is the quick read. Use Goals, Focus, Sessions, and Monthly Review for deeper analysis.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button onClick={() => setTab("goals")} className="cursor-pointer rounded-2xl border bg-muted/20 p-4 text-left hover:bg-muted/40">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Goals</p>
                      <p className="mt-2 text-sm font-semibold">Completion, rollover, and goal type patterns.</p>
                    </button>
                    <button onClick={() => setTab("focus")} className="cursor-pointer rounded-2xl border bg-muted/20 p-4 text-left hover:bg-muted/40">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Focus</p>
                      <p className="mt-2 text-sm font-semibold">Saved focus time, breaks, and goal-linked focus.</p>
                    </button>
                    <button onClick={() => setTab("sessions")} className="cursor-pointer rounded-2xl border bg-muted/20 p-4 text-left hover:bg-muted/40">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sessions</p>
                      <p className="mt-2 text-sm font-semibold">The exact work log behind your focus time.</p>
                    </button>
                  </div>
                </div>

                <div className="rounded-[32px] border bg-card p-8 shadow-sm lg:col-span-5">
                  <h2 className="text-xl font-black">Main Pattern</h2>
                  <p className="mt-4 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
                    {overview.mainProblem}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("monthly")}
                    className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/15"
                  >
                    Open Monthly Review <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "goals" && <GoalInsightsPanel goals={goals} />}
          {activeTab === "focus" && <FocusAnalyticsPanel view="focus" />}
          {activeTab === "sessions" && <FocusAnalyticsPanel view="sessions" />}

          {activeTab === "monthly" && (
            <MonthlyReview
              report={report}
              loading={loading}
              notGenerated={notGenerated}
              generating={generating}
              month={month}
              monthLabel={monthLabel}
              earnedAchievements={earnedAchievements}
              isClient={isClient}
              t={t}
              onMonthChange={setMonth}
              onLoad={() => loadReport(month || undefined)}
              onGenerate={handleGenerate}
              onAchievements={() => navigate("/achievements")}
            />
          )}
        </div>
      </div>
    </NishthaLayout>
  );
}

function MonthlyReview({
  report,
  loading,
  notGenerated,
  generating,
  month,
  monthLabel,
  earnedAchievements,
  isClient,
  t,
  onMonthChange,
  onLoad,
  onGenerate,
  onAchievements,
}: {
  report: MonthlyReport | null;
  loading: boolean;
  notGenerated: boolean;
  generating: boolean;
  month: string;
  monthLabel: string;
  earnedAchievements: any[];
  isClient: boolean;
  t: any;
  onMonthChange: (month: string) => void;
  onLoad: () => void;
  onGenerate: () => void;
  onAchievements: () => void;
}) {
  return (
    <section className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 rounded-[32px] border bg-card p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-black">Monthly Review</h2>
          <p className="text-sm font-medium text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
            <input
              type="month"
              value={month}
              onChange={(event) => onMonthChange(event.target.value)}
              className="rounded-[20px] border-2 border-transparent bg-background py-3.5 pl-11 pr-6 text-sm font-bold outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/5"
            />
          </div>
          <button
            type="button"
            onClick={onLoad}
            className="flex cursor-pointer items-center gap-2 rounded-[20px] border-2 bg-background px-6 py-3.5 text-sm font-bold shadow-sm transition-all hover:border-primary/50 active:scale-95"
          >
            <Search className="h-4 w-4" /> {t("analytics.load")}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="flex cursor-pointer items-center gap-3 rounded-[20px] bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : t("analytics.generate")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="animate-pulse text-xs font-black uppercase tracking-widest text-muted-foreground">Loading review...</p>
        </div>
      ) : notGenerated ? (
        <div className="space-y-6 rounded-[40px] border-2 border-dashed bg-card p-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted/50">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black">No review for {monthLabel}</h3>
            <p className="font-medium text-muted-foreground">Generate a monthly review when you are ready to reflect.</p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="cursor-pointer rounded-2xl bg-primary px-12 py-4 font-black text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            {t("analytics.generate_now")}
          </button>
        </div>
      ) : report ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { label: t("analytics.consistency_score"), val: `${report.executiveSummary.consistencyScore}%`, msg: report.executiveSummary.consistencyMessage, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: t("analytics.completion_rate"), val: `${report.executiveSummary.completionRate}%`, msg: report.executiveSummary.completionMessage, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: t("analytics.focus_depth"), val: `${report.executiveSummary.focusDepth}m/day`, msg: report.executiveSummary.focusMessage, icon: Brain, color: "text-blue-500", bg: "bg-blue-500/10" },
            ].map((stat) => (
              <div key={stat.label} className="group relative overflow-hidden rounded-[32px] border-2 bg-card p-8 shadow-sm">
                <stat.icon className={`absolute -bottom-6 -right-6 h-16 w-16 ${stat.color} opacity-5 transition-transform duration-500 group-hover:scale-110`} />
                <div className="relative z-10 space-y-4">
                  <div className={`w-fit rounded-2xl p-3 ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-black tracking-tight">{stat.val}</p>
                  </div>
                  <p className="border-l-2 pl-3 text-xs font-medium italic leading-relaxed text-muted-foreground">{stat.msg}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="flex flex-col overflow-hidden rounded-[40px] border-2 bg-card p-8 shadow-sm lg:col-span-12 xl:col-span-7 xl:p-12">
              <div className="mb-10 flex items-center justify-between">
                <h3 className="flex items-center gap-3 text-xl font-black">
                  <div className="h-6 w-1.5 rounded-full bg-primary" /> {t("analytics.skill_radar")}
                </h3>
                <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Multidimensional Performance</span>
              </div>
              <div className="min-h-[400px] flex-1">
                {isClient ? (
                  <ChartErrorBoundary>
                    <Suspense fallback={<div className="h-full w-full" />}>
                      <AnalyticsRadarChart data={report.radar} />
                    </Suspense>
                  </ChartErrorBoundary>
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-12 xl:col-span-5">
              <div className="rounded-[40px] border-2 bg-card p-8 shadow-sm">
                <h3 className="mb-6 flex items-center justify-between font-black">
                  {t("analytics.heatmap")} <span className="text-[9px] uppercase tracking-widest text-muted-foreground">30 Day Density</span>
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {report.heatmap.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.date} | intensity ${cell.intensity}`}
                      className={`h-5 w-5 cursor-help rounded-md ring-primary/30 transition-all duration-300 hover:ring-2 ${intensityClass(cell.intensity)}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-6 rounded-[40px] border-2 bg-card p-8 shadow-sm">
                <h3 className="flex items-center justify-between font-black">
                  {t("analytics.insights")} <div className="rounded-xl bg-muted p-2"><Brain className="h-4 w-4 text-indigo-500" /></div>
                </h3>
                <div className="space-y-4">
                  {[
                    { label: t("analytics.power_hour"), msg: report.insights.powerHour.message, icon: Zap, color: "text-amber-500" },
                    { label: t("analytics.mood_connection"), msg: report.insights.moodConnection.message, icon: Heart, color: "text-rose-500" },
                    { label: t("analytics.sunday_scaries"), msg: report.insights.sundayScaries.message, icon: Brain, color: "text-blue-500" },
                  ].map((insight) => (
                    <div key={insight.label} className="rounded-2xl border-2 border-transparent bg-muted/20 p-5 transition-all hover:border-primary/10">
                      <div className="mb-2 flex items-center gap-3">
                        <insight.icon className={`h-4 w-4 ${insight.color}`} />
                        <p className="text-[10px] font-black uppercase tracking-widest">{insight.label}</p>
                      </div>
                      <p className="text-xs font-medium leading-relaxed tracking-tight text-muted-foreground">{insight.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[40px] border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-teal-500/5 p-10 shadow-sm">
            <div className="relative z-10">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="flex items-center gap-3 text-xl font-black">
                  <Medal className="h-5 w-5 text-primary" /> Achievements
                </h3>
                <button
                  type="button"
                  onClick={onAchievements}
                  className="flex cursor-pointer items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary transition-all hover:gap-2"
                >
                  Collect Rewards <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              {earnedAchievements.length === 0 ? (
                <div className="space-y-3 py-10 text-center">
                  <Medal className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                  <p className="text-sm font-bold text-muted-foreground">Unlock your first achievement soon.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {earnedAchievements.map((badge) => (
                    <div key={badge.id} className="flex items-center gap-4 rounded-[28px] border-2 border-primary/20 bg-card p-6 shadow-lg transition-all hover:scale-[1.02]">
                      <div className="relative h-12 w-12 shrink-0">
                        {achievementImages[badge.id] ? (
                          <img src={achievementImages[badge.id]} alt={badge.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                            <Medal className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="line-clamp-1 text-sm font-black tracking-tight">{badge.name}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase leading-none text-emerald-500">Collected</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
