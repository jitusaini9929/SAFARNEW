import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "../client/utils/apiFetch";
import PlannerSidebar from "../client/components/PlannerSidebar";
import LanguageToggle from "../client/components/LanguageToggle";
import ThemeToggle from "../client/components/ui/theme-toggle";
import { TourPrompt } from "../client/components/guided-tour";
import { studyPlannerTour } from "../client/components/guided-tour/tourSteps";

type TopicStatus = "todo" | "in_progress" | "done" | "revision_needed";
type PlannerSection = "today" | "plan" | "syllabus" | "calendar";
type PlannerView = PlannerSection | "kanban";

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

const STATUS_UI: Record<TopicStatus, { label: string; color: string; bg: string; darkColor?: string; darkBg?: string }> = {
  todo: { label: "Not Started", color: "#64748b", bg: "#f1f5f9", darkColor: "#94a3b8", darkBg: "#1e293b" },
  in_progress: { label: "In Progress", color: "#00b8d4", bg: "#e0f7fa", darkColor: "#00e5ff", darkBg: "#00363d" },
  done: { label: "Done", color: "#0284c7", bg: "#e0f2fe", darkColor: "#0ea5e9", darkBg: "#001f24" },
  revision_needed: { label: "Needs Revision", color: "#9333ea", bg: "#f3e8ff", darkColor: "#c180ff", darkBg: "#25005a" },
};

const EXAM_TYPE_OPTIONS = ["CGL", "CHSL", "GD", "MTS", "12th Boards", "NTPC", "JEE", "NEET", "UPSC", "CAT"];

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  "todo": "Your Study Queue. Topics you haven't started yet. Drag items here to prioritize your upcoming work.",
  "in_progress": "Active Learning. Topics you are currently studying. Focus on these modules to stay on schedule.",
  "done": "Study Archive. Successfully completed topics. Great progress! Your achievements are logged here.",
};

function toIsoDateOnly(input: Date | string): string {
  return new Date(input).toISOString().split("T")[0];
}

function formatDate(input?: string): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function splitTopicLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function daysBetweenDateKeys(startKey: string, endKey: string): number {
  const start = new Date(startKey);
  const end = new Date(endKey);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function findNextAvailableDate(start: Date, offDays: number[]): string {
  const offDaysSet = new Set(offDays);
  const cursor = new Date(start);
  for (let i = 0; i < 366; i += 1) {
    if (!offDaysSet.has(cursor.getDay())) {
      return toIsoDateOnly(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return toIsoDateOnly(start);
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
  offDays,
  todayIso,
}: {
  monthDate: Date;
  calendar: Record<string, CalendarItem[]>;
  onPickDate: (iso: string) => void;
  offDays: number[];
  todayIso: string;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const firstDay = first.getDay(); // Sunday is 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const slots: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) slots.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) slots.push(d);

  const offDaySet = new Set(offDays);

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

          const cellDate = new Date(year, month, value);
          const iso = toIsoDateOnly(cellDate);
          const items = calendar[iso] || [];
          const isToday = iso === todayIso;
          const plannedCount = items.length;
          const doneCount = items.filter((item) => item.status === "done").length;
          const overdueCount = items.filter((item) => item.status !== "done" && iso < todayIso).length;
          const isOffDay = offDaySet.has(cellDate.getDay());

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

                {isOffDay && (
                  <div className="absolute top-1 right-1 text-[7px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Off
                  </div>
                )}

                {plannedCount > 0 && (
                  <div className={`mt-auto flex items-center justify-between text-[7px] font-black uppercase tracking-widest text-[#6b7280] dark:text-[#9ca3af] ${isToday ? "mb-4 md:mb-5" : ""}`}>
                    <span>{plannedCount}P</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{doneCount}D</span>
                    {overdueCount > 0 && (
                      <span className="text-red-500 dark:text-red-400">{overdueCount}O</span>
                    )}
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

export default function StudyPlanner({ planId, initialView }: { planId: string; initialView?: PlannerSection }) {
  const navigate = useNavigate();
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

  const [view, setView] = useState<PlannerView>(initialView ?? "today");
  const [monthDate, setMonthDate] = useState(new Date());

  const [examType, setExamType] = useState("");
  const [examDateDraft, setExamDateDraft] = useState("");
  const [isExamDateEditorOpen, setIsExamDateEditorOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [chapterName, setChapterName] = useState<Record<string, string>>({});
  const [topicName, setTopicName] = useState<Record<string, string>>({});
  const [topicDate, setTopicDate] = useState<Record<string, string>>({});
  const [pickedDay, setPickedDay] = useState<string>("");
  const [planTitleDraft, setPlanTitleDraft] = useState("");
  const [dailyGoalDraft, setDailyGoalDraft] = useState(3);
  const [offDaysDraft, setOffDaysDraft] = useState<number[]>([]);
  const [includeRevisionNeeded, setIncludeRevisionNeeded] = useState(false);
  const [lockExistingDates, setLockExistingDates] = useState(true);
  const [syllabusQuery, setSyllabusQuery] = useState("");
  const [syllabusStatus, setSyllabusStatus] = useState<TopicStatus | "all">("all");
  const [syllabusSubject, setSyllabusSubject] = useState<string>("all");
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [bulkSubjectName, setBulkSubjectName] = useState("");
  const [bulkChapterName, setBulkChapterName] = useState("");
  const [bulkTopicsText, setBulkTopicsText] = useState("");
  const [bulkAddError, setBulkAddError] = useState("");
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [expandedTodayTopicId, setExpandedTodayTopicId] = useState<string | null>(null);

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
    setPlanTitleDraft(plan.title || "");
    setDailyGoalDraft(plan.dailyGoal || 3);
    setOffDaysDraft(plan.offDays || []);
  }, [plan]);

  useEffect(() => {
    if (!initialView) return;
    if (initialView === view) return;
    setView(initialView);
  }, [initialView, view]);

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

  function handleViewChange(next: PlannerSection) {
    setView(next);
    navigate(`/study/planner/${planId}/${next}`, { replace: true });
  }

  function openTopicInSyllabus(topic: Topic, subject: Subject, chapter: Chapter) {
    setSyllabusQuery(topic.name);
    setSyllabusSubject(subject.id);
    setSyllabusStatus("all");
    setExpandedTopicId(topic.id);
    handleViewChange("syllabus");
  }

  function toggleOffDay(day: number) {
    setOffDaysDraft((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function saveExamSettings() {
    const trimmedTitle = planTitleDraft.trim();
    if (!trimmedTitle) {
      setError("Add a plan title");
      return;
    }

    const payload: Record<string, unknown> = {
      title: trimmedTitle,
      examType: examType.trim() || undefined,
      examDate: examDateDraft.trim() || undefined,
    };

    try {
      await updatePlanMeta(payload);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to save plan settings");
    }
  }

  async function saveCapacitySettings() {
    const payload: Record<string, unknown> = {
      dailyGoal: Math.max(1, Number(dailyGoalDraft) || 1),
      offDays: offDaysDraft,
    };

    try {
      await updatePlanMeta(payload);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to save study capacity");
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

  async function patchTopicSilent(topicId: string, patch: Record<string, unknown>) {
    return plannerRequest<Plan>(`${BASE}/${planId}/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async function patchTopicsAndRefresh(updates: Array<{ topicId: string; patch: Record<string, unknown> }>) {
    if (updates.length === 0) return;
    let latest: Plan | null = null;
    for (const update of updates) {
      latest = await patchTopicSilent(update.topicId, update.patch);
    }
    if (latest) {
      setPlan(latest);
    }
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
    const names = splitTopicLines(topicName[key] || "");
    if (names.length === 0) return;

    const plannedDate = topicDate[key] || undefined;
    let updatedPlan: Plan | null = null;

    for (const name of names) {
      updatedPlan = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/topics`,
        {
          method: "POST",
          body: JSON.stringify({ name, plannedDate }),
        }
      );
    }

    if (updatedPlan) {
      setPlan(updatedPlan);
    }
    setTopicName((prev) => ({ ...prev, [key]: "" }));
    setTopicDate((prev) => ({ ...prev, [key]: "" }));

    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
  }

  async function deleteSubject(subjectId: string) {
    if (!window.confirm("Delete this subject and all its chapters/topics?")) return;
    const data = await plannerRequest<Plan>(`${BASE}/${planId}/subjects/${subjectId}`, {
      method: "DELETE",
    });
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
  }

  async function deleteChapter(subjectId: string, chapterId: string) {
    if (!window.confirm("Delete this chapter and all topics inside it?")) return;
    const data = await plannerRequest<Plan>(`${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}`, {
      method: "DELETE",
    });
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
  }

  async function deleteTopic(topicId: string) {
    if (!window.confirm("Delete this topic?")) return;
    const data = await plannerRequest<Plan>(`${BASE}/${planId}/topics/${topicId}`, {
      method: "DELETE",
    });
    setPlan(data);
    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
  }

  async function clearFutureDates() {
    if (!plan) return;
    const confirmClear = window.confirm("This will remove planned dates for future topics.");
    if (!confirmClear) return;

    const todayKey = toIsoDateOnly(new Date());
    const updates: Array<{ topicId: string; patch: Record<string, unknown> }> = [];

    for (const subject of plan.subjects) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          if (!topic.plannedDate) continue;
          const plannedKey = toIsoDateOnly(topic.plannedDate);
          if (plannedKey && plannedKey > todayKey) {
            updates.push({ topicId: topic.id, patch: { plannedDate: "" } });
          }
        }
      }
    }

    await patchTopicsAndRefresh(updates);
  }

  async function resetPlanTopics() {
    if (!plan) return;
    const confirmReset = window.confirm(
      "This will reset all topics to Not Started and clear planned dates."
    );
    if (!confirmReset) return;

    const updates: Array<{ topicId: string; patch: Record<string, unknown> }> = [];

    for (const subject of plan.subjects) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          updates.push({ topicId: topic.id, patch: { status: "todo", plannedDate: "" } });
        }
      }
    }

    await patchTopicsAndRefresh(updates);
  }

  function matchesSyllabusFilters(topic: Topic, subject: Subject, chapter: Chapter) {
    if (syllabusSubject !== "all" && subject.id !== syllabusSubject) return false;
    if (syllabusStatus !== "all" && topic.status !== syllabusStatus) return false;
    const query = syllabusQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      topic.name.toLowerCase().includes(query) ||
      subject.name.toLowerCase().includes(query) ||
      chapter.name.toLowerCase().includes(query)
    );
  }

  async function moveTopicsToDate(topicIds: string[], dateKey: string) {
    const updates = topicIds.map((topicId) => ({ topicId, patch: { plannedDate: dateKey } }));
    await patchTopicsAndRefresh(updates);
  }

  async function clearTopicsFromDate(topicIds: string[]) {
    const updates = topicIds.map((topicId) => ({ topicId, patch: { plannedDate: "" } }));
    await patchTopicsAndRefresh(updates);
  }

  async function editTopicNotes(topic: Topic) {
    const next = window.prompt("Edit notes", topic.notes || "");
    if (next === null) return;
    await patchTopic(topic.id, { notes: next });
  }

  function resetBulkAdd() {
    setBulkAddOpen(false);
    setBulkSubjectId("");
    setBulkSubjectName("");
    setBulkChapterName("");
    setBulkTopicsText("");
    setBulkAddError("");
  }

  async function handleBulkAdd() {
    if (!plan) return;
    const topics = splitTopicLines(bulkTopicsText);
    if (topics.length === 0) {
      setBulkAddError("Add at least one topic");
      return;
    }

    let subjectId = bulkSubjectId;
    let subjectData = plan.subjects.find((subject) => subject.id === subjectId);

    if (!subjectId) {
      const name = bulkSubjectName.trim();
      if (!name) {
        setBulkAddError("Choose or add a subject");
        return;
      }

      const palette = ["#0ea5e9", "#9333ea", "#16a34a", "#ef4444", "#f59e0b", "#0f766e"];
      const color = palette[(plan?.subjects.length || 0) % palette.length];
      const created = await plannerRequest<Plan>(`${BASE}/${planId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      setPlan(created);
      subjectData = created.subjects[created.subjects.length - 1];
      subjectId = subjectData?.id;
    }

    if (!subjectId) {
      setBulkAddError("Subject not found");
      return;
    }

    const chapterLabel = bulkChapterName.trim() || "General";
    let chapterId = subjectData?.chapters.find(
      (chapter) => chapter.name.toLowerCase() === chapterLabel.toLowerCase()
    )?.id;

    if (!chapterId) {
      const updatedPlan = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters`,
        {
          method: "POST",
          body: JSON.stringify({ name: chapterLabel }),
        }
      );
      setPlan(updatedPlan);
      subjectData = updatedPlan.subjects.find((subject) => subject.id === subjectId);
      chapterId = subjectData?.chapters.find(
        (chapter) => chapter.name.toLowerCase() === chapterLabel.toLowerCase()
      )?.id;
    }

    if (!chapterId) {
      setBulkAddError("Could not create chapter");
      return;
    }

    let updatedPlan: Plan | null = null;
    for (const name of topics) {
      updatedPlan = await plannerRequest<Plan>(
        `${BASE}/${planId}/subjects/${subjectId}/chapters/${chapterId}/topics`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        }
      );
    }

    if (updatedPlan) {
      setPlan(updatedPlan);
    }

    const calendarData = await plannerRequest<Record<string, CalendarItem[]>>(`${BASE}/${planId}/calendar`);
    setCalendar(calendarData || {});
    resetBulkAdd();
  }

  async function autoDistribute(options?: { lockExistingDates?: boolean; includeRevisionNeeded?: boolean }) {
    try {
      const payload = {
        lockExistingDates: options?.lockExistingDates ?? lockExistingDates,
        includeRevisionNeeded: options?.includeRevisionNeeded ?? includeRevisionNeeded,
      };
      const data = await plannerRequest<{ plan: Plan }>(
        `${BASE}/${planId}/auto-distribute`,
        {
          method: "POST",
          body: JSON.stringify(payload),
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
  const todayKey = toIsoDateOnly(new Date());
  const tomorrowKey = (() => {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    return toIsoDateOnly(nextDay);
  })();
  const hasActiveSyllabusFilter = Boolean(syllabusQuery.trim()) || syllabusStatus !== "all" || syllabusSubject !== "all";
  const visibleSubjects = hasActiveSyllabusFilter
    ? plan.subjects.filter((subject) =>
        subject.chapters.some((chapter) =>
          chapter.topics.some((topic) => matchesSyllabusFilters(topic, subject, chapter))
        )
      )
    : plan.subjects;
  const todayTasks = topics.filter((topic) => topic.plannedDate && toIsoDateOnly(topic.plannedDate) === todayKey);
  const overdueTasks = topics.filter((topic) => {
    if (!topic.plannedDate) return false;
    const plannedKey = toIsoDateOnly(topic.plannedDate);
    return plannedKey !== "" && plannedKey < todayKey && topic.status !== "done";
  });
  const upcomingTasks = topics
    .filter((topic) => {
      if (!topic.plannedDate) return false;
      const plannedKey = toIsoDateOnly(topic.plannedDate);
      return plannedKey !== "" && plannedKey > todayKey && topic.status !== "done";
    })
    .sort((a, b) => (a.plannedDate || "").localeCompare(b.plannedDate || ""));
  const overdueCount = overdueTasks.length;
  const statusCounts = {
    todo: topics.filter((topic) => topic.status === "todo").length,
    in_progress: topics.filter((topic) => topic.status === "in_progress").length,
    done: topics.filter((topic) => topic.status === "done").length,
    revision_needed: topics.filter((topic) => topic.status === "revision_needed").length,
  };
  const summaryStatusLabel = overdueCount > 0 ? `Behind by ${overdueCount} topics` : "On track";
  const nextOffDayLabel = (() => {
    if (!plan.offDays || plan.offDays.length === 0) return "None";
    const offDaySet = new Set(plan.offDays);
    const now = new Date();
    for (let i = 0; i < 7; i += 1) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + i);
      if (offDaySet.has(candidate.getDay())) {
        return candidate.toLocaleDateString("en-US", { weekday: "long" });
      }
    }
    return "None";
  })();
  const kanban = {
    todo: topics.filter((t) => t.status === "todo"),
    in_progress: topics.filter((t) => t.status === "in_progress"),
    done: topics.filter((t) => t.status === "done"),
  };

  const selectedDayItems = pickedDay ? calendar[pickedDay] || [] : [];
  const selectedDayDone = selectedDayItems.filter((item) => item.status === "done");
  const selectedDayMissed = pickedDay && pickedDay < todayKey
    ? selectedDayItems.filter((item) => item.status !== "done")
    : [];

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
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#E0F2FE] via-[#F5F3FF] to-[#FFF1F2] dark:from-[#131416] dark:via-[#131416] dark:to-[#131416] text-[#3c4146] dark:text-[#e7e5e5] font-['Satoshi',sans-serif] overflow-x-hidden selection:bg-blue-500/30 transition-colors duration-500">

        {/* Noise Texture */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-0" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />

        <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">

          {/* Header Section */}
          <div data-tour="planner-header" className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#2d333b] dark:text-[#fcf9f8] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                {plan.title}.
              </h1>
              {plan.examType && (
                <div className="text-[12px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mb-4">
                  {plan.examType}
                </div>
              )}
              <motion.div layout className="flex flex-wrap items-center gap-6">
                <div data-tour="planner-countdown" className="inline-flex gap-3">
                  {countdown === null ? (
                    <motion.button
                      layout
                      onClick={() => setIsExamDateEditorOpen((prev) => !prev)}
                      className="bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] text-[20px] md:text-[22px] font-black uppercase tracking-[0.1em] px-8 py-3 rounded-full shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8),0_6px_14px_rgba(0,0,0,0.12)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05),0_10px_20px_rgba(0,0,0,0.4)] border border-[#c0c4d1] dark:border-[#252626] transition-transform hover:scale-[1.03]"
                      title="Set your exam date"
                    >
                      Set Exam Date
                    </motion.button>
                  ) : (
                    <>
                      <motion.span layout className="bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] text-[10px] font-extrabold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#252626]">
                        {countdownLabel}
                      </motion.span>
                      <motion.button
                        layout
                        onClick={() => setIsExamDateEditorOpen((prev) => !prev)}
                        className="bg-[#e6e7ee] dark:bg-[#202225] text-[#2d333b] dark:text-[#e7e5e5] text-[10px] font-extrabold uppercase tracking-[0.15em] px-4 py-2 rounded-full border border-[#c0c4d1] dark:border-[#2b2c2c] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                        title="Edit exam date"
                      >
                        Update Date
                      </motion.button>
                    </>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isExamDateEditorOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="inline-flex flex-col gap-3 rounded-2xl bg-[#f0f0f5] dark:bg-[#1a1c1e] px-5 py-4 border border-[#c0c4d1] dark:border-[#2b2c2c] shadow-[inset_2px_2px_4px_rgba(166,171,189,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.04)]"
                    >
                      <div className="text-[11px] font-bold text-[#334155] dark:text-[#e2e8f0] uppercase tracking-[0.2em] px-1">
                        Select Exam
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                      <input
                        type="date"
                        value={examDateDraft}
                        onChange={(e) => setExamDateDraft(e.target.value)}
                        className="text-sm font-bold bg-[#d9dbe2] dark:bg-[#0e0e0e] border border-[#c0c4d1] dark:border-[#252626] rounded-xl px-4 py-2 text-[#1e293b] dark:text-[#e7e5e5] focus:outline-none shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]"
                        style={{ colorScheme: isDarkMode ? "dark" : "light" }}
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
                  </motion.div>
                )}
              </AnimatePresence>
              </motion.div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleViewChange("plan")}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white/80 dark:bg-[#202225]/80 border border-[#c0c4d1] dark:border-[#2b2c2c]"
              >
                Edit Plan
              </button>
              <button
                onClick={() => handleViewChange("syllabus")}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white/80 dark:bg-[#202225]/80 border border-[#c0c4d1] dark:border-[#2b2c2c]"
              >
                Add Topics
              </button>
              <button
                onClick={() => { void autoDistribute(); }}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-[#3b82f6] text-white"
              >
                Build Schedule
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          {view === "today" && (
            <div data-tour="planner-metrics" className="grid grid-cols-2 lg:grid-cols-5 gap-5 md:gap-8 mb-12">
              {/* Days Left */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Days left</div>
                <div className="text-5xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  {countdown === null ? "--" : Math.abs(countdown)}
                </div>
                <div className="text-[11px] font-bold text-[#8b919e] dark:text-[#767575] uppercase tracking-[0.1em]">
                  {countdown === null ? "Set exam date" : countdown >= 0 ? "days remaining" : "days since exam"}
                </div>
              </div>

              {/* Completed */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Completed</div>
                <div className="text-5xl font-bold text-[#2d333b] dark:text-[#e7e5e5] flex items-baseline gap-2 mt-auto drop-shadow-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  {summary.done} <span className="text-xl text-[#8b919e] dark:text-[#767575] font-['Satoshi',sans-serif] font-bold">/ {summary.total}</span>
                </div>
              </div>

              {/* Today */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Today</div>
                <div className="text-5xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  {todayTasks.length}
                </div>
                <div className="text-[11px] font-bold text-[#8b919e] dark:text-[#767575] uppercase tracking-[0.1em]">tasks planned</div>
              </div>

              {/* Status */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Status</div>
                <div className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm">
                  {summaryStatusLabel}
                </div>
                <div className="text-[11px] font-bold text-[#8b919e] dark:text-[#767575] uppercase tracking-[0.1em]">
                  {overdueCount > 0 ? "Recover overdue tasks" : "Keep the streak"}
                </div>
              </div>

              {/* Next Off Day */}
              <div className="rounded-3xl p-6 flex flex-col transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                <div className="text-[10px] font-bold text-[#8b919e] dark:text-[#767575] mb-2 uppercase tracking-[0.15em] drop-shadow-sm">Next off day</div>
                <div className="text-3xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2 drop-shadow-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                  {nextOffDayLabel}
                </div>
                <div className="text-[11px] font-bold text-[#8b919e] dark:text-[#767575] uppercase tracking-[0.1em]">
                  {plan.offDays.length > 0 ? "Off days are skipped" : "No off days set"}
                </div>
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
            <div data-tour="planner-view-toggle" className="flex p-1.5 rounded-full transition-colors duration-500 bg-[#d9dbe2] dark:bg-[#0e0e0e] shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#1a1c1e] w-full md:w-auto">
              {([
                ["today", "Today"],
                ["plan", "Plan"],
                ["syllabus", "Syllabus"],
                ["calendar", "Calendar"],
              ] as Array<[PlannerSection, string]>).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => handleViewChange(value)}
                  className={`relative px-6 py-2.5 rounded-full text-[12px] md:text-[14px] font-extrabold uppercase tracking-[0.15em] transition-all duration-300 z-10 flex-1 md:flex-none ${view === value
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
          </div>

          {error && (
            <div className="mb-6 rounded-2xl p-4 bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold shadow-[inset_1px_1px_2px_rgba(255,255,255,0.5)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)]">
              {error}
            </div>
          )}

          {view === "today" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">Today&apos;s Study Tasks</h3>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575]">
                      {todayTasks.length} planned
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    {todayTasks.map((topic) => (
                      <div key={topic.id} className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_2px_2px_6px_rgba(166,171,189,0.4),inset_-2px_-2px_6px_rgba(255,255,255,0.6)] dark:shadow-[inset_2px_2px_8px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[17px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">{topic.name}</div>
                            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mt-1">
                              {topic.subject.name}{topic.chapter?.name ? ` - ${topic.chapter.name}` : ""}
                            </div>
                            {topic.notes && (
                              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748b] mt-2">
                                Notes attached
                              </div>
                            )}
                          </div>
                          <span
                            className="text-[10px] whitespace-nowrap px-3 py-1 rounded-full font-black tracking-widest"
                            style={{
                              color: STATUS_UI[topic.status].color,
                              background: isDarkMode ? STATUS_UI[topic.status].darkBg || STATUS_UI[topic.status].bg : STATUS_UI[topic.status].bg,
                              border: `1px solid ${STATUS_UI[topic.status].color}30`,
                            }}
                          >
                            {STATUS_UI[topic.status].label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 mt-4">
                          <button
                            onClick={() => patchTopic(topic.id, { status: "in_progress" })}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => patchTopic(topic.id, { status: "done" })}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-emerald-500/80 text-white"
                          >
                            Mark Done
                          </button>
                          <button
                            onClick={() => patchTopic(topic.id, { status: "revision_needed" })}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff]"
                          >
                            Needs Revision
                          </button>
                          <button
                            onClick={() =>
                              setExpandedTodayTopicId((prev) => (prev === topic.id ? null : topic.id))
                            }
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                          >
                            More
                          </button>
                        </div>

                        {expandedTodayTopicId === topic.id && (
                          <div className="flex flex-wrap gap-3 mt-3">
                            <button
                              onClick={() => patchTopic(topic.id, { plannedDate: tomorrowKey })}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe]"
                            >
                              Move to Tomorrow
                            </button>
                            <button
                              onClick={() => patchTopic(topic.id, { plannedDate: "" })}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]"
                            >
                              Remove Date
                            </button>
                            <button
                              onClick={() => { void editTopicNotes(topic); }}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                            >
                              Edit Notes
                            </button>
                            <button
                              onClick={() => openTopicInSyllabus(topic, topic.subject, topic.chapter)}
                              className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                            >
                              Open in Syllabus
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {todayTasks.length === 0 && (
                      <div className="text-[12px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-10 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                        No tasks planned for today.
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                          <button
                            onClick={() => handleViewChange("calendar")}
                            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                          >
                            View Upcoming
                          </button>
                          <button
                            onClick={() => handleViewChange("plan")}
                            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-[#3b82f6] text-white"
                          >
                            Rebuild Plan
                          </button>
                          <button
                            onClick={() => handleViewChange("syllabus")}
                            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                          >
                            Add Topics
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">Coming Up</h3>
                    <button
                      onClick={() => handleViewChange("calendar")}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400"
                    >
                      Open Calendar
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {upcomingTasks.slice(0, 7).map((topic) => (
                      <div key={topic.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1] dark:border-[#252626]">
                        <div>
                          <div className="text-[15px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">{topic.name}</div>
                          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mt-1">
                            {topic.subject.name}{topic.chapter?.name ? ` - ${topic.chapter.name}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[11px] font-black uppercase tracking-widest text-[#1e40af] dark:text-[#93c5fd]">
                            {topic.plannedDate ? formatDate(topic.plannedDate) : "Unplanned"}
                          </div>
                          <button
                            onClick={() => patchTopic(topic.id, { status: "done" })}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-500/80 text-white"
                          >
                            Mark Done
                          </button>
                          <button
                            onClick={() => patchTopic(topic.id, { plannedDate: tomorrowKey })}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe]"
                          >
                            Move Date
                          </button>
                          <button
                            onClick={() => handleViewChange("calendar")}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-200 text-slate-600"
                          >
                            Calendar
                          </button>
                        </div>
                      </div>
                    ))}

                    {upcomingTasks.length === 0 && (
                      <div className="text-[12px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-8 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                        No upcoming tasks yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[20px] font-bold text-[#2d333b] dark:text-[#e7e5e5]">Overdue</h3>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575]">
                      {overdueCount} items
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {overdueTasks.slice(0, 5).map((topic) => (
                      <div key={topic.id} className="rounded-2xl p-4 bg-[#fee2e2] dark:bg-[#2a1216] border border-[#fecaca] dark:border-[#7f1d1d]">
                        <div className="text-[14px] font-bold text-[#7f1d1d] dark:text-[#fecaca]">{topic.name}</div>
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#b91c1c] dark:text-[#fca5a5] mt-1">
                          {topic.subject.name}{topic.chapter?.name ? ` - ${topic.chapter.name}` : ""}
                        </div>
                        {topic.plannedDate && (
                          <div className="text-[10px] font-black uppercase tracking-widest text-[#b91c1c] dark:text-[#fca5a5] mt-2">
                            {daysBetweenDateKeys(toIsoDateOnly(topic.plannedDate), todayKey)} days overdue
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            onClick={() => patchTopic(topic.id, { status: "done" })}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-500/80 text-white"
                          >
                            Mark Done
                          </button>
                          <button
                            onClick={() => patchTopic(topic.id, { plannedDate: tomorrowKey })}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe]"
                          >
                            Move to Tomorrow
                          </button>
                          <button
                            onClick={() => patchTopic(topic.id, { plannedDate: "" })}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]"
                          >
                            Skip for Now
                          </button>
                        </div>
                      </div>
                    ))}

                    {overdueTasks.length === 0 && (
                      <div className="text-[12px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-8 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c]">
                        No overdue topics.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewChange("calendar")}
                    className="mt-5 w-full text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-[#0ea5e9] text-white"
                  >
                    Reschedule Overdue
                  </button>
                </div>

                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <h3 className="text-[18px] font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleViewChange("syllabus")}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                    >
                      Add Topics
                    </button>
                    <button
                      onClick={() => handleViewChange("plan")}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                    >
                      Edit Plan
                    </button>
                    <button
                      onClick={() => handleViewChange("calendar")}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                    >
                      Open Calendar
                    </button>
                    <button
                      onClick={() => handleViewChange("plan")}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-[#3b82f6] text-white"
                    >
                      Build Schedule
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "plan" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="flex flex-col gap-6">
                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-4">Exam Settings</div>
                  <div className="grid gap-4">
                    <input
                      value={planTitleDraft}
                      onChange={(e) => setPlanTitleDraft(e.target.value)}
                      placeholder="Plan title"
                      className="w-full bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                    />
                    <input
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      placeholder="Exam / goal name"
                      className="w-full bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                    />
                    <input
                      type="date"
                      value={examDateDraft}
                      onChange={(e) => setExamDateDraft(e.target.value)}
                      className="w-full bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                      style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                    />
                    <button
                      onClick={() => { void saveExamSettings(); }}
                      className="text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-full bg-[#3b82f6] text-white"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-4">Study Capacity</div>
                  <div className="grid gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">Daily goal</label>
                      <input
                        type="number"
                        min={1}
                        value={dailyGoalDraft}
                        onChange={(e) => setDailyGoalDraft(Number(e.target.value))}
                        className="w-full mt-2 bg-[#ffffff] dark:bg-[#0e0e0e] text-[#2d333b] dark:text-[#e7e5e5] rounded-xl px-4 py-3 border border-[#c0c4d1] dark:border-[#2b2c2c] font-bold"
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mb-2">Off days</div>
                      <div className="flex flex-wrap gap-2">
                        {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((label, idx) => (
                          <button
                            key={label}
                            onClick={() => toggleOffDay(idx)}
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full border ${offDaysDraft.includes(idx)
                                ? "bg-[#3b82f6] text-white border-[#2563eb]"
                                : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                              }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setIncludeRevisionNeeded((prev) => !prev)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full border ${includeRevisionNeeded
                            ? "bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]"
                            : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                          }`}
                      >
                        Include revision topics
                      </button>
                      <button
                        onClick={() => setLockExistingDates((prev) => !prev)}
                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full border ${lockExistingDates
                            ? "bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]"
                            : "bg-white dark:bg-[#202225] text-[#4b5563] dark:text-[#cbd5f5] border-[#c0c4d1] dark:border-[#2b2c2c]"
                          }`}
                      >
                        Keep already planned dates
                      </button>
                    </div>

                    <button
                      onClick={() => { void saveCapacitySettings(); }}
                      className="text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-full bg-[#3b82f6] text-white"
                    >
                      Save Changes
                    </button>
                    <div className="text-[11px] font-bold text-[#8b919e] dark:text-[#767575]">
                      These settings affect how your schedule is generated.
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-4">Planning Explanation</div>
                  <ul className="text-[12px] font-bold text-[#475569] dark:text-[#9aa2ae] space-y-2">
                    <li>Only unfinished topics are scheduled.</li>
                    <li>Done topics are never scheduled again.</li>
                    <li>Off days are skipped.</li>
                    <li>Needs Revision topics are included only if enabled.</li>
                    <li>Keep already planned dates keeps existing schedules in place.</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-4">Plan Actions</div>
                  <button
                    onClick={() => {
                      const confirmRun = window.confirm("This will rebuild your schedule using current settings.");
                      if (!confirmRun) return;
                      void autoDistribute();
                    }}
                    className="w-full text-[12px] font-black uppercase tracking-widest px-6 py-4 rounded-full bg-[#3b82f6] text-white mb-4"
                  >
                    Build Schedule
                  </button>
                  <button
                    onClick={() => { void clearFutureDates(); }}
                    className="w-full text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c] mb-3"
                  >
                    Clear Future Dates
                  </button>
                  <button
                    onClick={() => handleViewChange("calendar")}
                    className="w-full text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-white dark:bg-[#202225] border border-[#c0c4d1] dark:border-[#2b2c2c]"
                  >
                    Reschedule in Calendar
                  </button>
                  <button
                    onClick={() => { void resetPlanTopics(); }}
                    className="w-full text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full border border-red-200 text-red-500 mt-3"
                  >
                    Reset Plan
                  </button>
                </div>

                <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c]">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b919e] dark:text-[#767575] mb-4">Progress Snapshot</div>
                  <div className="grid gap-3 text-[12px] font-bold text-[#475569] dark:text-[#9aa2ae]">
                    <div className="flex justify-between"><span>Not Started</span><span>{statusCounts.todo}</span></div>
                    <div className="flex justify-between"><span>In Progress</span><span>{statusCounts.in_progress}</span></div>
                    <div className="flex justify-between"><span>Done</span><span>{statusCounts.done}</span></div>
                    <div className="flex justify-between"><span>Needs Revision</span><span>{statusCounts.revision_needed}</span></div>
                    <div className="flex justify-between"><span>Overdue</span><span>{overdueCount}</span></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "syllabus" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-6"
            >
              <div className={`rounded-3xl p-6 transition-colors duration-500 ${isDarkMode ? "bg-[#0c0c0e] shadow-2xl border border-zinc-800" : "bg-white shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8)] border border-slate-200"}`}>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-[#8b919e] dark:text-zinc-500">
                  Syllabus Setup
                </div>

                <div className="flex flex-col lg:flex-row gap-4">
                  <input
                    value={syllabusQuery}
                    onChange={(e) => setSyllabusQuery(e.target.value)}
                    placeholder="Search topics, chapters, or subjects"
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-50 placeholder-zinc-500" : "bg-[#f0f0f5] border-slate-200 text-[#2d333b] placeholder-[#8b919e]"}`}
                  />
                  <select
                    value={syllabusSubject}
                    onChange={(e) => setSyllabusSubject(e.target.value)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-50" : "bg-[#f0f0f5] border-slate-200 text-[#2d333b]"}`}
                  >
                    <option value="all">All subjects</option>
                    {plan.subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                  <select
                    value={syllabusStatus}
                    onChange={(e) => setSyllabusStatus(e.target.value as TopicStatus | "all")}
                    className={`rounded-xl px-4 py-3 text-sm font-bold border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-50" : "bg-[#f0f0f5] border-slate-200 text-[#2d333b]"}`}
                  >
                    <option value="all">All statuses</option>
                    {Object.entries(STATUS_UI).map(([value, ui]) => (
                      <option key={value} value={value}>{ui.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 mt-4">
                  <input
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Add a subject"
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-50 placeholder-zinc-500" : "bg-[#f0f0f5] border-slate-200 text-[#2d333b] placeholder-[#8b919e]"}`}
                  />
                  <button
                    onClick={addSubject}
                    className={`text-[11px] font-black uppercase tracking-widest rounded-xl px-6 py-3 border ${isDarkMode ? "bg-zinc-800 text-zinc-50 border-zinc-700" : "bg-white text-[#2d333b] border-slate-200"}`}
                  >
                    Add Subject
                  </button>
                  <button
                    onClick={() => setBulkAddOpen(true)}
                    className="text-[11px] font-black uppercase tracking-widest rounded-xl px-6 py-3 bg-[#3b82f6] text-white"
                  >
                    Bulk Add
                  </button>
                </div>

                <div className="text-[11px] font-bold text-[#8b919e] dark:text-[#767575] mt-3">
                  Use bulk add for fast entry. Chapters are optional.
                </div>
              </div>

              {visibleSubjects.length === 0 ? (
                <div className={`rounded-3xl p-10 text-center ${isDarkMode ? "bg-[#0c0c0e] border border-zinc-800" : "bg-white border border-slate-200"}`}>
                  <h3 className="text-xl font-bold text-[#2d333b] dark:text-[#e7e5e5] mb-2">
                    {plan.subjects.length === 0 ? "Start your syllabus" : "No topics match these filters"}
                  </h3>
                  <p className="text-sm text-[#8b919e] dark:text-[#767575] mb-6">
                    {plan.subjects.length === 0
                      ? "Add your first subject and topics to get started."
                      : "Try clearing filters or searching with different keywords."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {plan.subjects.length === 0 ? (
                      <>
                        <button
                          onClick={() => setBulkAddOpen(true)}
                          className="text-[11px] font-black uppercase tracking-widest rounded-xl px-6 py-3 bg-[#3b82f6] text-white"
                        >
                          Bulk Add Topics
                        </button>
                        <button
                          onClick={() => handleViewChange("plan")}
                          className={`text-[11px] font-black uppercase tracking-widest rounded-xl px-6 py-3 border ${isDarkMode ? "border-zinc-700 text-zinc-50" : "border-slate-200 text-[#2d333b]"}`}
                        >
                          Edit Plan
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSyllabusQuery("");
                          setSyllabusStatus("all");
                          setSyllabusSubject("all");
                        }}
                        className="text-[11px] font-black uppercase tracking-widest rounded-xl px-6 py-3 bg-[#3b82f6] text-white"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {visibleSubjects.map((subject) => {
                    const subjectTopicCount = subject.chapters.reduce((total, chapter) => total + chapter.topics.length, 0);
                    return (
                      <div key={subject.id} className={`rounded-3xl overflow-hidden transition-colors duration-500 ${isDarkMode ? "bg-[#09090b] shadow-2xl border border-zinc-800" : "bg-white shadow-[12px_12px_24px_rgba(166,171,189,0.4),-8px_-8px_24px_rgba(255,255,255,0.8)] border border-slate-200"}`}>
                        <div className={`p-6 border-b ${isDarkMode ? "bg-[#101013] border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                              <h3 className={`text-[28px] font-bold ${isDarkMode ? "text-zinc-50" : "text-[#2d333b]"}`}>
                                {subject.name}
                              </h3>
                              <div className="text-[11px] font-bold uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                {subjectTopicCount} topics ┬╖ {subjectPercent(subject)}% complete
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  setBulkSubjectId(subject.id);
                                  setBulkSubjectName("");
                                  setBulkAddOpen(true);
                                }}
                                className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-[#3b82f6] text-white"
                              >
                                Bulk Add
                              </button>
                              <button
                                onClick={() => { void deleteSubject(subject.id); }}
                                className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-red-200 text-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <input
                              value={chapterName[subject.id] || ""}
                              onChange={(e) => setChapterName((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                              placeholder="Add a chapter (optional)"
                              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-50 placeholder-zinc-600" : "bg-white border-slate-200 text-[#2d333b] placeholder-[#8b919e]"}`}
                            />
                            <button
                              onClick={() => addChapter(subject.id)}
                              className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl bg-[#0ea5e9] text-white"
                            >
                              Add Chapter
                            </button>
                          </div>
                        </div>

                        <div className={`p-6 flex flex-col gap-6 ${isDarkMode ? "bg-[#09090b]" : "bg-white"}`}>
                          {subject.chapters.length === 0 && (
                            <div className="text-[12px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-6 border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] rounded-2xl">
                              No chapters yet. Add one to start.
                            </div>
                          )}

                          {subject.chapters.map((chapter) => {
                            const key = `${subject.id}:${chapter.id}`;
                            const filteredTopics = chapter.topics.filter((topic) => matchesSyllabusFilters(topic, subject, chapter));
                            const visibleTopics = hasActiveSyllabusFilter ? filteredTopics : chapter.topics;

                            if (hasActiveSyllabusFilter && visibleTopics.length === 0) return null;

                            return (
                              <div key={chapter.id} className={`rounded-2xl p-5 border ${isDarkMode ? "border-zinc-800 bg-[#111114]" : "border-slate-200 bg-slate-50"}`}>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                                  <div>
                                    <div className={`text-[20px] font-bold ${isDarkMode ? "text-zinc-50" : "text-[#2d333b]"}`}>{chapter.name}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                                      {visibleTopics.length} topics
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => { void deleteChapter(subject.id, chapter.id); }}
                                    className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full border border-red-200 text-red-500"
                                  >
                                    Delete Chapter
                                  </button>
                                </div>

                                <div className="flex flex-col gap-3">
                                  {visibleTopics.map((topic) => (
                                    <div key={topic.id} className={`rounded-2xl p-4 border ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800" : "bg-white border-slate-200"}`}>
                                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                                        <div>
                                          <div className={`text-[16px] font-bold ${isDarkMode ? "text-zinc-50" : "text-[#2d333b]"}`}>{topic.name}</div>
                                          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8b919e] dark:text-[#767575] mt-1">
                                            {topic.plannedDate ? formatDate(topic.plannedDate) : "Unplanned"}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span
                                            className="text-[10px] whitespace-nowrap px-3 py-1 rounded-full font-black tracking-widest"
                                            style={{
                                              color: STATUS_UI[topic.status].color,
                                              background: isDarkMode ? STATUS_UI[topic.status].darkBg || STATUS_UI[topic.status].bg : STATUS_UI[topic.status].bg,
                                              border: `1px solid ${STATUS_UI[topic.status].color}30`,
                                            }}
                                          >
                                            {STATUS_UI[topic.status].label}
                                          </span>
                                          {topic.notes && (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#64748b]">Notes</span>
                                          )}
                                          <button
                                            onClick={() => setExpandedTopicId((prev) => (prev === topic.id ? null : topic.id))}
                                            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-slate-200 text-slate-600"
                                          >
                                            {expandedTopicId === topic.id ? "Hide" : "More"}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap gap-2 mt-3">
                                        <button
                                          onClick={() => patchTopic(topic.id, { status: "in_progress" })}
                                          className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-full border border-slate-200 text-slate-600"
                                        >
                                          Start
                                        </button>
                                        <button
                                          onClick={() => patchTopic(topic.id, { status: "done" })}
                                          className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-emerald-500/80 text-white"
                                        >
                                          Mark Done
                                        </button>
                                        <button
                                          onClick={() => patchTopic(topic.id, { status: "revision_needed" })}
                                          className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-full bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff]"
                                        >
                                          Needs Revision
                                        </button>
                                      </div>

                                      {expandedTopicId === topic.id && (
                                        <div className="mt-3 flex flex-col sm:flex-row gap-3">
                                          <input
                                            type="date"
                                            value={topic.plannedDate ? toIsoDateOnly(topic.plannedDate) : ""}
                                            onChange={(e) => patchTopic(topic.id, { plannedDate: e.target.value || "" })}
                                            className={`text-[12px] font-bold border rounded-xl px-3 py-2 ${isDarkMode ? "bg-zinc-900 border-zinc-800 text-zinc-200" : "bg-[#f0f0f5] border-slate-200 text-[#2d333b]"}`}
                                            style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                                          />
                                          <button
                                            onClick={() => { void editTopicNotes(topic); }}
                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-slate-200 text-slate-600"
                                          >
                                            Edit Notes
                                          </button>
                                          <button
                                            onClick={() => patchTopic(topic.id, { plannedDate: "" })}
                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-slate-200 text-slate-600"
                                          >
                                            Remove Date
                                          </button>
                                          <button
                                            onClick={() => { void deleteTopic(topic.id); }}
                                            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-red-200 text-red-500"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {visibleTopics.length === 0 && (
                                    <div className="text-[12px] font-bold text-[#8b919e] dark:text-[#767575] text-center py-6 border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] rounded-2xl">
                                      No topics yet. Add some below.
                                    </div>
                                  )}
                                </div>

                                <div className={`flex flex-col sm:flex-row gap-3 pt-4 mt-4 border-t ${isDarkMode ? "border-zinc-800" : "border-slate-200"}`}>
                                  <input
                                    value={topicName[key] || ""}
                                    onChange={(e) => setTopicName((prev) => ({ ...prev, [key]: e.target.value }))}
                                    placeholder="Add topics (one per line)"
                                    className={`flex-1 text-sm font-bold border rounded-xl px-4 py-3 ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-50 placeholder-zinc-600" : "bg-white border-slate-200 text-[#2d333b] placeholder-[#8b919e]"}`}
                                  />
                                  <input
                                    type="date"
                                    value={topicDate[key] || ""}
                                    onChange={(e) => setTopicDate((prev) => ({ ...prev, [key]: e.target.value }))}
                                    className={`text-sm font-bold border rounded-xl px-4 py-3 ${isDarkMode ? "bg-[#0b0b0d] border-zinc-800 text-zinc-200" : "bg-white border-slate-200 text-[#2d333b]"}`}
                                    style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                                  />
                                  <button
                                    onClick={() => addTopic(subject.id, chapter.id)}
                                    className="text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3 bg-[#0ea5e9] text-white"
                                  >
                                    Add Topics
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                bg-[#e6e7ee] dark:bg-[#1a1c1e]
                shadow-[inset_4px_4px_8px_rgba(166,171,189,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]
                dark:shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.8)]
                border border-slate-300 dark:border-transparent relative
              "
                  >
                    <div className="flex justify-between items-center mb-4 px-2 pt-2">
                      <h3 className="font-['Satoshi',sans-serif] text-[18.2px] font-bold uppercase tracking-widest text-[#2d333b] dark:text-[#fcf9f8]">
                        {title}
                      </h3>
                      <span className="text-[13px] font-bold bg-[#ffffff] dark:bg-[#252626] px-3 py-1 rounded-full text-[#4b5563] dark:text-[#c3c7cd] shadow-sm dark:shadow-none">
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
                            className={`rounded-lg p-4 cursor-grab active:cursor-grabbing transform transition-all hover:-translate-y-1 bg-[#fcf9f8] dark:bg-[#1a1c1e] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_10px_-2px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8),0_4px_10px_-2px_rgba(0,0,0,0.6)] ${status === 'done' ? (isDarkMode ? 'grayscale-[0.2] hover:grayscale-0 opacity-80 hover:opacity-100' : 'opacity-80 hover:opacity-100') : ''} border-l-[4px] ${neonClass}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                               <span className="text-[10px] font-bold text-neutral-500 dark:text-slate-500 uppercase tracking-widest truncate max-w-[80%]">
                                {topic.subject.name}
                              </span>
                              <div className="w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center -mt-1 -mr-1" style={{ backgroundColor: topic.subject.color + "40" }}>
                                <div className="w-2 h-2 rounded-full shadow-inner" style={{ backgroundColor: topic.subject.color }}></div>
                              </div>
                            </div>

                            <h4 className="text-neutral-900 dark:text-slate-50 font-extrabold text-[18.2px] mb-2 leading-snug drop-shadow-sm">{topic.name}</h4>

                            <p className="text-[14.5px] text-neutral-600 dark:text-slate-400 mb-4 line-clamp-2 font-black">{topic.chapter.name}</p>

                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-bold">
                                {topic.plannedDate ? (
                                  <span className="flex items-center gap-1 bg-neutral-200/60 px-2 py-1 rounded-md text-[13px]">
                                    ≡ƒôà {formatDate(topic.plannedDate)}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2 py-1">

                                  </span>
                                )}
                              </div>
                              <span className={`text-[12px] font-black uppercase tracking-widest ${textClass} px-2 py-1 bg-neutral-200/50 rounded-md`}>
                                {STATUS_UI[topic.status].label}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {kanban[status].length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
                          <div className="text-[15.6px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300 text-center leading-relaxed max-w-[80%]">
                            {COLUMN_DESCRIPTIONS[status]}
                          </div>
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
                    ΓùÇ
                  </motion.button>

                  <strong className="text-[31px] font-bold text-[#2d333b] dark:text-[#fcf9f8] tracking-widest uppercase drop-shadow-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                    {monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </strong>

                  <motion.button
                    whileHover={{ scale: 0.95 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#0e0e0e] text-[#4b5563] dark:text-[#acabaa] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] transition-colors"
                    title="Next Month"
                  >
                    Γû╢
                  </motion.button>
                </div>

                <CalendarView
                  monthDate={monthDate}
                  calendar={calendar}
                  onPickDate={setPickedDay}
                  offDays={plan.offDays}
                  todayIso={todayKey}
                />

                <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                  <span className="px-3 py-1 rounded-full border border-slate-200">Planned</span>
                  <span className="px-3 py-1 rounded-full border border-emerald-200 text-emerald-600">Done</span>
                  <span className="px-3 py-1 rounded-full border border-red-200 text-red-500">Overdue</span>
                  <span className="px-3 py-1 rounded-full border border-amber-200 text-amber-600">Off Day</span>
                </div>
              </div>

              <div className="rounded-3xl p-6 transition-colors duration-500 bg-[#f0f0f5] dark:bg-[#1a1c1e] shadow-[8px_8px_16px_rgba(166,171,189,0.4),-8px_-8px_16px_rgba(255,255,255,0.8),inset_0_1px_2px_rgba(255,255,255,1)] dark:shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_8px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#c0c4d1] dark:border-[#2b2c2c] h-fit flex flex-col gap-6 sticky top-8">
                <div className="border-b border-[#d9dbe2] dark:border-[#252626] pb-5 text-center">
                  <strong className="block text-[26px] font-extrabold text-[#2d333b] dark:text-[#fcf9f8] mb-2 drop-shadow-sm uppercase tracking-widest">Selected Log</strong>
                  <div className="text-[14.5px] font-black tracking-widest text-blue-600 dark:text-blue-400 bg-[#e6e7ee] dark:bg-[#131416] inline-block px-4 py-2 rounded-lg border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_1px_1px_3px_rgba(166,171,189,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]">
                    {pickedDay ? new Date(pickedDay).toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) : "AWAITING SELECTION"}
                  </div>
                  {pickedDay && (
                    <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#8b919e] dark:text-[#767575]">
                      <span>Planned {selectedDayItems.length}</span>
                      <span>Done {selectedDayDone.length}</span>
                      <span>Missed {selectedDayMissed.length}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {selectedDayItems.map((item) => (
                    <div key={item.topicId} className="rounded-2xl p-4 bg-[#e6e7ee] dark:bg-[#131416] border border-[#c0c4d1] dark:border-[#252626] shadow-[inset_2px_2px_6px_rgba(166,171,189,0.4),inset_-2px_-2px_6px_rgba(255,255,255,0.6)] dark:shadow-[inset_2px_2px_8px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.03)] transition-colors">
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <strong className="text-[17px] font-bold text-[#3c4146] dark:text-[#e7e5e5] leading-snug drop-shadow-sm">{item.topicName}</strong>
                        <span
                          className="text-[12px] whitespace-nowrap px-2.5 py-1 rounded-md font-black tracking-widest shadow-[0_2px_3px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.3)]"
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
                        {item.subjectName} <span className="text-[#d9dbe2] dark:text-[#252626] mx-1">┬╖</span> {item.chapterName}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={() => patchTopic(item.topicId, { status: "done" })}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-emerald-500/80 text-white"
                        >
                          Mark Done
                        </button>
                        <button
                          onClick={() => patchTopic(item.topicId, { status: "revision_needed" })}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff]"
                        >
                          Needs Revision
                        </button>
                        <button
                          onClick={() => {
                            if (!pickedDay) return;
                            const next = new Date(pickedDay);
                            next.setDate(next.getDate() + 1);
                            const targetDate = findNextAvailableDate(next, plan.offDays);
                            void patchTopic(item.topicId, { plannedDate: targetDate });
                          }}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-200 text-slate-600"
                        >
                          Move Date
                        </button>
                        <button
                          onClick={() => patchTopic(item.topicId, { plannedDate: "" })}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-slate-200 text-slate-600"
                        >
                          Remove Date
                        </button>
                      </div>
                    </div>
                  ))}

                  {pickedDay && selectedDayItems.length === 0 && (
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#8b919e] dark:text-[#565555] text-center py-10 bg-[#e6e7ee]/50 dark:bg-[#131416]/50 rounded-2xl border border-dashed border-[#d9dbe2] dark:border-[#2b2c2c] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.3)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
                      NO MODULES SCHEDULED
                    </div>
                  )}
                </div>

                {pickedDay && selectedDayItems.length > 0 && (
                  <div className="flex flex-col gap-3 mt-4">
                    <button
                      onClick={() => {
                        if (!pickedDay) return;
                        const next = new Date(pickedDay);
                        next.setDate(next.getDate() + 1);
                        const targetDate = findNextAvailableDate(next, plan.offDays);
                        void moveTopicsToDate(selectedDayItems.map((item) => item.topicId), targetDate);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full bg-[#3b82f6] text-white"
                    >
                      Move All to Next Available Day
                    </button>
                    <button
                      onClick={() => clearTopicsFromDate(selectedDayItems.map((item) => item.topicId))}
                      className="text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-full border border-slate-200 text-slate-600"
                    >
                      Clear This Day
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {bulkAddOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={resetBulkAdd}
          />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#111214] border border-slate-200 dark:border-slate-800 shadow-[0_30px_60px_rgba(15,23,42,0.4)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#0f172a] dark:text-[#e7e5e5]">Bulk Add Topics</h3>
              <button
                onClick={resetBulkAdd}
                className="text-xs font-black uppercase tracking-widest text-slate-500"
              >
                Close
              </button>
            </div>

            {bulkAddError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold">
                {bulkAddError}
              </div>
            )}

            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <select
                  value={bulkSubjectId}
                  onChange={(e) => {
                    setBulkSubjectId(e.target.value);
                    if (e.target.value) {
                      setBulkSubjectName("");
                    }
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                >
                  <option value="">Select subject</option>
                  {plan?.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
                <input
                  value={bulkSubjectName}
                  onChange={(e) => {
                    setBulkSubjectName(e.target.value);
                    if (e.target.value) setBulkSubjectId("");
                  }}
                  placeholder="Or add a new subject"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
                />
              </div>

              <input
                value={bulkChapterName}
                onChange={(e) => setBulkChapterName(e.target.value)}
                placeholder="Chapter name (optional)"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold"
              />

              <textarea
                value={bulkTopicsText}
                onChange={(e) => setBulkTopicsText(e.target.value)}
                placeholder="One topic per line"
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold min-h-[140px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-6">
              <button
                onClick={resetBulkAdd}
                className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => { void handleBulkAdd(); }}
                className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest"
              >
                Add Topics
              </button>
            </div>
          </div>
        </div>
      )}

      <TourPrompt tour={studyPlannerTour} featureName="Syllabus Planner" />
    </>
  );
}
