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
  process.env.SYLLABUS_GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_STRUCTURE_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const GROQ_STRUCTURE_TIMEOUT_MS = 60_000;

const STRUCTURE_SYSTEM_PROMPT = `You are a syllabus structuring assistant for SAFAR, an Indian competitive-exam study planner.

Your job: Given messy syllabus text (from websites, PDFs, coaching notes, or typed notes), extract a clean Subject → Chapter → Topic hierarchy.

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
3. Keep topic names concise — trim whitespace, capitalise properly.
4. Deduplicate exact repeated topics within the same chapter.
5. Warnings is an array of short strings noting anything ambiguous (can be empty).
6. If you cannot extract ANY structure, return {"subjects":[],"warnings":["Could not parse syllabus text"]}.`;

router.post("/structure-preview", async (req: Request, res: Response) => {
  try {
    const { rawText, examType, planTitle, language } = req.body as {
      rawText?: string;
      examType?: string;
      planTitle?: string;
      language?: string;
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

    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    if (!groqKey) {
      return res.status(503).json({
        success: false,
        message:
          "AI structuring is not configured on the server (GROQ_API_KEY missing).",
      });
    }

    const contextHints = [
      examType ? `Exam type: ${examType}` : null,
      planTitle ? `Plan title: ${planTitle}` : null,
      language ? `Language of text: ${language}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const userMessage = contextHints
      ? `${contextHints}\n\nSyllabus text:\n${text}`
      : `Syllabus text:\n${text}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GROQ_STRUCTURE_TIMEOUT_MS,
    );

    let groqRes: globalThis.Response;
    try {
      groqRes = await fetch(GROQ_STRUCTURE_API_URL, {
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
          max_tokens: 8192,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const groqPayload = await groqRes.json().catch(() => null);

    if (!groqRes.ok) {
      const errMsg =
        groqPayload?.error?.message ||
        groqPayload?.message ||
        "AI request failed.";
      return res.status(502).json({ success: false, message: errMsg });
    }

    const rawContent: string =
      groqPayload?.choices?.[0]?.message?.content ?? "";

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

    const subjects = parsed.subjects as Array<{
      name: string;
      chapters: Array<{ name: string; topics: string[] }>;
    }>;
    const warnings: string[] = Array.isArray(parsed.warnings)
      ? (parsed.warnings as string[])
      : [];

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
