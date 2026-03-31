import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import StudyPlanner from "../../sylaabus planner/StudyPlanner";

interface PlanSummary {
  id: string;
  title: string;
}

interface PlannerPlanResponse {
  id: string;
  subjects: Array<{
    id: string;
    name: string;
    chapters: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

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

type PlannerSection = "today" | "plan" | "syllabus" | "calendar";

function normalizeSection(section?: string): PlannerSection {
  if (section === "plan" || section === "syllabus" || section === "calendar") {
    return section;
  }
  return "today";
}

function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
}

function parseTopics(input: string): string[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseBulkPaste(input: string): BulkParseResult {
  const entriesMap = new Map<string, { subjectName: string; topics: string[] }>();
  const invalidLines: string[] = [];
  let currentSubject: string | null = null;

  const addSubject = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return null;
    if (!entriesMap.has(normalized)) {
      entriesMap.set(normalized, { subjectName: normalized, topics: [] });
    }
    return normalized;
  };

  const addTopic = (subject: string, topic: string) => {
    const normalizedTopic = topic.trim();
    if (!normalizedTopic) return;
    const entry = entriesMap.get(subject);
    if (!entry) return;
    entry.topics.push(normalizedTopic);
  };

  const lines = input.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.endsWith(":")) {
      const subject = addSubject(line.slice(0, -1));
      if (subject) currentSubject = subject;
      continue;
    }

    if (currentSubject && /^[-*]\s+/.test(line)) {
      addTopic(currentSubject, line.replace(/^[-*]\s+/, ""));
      continue;
    }

    const dashParts = line.split(/\s*-\s*/).filter(Boolean);
    if (dashParts.length >= 2) {
      const subject = addSubject(dashParts[0]);
      if (!subject) {
        invalidLines.push(line);
        continue;
      }
      currentSubject = subject;
      for (const topic of dashParts.slice(1)) {
        addTopic(subject, topic);
      }
      continue;
    }

    const colonParts = line.split(/\s*:\s*/).filter(Boolean);
    if (colonParts.length >= 2) {
      const subject = addSubject(colonParts[0]);
      if (!subject) {
        invalidLines.push(line);
        continue;
      }
      currentSubject = subject;
      const topics = colonParts.slice(1).join(":");
      for (const topic of topics.split(/[,;|]/)) {
        addTopic(subject, topic);
      }
      continue;
    }

    if (currentSubject) {
      addTopic(currentSubject, line);
      continue;
    }

    invalidLines.push(line);
  }

  const entries: SyllabusEntry[] = Array.from(entriesMap.values()).map((entry) => ({
    subjectName: entry.subjectName,
    chapterName: "",
    topicsText: entry.topics.join("\n"),
  }));

  const subjectCount = entries.length;
  const topicCount = entries.reduce((total, entry) => total + parseTopics(entry.topicsText).length, 0);

  return { entries, invalidLines, subjectCount, topicCount };
}

function SetupWizard({
  onCancel,
  onComplete,
}: {
  onCancel: () => void;
  onComplete: (planId: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [wizardError, setWizardError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState("");

  const [title, setTitle] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [description, setDescription] = useState("");

  const [dailyGoal, setDailyGoal] = useState(3);
  const [offDays, setOffDays] = useState<number[]>([]);
  const [includeRevision, setIncludeRevision] = useState(false);
  const [lockExistingDates, setLockExistingDates] = useState(true);

  const [inputMode, setInputMode] = useState<"quick" | "bulk">("quick");
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [entries, setEntries] = useState<SyllabusEntry[]>([
    { subjectName: "", chapterName: "", topicsText: "" },
  ]);
  const [quickTopicInput, setQuickTopicInput] = useState<Record<number, string>>({});

  const bulkParse = useMemo(() => parseBulkPaste(bulkPasteText), [bulkPasteText]);
  const effectiveEntries = useMemo(
    () => (inputMode === "bulk" ? bulkParse.entries : entries),
    [inputMode, bulkParse.entries, entries]
  );
  const subjectCount = useMemo(
    () => effectiveEntries.filter((entry) => entry.subjectName.trim()).length,
    [effectiveEntries]
  );
  const topicCount = useMemo(
    () => effectiveEntries.reduce((total, entry) => total + parseTopics(entry.topicsText).length, 0),
    [effectiveEntries]
  );
  const daysLeft = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    const target = new Date(examDate);
    if (Number.isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [examDate]);

  function updateEntry(index: number, patch: Partial<typeof entries[number]>) {
    setEntries((prev) =>
      prev.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry))
    );
  }

  function updateEntryTopics(index: number, topics: string[]) {
    updateEntry(index, { topicsText: topics.join("\n") });
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== index));
    setQuickTopicInput((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function addEntry() {
    setEntries((prev) => [...prev, { subjectName: "", chapterName: "", topicsText: "" }]);
  }

  function addQuickTopics(index: number) {
    const input = quickTopicInput[index] || "";
    const topics = parseTopics(input);
    if (topics.length === 0) return;
    const currentTopics = parseTopics(entries[index]?.topicsText || "");
    updateEntryTopics(index, [...currentTopics, ...topics]);
    setQuickTopicInput((prev) => ({ ...prev, [index]: "" }));
  }

  function removeQuickTopic(index: number, topic: string) {
    const currentTopics = parseTopics(entries[index]?.topicsText || "");
    const targetIndex = currentTopics.indexOf(topic);
    if (targetIndex === -1) return;
    currentTopics.splice(targetIndex, 1);
    updateEntryTopics(index, currentTopics);
  }

  function toggleOffDay(day: number) {
    setOffDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function validateStep(nextStep: number): boolean {
    setWizardError("");

    if (nextStep === 2) {
      if (!title.trim()) {
        setWizardError("Add a plan title");
        return false;
      }
      if (!examDate) {
        setWizardError("Select an exam date");
        return false;
      }
      return true;
    }

    if (nextStep === 3) {
      if (!Number.isFinite(dailyGoal) || dailyGoal <= 0) {
        setWizardError("Daily goal must be greater than 0");
        return false;
      }
      if (!isFutureDate(examDate)) {
        setWizardError("Exam date must be in the future");
        return false;
      }
      return true;
    }

    if (nextStep === 4) {
      if (subjectCount === 0 || topicCount === 0) {
        setWizardError("Add at least 1 subject and 1 topic");
        return false;
      }
      return true;
    }

    return true;
  }

  async function createPlanAndSyllabus(): Promise<string> {
    const createRes = await apiFetch(`${API_BASE}/plans`, {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        examType: examName.trim(),
        examDate,
        description: description.trim(),
        dailyGoal,
        offDays,
      }),
    });

    if (!createRes.ok) {
      const payload = await createRes.json().catch(() => ({}));
      throw new Error(payload?.message || "Failed to create plan");
    }

    const created = (await createRes.json()) as PlannerPlanResponse;
    const planId = created.id;

    for (const entry of effectiveEntries) {
      const subjectName = entry.subjectName.trim();
      const topics = parseTopics(entry.topicsText);
      if (!subjectName || topics.length === 0) continue;

      const subjectRes = await apiFetch(`${API_BASE}/plans/${planId}/subjects`, {
        method: "POST",
        body: JSON.stringify({ name: subjectName }),
      });

      if (!subjectRes.ok) {
        const payload = await subjectRes.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to add subject");
      }

      const planWithSubject = (await subjectRes.json()) as PlannerPlanResponse;
      const subject = planWithSubject.subjects[planWithSubject.subjects.length - 1];
      if (!subject) {
        throw new Error("Failed to create subject");
      }

      const chapterName = entry.chapterName.trim() || "General";
      const chapterRes = await apiFetch(`${API_BASE}/plans/${planId}/subjects/${subject.id}/chapters`, {
        method: "POST",
        body: JSON.stringify({ name: chapterName }),
      });

      if (!chapterRes.ok) {
        const payload = await chapterRes.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to add chapter");
      }

      const planWithChapter = (await chapterRes.json()) as PlannerPlanResponse;
      const updatedSubject = planWithChapter.subjects.find((item) => item.id === subject.id);
      const chapter = updatedSubject?.chapters[updatedSubject.chapters.length - 1];
      if (!chapter) {
        throw new Error("Failed to create chapter");
      }

      for (const topicName of topics) {
        const topicRes = await apiFetch(
          `${API_BASE}/plans/${planId}/subjects/${subject.id}/chapters/${chapter.id}/topics`,
          {
            method: "POST",
            body: JSON.stringify({ name: topicName }),
          }
        );

        if (!topicRes.ok) {
          const payload = await topicRes.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to add topic");
        }
      }
    }

    return planId;
  }

  async function handleGenerate() {
    setWizardError("");
    setScheduleError("");
    setIsSubmitting(true);

    try {
      const planId = await createPlanAndSyllabus();
      setCreatedPlanId(planId);

      const autoRes = await apiFetch(`${API_BASE}/plans/${planId}/auto-distribute`, {
        method: "POST",
        body: JSON.stringify({
          includeRevisionNeeded: includeRevision,
          lockExistingDates,
        }),
      });

      if (!autoRes.ok) {
        const payload = await autoRes.json().catch(() => ({}));
        setScheduleError(payload?.message || "Could not build the schedule yet.");
        return;
      }

      onComplete(planId);
    } catch (err: any) {
      setWizardError(err?.message || "Unable to create plan");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-[#111214] border border-slate-200 dark:border-slate-800 shadow-[0_20px_40px_rgba(15,23,42,0.2)] p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[12px] font-black uppercase tracking-widest text-[#8b919e]">Step {step} of 4</div>
          <button
            onClick={onCancel}
            className="text-[11px] font-black uppercase tracking-widest text-[#64748b]"
          >
            Cancel
          </button>
        </div>

        {wizardError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-bold">
            {wizardError}
          </div>
        )}

        {scheduleError && createdPlanId && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 font-bold">
            {scheduleError}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Set your target first</h2>
            <p className="text-sm text-[#6b7280] mb-6">
              Your schedule will be built backward from this date.
            </p>
            <div className="grid gap-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Semester Finals Plan"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
              />
              <input
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="UPSC Prelims 2026"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
              />
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold min-h-[100px]"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Study capacity</h2>
            <p className="text-sm text-[#6b7280] mb-6">
              A realistic plan is better than an ambitious one you will not follow.
            </p>
            <div className="grid gap-6">
              <div>
                <label className="text-sm font-semibold text-[#374151]">
                  How many topics can you realistically study per day?
                </label>
                <input
                  type="number"
                  min={1}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
                />
              </div>

              <div>
                <div className="text-sm font-semibold text-[#374151] mb-2">Off days</div>
                <div className="flex flex-wrap gap-2">
                  {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((label, idx) => (
                    <button
                      key={label}
                      onClick={() => toggleOffDay(idx)}
                      className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${offDays.includes(idx)
                          ? "bg-blue-600 text-white border-blue-700"
                          : "bg-white text-slate-600 border-slate-200"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setIncludeRevision((prev) => !prev)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border ${includeRevision
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-white text-slate-600 border-slate-200"
                    }`}
                >
                  Include revision topics
                </button>
                <button
                  onClick={() => setLockExistingDates((prev) => !prev)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border ${lockExistingDates
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-white text-slate-600 border-slate-200"
                    }`}
                >
                  Keep already planned dates
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Add subjects and topics</h2>
            <p className="text-sm text-[#6b7280] mb-4">
              Add your subjects and topics. Start simple and refine later.
            </p>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex p-1 rounded-full border border-slate-200 bg-slate-50">
                {([
                  ["quick", "Quick Add"],
                  ["bulk", "Bulk Paste"],
                ] as Array<["quick" | "bulk", string]>).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setInputMode(value)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${inputMode === value
                        ? "bg-blue-600 text-white"
                        : "text-slate-600"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {inputMode === "quick" ? "Best for small lists" : "Best for long syllabuses"}
              </div>
            </div>

            {inputMode === "quick" && (
              <div className="grid gap-6">
                {entries.map((entry, index) => {
                  const topics = parseTopics(entry.topicsText);
                  return (
                    <div key={`entry-${index}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          Subject {index + 1}
                        </div>
                        {entries.length > 1 && (
                          <button
                            onClick={() => removeEntry(index)}
                            className="text-xs font-bold uppercase tracking-widest text-red-500"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3">
                        <input
                          value={entry.subjectName}
                          onChange={(e) => updateEntry(index, { subjectName: e.target.value })}
                          placeholder="Subject name"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
                        />
                        <input
                          value={entry.chapterName}
                          onChange={(e) => updateEntry(index, { chapterName: e.target.value })}
                          placeholder="Chapter name (optional)"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            value={quickTopicInput[index] || ""}
                            onChange={(e) => setQuickTopicInput((prev) => ({ ...prev, [index]: e.target.value }))}
                            placeholder="Type a topic and press Add"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold"
                          />
                          <button
                            onClick={() => addQuickTopics(index)}
                            className="px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest"
                          >
                            Add topic
                          </button>
                        </div>
                        <textarea
                          value={entry.topicsText}
                          onChange={(e) => updateEntry(index, { topicsText: e.target.value })}
                          placeholder="Or paste topics here, one per line"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold min-h-[120px]"
                        />
                        {topics.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {topics.map((topic) => (
                              <button
                                key={`${topic}-${index}`}
                                onClick={() => removeQuickTopic(index, topic)}
                                className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 text-slate-600"
                              >
                                {topic} x
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={addEntry}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-600"
                >
                  Add another subject
                </button>
              </div>
            )}

            {inputMode === "bulk" && (
              <div className="grid gap-4">
                <textarea
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder="Math - Algebra - Trigonometry - Calculus\nPhysics - Kinematics - Current Electricity"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 font-semibold min-h-[180px]"
                />
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Subjects: {bulkParse.subjectCount}
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Topics: {bulkParse.topicCount}
                  </div>
                  <div className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Invalid: {bulkParse.invalidLines.length}
                  </div>
                </div>
                {bulkParse.invalidLines.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 font-semibold">
                    Invalid lines: {bulkParse.invalidLines.slice(0, 3).join(" | ")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-[#1f2937] mb-2">Review and generate</h2>
            <p className="text-sm text-[#6b7280] mb-6">
              We will schedule unfinished topics from today until your exam date, skipping off days.
            </p>
            <div className="rounded-2xl border border-slate-200 p-4 grid gap-2 text-sm">
              <div className="flex justify-between"><span>Plan title</span><strong>{title || "-"}</strong></div>
              <div className="flex justify-between"><span>Exam name</span><strong>{examName || "-"}</strong></div>
              <div className="flex justify-between"><span>Exam date</span><strong>{examDate || "-"}</strong></div>
              <div className="flex justify-between"><span>Days left</span><strong>{daysLeft ?? "-"}</strong></div>
              <div className="flex justify-between"><span>Daily goal</span><strong>{dailyGoal}</strong></div>
              <div className="flex justify-between"><span>Off days</span><strong>{offDays.length ? offDays.length : "None"}</strong></div>
              <div className="flex justify-between"><span>Subjects</span><strong>{subjectCount}</strong></div>
              <div className="flex justify-between"><span>Topics</span><strong>{topicCount}</strong></div>
              <div className="flex justify-between"><span>Include revision</span><strong>{includeRevision ? "Yes" : "No"}</strong></div>
              <div className="flex justify-between"><span>Keep planned dates</span><strong>{lockExistingDates ? "Yes" : "No"}</strong></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-600"
              disabled={isSubmitting}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 && (
            <button
              onClick={() => {
                if (validateStep(step + 1)) setStep((prev) => prev + 1);
              }}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest"
            >
              Continue
            </button>
          )}

          {step === 4 && !scheduleError && (
            <button
              onClick={handleGenerate}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Generating..." : "Generate Plan"}
            </button>
          )}

          {step === 4 && scheduleError && createdPlanId && (
            <button
              onClick={() => onComplete(createdPlanId)}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest"
            >
              Continue to Planner
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudyPlannerPage() {
  const navigate = useNavigate();
  const { planId, section } = useParams<{ planId?: string; section?: string }>();
  const resolvedSection = normalizeSection(section);

  const [loading, setLoading] = useState(!planId);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);

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
        if (plans.length > 0) {
          navigate(`/study/planner/${plans[0].id}/today`, { replace: true });
          return;
        }
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
    if (showWizard) {
      return (
        <SetupWizard
          onCancel={() => setShowWizard(false)}
          onComplete={(id) => navigate(`/study/planner/${id}/today`, { replace: true })}
        />
      );
    }

    return (
      <div className="min-h-[70dvh] flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
          <h1 className="text-2xl font-bold text-[#0f172a]">Create your first study plan</h1>
          <p className="text-sm text-[#64748b] mt-2">
            Build a realistic study schedule for your exam and track what to study each day.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="mt-6 px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest"
          >
            Create Plan
          </button>
          <p className="text-xs text-[#64748b] mt-3">
            You will set your exam date, subjects, and daily study target.
          </p>
          {plans.length > 0 && (
            <button
              onClick={() => navigate(`/study/planner/${plans[0].id}/today`, { replace: true })}
              className="mt-4 text-xs font-bold uppercase tracking-widest text-[#64748b]"
            >
              Open existing plan
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <StudyPlanner planId={planId} initialView={resolvedSection} />
  );
}
