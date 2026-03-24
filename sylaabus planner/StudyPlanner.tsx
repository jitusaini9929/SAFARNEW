import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../client/utils/apiFetch";
import PlannerSidebar from "../client/components/PlannerSidebar";
import LanguageToggle from "../client/components/LanguageToggle";
import ThemeToggle from "../client/components/ui/theme-toggle";
import { TourPrompt } from "../client/components/guided-tour";
import { studyPlannerTour } from "../client/components/guided-tour/tourSteps";

type TopicStatus = "todo" | "in_progress" | "done" | "revision_needed";
type PlannerView = "tree" | "kanban" | "calendar";

interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  plannedDate?: string;
  completedDate?: string;
  notes?: string;
}

interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

interface Subject {
  id: string;
  name: string;
  color: string;
  weeklyTarget?: number;
  monthlyTarget?: number;
  chapters: Chapter[];
}

interface Plan {
  id: string;
  title: string;
  examType?: string;
  examDate?: string;
  description?: string;
  dailyGoal?: number;
  offDays: number[];
  features: {
    isPremium: boolean;
    unlockedAt?: string;
  };
  subjects: Subject[];
  progress?: {
    totalTopics: number;
    doneTopics: number;
    completionPercent: number;
  };
}

interface CalendarItem {
  topicId: string;
  topicName: string;
  chapterName: string;
  subjectName: string;
  subjectColor: string;
  status: TopicStatus;
}

const BASE = "/api/plans";

async function plannerRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(url, init);
  if (!response.ok) {
    let message = "Planner request failed";
    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

const STATUS_UI: Record<TopicStatus, { label: string; color: string; bg: string }> = {
  todo: { label: "Not Started", color: "#a3aac4", bg: "#1c1b1c" },
  in_progress: { label: "In Progress", color: "#00e5ff", bg: "#00363d" },
  done: { label: "Done", color: "#0ea5e9", bg: "#001f24" },
  revision_needed: { label: "Revision", color: "#c180ff", bg: "#25005a" },
};

const EXAM_TYPE_OPTIONS = ["CGL", "CHSL", "GD", "MTS", "12th Boards", "NTPC", "JEE", "NEET", "UPSC", "CAT"];

function toIsoDateOnly(input: Date | string): string {
  return new Date(input).toISOString().split("T")[0];
}

function formatDate(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function dayDiff(dateStr?: string): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function flattenTopics(plan: Plan): Array<Topic & { subject: Subject; chapter: Chapter }> {
  const out: Array<Topic & { subject: Subject; chapter: Chapter }> = [];
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        out.push({ ...topic, subject, chapter });
      }
    }
  }
  return out;
}

function plannerProgress(plan: Plan) {
  let total = 0;
  let done = 0;
  for (const subject of plan.subjects) {
    for (const chapter of subject.chapters) {
      total += chapter.topics.length;
      done += chapter.topics.filter((t) => t.status === "done").length;
    }
  }
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

function chapterPercent(chapter: Chapter) {
  if (!chapter.topics.length) return 0;
  return Math.round((chapter.topics.filter((t) => t.status === "done").length / chapter.topics.length) * 100);
}

function subjectPercent(subject: Subject) {
  let total = 0;
  let done = 0;
  for (const chapter of subject.chapters) {
    total += chapter.topics.length;
    done += chapter.topics.filter((t) => t.status === "done").length;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function CalendarView({
  monthDate,
  calendar,
  onPickDate,
}: {
  monthDate: Date;
  calendar: Record<string, CalendarItem[]>;
  onPickDate: (iso: string) => void;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const firstDay = first.getDay(); // Sunday is 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const slots: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) slots.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) slots.push(d);

  const todayIso = toIsoDateOnly(new Date());

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-7 gap-4 px-2">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div key={day} className="text-center font-['Satoshi',sans-serif] text-[10px] font-bold text-[#8b919e] dark:text-[#acabaa] tracking-[0.3em]">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3 md:gap-4 p-4 rounded-3xl bg-[#e6e7ee] dark:bg-[#131313] shadow-[inset_0_2px_4px_0_rgba(166,171,189,0.4),inset_0_-1px_1px_0_rgba(255,255,255,1)] dark:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.6),inset_0_-1px_1px_0_rgba(255,255,255,0.05)] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] dark:bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:4px_4px]">
        {slots.map((value, idx) => {
          if (!value) {
            return (
              <div key={`empty-${idx}`} className="aspect-square rounded-2xl opacity-40 dark:opacity-20 border border-transparent flex items-start p-4 text-[#8b919e] dark:text-[#acabaa] font-['Satoshi',sans-serif] text-lg italic" />
            );
          }

          const iso = toIsoDateOnly(new Date(year, month, value));
          const items = calendar[iso] || [];
          const isToday = iso === todayIso;

          return (
            <motion.button
              whileHover={{ scale: 0.96 }}
              whileTap={{ scale: 0.94 }}
              key={iso}
              onClick={() => onPickDate(iso)}
              className={`aspect-square rounded-2xl shadow-lg relative group transition-colors text-left ${isToday
                  ? "bg-[#ffffff] dark:bg-[#252626] border-2 border-blue-500/50 dark:border-[#c3c7cd]/50 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_30px_-5px_rgba(195,199,205,0.2)]"
                  : "bg-[#f0f0f5] dark:bg-[#000000] border border-[#ffffff]/50 dark:border-[#484848]/10 hover:bg-[#ffffff] dark:hover:bg-[#1f2020]"
                }`}
            >
              {/* Inner container to clip overlapping items, but allow popover outside */}
              <div className="absolute inset-0 p-1.5 md:p-2.5 flex flex-col overflow-hidden rounded-2xl">
                <span className={`text-sm md:text-xl font-bold font-['Satoshi',sans-serif] ${isToday ? "text-[#2d333b] dark:text-[#e7e5e5]" : "text-[#4b5563] dark:text-[#acabaa]"}`}>
                  {value}
                </span>

                {/* Status dot indicator for days with tasks */}
                {items.length > 0 && (
                  <div className={`mt-auto flex justify-end ${isToday ? 'mb-4 md:mb-5' : ''}`}>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-[#c3c7cd] shadow-[0_0_8px_rgba(59,130,246,0.6)] dark:shadow-[0_0_8px_rgba(195,199,205,0.6)]"></div>
                  </div>
                )}

                {isToday && (
                  <div className="absolute bottom-0 left-0 right-0 bg-blue-500 dark:bg-[#c3c7cd] text-white dark:text-[#3c4146] text-[6px] md:text-[7px] font-black uppercase tracking-widest py-1 md:py-1.5 text-center rounded-none border-t border-white/20 dark:border-black/20 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
                    Today
                  </div>
                )}
              </div>

              {/* Hover Popover */}
              {items.length > 0 && (
                <div className="absolute left-[50%] -translate-x-[50%] bottom-[105%] w-[180%] min-w-[140px] max-w-[220px] z-[60] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-[#ffffff] dark:bg-[#1f2020] rounded-xl shadow-2xl border border-gray-200 dark:border-[#3b494c] p-2 md:p-3 flex-col gap-2 flex pointer-events-none">
                  <span className="text-[9px] md:text-[10px] font-bold text-[#4b5563] dark:text-[#acabaa] border-b border-gray-100 dark:border-[#3b494c] pb-1 mb-1 font-['Satoshi',sans-serif] uppercase tracking-wider">
                    {value} {monthDate.toLocaleString('default', { month: 'short' })}
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto w-full custom-scrollbar">
                    {items.map((item) => (
                      <div key={`popover-${item.topicId}`} className="bg-blue-100/50 dark:bg-[#dae2fd]/10 border border-blue-200/50 dark:border-[#dae2fd]/20 p-1.5 md:p-2 rounded-md break-words whitespace-normal">
                        <span className="text-[8px] md:text-[9px] font-bold text-blue-700 dark:text-[#ccd4ee] uppercase block leading-tight">
                          {item.topicName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default function StudyPlanner({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [calendar, setCalendar] = useState<Record<string, CalendarItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const [view, setView] = useState<PlannerView>("tree");
  const [monthDate, setMonthDate] = useState(new Date());

  const [examType, setExamType] = useState("");
  const [examDateDraft, setExamDateDraft] = useState("");
  const [isExamDateEditorOpen, setIsExamDateEditorOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState<Record<string, string>>({});
  const [topicName, setTopicName] = useState<Record<string, string>>({});
  const [topicDate, setTopicDate] = useState<Record<string, string>>({});
  const [pickedDay, setPickedDay] = useState<string>("");

  const summary = useMemo(() => (plan ? plannerProgress(plan) : { total: 0, done: 0, percent: 0 }), [plan]);
  const countdown = useMemo(() => dayDiff(plan?.examDate), [plan?.examDate]);
  const countdownLabel = useMemo(() => {
    if (countdown === null) return "Set Exam Date";
    if (countdown > 0) return `${countdown} Days Remaining`;
    if (countdown === 0) return "Exam is Today";
    return `${Math.abs(countdown)} Days Since Exam`;
  }, [countdown]);

  async function fetchPlan() {
    try {
      setLoading(true);
      const [planData, calendarData] = await Promise.all([
        plannerRequest<Plan>(`${BASE}/${planId}`),
        plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`),
      ]);

      setPlan(planData);
      setCalendar(calendarData || {});
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load planner");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPlan();
  }, [planId]);

  useEffect(() => {
    if (!plan) return;
    setExamType(plan.examType || "");
    setExamDateDraft(plan.examDate ? toIsoDateOnly(plan.examDate) : "");
  }, [plan]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const syncDarkMode = () => setIsDarkMode(root.classList.contains("dark"));
    syncDarkMode();

    const observer = new MutationObserver(syncDarkMode);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  async function updatePlanMeta(patch: Record<string, unknown>) {
    const data = await plannerRequest<Plan>(`${BASE}/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setPlan(data);
  }

  async function saveExamType() {
    const normalized = examType.trim();
    if (normalized === (plan?.examType || "")) return;
    try {
      await updatePlanMeta({ examType: normalized });
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to save exam type");
    }
  }

  async function saveExamDate() {
    const normalized = examDateDraft.trim();
    if (!normalized) {
      setError("Please choose a valid exam date");
      return;
    }
    if (normalized === (plan?.examDate || "")) {
      setIsExamDateEditorOpen(false);
      return;
    }
    try {
      await updatePlanMeta({ examDate: normalized });
      setError("");
      setIsExamDateEditorOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to save exam date");
    }
  }

  async function patchTopic(topicId: string, patch: Record<string, unknown>) {
    const data = await plannerRequest<Plan>(`${BASE}/${planId}/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
  }

  async function addSubject() {
    if (!subjectName.trim()) return;
    const palette = ["#0ea5e9", "#9333ea", "#16a34a", "#ef4444", "#f59e0b", "#0f766e"];
    const color = palette[(plan?.subjects.length || 0) % palette.length];
    const data = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects`,
      {
        method: "POST",
        body: JSON.stringify({ name: subjectName.trim(), color }),
      }
    );
    setPlan(data);
    setSubjectName("");
  }

  async function addChapter(subjectId: string) {
    const name = chapterName[subjectId]?.trim();
    if (!name) return;
    const data = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters`,
      {
        method: "POST",
        body: JSON.stringify({ name }),
      }
    );
    setPlan(data);
    setChapterName((prev) => ({ ...prev, [subjectId]: "" }));
  }

  async function addTopic(subjectId: string, chapterId: string) {
    const key = `${subjectId}:${chapterId}`;
    const name = topicName[key]?.trim();
    if (!name) return;

    const plannedDate = topicDate[key] || undefined;

    const data = await plannerRequest<Plan>(
      `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/topics`,
      {
        method: "POST",
        body: JSON.stringify({ name, plannedDate }),
      }
    );
    setPlan(data);
    setTopicName((prev) => ({ ...prev, [key]: "" }));
    setTopicDate((prev) => ({ ...prev, [key]: "" }));

    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
  }

  async function autoDistribute() {
    try {
      const data = await plannerRequest<{ plan: Plan }>(
        `${BASE}/${planId}/auto-distribute`,
        {
          method: "POST",
          body: JSON.stringify({ lockExistingDates: true, includeRevisionNeeded: false }),
        }
      );
      setPlan(data.plan);
      const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
      setCalendar(calendarData || {});
    } catch (err: any) {
      const rawMessage = String(err?.message || "Auto distribution failed");
      const safeMessage = /premium|paid/i.test(rawMessage)
        ? "Auto plan is temporarily unavailable for this account."
        : rawMessage;
      alert(safeMessage);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e6e7ee] dark:bg-[#131416] flex items-center justify-center p-6 text-[#3c4146] dark:text-[#e7e5e5] transition-colors duration-500">
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-16 h-16 rounded-full border-[6px] border-[#d9dbe2] dark:border-[#1a1c1e] border-t-blue-500 shadow-[inset_2px_2px_4px_rgba(166,171,189,0.3),4px_4px_8px_rgba(166,171,189,0.2)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),4px_4px_10px_rgba(0,0,0,0.6)]"
          />
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6b7280] dark:text-[#767575]">Waking System...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#e6e7ee] dark:bg-[#131416] flex items-center justify-center p-6 transition-colors duration-500">
        <div className="rounded-3xl p-8 bg-[#fef2f2] dark:bg-[#1f1315] border border-red-200 dark:border-red-900/50 shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)] dark:shadow-[8px_8px_20px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.02)]">
          <p className="text-red-600 dark:text-red-400 font-bold text-lg drop-shadow-sm">{error || "Plan not found"}</p>
        </div>
      </div>
    );
  }

  const topics = flattenTopics(plan);
  const kanban = {
    todo: topics.filter((t) => t.status === "todo"),
    in_progress: topics.filter((t) => t.status === "in_progress"),
    done: topics.filter((t) => t.status === "done"),
  };

  const selectedDayItems = pickedDay ? calendar[pickedDay] || [] : [];

  return (
    <>
      <PlannerSidebar />
      <div className="fixed top-6 right-6 z-[40] flex items-center gap-4">
        <div className="rounded-2xl bg-white/70 dark:bg-black/20 backdrop-blur-md px-4 py-2 shadow-[6px_6px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-slate-300 dark:border-white/20 scale-110 origin-right transition-all hover:scale-115">
          <LanguageToggle />
        </div>
        <div className="rounded-2xl bg-white/70 dark:bg-black/20 backdrop-blur-md p-1.5 shadow-[6px_6px_12px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-slate-300 dark:border-white/20 scale-110 origin-right transition-all hover:scale-115">
          <ThemeToggle />
        </div>
      </div>
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#E0F2FE] via-[#F5F3FF] to-[#FFF1F2] dark:from-[#131416] dark:via-[#131416] dark:to-[#131416] text-[#3c4146] dark:text-[#e7e5e5] font-['Poppins',sans-serif] overflow-x-hidden selection:bg-blue-500/30 transition-colors duration-500">

        {/* Noise Texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-0" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />

        <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">

          {/* Header Section */}
          <div data-tour="planner-header" className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-[#2d333b] dark:text-[#fcf9f8] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {plan.title}.
              </h1>
              <div data-tour="planner-countdown" className="inline-flex flex-wrap items-center gap-3">
                {countdown === null ? (
                  <button
                    onClick={() => setIsExamDateEditorOpen((prev) => !prev)}
                    className="bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] text-[20px] md:text-[22px] font-black uppercase tracking-[0.1em] px-8 py-3 rounded-full shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8),0_6px_14px_rgba(0,0,0,0.12)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)] border border-[#c0c4d1] dark:border-[#252626] transition-transform hover:scale-[1.03]"
                    title="Set your exam date"
                  >
                    Set Exam Date
                  </button>
                ) : (
                  <>
                    <span className="bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] text-[10px] font-extrabold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#252626]">
                      {countdownLabel}
                    </span>
                    <button
                      onClick={() => setIsExamDateEditorOpen((prev) => !prev)}
                      className="bg-[#e6e7ee] dark:bg-[#202225] text-[#2d333b] dark:text-[#e7e5e5] text-[10px] font-extrabold uppercase tracking-[0.15em] px-4 py-2 rounded-full border border-[#c0c4d1] dark:border-[#2b2c2c] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                      title="Edit exam date"
                    >
                      Update Date
                    </button>
                  </>
                )}
              </div>

              {isExamDateEditorOpen && (
                <div className="mt-4 inline-flex flex-wrap items-center gap-3 rounded-2xl bg-[#f0f0f5] dark:bg-[#1a1c1e] px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]">
                  <input
                    type="date"
                    value={examDateDraft}
                    onChange={(e) => setExamDateDraft(e.target.value)}
                    className="text-sm font-bold bg-[#d9dbe2] dark:bg-[#0e0e0e] border border-slate-300 dark:border-[#252626] rounded-xl px-4 py-2 text-[#4b5563] dark:text-[#e7e5e5] focus:outline-none shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]"
                  />
                  <button
                    onClick={() => { void saveExamDate(); }}
                    className="bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white text-[10px] font-extrabold uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl shadow-[0_4px_10px_rgba(37,99,235,0.35)]"
                  >
                    Save Date
                  </button>
                  <button
                    onClick={() => {
                      setExamDateDraft(plan?.examDate ? toIsoDateOnly(plan.examDate) : "");
                      setIsExamDateEditorOpen(false);
                    }}
                    className="bg-[#e6e7ee] dark:bg-[#202225] text-[#2d333b] dark:text-[#e7e5e5] text-[10px] font-extrabold uppercase tracking-[0.15em] px-4 py-2 rounded-xl border border-[#c0c4d1] dark:border-[#2b2c2c]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div data-tour="planner-metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8 mb-12">
            {/* Completion */}
            <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] group">
              <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Completion</div>
              <div className="text-4xl font-extrabold text-[#2d333b] dark:text-[#e7e5e5] mb-5 drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{summary.percent}%</div>

              {/* Recessed Progress Bar Tray */}
              <div className="h-2 w-full bg-[#d9dbe2] dark:bg-[#0e0e0e] rounded-full overflow-hidden shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] mt-auto p-[1.5px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${summary.percent}%` }}
                  transition={{ duration: 1.5, type: "spring" }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_2px_4px_rgba(59,130,246,0.4)]"
                />
              </div>
            </div>

            {/* Topics Done */}
            <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#ffffff] dark:border-[#2b2c2c]">
              <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Topics Done</div>
              <div className="text-4xl font-extrabold text-[#2d333b] dark:text-[#e7e5e5] flex items-baseline gap-2 mt-auto drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                {summary.done} <span className="text-base text-[#8b919e] dark:text-[#767575] font-['Poppins',sans-serif] font-bold">/ {summary.total}</span>
              </div>
            </div>

            {/* Daily Goal */}
            <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#ffffff] dark:border-[#2b2c2c]">
              <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Daily Target</div>
              <div className="text-4xl font-extrabold text-[#2d333b] dark:text-[#e7e5e5] flex items-baseline gap-2 mt-auto drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                {plan.dailyGoal || 3} <span className="text-base text-[#8b919e] dark:text-[#767575] font-['Poppins',sans-serif] font-bold">topics</span>
              </div>
            </div>

            {/* Planned This Month */}
            <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#ffffff] dark:border-[#2b2c2c]">
              <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Planned (Month)</div>
              <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-auto drop-shadow-[0_2px_4px_rgba(59,130,246,0.2)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {topics.filter((t) => t.plannedDate?.startsWith(toIsoDateOnly(monthDate).slice(0, 7))).length}
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-12">

            {/* Hardware Toggle Switch for Views */}
            <div data-tour="planner-view-toggle" className="flex p-1.5 rounded-full transition-colors duration-500 bg-[#d9dbe2] dark:bg-[#0e0e0e] shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#1a1c1e] w-full md:w-auto">
              {([
                ["tree", "Planner"],
                ["kanban", "Kanban"],
                ["calendar", "Log"],
              ] as Array<[PlannerView, string]>).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setView(value)}
                  className={`relative px-6 py-2.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.15em] transition-all duration-300 z-10 flex-1 md:flex-none ${view === value
                      ? "text-[#2d333b] dark:text-[#e7e5e5]"
                      : "text-[#8b919e] dark:text-[#767575] hover:text-[#4b5563] dark:hover:text-[#acabaa]"
                    }`}
                >
                  {view === value && (
                    <motion.div
                      layoutId="viewToggle"
                      className="absolute inset-0 rounded-full bg-[#f0f0f5] dark:bg-[#202225] shadow-[2px_2px_4px_rgba(166,171,189,0.4),-2px_-2px_4px_rgba(255,255,255,0.9),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.6),-1px_-1px_3px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 0.985 }}
              whileTap={{ scale: 0.96 }}
              onClick={autoDistribute}
              data-tour="planner-autoplan"
              className="md:ml-auto w-full md:w-auto rounded-full px-8 py-3.5 font-bold tracking-[0.15em] text-[11px] uppercase transition-all duration-300
              bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white
              shadow-[0_4px_10px_rgba(37,99,235,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.2)]
              dark:from-[#1d4ed8] dark:to-[#1e3a8a] dark:shadow-[0_6px_15px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-4px_8px_rgba(0,0,0,0.4)]
              active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]
            "
              title="Auto distribute pending topics"
            >
              Run Auto-Plan
            </motion.button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl p-4 bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]">
              {error}
            </div>
          )}

          {view === "tree" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="flex flex-col gap-8"
            >
              {/* Configure Setup Tray */}
              <div data-tour="planner-setup-tray" className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-[#8b919e] dark:text-[#767575] flex items-center gap-2 drop-shadow-sm">
                  <span className="w-2 h-2 bg-[#8b919e] dark:bg-[#565555] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.8)]" />
                  Syllabus Planner Array
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <input
                      list="planner-exam-type-options"
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      onBlur={() => { void saveExamType(); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveExamType(); } }}
                      placeholder="Exam Engine Protocol (e.g., UPSC, JEE)"
                      data-tour="planner-exam-input"
                      className="w-full bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#e7e5e5] placeholder-[#8b919e] dark:placeholder-[#565555] rounded-xl px-5 py-3.5 focus:outline-none shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-[#e6e7ee] dark:border-[#1a1c1e] text-sm font-bold transition-all focus:shadow-[inset_4px_4px_8px_rgba(166,171,189,0.7),inset_-4px_-4px_8px_rgba(255,255,255,0.9),0_0_0_2px_rgba(59,130,246,0.3)]"
                    />
                    <datalist id="planner-exam-type-options">
                      {EXAM_TYPE_OPTIONS.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>

                  <input
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Initialize New Subject"
                    data-tour="planner-subject-input"
                    className="flex-1 bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#e7e5e5] placeholder-[#8b919e] dark:placeholder-[#565555] rounded-xl px-5 py-3.5 focus:outline-none shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-[#e6e7ee] dark:border-[#1a1c1e] text-sm font-bold transition-all focus:shadow-[inset_4px_4px_8px_rgba(166,171,189,0.7),inset_-4px_-4px_8px_rgba(255,255,255,0.9),0_0_0_2px_rgba(59,130,246,0.3)]"
                  />

                  <motion.button
                    whileHover={{ scale: 0.97 }} whileTap={{ scale: 0.94 }}
                    onClick={addSubject}
                    data-tour="planner-add-subject"
                    className="bg-[#e6e7ee] dark:bg-[#202225] text-[#2d333b] dark:text-[#e7e5e5] font-extrabold uppercase tracking-[0.15em] text-[11px] rounded-xl px-8 py-3.5 shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#ffffff] dark:border-[#2b2c2c] active:shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.5)] dark:active:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.02)] transition-all"
                  >
                    Inject
                  </motion.button>
                </div>
              </div>

              <div data-tour="planner-subjects-area" className="flex flex-col gap-6">
              {plan.subjects.map((subject) => (
                <div key={subject.id} className="rounded-3xl overflow-hidden transition-colors duration-500 bg-[#e6e7ee] dark:bg-[#131416] shadow-[8px_8px_16px_rgba(166,171,189,0.3),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] mb-6">

                  {/* Subject Header Tray */}
                  <div className="p-5 md:p-8 bg-[#f0f0f5] dark:bg-[#1a1c1e] border-b border-[#d9dbe2] dark:border-[#252626] relative z-10 shadow-[0_4px_8px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.2)]">

                    {/* Physical Color Band Indicator */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2.5 shadow-[inset_1px_0_2px_rgba(255,255,255,0.6)]"
                      style={{ backgroundColor: subject.color }}
                    />

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pl-4 relative z-10">
                      <strong className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#2d333b] dark:text-[#fcf9f8] drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{subject.name}</strong>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#4b5563] dark:text-[#acabaa] bg-[#d9dbe2] dark:bg-[#0e0e0e] px-4 py-1.5 rounded-full shadow-[inset_1px_1px_3px_rgba(166,171,189,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#252626]">
                          {subjectPercent(subject)}% SYNCED
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pl-4 flex flex-col sm:flex-row gap-4 relative z-10">
                      <input
                        value={chapterName[subject.id] || ""}
                        onChange={(e) => setChapterName((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                        placeholder="Initialize Chapter Module..."
                        className="flex-1 bg-[#d9dbe2] dark:bg-[#0e0e0e] border border-[#e6e7ee] dark:border-[#1a1c1e] text-sm font-bold rounded-xl px-5 py-3 text-[#4b5563] dark:text-[#e7e5e5] placeholder-[#8b919e] dark:placeholder-[#565555] focus:outline-none shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] transition-all"
                      />
                      <motion.button
                        whileHover={{ scale: 0.97 }} whileTap={{ scale: 0.95 }}
                        onClick={() => addChapter(subject.id)}
                        className="font-black tracking-[0.15em] uppercase text-[10px] rounded-xl px-6 py-3 shadow-[0_4px_8px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.4)] text-white"
                        style={{ background: `linear-gradient(135deg, ${subject.color}, #00000050)` }}
                      >
                        Add Chapter
                      </motion.button>
                    </div>
                  </div>

                  {/* Chapters Container List */}
                  <div className="p-5 md:p-8 flex flex-col gap-8 bg-[#e6e7ee] dark:bg-[#131416]">
                    {subject.chapters.map((chapter) => {
                      const key = `${subject.id}:${chapter.id}`;

                      return (
                        <div key={chapter.id} className="border border-[#c0c4d1] dark:border-[#2b2c2c] rounded-2xl p-5 md:p-6 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[6px_6px_12px_rgba(166,171,189,0.3),-6px_-6px_12px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[6px_6px_16px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-colors duration-500">

                          <div className="flex justify-between items-center mb-6 border-b border-[#d9dbe2] dark:border-[#252626] pb-4">
                            <strong className="text-xl md:text-2xl font-bold text-[#2d333b] dark:text-[#fcf9f8] drop-shadow-sm">{chapter.name}</strong>
                            <span className="text-[10px] font-black text-[#8b919e] dark:text-[#767575] bg-[#d9dbe2] dark:bg-[#0e0e0e] px-3 py-1 rounded-lg border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.5)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8)] tracking-widest">{chapterPercent(chapter)}% COMPLETED</span>
                          </div>

                          <div className="grid gap-4 mb-6">
                            {chapter.topics.map((topic) => (
                              <div key={topic.id} className="flex flex-col lg:flex-row lg:items-center gap-4 py-3 px-4 rounded-xl bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_2px_2px_6px_rgba(166,171,189,0.4),inset_-2px_-2px_6px_rgba(255,255,255,0.6)] dark:shadow-[inset_2px_2px_8px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)] transition-colors">

                                <div className="flex items-center gap-4 flex-1">
                                  <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => patchTopic(topic.id, { status: topic.status === "done" ? "todo" : "done" })}
                                    className="w-6 h-6 flex-shrink-0 rounded-[4px] flex items-center justify-center transition-all cursor-pointer shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)] border border-transparent"
                                    style={{
                                      backgroundColor: topic.status === "done" ? subject.color : "transparent",
                                      borderColor: topic.status === "done" ? "transparent" : "#a6abbd", // dynamic border fallback
                                    }}
                                  >
                                    {topic.status === "done" && <span className="text-white text-[10px] font-black leading-none drop-shadow-md">✓</span>}
                                  </motion.button>

                                  <span className={`text-base font-bold leading-snug drop-shadow-sm transition-opacity duration-300 ${topic.status === "done" ? "line-through text-[#8b919e] dark:text-[#565555] opacity-60" : "text-[#3c4146] dark:text-[#e7e5e5]"}`}>
                                    {topic.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 lg:ml-auto ml-10">

                                  {/* Recessed Date Input */}
                                  <input
                                    type="date"
                                    value={topic.plannedDate ? toIsoDateOnly(topic.plannedDate) : ""}
                                    onChange={(e) => patchTopic(topic.id, { plannedDate: e.target.value || "" })}
                                    className="text-[11px] font-bold bg-[#d9dbe2] dark:bg-[#0e0e0e] border border-slate-300 dark:border-[#252626] rounded-lg px-3 py-2 text-[#6b7280] dark:text-[#acabaa] focus:outline-none shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] transition-colors cursor-pointer"
                                  />

                                  {/* Physical Status Indicator */}
                                  <div className="relative">
                                    <select
                                      value={topic.status}
                                      onChange={(e) => patchTopic(topic.id, { status: e.target.value })}
                                      className="text-[10px] font-black tracking-widest uppercase border border-white dark:border-[#2b2c2c] rounded-lg px-3 py-2 focus:outline-none transition-colors appearance-none cursor-pointer shadow-[2px_2px_4px_rgba(166,171,189,0.3),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.6),-1px_-1px_2px_rgba(255,255,255,0.02)] pr-8"
                                      style={{
                                        backgroundColor: isDarkMode ? STATUS_UI[topic.status].bg : "#e6e7ee",
                                        color: STATUS_UI[topic.status].color,
                                      }}
                                    >
                                      {Object.entries(STATUS_UI).map(([value, ui]) => (
                                        <option key={value} value={value} style={{ background: isDarkMode ? "#131416" : "#e6e7ee", color: ui.color }}>
                                          {ui.label}
                                        </option>
                                      ))}
                                    </select>
                                    {/* Custom arrow to emulate physical dial cut */}
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Topic Tray */}
                          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#d9dbe2] dark:border-[#252626]">
                            <input
                              value={topicName[key] || ""}
                              onChange={(e) => setTopicName((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Inject New Topic Detail..."
                              className="flex-1 text-sm font-bold bg-[#d9dbe2] dark:bg-[#0e0e0e] border border-slate-300 dark:border-[#252626] rounded-xl px-5 py-3 text-[#4b5563] dark:text-[#e7e5e5] placeholder-[#8b919e] dark:placeholder-[#565555] focus:outline-none shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] transition-all"
                            />
                            <input
                              type="date"
                              value={topicDate[key] || ""}
                              onChange={(e) => setTopicDate((prev) => ({ ...prev, [key]: e.target.value }))}
                              className="text-sm font-bold bg-[#d9dbe2] dark:bg-[#0e0e0e] border border-slate-300 dark:border-[#252626] rounded-xl px-4 py-3 text-[#6b7280] dark:text-[#acabaa] focus:outline-none shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] transition-all cursor-pointer"
                            />
                            <motion.button
                              whileHover={{ scale: 0.97 }} whileTap={{ scale: 0.95 }}
                              onClick={() => addTopic(subject.id, chapter.id)}
                              className="text-[11px] font-extrabold uppercase tracking-widest rounded-xl px-6 py-3 bg-[#e6e7ee] dark:bg-[#202225] text-[#2d333b] dark:text-[#e7e5e5] border border-slate-300 dark:border-[#2b2c2c] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all"
                            >
                              Push Topic
                            </motion.button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              </div>
            </motion.div>
          )}

          {view === "kanban" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {([
                ["todo", "Queue"],
                ["in_progress", "Active"],
                ["done", "Completed"],
              ] as Array<["todo" | "in_progress" | "done", string]>).map(([status, title]) => {
                const neonClass = status === "todo" ? "dark:shadow-[0_0_8px_#3b82f6] border-blue-500" :
                  status === "in_progress" ? "dark:shadow-[0_0_8px_#f59e0b] border-amber-500" :
                    "dark:shadow-[0_0_8px_#10b981] border-emerald-500";
                const textClass = status === "todo" ? "text-blue-600" :
                  status === "in_progress" ? "text-amber-600" :
                    "text-emerald-700";

                return (
                  <div
                    key={status}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      const topicId = e.dataTransfer.getData("topic-id");
                      if (!topicId) return;
                      await patchTopic(topicId, { status });
                    }}
                    className="rounded-xl min-h-[700px] p-4 flex flex-col gap-4 transition-colors duration-500
                bg-[#e6e7ee] dark:bg-[linear-gradient(45deg,#191a1a_0%,#252626_100%)]
                shadow-[inset_4px_4px_8px_rgba(166,171,189,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]
                dark:shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.8)]
                border border-slate-300 dark:border-transparent relative
              "
                  >
                    <div className="flex justify-between items-center mb-4 px-2 pt-2">
                      <h3 className="font-['Satoshi',sans-serif] text-sm font-bold uppercase tracking-widest text-[#4b5563] dark:text-[#acabaa]">
                        {title}
                      </h3>
                      <span className="text-[10px] font-bold bg-[#ffffff] dark:bg-[#252626] px-2 py-0.5 rounded-full text-[#4b5563] dark:text-[#c3c7cd] shadow-sm dark:shadow-none">
                        {kanban[status].length < 10 && kanban[status].length > 0 ? `0${kanban[status].length}` : kanban[status].length}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1 relative">
                      <AnimatePresence>
                        {kanban[status].map((topic) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            key={topic.id}
                            draggable
                            onDragStart={(e: any) => e.dataTransfer.setData("topic-id", topic.id)}
                            className={`rounded-lg p-4 cursor-grab active:cursor-grabbing transform transition-all hover:-translate-y-1 bg-[#fcf9f8] dark:bg-[#e7e5e5] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8),0_4px_10px_-2px_rgba(0,0,0,0.6)] ${status === 'done' ? (isDarkMode ? 'grayscale-[0.2] hover:grayscale-0 opacity-80 hover:opacity-100' : 'opacity-80 hover:opacity-100') : ''} border-l-[4px] ${neonClass}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest truncate max-w-[80%]">
                                {topic.subject.name}
                              </span>
                              <div className="w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center -mt-1 -mr-1" style={{ backgroundColor: topic.subject.color + "40" }}>
                                <div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: topic.subject.color }}></div>
                              </div>
                            </div>

                            <h4 className="text-neutral-900 font-bold text-sm mb-2 leading-snug drop-shadow-sm">{topic.name}</h4>

                            <p className="text-[11px] text-neutral-600 mb-4 line-clamp-2 font-medium">{topic.chapter.name}</p>

                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-bold">
                                {topic.plannedDate ? (
                                  <span className="flex items-center gap-1 bg-neutral-200/60 px-2 py-1 rounded-md">
                                    📅 {formatDate(topic.plannedDate)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2 py-1">

                                  </span>
                                )}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${textClass} px-2 py-1 bg-neutral-200/50 rounded-md`}>
                                {STATUS_UI[topic.status].label}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {kanban[status].length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8b919e]/50 dark:text-[#565555]">Drop Zone Target</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

          {view === "calendar" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex justify-between items-center rounded-3xl px-8 py-5 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <motion.button
                    whileHover={{ scale: 0.95 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] transition-colors"
                    title="Previous Month"
                  >
                    ◀
                  </motion.button>

                  <strong className="text-2xl font-extrabold text-[#2d333b] dark:text-[#fcf9f8] tracking-widest uppercase drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </strong>

                  <motion.button
                    whileHover={{ scale: 0.95 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] transition-colors"
                    title="Next Month"
                  >
                    ▶
                  </motion.button>
                </div>

                <CalendarView monthDate={monthDate} calendar={calendar} onPickDate={setPickedDay} />
              </div>

              <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] h-fit flex flex-col gap-6 sticky top-8">
                <div className="border-b border-[#d9dbe2] dark:border-[#252626] pb-5 text-center">
                  <strong className="block text-xl font-extrabold text-[#2d333b] dark:text-[#fcf9f8] mb-2 drop-shadow-sm uppercase tracking-widest">Selected Log</strong>
                  <div className="text-[11px] font-black tracking-widest text-blue-600 dark:text-blue-400 bg-[#e6e7ee] dark:bg-[#131416] inline-block px-4 py-2 rounded-lg border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_1px_1px_3px_rgba(166,171,189,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]">
                    {pickedDay ? new Date(pickedDay).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : "AWAITING SELECTION"}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {selectedDayItems.map((item) => (
                    <div key={item.topicId} className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_2px_2px_6px_rgba(166,171,189,0.4),inset_-2px_-2px_6px_rgba(255,255,255,0.6)] dark:shadow-[inset_2px_2px_8px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)] transition-colors">
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <strong className="text-[13px] font-bold text-[#3c4146] dark:text-[#e7e5e5] leading-snug drop-shadow-sm">{item.topicName}</strong>
                        <span
                          className="text-[9px] whitespace-nowrap px-2.5 py-1 rounded-md font-black tracking-widest shadow-[0_2px_3px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                          style={{
                            color: STATUS_UI[item.status].color,
                            background: isDarkMode ? STATUS_UI[item.status].bg : "#d9dbe2",
                            border: `1px solid ${STATUS_UI[item.status].color}30`
                          }}
                        >
                          {STATUS_UI[item.status].label}
                        </span>
                      </div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                        {item.subjectName} <span className="text-[#d9dbe2] dark:text-[#252626] mx-1">·</span> {item.chapterName}
                      </div>
                    </div>
                  ))}

                  {pickedDay && selectedDayItems.length === 0 && (
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#8b919e] dark:text-[#565555] text-center py-10 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.3)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
                      NO MODULES SCHEDULED
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <TourPrompt tour={studyPlannerTour} featureName="Syllabus Planner" />
    </>
  );
}
