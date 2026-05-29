import crypto from "crypto";
import "../../load-env";
import { validateBlockedWords } from "../../utils/contentFilter";
import { WISHBOX_CONFIG } from "./wishbox.config";

export type WishModerationDecision = {
  status: "approved" | "rejected" | "flagged";
  language: string;
  toxicityScore: number;
  categories: string[];
  reason: string | null;
};

export type ModerationBatchResult = {
  id: string;
  decision: WishModerationDecision;
};

const GROQ_API_KEY = String(
  process.env.Wishbox_GROQ_API_KEY || process.env.WISHBOX_GROQ_API_KEY || "",
).trim();
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_SYSTEM_PROMPT = `You are moderating birthday wishes for a teacher.

Approve only respectful birthday wishes.
Reject abusive, insulting, sexual, hateful, spam, political, religiously hateful, threatening, or nonsense messages.
Flag doubtful messages for admin review.

Return only JSON in this format:
{
  "results": [
    {
      "id": "wish_id",
      "status": "approved | rejected | flagged",
      "language": "english | hindi | hinglish | mixed | unknown",
      "toxicityScore": 0.0,
      "categories": [],
      "reason": null
    }
  ]
}`;

const BASIC_ABUSE_WORDS = [
  "fuck",
  "bitch",
  "bastard",
  "madarchod",
  "bhenchod",
  "behenchod",
  "chutiya",
  "gandu",
  "randi",
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashNormalizedMessage(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function validateWishMessage(message: string): string | null {
  const cleaned = String(message || "").trim();

  if (cleaned.length < WISHBOX_CONFIG.minMessageLength) {
    return "Wish is too short.";
  }

  if (cleaned.length > WISHBOX_CONFIG.maxMessageLength) {
    return "Wish is too long.";
  }

  const wordCount = cleaned.match(/\S+/g)?.length || 0;
  if (wordCount > WISHBOX_CONFIG.maxMessageWords) {
    return `Wish must be ${WISHBOX_CONFIG.maxMessageWords} words or fewer.`;
  }

  if (/https?:\/\//i.test(cleaned) || /www\./i.test(cleaned)) {
    return "Links are not allowed.";
  }

  if (/<[^>]*>/g.test(cleaned)) {
    return "HTML is not allowed.";
  }

  if (/\b\d{10}\b/.test(cleaned)) {
    return "Phone numbers are not allowed.";
  }

  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(cleaned)) {
    return "Emails are not allowed.";
  }

  if (/([A-Za-z0-9])\1{8,}/.test(cleaned)) {
    return "Spam text is not allowed.";
  }

  return null;
}

export function getLocalModerationDecision(message: string): WishModerationDecision | null {
  const normalized = normalizeText(message);

  const blocked = validateBlockedWords(message);
  if (blocked.isBlocked) {
    return {
      status: "rejected",
      language: "unknown",
      toxicityScore: 1,
      categories: ["abusive"],
      reason: "Contains abusive language.",
    };
  }

  const hasAbuse = BASIC_ABUSE_WORDS.some((word) =>
    new RegExp(`\\b${word}\\b`, "i").test(normalized),
  );

  if (hasAbuse) {
    return {
      status: "rejected",
      language: "unknown",
      toxicityScore: 1,
      categories: ["abusive"],
      reason: "Contains abusive language.",
    };
  }

  return null;
}

function cleanModelJson(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
}

function normalizeDecisionStatus(value: unknown): "approved" | "rejected" | "flagged" {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "approved" || normalized === "rejected" || normalized === "flagged") {
    return normalized;
  }
  return "flagged";
}

function normalizeDecision(payload: any): WishModerationDecision {
  const status = normalizeDecisionStatus(payload?.status);
  return {
    status,
    language: String(payload?.language || "unknown"),
    toxicityScore: Number(payload?.toxicityScore ?? 0),
    categories: Array.isArray(payload?.categories) ? payload.categories.map(String) : [],
    reason: payload?.reason ? String(payload.reason) : null,
  };
}

export async function moderateWishesBatch(
  wishes: Array<{ id: string; message: string }>,
): Promise<ModerationBatchResult[]> {
  if (!wishes.length) return [];

  if (!GROQ_API_KEY) {
    return wishes.map((wish) => ({
      id: wish.id,
      decision: {
        status: "flagged",
        language: "unknown",
        toxicityScore: 0,
        categories: ["manual_review"],
        reason: "AI moderation unavailable.",
      },
    }));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: GROQ_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify(
              wishes.map((wish) => ({ id: wish.id, message: wish.message })),
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Groq API failed (${response.status}): ${errorBody}`);
    }

    const data: any = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;

    if (typeof rawContent !== "string" || !rawContent.trim()) {
      throw new Error("Groq response missing classification payload");
    }

    const parsed = JSON.parse(cleanModelJson(rawContent));
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const resultMap = new Map<string, WishModerationDecision>();

    results.forEach((entry: any) => {
      const id = String(entry?.id || "").trim();
      if (!id) return;
      resultMap.set(id, normalizeDecision(entry));
    });

    return wishes.map((wish) => ({
      id: wish.id,
      decision: resultMap.get(wish.id) || {
        status: "flagged",
        language: "unknown",
        toxicityScore: 0,
        categories: ["manual_review"],
        reason: "Moderation response missing.",
      },
    }));
  } catch (error: any) {
    console.error("[WISHBOX] AI moderation failed:", error?.message || error);
    return wishes.map((wish) => ({
      id: wish.id,
      decision: {
        status: "flagged",
        language: "unknown",
        toxicityScore: 0,
        categories: ["manual_review"],
        reason: "AI moderation failed.",
      },
    }));
  } finally {
    clearTimeout(timeout);
  }
}
