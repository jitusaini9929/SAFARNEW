import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { PremiumEmoji, type PremiumEmojiName } from "@/components/PremiumEmoji";
import StudyPlanner from "../../sylaabus planner/StudyPlanner";

// ── Types ──

interface PlanSummary {
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

interface TemplateSummary {
  id: string;
  name: string;
  examBody: string;
  category: string;
  description: string;
  estimatedTopics: number;
  recommendedDailyGoal: number;
  tags: string[];
}

type PlannerSection = "today" | "syllabus" | "calendar" | "plan" | "insights";

function normalizeSection(section?: string): PlannerSection {
  if (section === "syllabus" || section === "calendar" || section === "plan" || section === "insights") {
    return section;
  }
  return "today";
}

// ── Template card styling ──

const TEMPLATE_ICONS: Record<string, { name: PremiumEmojiName | null; fallback: string }> = {
  "ssc-cgl-tier1": { name: "bookmarks", fallback: "📋" },
  "railway-ntpc": { name: "train", fallback: "🚂" },
  "bank-po-prelims": { name: "bank", fallback: "🏦" },
  "jee-mains": { name: "zap", fallback: "⚡" },
  "neet-ug": { name: "dna", fallback: "🧬" },
};

const TEMPLATE_GRADIENTS: Record<string, string> = {
  "ssc-cgl-tier1": "from-blue-500/20 to-indigo-500/20",
  "railway-ntpc": "from-amber-500/20 to-orange-500/20",
  "bank-po-prelims": "from-emerald-500/20 to-teal-500/20",
  "jee-mains": "from-violet-500/20 to-fuchsia-500/20",
  "neet-ug": "from-rose-500/20 to-pink-500/20",
};

const TEMPLATE_BORDER_COLORS: Record<string, string> = {
  "ssc-cgl-tier1": "border-blue-400/30 dark:border-blue-500/20",
  "railway-ntpc": "border-amber-400/30 dark:border-amber-500/20",
  "bank-po-prelims": "border-emerald-400/30 dark:border-emerald-500/20",
  "jee-mains": "border-violet-400/30 dark:border-violet-500/20",
  "neet-ug": "border-rose-400/30 dark:border-rose-500/20",
};

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  government: { label: "GOVT EXAM", color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40" },
  banking: { label: "BANKING", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40" },
  engineering: { label: "ENGINEERING", color: "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40" },
  medical: { label: "MEDICAL", color: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40" },
};

const PRESSABLE_EASE = "motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]";
const PRESSABLE_BUTTON = `motion-safe:transition-[transform,box-shadow,background-color,border-color,color,opacity] motion-safe:duration-150 ${PRESSABLE_EASE} motion-reduce:transition-colors active:scale-[0.97] active:translate-y-[1px] disabled:active:scale-100 disabled:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40`;
const PRESSABLE_CARD = `motion-safe:transition-[transform,box-shadow,border-color,background-color,opacity] motion-safe:duration-200 ${PRESSABLE_EASE} motion-reduce:transition-colors active:scale-[0.985] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40`;
const PRESSABLE_TEXT = `motion-safe:transition-[transform,color,opacity] motion-safe:duration-150 ${PRESSABLE_EASE} active:scale-[0.97] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30`;

// ── QuickStart Component ──

function TemplateCard({
  template,
  index,
  onSelect,
}: {
  template: TemplateSummary;
  index: number;
  onSelect: (template: TemplateSummary) => void;
}) {
  return (
    <motion.button
      key={template.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onClick={() => onSelect(template)}
      className={`template-card group relative flex flex-col h-full text-left rounded-2xl p-6 border-2 hover:scale-[1.02] hover:shadow-lg
        ${PRESSABLE_CARD}
        bg-gradient-to-br ${TEMPLATE_GRADIENTS[template.id] || "from-slate-100/50 to-slate-200/50 dark:from-slate-800/50 dark:to-slate-900/50"}
        ${TEMPLATE_BORDER_COLORS[template.id] || "border-slate-300 dark:border-slate-700"}
        bg-white/80 dark:bg-[#141518]/80 backdrop-blur-sm
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <PremiumEmoji name={TEMPLATE_ICONS[template.id] ? TEMPLATE_ICONS[template.id].name : "bookmarks"} fallback={TEMPLATE_ICONS[template.id]?.fallback || "📋"} alt="" className="h-8 w-8" />
        {CATEGORY_BADGES[template.category] && (
          <span className={`text-[11px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${CATEGORY_BADGES[template.category].color}`}>
            {CATEGORY_BADGES[template.category].label}
          </span>
        )}
      </div>

      <h3 className="text-xl font-bold text-[#0f172a] dark:text-white mb-2">
        {template.name}
      </h3>

      <div className="template-desc-marquee text-[14px] font-medium leading-relaxed text-[#64748b] dark:text-[#94a3b8] mb-6 flex-grow">
        <span className="template-desc-static">
          {template.description}
        </span>
        <span className="template-desc-track" aria-hidden="true">
          <span>{template.description}</span>
          <span>{template.description}</span>
        </span>
      </div>

      <div className="flex items-center gap-4 text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8]">
        <span>{template.estimatedTopics} topics</span>
        <span aria-hidden="true">&middot;</span>
        <span>{template.examBody}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{template.recommendedDailyGoal}/day</span>
      </div>
    </motion.button>
  );
}

function QuickStart({
  onCancel,
  onComplete,
}: {
  onCancel: () => void;
  onComplete: (planId: string) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  // Plan config (shown after template selection)
  const [examDate, setExamDate] = useState("");
  const [dailyGoal, setDailyGoal] = useState(3);
  const [offDays, setOffDays] = useState<number[]>([0]); // Sunday off by default
  const [title, setTitle] = useState("");

  // Custom plan fields
  const [customTitle, setCustomTitle] = useState("");
  const [customExamName, setCustomExamName] = useState("");
  const [customPasteText, setCustomPasteText] = useState("");
  
  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch templates
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`${API_BASE}/plans/templates`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }
      } catch {
        // Templates will just be empty
      } finally {
        setLoadingTemplates(false);
      }
    };
    void load();
  }, []);

  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    const target = new Date(examDate);
    if (Number.isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [examDate]);

  function toggleOffDay(day: number) {
    setOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleGenerateFromTemplate() {
    if (!selectedTemplate) return;
    if (!examDate) {
      setError("Set your exam date to generate a schedule");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const res = await apiFetch(`${API_BASE}/plans/from-template`, {
        method: "POST",
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          title: title.trim() || selectedTemplate.name,
          examDate,
          dailyGoal,
          offDays,
          autoDistribute: true,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to create plan");
      }

      const created = await res.json();
      onComplete(created.id);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCustomCreate() {
    if (!customTitle.trim()) {
      setError("Add a plan title");
      return;
    }
    if (!examDate) {
      setError("Set an exam date");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Create plan
      const createRes = await apiFetch(`${API_BASE}/plans`, {
        method: "POST",
        body: JSON.stringify({
          title: customTitle.trim(),
          examType: customExamName.trim(),
          examDate,
          dailyGoal,
          offDays,
        }),
      });

      if (!createRes.ok) {
        const payload = await createRes.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to create plan");
      }

      const plan = await createRes.json();

      // If user pasted syllabus, parse and add it
      if (customPasteText.trim()) {
        const parsed = parseBulkPaste(customPasteText);
        
        // Caches to avoid duplicate creation
        const subjectCache = new Map<string, any>(); 
        const chapterCache = new Map<string, any>(); 

        for (const entry of parsed.entries) {
          const subjectName = entry.subjectName.trim();
          const chapterName = (entry.chapterName || "General").trim();
          const topics = entry.topicsText.split("\n").map((t: string) => t.trim()).filter(Boolean);
          
          if (!subjectName || topics.length === 0) continue;

          // 1. Ensure Subject
          let subject = subjectCache.get(subjectName.toLowerCase());
          if (!subject) {
            const subjectRes = await apiFetch(`${API_BASE}/plans/${plan.id}/subjects`, {
              method: "POST",
              body: JSON.stringify({ name: subjectName }),
            });
            if (!subjectRes.ok) continue;
            const planWithSubject = await subjectRes.json();
            subject = planWithSubject.subjects[planWithSubject.subjects.length - 1];
            if (!subject) continue;
            subjectCache.set(subjectName.toLowerCase(), subject);
          }

          // 2. Ensure Chapter
          const chapterKey = `${subject.id}:${chapterName.toLowerCase()}`;
          let chapter = chapterCache.get(chapterKey);
          if (!chapter) {
            const chapterRes = await apiFetch(`${API_BASE}/plans/${plan.id}/subjects/${subject.id}/chapters`, {
              method: "POST",
              body: JSON.stringify({ name: chapterName }),
            });
            if (!chapterRes.ok) continue;
            const planWithChapter = await chapterRes.json();
            const updatedSubject = planWithChapter.subjects.find((s: any) => s.id === subject.id);
            if (!updatedSubject || !Array.isArray(updatedSubject.chapters)) continue;
            chapter = updatedSubject.chapters[updatedSubject.chapters.length - 1];
            if (!chapter) continue;
            chapterCache.set(chapterKey, chapter);
          }

          // 3. Add Topics
          for (const topicName of topics) {
            await apiFetch(
              `${API_BASE}/plans/${plan.id}/subjects/${subject.id}/chapters/${chapter.id}/topics`,
              { method: "POST", body: JSON.stringify({ name: topicName }) }
            );
          }
        }

        // Auto-distribute after adding topics
        await apiFetch(`${API_BASE}/plans/${plan.id}/auto-distribute`, {
          method: "POST",
          body: JSON.stringify({ lockExistingDates: false }),
        }).catch(() => {});
      }

      onComplete(plan.id);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Template Selection Screen ──
  if (!selectedTemplate && !showCustom) {
    return (
      <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h1
              className="text-4xl md:text-5xl font-bold tracking-tight text-[#0f172a] dark:text-white mb-3"
              style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
            >
              Pick your exam.
            </h1>
            <p className="text-[15px] text-slate-600 dark:text-[#94a3b8] max-w-lg mx-auto">
              Choose a pre-loaded syllabus template and we'll build your entire study schedule in seconds.
            </p>
          </div>

          {/* Template Grid */}
          {loadingTemplates ? (
            <div className="flex justify-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-10 h-10 rounded-full border-[4px] border-slate-200 dark:border-slate-700 border-t-blue-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {templates.map((template, idx) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={idx}
                  onSelect={(selected) => {
                    setSelectedTemplate(selected);
                    setDailyGoal(selected.recommendedDailyGoal);
                    setTitle(selected.name);
                  }}
                />
              ))}


              {/* Custom Plan Card */}
              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: templates.length * 0.08, duration: 0.4 }}
                onClick={() => setShowCustom(true)}
                className={`group flex flex-col h-full text-left rounded-2xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:scale-[1.02] bg-white/50 dark:bg-[#141518]/50 ${PRESSABLE_CARD}`}
              >
                <PremiumEmoji name="pencil" alt="" className="h-8 w-8 mb-4" />
                <h3 className="text-xl font-bold text-[#0f172a] dark:text-white mb-2">
                  Custom Plan
                </h3>
                <p className="text-[14px] font-medium leading-relaxed text-[#64748b] dark:text-[#94a3b8] mb-6 flex-grow line-clamp-2">
                  Build your own plan from scratch. Paste your syllabus or add topics manually.
                </p>
                <div className="text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8]">
                  Any exam · Your syllabus
                </div>
              </motion.button>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={onCancel}
              className={`text-[13px] font-bold uppercase tracking-widest text-[#64748b] hover:text-[#64748b] ${PRESSABLE_TEXT}`}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Custom Plan Form ──
  if (showCustom) {
    return (
      <div className="min-h-[85dvh] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#141518] border border-slate-200 dark:border-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setShowCustom(false)}
              className={`text-[13px] font-bold uppercase tracking-widest text-[#64748b] hover:text-[#0f172a] dark:hover:text-white ${PRESSABLE_TEXT}`}
            >
              ← Back
            </button>
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b]">
              Custom Plan
            </span>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-bold">
              {error}
            </div>
          )}

          <div className="grid gap-5">
            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                Plan Title
              </label>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="SSC CGL 2026 Prep"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white placeholder-[#64748b] dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{ colorScheme: isDark ? "dark" : "light" }}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                  Topics / Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`mt-2 text-left text-[13px] font-bold uppercase tracking-widest text-[#64748b] hover:text-[#0f172a] dark:hover:text-white ${PRESSABLE_TEXT}`}
            >
              {showAdvanced ? "- Hide Advanced Options" : "+ Show Advanced Options"}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden grid gap-5"
                >
                  <div>
                    <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                      Exam Name (optional)
                    </label>
                    <input
                      value={customExamName}
                      onChange={(e) => setCustomExamName(e.target.value)}
                      placeholder="CGL Tier-1"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white placeholder-[#64748b] dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                      Off Days
                    </label>
                    <div className="flex gap-2">
                      {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((label, idx) => (
                        <button
                          key={label}
                          onClick={() => toggleOffDay(idx)}
                          className={`px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-widest border ${PRESSABLE_BUTTON} ${
                            offDays.includes(idx)
                              ? "bg-blue-500 text-white border-blue-600"
                              : "bg-white dark:bg-[#1a1c1e] text-[#64748b] border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                      Paste Your Syllabus (optional)
                    </label>
                    <textarea
                      value={customPasteText}
                      onChange={(e) => setCustomPasteText(e.target.value)}
                      placeholder={"Math:\n_ Algebra\n- Equations\nPhysics:\n_ Mechanics\n- Force"}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-4 text-[14px] font-semibold text-[#0f172a] dark:text-white placeholder-[#64748b] dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[140px] leading-relaxed"
                    />
                    <p className="text-[12px] font-semibold text-[#64748b] mt-2">
                      Use Subject: for subjects, _ Chapter for chapters, and - Topic for topics.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setShowCustom(false)}
              className={`text-[13px] font-bold uppercase tracking-widest text-slate-600 dark:text-[#94a3b8] px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 ${PRESSABLE_BUTTON}`}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              onClick={handleCustomCreate}
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[14px] font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] disabled:opacity-50 ${PRESSABLE_BUTTON}`}
            >
              {isSubmitting ? "Creating..." : "Create Plan"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Configure & Generate Screen (after template selection) ──
  return (
    <div className="min-h-[85dvh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#141518] border border-slate-200 dark:border-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setSelectedTemplate(null)}
            className={`text-[13px] font-bold uppercase tracking-widest text-[#64748b] hover:text-[#0f172a] dark:hover:text-white ${PRESSABLE_TEXT}`}
          >
            ← Change Exam
          </button>
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b]">
            Almost Done
          </span>
        </div>

        {/* Selected template badge */}
        <div className="flex items-center gap-3 mb-6 mt-4">
          <PremiumEmoji name={TEMPLATE_ICONS[selectedTemplate!.id] ? TEMPLATE_ICONS[selectedTemplate!.id].name : "bookmarks"} fallback={TEMPLATE_ICONS[selectedTemplate!.id]?.fallback || "📋"} alt="" className="h-7 w-7" />
          <div>
            <h2 className="text-2xl font-bold text-[#0f172a] dark:text-white" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}>
              {selectedTemplate!.name}
            </h2>
            <p className="text-[13px] font-semibold text-[#64748b]">
              {selectedTemplate!.estimatedTopics} topics · {selectedTemplate!.examBody}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-bold">
            {error}
          </div>
        )}

        <div className="grid gap-5">
          {/* Title override */}
          <div>
            <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
              Plan Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedTemplate!.name}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white placeholder-[#64748b] dark:placeholder-[#4b5563] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Date & Goal Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={{ colorScheme: isDark ? "dark" : "light" }}
                min={new Date().toISOString().split("T")[0]}
              />
              {daysLeft !== null && daysLeft > 0 && (
                <p className="text-[12px] font-bold text-blue-600 dark:text-blue-400 mt-1">{daysLeft} days away</p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                Topics / Day
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c0c0e] px-4 py-3 text-[15px] font-semibold text-[#0f172a] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {daysLeft !== null && daysLeft > 0 && (
                <p className="text-[12px] font-bold text-[#64748b] mt-1">
                  {Math.ceil(selectedTemplate!.estimatedTopics / dailyGoal)} days needed
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`mt-2 text-left text-[13px] font-bold uppercase tracking-widest text-[#64748b] hover:text-[#0f172a] dark:hover:text-white ${PRESSABLE_TEXT}`}
          >
            {showAdvanced ? "- Hide Advanced Options" : "+ Show Advanced Options"}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div>
                  <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] dark:text-[#94a3b8] mb-2">
                    Off Days
                  </label>
                  <div className="flex gap-2">
                    {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((label, idx) => (
                      <button
                        key={label}
                        onClick={() => toggleOffDay(idx)}
                        className={`px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-widest border ${PRESSABLE_BUTTON} ${
                          offDays.includes(idx)
                            ? "bg-blue-500 text-white border-blue-600"
                            : "bg-white dark:bg-[#1a1c1e] text-[#64748b] border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary */}
          {examDate && daysLeft !== null && daysLeft > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/30 p-4"
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#0f172a] dark:text-white" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}>
                    {selectedTemplate!.estimatedTopics}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">Topics</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0f172a] dark:text-white" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}>
                    {daysLeft}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">Days Left</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#0f172a] dark:text-white" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}>
                    {dailyGoal}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">Per Day</div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setSelectedTemplate(null)}
            className={`text-[13px] font-bold uppercase tracking-widest text-slate-600 dark:text-[#94a3b8] px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 ${PRESSABLE_BUTTON}`}
            disabled={isSubmitting}
          >
            Change Exam
          </button>
          <button
            onClick={handleGenerateFromTemplate}
            disabled={isSubmitting || !examDate}
            className={`px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[13px] font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] disabled:opacity-50 ${PRESSABLE_BUTTON}`}
          >
            {isSubmitting ? "Generating..." : "Generate My Plan →"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Bulk Paste Parser (for Custom Plan) ──

interface SyllabusEntry {
  subjectName: string;
  chapterName: string;
  topicsText: string;
}

interface BulkParseResult {
  entries: SyllabusEntry[];
  invalidLines: string[];
  subjectCount: number;
  topicCount: number;
}

function parseBulkPaste(input: string): BulkParseResult {
  const entries: SyllabusEntry[] = [];
  let currentSubject = "General";
  let currentChapter = "General";
  
  const subjectsMap = new Map<string, Map<string, string[]>>();

  const lines = input.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Subject Header (e.g. "Math:")
    if (line.endsWith(":")) {
      currentSubject = line.slice(0, -1).trim() || "General";
      currentChapter = "General"; // Reset chapter on new subject
      continue;
    }

    // 2. Chapter Header (e.g. "_ Algebra")
    if (line.startsWith("_")) {
      currentChapter = line.slice(1).trim() || "General";
      continue;
    }

    // 3. Topic Line (Bullet points or plain text)
    let topicName = line;
    if (/^[-*]\s+/.test(line)) {
      topicName = line.replace(/^[-*]\s+/, "").trim();
    } else {
      // Handle Dash split syntax: "Subject - Topic" or "Chapter - Topic"
      const dashParts = line.split(/\s+-\s+/);
      if (dashParts.length >= 2) {
        currentSubject = dashParts[0].trim();
        topicName = dashParts.slice(1).join(" - ").trim();
      }
    }

    if (!topicName) continue;

    if (!subjectsMap.has(currentSubject)) {
      subjectsMap.set(currentSubject, new Map());
    }
    const chaptersMap = subjectsMap.get(currentSubject)!;
    if (!chaptersMap.has(currentChapter)) {
      chaptersMap.set(currentChapter, []);
    }
    chaptersMap.get(currentChapter)!.push(topicName);
  }

  // Convert map to flat SyllabusEntry list
  subjectsMap.forEach((chapters, subjectName) => {
    chapters.forEach((topics, chapterName) => {
      entries.push({
        subjectName,
        chapterName,
        topicsText: topics.join("\n"),
      });
    });
  });

  const parseTopics = (text: string) => text.split("\n").filter(Boolean);
  const subjectCount = subjectsMap.size;
  const topicCount = entries.reduce((total, entry) => total + parseTopics(entry.topicsText).length, 0);

  return { entries, invalidLines: [], subjectCount, topicCount };
}

// ── Main Page Component ──

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const { planId, section } = useParams<{ planId?: string; section?: string }>();
  const resolvedSection = normalizeSection(section);

  const [loading, setLoading] = useState(!planId);
  const [error, setError] = useState("");
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [planToDelete, setPlanToDelete] = useState<PlanSummary | null>(null);
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

        const plans = (await listRes.json()) as PlanSummary[];
        setPlans(plans);
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
    // ── Plans Dashboard (replaces single-plan auto-redirect) ──
    if (showQuickStart) {
      return (
        <QuickStart
          onCancel={() => setShowQuickStart(false)}
          onComplete={(id) => navigate(`/study/planner/${id}/today`, { replace: true })}
        />
      );
    }

    return (
      <div className="min-h-[80dvh] px-6 py-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold text-[#0f172a] dark:text-white tracking-tight"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
              >
                Study Plans
              </h1>
              <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                {plans.length === 0
                  ? "Create your first plan to get started."
                  : `${plans.length} active plan${plans.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              onClick={() => setShowQuickStart(true)}
              className={`px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[14px] font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] ${PRESSABLE_BUTTON}`}
            >
              + New Plan
            </button>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan, idx) => {
              const daysLeft = plan.examDate
                ? Math.ceil((new Date(plan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const percent = plan.completionPercent ?? 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => navigate(`/study/planner/${plan.id}/today`)}
                  className={`group cursor-pointer rounded-2xl p-6 border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141518] hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg hover:scale-[1.01] relative ${PRESSABLE_CARD}`}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlanToDelete(plan);
                    }}
                    className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-[12px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 ${PRESSABLE_TEXT}`}
                  >
                    Delete
                  </button>

                  {/* Exam type badge */}
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

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-[13px] font-bold text-[#64748b] dark:text-[#94a3b8] mb-4">
                    {plan.subjectCount !== undefined && (
                      <span>{plan.subjectCount} subject{plan.subjectCount !== 1 ? "s" : ""}</span>
                    )}
                    {plan.totalTopics !== undefined && plan.totalTopics > 0 && (
                      <><span>&middot;</span><span>{plan.totalTopics} topics</span></>
                    )}
                    {daysLeft !== null && daysLeft > 0 && (
                      <><span>&middot;</span><span className="text-blue-600 dark:text-blue-400">{daysLeft}d left</span></>
                    )}
                    {daysLeft !== null && daysLeft <= 0 && daysLeft !== null && (
                      <><span>&middot;</span><span className="text-red-500">{daysLeft === 0 ? "Today!" : "Passed"}</span></>
                    )}
                  </div>

                  {/* Progress Bar */}
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

            {/* New Plan Card */}
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: plans.length * 0.06 }}
              onClick={() => setShowQuickStart(true)}
              className={`rounded-2xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:scale-[1.01] bg-white/50 dark:bg-[#141518]/50 text-left min-h-[180px] flex flex-col items-center justify-center ${PRESSABLE_CARD}`}
            >
              <div className="text-4xl mb-3 opacity-60">+</div>
              <div className="text-[14px] font-bold text-[#0f172a] dark:text-white mb-1">Create New Plan</div>
              <div className="text-[13px] text-[#64748b] dark:text-[#94a3b8] text-center">
                JEE, NEET, SSC, Custom & more
              </div>
            </motion.button>
          </div>

          {/* Empty state (first time) */}
          {plans.length === 0 && (
            <div className="text-center mt-16">
              <PremiumEmoji name="library" alt="" className="h-16 w-16 mb-6 mx-auto opacity-80" />
              <h2
                className="text-2xl font-bold text-[#0f172a] dark:text-white mb-3"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.03em", wordSpacing: "0.1em" }}
              >
                No plans yet
              </h2>
              <p className="text-[14px] text-[#64748b] dark:text-[#94a3b8] mb-6 max-w-sm mx-auto">
                Pick an exam template and get a personalized study schedule in under a minute.
              </p>
              <button
                onClick={() => setShowQuickStart(true)}
                className={`px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[13px] font-bold uppercase tracking-widest shadow-[0_4px_12px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] ${PRESSABLE_BUTTON}`}
              >
                Get Started →
              </button>
              <p className="text-[13px] text-[#64748b] mt-4">
                Pre-loaded syllabuses for JEE, NEET, SSC, Railway & more.
              </p>
            </div>
          )}
        </motion.div>

        {/* Delete Plan Confirmation Modal */}
        <AnimatePresence>
          {planToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setPlanToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141518] shadow-2xl p-7"
              >
                <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#64748b] mb-3">Delete Plan</div>
                <p className="text-[15px] font-bold mb-2 text-[#0f172a] dark:text-white">
                  Are you sure you want to delete "{planToDelete.title}"?
                </p>
                <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] mb-7">
                  This will permanently remove all subjects, chapters, topics, and schedule data. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setPlanToDelete(null)}
                    disabled={isDeletingPlan}
                    className={`px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 ${PRESSABLE_BUTTON}`}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isDeletingPlan}
                    onClick={async () => {
                      setIsDeletingPlan(true);
                      try {
                        const res = await apiFetch(`${API_BASE}/plans/${planToDelete.id}`, { method: "DELETE" });
                        if (!res.ok) throw new Error("Failed to delete plan");
                        setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
                        setPlanToDelete(null);
                      } catch {
                        // Stay on modal
                      } finally {
                        setIsDeletingPlan(false);
                      }
                    }}
                    className={`px-5 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold uppercase tracking-widest shadow-md disabled:opacity-50 ${PRESSABLE_BUTTON}`}
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

  return (
    <StudyPlanner planId={planId} initialView={resolvedSection} />
  );
}
