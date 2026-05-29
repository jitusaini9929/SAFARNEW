import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);
const SYLLABUS_AGENT_BASE_URL = (
  process.env.SYLLABUS_AGENT_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");
const SYLLABUS_AGENT_TIMEOUT_MS = Number.parseInt(
  process.env.SYLLABUS_AGENT_TIMEOUT_MS || "170000",
  10,
);
const SYLLABUS_AGENT_MAX_ATTEMPTS = Math.max(
  1,
  Number.parseInt(process.env.SYLLABUS_AGENT_MAX_ATTEMPTS || "3", 10),
);

function isSyllabusAgentConnectivityError(error: any): boolean {
  const causeCode = error?.cause?.code ?? error?.cause?.errno;
  return (
    causeCode === "ECONNREFUSED" ||
    causeCode === "ENOTFOUND" ||
    causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
    causeCode === "UND_ERR_SOCKET" ||
    error?.name === "AbortError" ||
    /ECONNREFUSED|fetch failed|Connect Timeout Error/i.test(
      String(error?.message ?? ""),
    )
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAgentFormData(file: Express.Multer.File): FormData {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || "application/octet-stream",
    }),
    file.originalname,
  );
  return formData;
}

async function postToSyllabusAgent(
  file: Express.Multer.File,
): Promise<globalThis.Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= SYLLABUS_AGENT_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number.isFinite(SYLLABUS_AGENT_TIMEOUT_MS)
        ? SYLLABUS_AGENT_TIMEOUT_MS
        : 170000,
    );

    try {
      return await fetch(`${SYLLABUS_AGENT_BASE_URL}/api/syllabus/import`, {
        method: "POST",
        body: buildAgentFormData(file),
        signal: controller.signal,
      });
    } catch (error: any) {
      lastError = error;
      if (
        attempt >= SYLLABUS_AGENT_MAX_ATTEMPTS ||
        !isSyllabusAgentConnectivityError(error)
      ) {
        throw error;
      }

      console.warn(
        `[SYLLABUS-IMPORT] Agent connection failed on attempt ${attempt}/${SYLLABUS_AGENT_MAX_ATTEMPTS}; retrying...`,
        error?.cause?.message || error?.message || error,
      );
      await wait(1000 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("Syllabus agent request failed");
}

router.use(requireAuth);

router.post(
  "/import",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }
      const filename = file.originalname || "";
      const extension = filename.includes(".")
        ? filename.slice(filename.lastIndexOf(".")).toLowerCase()
        : "";
      const mimeType = (file.mimetype || "").toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(extension) || !ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          message: "Only PDF, DOCX, and TXT files are supported.",
        });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
        });
      }

      const agentResponse = await postToSyllabusAgent(file);

      const payload = await agentResponse.json().catch(() => null);

      if (!agentResponse.ok) {
        const detailMessage =
          payload?.detail || payload?.message || payload?.error || "Syllabus import failed";
        return res.status(agentResponse.status).json(
          payload?.success !== undefined
            ? payload
            : {
                success: false,
                message: detailMessage,
              },
        );
      }

      return res.json(
        payload?.success !== undefined
          ? payload
          : {
              success: false,
              message: "Invalid response from syllabus agent.",
            },
      );
    } catch (error: any) {
      console.error("[SYLLABUS-IMPORT] Failed to process upload:", error);

      const causeAddr = error?.cause?.address;
      const causePort = error?.cause?.port;
      const isAgentFetchFailure = isSyllabusAgentConnectivityError(error);
      const isDnsFailure = (error?.cause?.code ?? error?.cause?.errno) === "ENOTFOUND";

      const friendly =
        isDnsFailure
          ? `Syllabus AI agent hostname could not be resolved: ${SYLLABUS_AGENT_BASE_URL}. Update SYLLABUS_AGENT_URL to the current public Railway domain.`
          : isAgentFetchFailure
            ? `Syllabus AI agent is not reachable at ${SYLLABUS_AGENT_BASE_URL}. Start the agent (e.g. on port 8000) or set SYLLABUS_AGENT_URL to the correct URL.`
            : error?.message || "Syllabus import failed";

      return res.status(isAgentFetchFailure ? 503 : 500).json({
        success: false,
        message: friendly,
        ...(process.env.NODE_ENV !== "production" && isAgentFetchFailure
          ? {
              detail: `Underlying: ${String(error?.cause?.message ?? error?.message)} ${causeAddr != null ? `@ ${causeAddr}:${causePort ?? ""}` : ""}`.trim(),
            }
          : {}),
      });
    }
  },
);

// ── AI Syllabus Structure Preview ──────────────────────────────────────────
// Accepts raw/messy syllabus text and returns a structured JSON preview
// (subjects → chapters → topics) by calling the Groq API server-side.
// The client shows the preview and lets the user confirm before importing.

const GROQ_STRUCTURE_MODEL =
  process.env.SYLLABUS_GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_STRUCTURE_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const GROQ_STRUCTURE_TIMEOUT_MS = 60_000;

function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function preprocessSyllabusTextForStructuring(raw: string): {
  cleaned: string;
  notes: string[];
} {
  const notes: string[] = [];
  let text = String(raw ?? "");

  // Normalize whitespace early.
  text = text.replace(/\r\n?/g, "\n");

  // Remove common planning/schedule metadata that is not part of a syllabus.
  const beforeMeta = text;
  text = text
    .replace(/\bStudy\s*Plan\s*:\s*/gi, "")
    .replace(/\bGoal\s*:\s*\d+\s*\/\s*day\b/gi, "")
    .replace(/\bExam\s*:\s*/gi, "")
    .replace(/\bExam\s*Date\s*:\s*/gi, "");
  if (text !== beforeMeta) {
    notes.push("Removed study-plan metadata (Study Plan / Goal / Exam labels).");
  }

  // Remove inline planned dates (e.g. "02 Jun 2026") and ISO dates.
  const month =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  const dateWord = new RegExp(`\\b\\d{1,2}\\s+${month}\\s+\\d{4}\\b`, "gi");
  const isoDate = /\b\d{4}-\d{2}-\d{2}\b/g;
  const beforeDates = text;
  text = text.replace(dateWord, "").replace(isoDate, "");
  if (text !== beforeDates) {
    notes.push("Removed planned dates from the input.");
  }

  // If the user pasted a schedule-like single paragraph with many dashes, add line breaks.
  const dashCount = (text.match(/\s-\s/g) || []).length;
  if (dashCount >= 10 && !/\n/.test(text)) {
    text = text.replace(/\s-\s/g, "\n- ");
    notes.push("Added line breaks around dash-separated items.");
  }

  // Clean up excess whitespace introduced by removals.
  text = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();

  return { cleaned: text, notes };
}

function parseGroqTpmLimitError(
  message: string,
): { limit: number; requested: number } | null {
  // Example:
  // "Request too large for model 'llama-3.1-8b-instant' ... on tokens per minute (TPM): Limit 6000, Requested 9082"
  const match = /tokens per minute \(TPM\):\s*Limit\s*(\d+)\s*,\s*Requested\s*(\d+)/i.exec(
    message,
  );
  if (!match) return null;
  const limit = Number.parseInt(match[1], 10);
  const requested = Number.parseInt(match[2], 10);
  if (!Number.isFinite(limit) || !Number.isFinite(requested)) return null;
  if (limit <= 0 || requested <= 0) return null;
  return { limit, requested };
}

type SyllabusStructureOutputMode = "full" | "chapters_only";

function normalizeLabel(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[-_>\s]+/, "")
    .trim();
}

function dedupeByLowerTrim(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const normalized = normalizeLabel(item);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function isGenericSubjectName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "general" || n === "syllabus" || n === "outline";
}

function looksLikeSubjectHeading(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  // Heuristics for competitive exam syllabus sections.
  if (/(english|language|awareness|reasoning|intelligence|aptitude|quant|mathematics|maths|science|history|geography|polity|economy|current affairs)/i.test(n)) {
    return true;
  }
  // Often comes as "<something> Syllabus".
  if (/\bsyllabus\b/i.test(n)) return true;
  // Avoid promoting very long paragraphs.
  if (n.length > 80) return false;
  return false;
}

function normalizeFullStructure(
  parsedSubjects: any,
): {
  subjects: Array<{ name: string; chapters: Array<{ name: string; topics: string[] }> }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const inputSubjects: Array<any> = Array.isArray(parsedSubjects) ? parsedSubjects : [];
  const subjects = inputSubjects
    .map((subject) => {
      const subjectName = normalizeLabel(subject?.name) || "General";
      const chaptersRaw: Array<any> = Array.isArray(subject?.chapters)
        ? subject.chapters
        : [];

      const chapters = chaptersRaw
        .map((chapter) => {
          const chapterName = normalizeLabel(chapter?.name);
          const topicsRaw: Array<any> = Array.isArray(chapter?.topics)
            ? chapter.topics
            : [];
          const topics = dedupeByLowerTrim(topicsRaw.map((t) => String(t ?? "")));
          return { name: chapterName, topics };
        })
        .filter((c) => c.name || c.topics.length > 0);

      return { name: subjectName, chapters };
    })
    .filter((s) => s.name && s.chapters.length > 0);

  // De-dupe chapter names per subject (case-insensitive), while merging topics.
  const dedupedSubjects = subjects.map((subject) => {
    const map = new Map<string, { name: string; topics: string[] }>();
    for (const chapter of subject.chapters) {
      const key = normalizeLabel(chapter.name).toLowerCase() || "general";
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          name: normalizeLabel(chapter.name) || "General",
          topics: chapter.topics,
        });
      } else {
        existing.topics = dedupeByLowerTrim([...existing.topics, ...chapter.topics]);
      }
    }
    return {
      name: subject.name,
      chapters: Array.from(map.values()).map((c) => ({
        name: c.name,
        topics: dedupeByLowerTrim(c.topics),
      })),
    };
  });

  return { subjects: dedupedSubjects, warnings };
}

function repairGeneralSubjectMisgrouping(
  subjects: Array<{ name: string; chapters: Array<{ name: string; topics: string[] }> }>,
): {
  subjects: Array<{ name: string; chapters: Array<{ name: string; topics: string[] }> }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (subjects.length !== 1) return { subjects, warnings };

  const only = subjects[0];
  if (!isGenericSubjectName(only.name)) return { subjects, warnings };

  const likelySubjects = only.chapters.filter(
    (c) => c.topics.length > 0 && looksLikeSubjectHeading(c.name),
  );
  if (likelySubjects.length < 2) return { subjects, warnings };

  const nextSubjects: Array<{
    name: string;
    chapters: Array<{ name: string; topics: string[] }>;
  }> = [];

  // Keep any non-subject-like chapters inside General.
  const remaining = only.chapters.filter(
    (c) => !looksLikeSubjectHeading(c.name),
  );
  if (remaining.length > 0) {
    nextSubjects.push({ name: only.name, chapters: remaining });
  }

  // Promote each likely subject chapter to a real subject.
  for (const chapter of likelySubjects) {
    nextSubjects.push({
      name: chapter.name,
      chapters: [
        {
          name: "General",
          topics: chapter.topics,
        },
      ],
    });
  }

  warnings.push(
    'Detected top-level sections under a generic "General" subject; promoted them into separate subjects.',
  );
  return { subjects: nextSubjects, warnings };
}

function chaptersOnlyFromParsedStructure(
  parsedSubjects: any,
): {
  subjects: Array<{ name: string; chapters: Array<{ name: string; topics: string[] }> }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const inputSubjects: Array<any> = Array.isArray(parsedSubjects) ? parsedSubjects : [];
  const cleanedSubjects = inputSubjects
    .map((subject) => {
      const subjectName = normalizeLabel(subject?.name) || "General";
      const chaptersRaw: Array<any> = Array.isArray(subject?.chapters)
        ? subject.chapters
        : [];
      const chapters = chaptersRaw
        .map((chapter) => {
          const chapterName = normalizeLabel(chapter?.name);
          const topicsRaw: Array<any> = Array.isArray(chapter?.topics)
            ? chapter.topics
            : [];
          const topics = dedupeByLowerTrim(topicsRaw.map((t) => String(t ?? "")));
          return { name: chapterName, topics };
        })
        .filter((c) => c.name || c.topics.length > 0);
      return { name: subjectName, chapters };
    })
    .filter((s) => s.name && s.chapters.length > 0);

  if (cleanedSubjects.length === 1 && isGenericSubjectName(cleanedSubjects[0].name)) {
    const general = cleanedSubjects[0];
    const promotable = general.chapters.filter((c) => c.topics.length > 0);
    const likelySubjects = promotable.filter((c) => looksLikeSubjectHeading(c.name));
    if (likelySubjects.length >= 2) {
      const nextSubjects: Array<{
        name: string;
        chapters: Array<{ name: string; topics: string[] }>;
      }> = [];

      const remainingGeneralChapters = general.chapters
        .filter((c) => c.topics.length === 0)
        .map((c) => ({ name: c.name || "General", topics: [] as string[] }))
        .filter((c) => c.name);

      if (remainingGeneralChapters.length > 0) {
        nextSubjects.push({ name: general.name, chapters: remainingGeneralChapters });
      }

      for (const chapter of likelySubjects) {
        const chapterNames = chapter.topics.length
          ? chapter.topics
          : chapter.name
            ? [chapter.name]
            : [];
        const subjectChapters = dedupeByLowerTrim(chapterNames).map((name) => ({
          name,
          topics: [] as string[],
        }));
        if (subjectChapters.length === 0) continue;
        nextSubjects.push({
          name: chapter.name,
          chapters: subjectChapters,
        });
      }

      warnings.push(
        'Detected top-level sections under a generic "General" subject; promoted them into separate subjects and converted their items into chapters.',
      );
      return { subjects: nextSubjects, warnings };
    }
  }

  // Default: convert everything into chapters-only by flattening topics into chapters.
  const subjects = cleanedSubjects.map((subject) => {
    const chapterNames: string[] = [];
    for (const chapter of subject.chapters) {
      if (chapter.topics.length > 0) {
        chapterNames.push(...chapter.topics);
      } else if (chapter.name) {
        chapterNames.push(chapter.name);
      }
    }

    const chapters = dedupeByLowerTrim(chapterNames).map((name) => ({
      name,
      topics: [] as string[],
    }));
    return { name: subject.name, chapters };
  });

  warnings.push('Converted any nested topics into chapters (chapters-only mode).');
  return { subjects, warnings };
}

const STRUCTURE_SYSTEM_PROMPT = `You are a syllabus structuring assistant for SAFAR, an Indian competitive-exam study planner.

Your job: Given messy syllabus text (from websites, PDFs, coaching notes, or typed notes), extract a clean Subject → Chapter → Topic hierarchy.

Goal: Produce a structure that is most useful for studying.
- Subjects are the highest-level buckets (e.g. English Language, Quantitative Aptitude).
- Chapters are mid-level groupings (e.g. Grammar, Algebra).
- Topics are the smallest study items (e.g. Tenses, Quadratic Equations).

Key guidance (ambiguity handling):
- Prefer NOT to invent chapters.
- If a subject section is a flat list of items with no obvious sub-groups, treat those items as TOPICS under a single placeholder chapter named "General".
- Only create multiple chapters when the input clearly indicates group headings.
- If you're unsure whether a line is a chapter or topic, prefer TOPIC and add a short warning.

Noise handling:
- Ignore non-syllabus boilerplate (exam timing, marketing lines like "candidates can go through...", etc.).
- Ignore scheduling information or planned dates if present (e.g. "02 Jun 2026", "Goal: 4/day").

Rules:
1. Return ONLY valid JSON matching this exact schema — no markdown, no extra text:
{
  "subjects": [
    {
      "name": "Subject Name",
      "chapters": [
        {
          "name": "Chapter Name",
          "topics": ["Topic 1", "Topic 2"]
        }
      ]
    }
  ],
  "warnings": []
}

2. Infer subjects from the headings. If only chapters/topics are present with no clear subject, use "General" as the subject name.
3. Keep names concise — trim whitespace, capitalise properly.
4. Deduplicate exact repeated chapter names within the same subject (case-insensitive). Deduplicate exact repeated topics within the same chapter.
5. Warnings is an array of short strings noting anything ambiguous (can be empty).
6. If you cannot extract ANY structure, return {"subjects":[],"warnings":["Could not parse syllabus text"]}.`;

router.post("/structure-preview", async (req: Request, res: Response) => {
  try {
    const { rawText, examType, planTitle, language, outputMode } = req.body as {
      rawText?: string;
      examType?: string;
      planTitle?: string;
      language?: string;
      outputMode?: SyllabusStructureOutputMode;
    };

    const text = (rawText ?? "").trim();
    if (!text) {
      return res
        .status(400)
        .json({ success: false, message: "rawText is required." });
    }
    if (text.length > 40_000) {
      return res.status(400).json({
        success: false,
        message: "Syllabus text is too long. Please trim it to under 40,000 characters.",
      });
    }

    const preprocessed = preprocessSyllabusTextForStructuring(text);
    const cleanedText = preprocessed.cleaned;
    const preprocessingWarnings = preprocessed.notes;

    // Uses its own dedicated key (SYLLABUS_GROQ_API_KEY) — isolated from Mehfil's GROQ_API_KEY
    const groqKey = (process.env.SYLLABUS_GROQ_API_KEY || "").trim();
    if (!groqKey) {
      return res.status(503).json({
        success: false,
        message:
          "Syllabus AI is not configured on the server (SYLLABUS_GROQ_API_KEY missing).",
      });
    }

    const mode: SyllabusStructureOutputMode =
      outputMode === "chapters_only" ? "chapters_only" : "full";

    const contextHints = [
      examType ? `Exam type: ${examType}` : null,
      planTitle ? `Plan title: ${planTitle}` : null,
      language ? `Language of text: ${language}` : null,
      mode === "chapters_only"
        ? "Output mode: chapters only (do not return any topics)"
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const userMessage = contextHints
      ? `${contextHints}\n\nSyllabus text:\n${cleanedText}`
      : `Syllabus text:\n${cleanedText}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GROQ_STRUCTURE_TIMEOUT_MS,
    );

    const envMaxTokens =
      parsePositiveInt(process.env.SYLLABUS_GROQ_MAX_TOKENS) ?? 2048;
    // Keep this conservative by default to fit Groq on-demand TPM limits.
    // Users on higher tiers can raise via SYLLABUS_GROQ_MAX_TOKENS.
    const requestedMaxTokens = clampInt(envMaxTokens, 256, 4096);

    async function callGroq(maxTokens: number): Promise<{
      ok: boolean;
      status: number;
      payload: any;
    }> {
      const response = await fetch(GROQ_STRUCTURE_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_STRUCTURE_MODEL,
          messages: [
            { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, payload };
    }

    let groqResult: Awaited<ReturnType<typeof callGroq>> | null = null;
    try {
      groqResult = await callGroq(requestedMaxTokens);
      if (!groqResult.ok) {
        const errMsg =
          groqResult.payload?.error?.message ||
          groqResult.payload?.message ||
          "AI request failed.";

        // If Groq rejects due to TPM-per-request budgeting, retry once with a smaller max_tokens.
        const parsed = parseGroqTpmLimitError(String(errMsg));
        if (parsed && parsed.requested > parsed.limit) {
          const overBy = parsed.requested - parsed.limit;
          const retryMaxTokens = clampInt(
            requestedMaxTokens - overBy - 256,
            256,
            requestedMaxTokens,
          );
          if (retryMaxTokens < requestedMaxTokens) {
            groqResult = await callGroq(retryMaxTokens);
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!groqResult?.ok) {
      const errMsg =
        groqResult?.payload?.error?.message ||
        groqResult?.payload?.message ||
        "AI request failed.";
      return res.status(502).json({ success: false, message: errMsg });
    }

    const rawContent: string =
      groqResult?.payload?.choices?.[0]?.message?.content ?? "";

    let parsed: { subjects?: unknown[]; warnings?: string[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return res.status(502).json({
        success: false,
        message: "AI returned an invalid response. Please try again.",
      });
    }

    if (!Array.isArray(parsed?.subjects)) {
      return res.status(502).json({
        success: false,
        message: "AI response is missing the subjects list.",
      });
    }

    let subjects = parsed.subjects as Array<{
      name: string;
      chapters: Array<{ name: string; topics: string[] }>;
    }>;
    let warnings: string[] = Array.isArray(parsed.warnings)
      ? (parsed.warnings as string[])
      : [];

    if (preprocessingWarnings.length > 0) {
      warnings = dedupeByLowerTrim([...warnings, ...preprocessingWarnings]);
    }

    if (mode === "full") {
      const normalized = normalizeFullStructure(subjects);
      subjects = normalized.subjects;
      warnings = dedupeByLowerTrim([...warnings, ...normalized.warnings]);

      const repaired = repairGeneralSubjectMisgrouping(subjects);
      subjects = repaired.subjects;
      warnings = dedupeByLowerTrim([...warnings, ...repaired.warnings]);
    }

    if (mode === "chapters_only") {
      const normalized = chaptersOnlyFromParsedStructure(subjects);
      subjects = normalized.subjects;
      warnings = dedupeByLowerTrim([...warnings, ...normalized.warnings]);
    }

    const topicCount = subjects.reduce(
      (sum, s) =>
        sum +
        s.chapters.reduce((cs, c) => cs + (c.topics?.length ?? 0), 0),
      0,
    );
    const chapterCount = subjects.reduce(
      (sum, s) => sum + s.chapters.length,
      0,
    );

    return res.json({
      success: true,
      subjects,
      warnings,
      stats: {
        subjectCount: subjects.length,
        chapterCount,
        topicCount,
      },
    });
  } catch (error: any) {
    console.error("[SYLLABUS-STRUCTURE-PREVIEW] Error:", error);
    const isAbort = error?.name === "AbortError";
    return res.status(isAbort ? 504 : 500).json({
      success: false,
      message: isAbort
        ? "AI request timed out. Please try again."
        : error?.message || "Could not structure syllabus.",
    });
  }
});

export const syllabusImportRoutes = router;
