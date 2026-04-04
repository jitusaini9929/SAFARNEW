import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";
import { uploadAvatar, uploadGeneral } from "../middleware/upload";
import { deleteOldFile } from "../utils/fileHelper";

export const uploadRoutes = Router();
const ALLOW_LEGACY_BASE64_UPLOADS = process.env.ALLOW_LEGACY_BASE64_UPLOADS !== "false";
const LEGACY_METRICS_DEFAULT_WINDOW_DAYS = 30;

type LegacyUsageEvent = "legacy_write" | "legacy_write_blocked" | "legacy_read" | "legacy_read_miss";

type LegacyUsageMetricDoc = {
  event: LegacyUsageEvent;
  day: string;
  requestCount?: number;
  totalBytes?: number;
  mimeCount?: Record<string, number>;
  sourceCount?: Record<string, number>;
  lastSeenAt?: Date;
};

function sanitizeMetricKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "unknown";
}

function getUtcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getRecentUtcDayKeys(days: number): string[] {
  const safeDays = Math.max(1, Math.floor(days));
  const today = new Date();
  const keys: string[] = [];

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - offset);
    keys.push(getUtcDayKey(d));
  }

  return keys;
}

function resolveWindowDays(raw: unknown, fallback = LEGACY_METRICS_DEFAULT_WINDOW_DAYS): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(7, Math.min(90, Math.floor(parsed)));
}

function toFiniteBytes(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

async function recordLegacyUsage(
  event: LegacyUsageEvent,
  details: { mimeType?: string | null; sizeBytes?: number | null; source: string },
): Promise<void> {
  const now = new Date();
  const day = getUtcDayKey(now);
  const mimeKey = sanitizeMetricKey(String(details.mimeType || "unknown"));
  const sourceKey = sanitizeMetricKey(String(details.source || "unknown"));

  await collections.legacyUploadUsageDaily().updateOne(
    { event, day },
    {
      $setOnInsert: {
        event,
        day,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
        lastSeenAt: now,
      },
      $inc: {
        requestCount: 1,
        totalBytes: toFiniteBytes(details.sizeBytes),
        [`mimeCount.${mimeKey}`]: 1,
        [`sourceCount.${sourceKey}`]: 1,
      },
    },
    { upsert: true },
  );
}

function queueLegacyUsageMetric(
  event: LegacyUsageEvent,
  details: { mimeType?: string | null; sizeBytes?: number | null; source: string },
): void {
  void recordLegacyUsage(event, details).catch((error) => {
    console.error("[UPLOAD] Failed to record legacy usage metric", { event, error });
  });
}

function sumMetric(
  byDay: Map<string, LegacyUsageMetricDoc>,
  dayKeys: string[],
  field: "requestCount" | "totalBytes",
): number {
  return dayKeys.reduce((sum, dayKey) => sum + Number(byDay.get(dayKey)?.[field] || 0), 0);
}

uploadRoutes.use(requireAuth);

uploadRoutes.get("/legacy-usage-metrics", async (req: Request, res: Response) => {
  try {
    const windowDays = resolveWindowDays(req.query.days, LEGACY_METRICS_DEFAULT_WINDOW_DAYS);
    const compareDays = Math.max(windowDays, 14);
    const compareDayKeys = getRecentUtcDayKeys(compareDays);
    const metricStartDay = compareDayKeys[0];

    const rows = (await collections.legacyUploadUsageDaily()
      .find(
        { day: { $gte: metricStartDay } },
        { projection: { _id: 0 } },
      )
      .sort({ day: 1, event: 1 })
      .toArray()) as unknown as LegacyUsageMetricDoc[];

    const byEvent = new Map<LegacyUsageEvent, Map<string, LegacyUsageMetricDoc>>();

    for (const row of rows) {
      if (!byEvent.has(row.event)) {
        byEvent.set(row.event, new Map<string, LegacyUsageMetricDoc>());
      }
      byEvent.get(row.event)!.set(row.day, row);
    }

    const windowDayKeys = compareDayKeys.slice(-windowDays);
    const current7DayKeys = compareDayKeys.slice(-7);
    const previous7DayKeys = compareDayKeys.slice(-14, -7);

    const summarizeEvent = (event: LegacyUsageEvent) => {
      const byDay = byEvent.get(event) ?? new Map<string, LegacyUsageMetricDoc>();
      const windowRequests = sumMetric(byDay, windowDayKeys, "requestCount");
      const windowBytes = sumMetric(byDay, windowDayKeys, "totalBytes");
      const current7Requests = sumMetric(byDay, current7DayKeys, "requestCount");
      const previous7Requests = sumMetric(byDay, previous7DayKeys, "requestCount");
      const current7Bytes = sumMetric(byDay, current7DayKeys, "totalBytes");
      const previous7Bytes = sumMetric(byDay, previous7DayKeys, "totalBytes");

      const requestDecayPercent =
        previous7Requests > 0
          ? Number((((previous7Requests - current7Requests) / previous7Requests) * 100).toFixed(2))
          : null;
      const bytesDecayPercent =
        previous7Bytes > 0
          ? Number((((previous7Bytes - current7Bytes) / previous7Bytes) * 100).toFixed(2))
          : null;

      let trend: "insufficient_history" | "decaying" | "growing" | "flat" = "insufficient_history";
      if (requestDecayPercent !== null) {
        if (requestDecayPercent > 0) trend = "decaying";
        else if (requestDecayPercent < 0) trend = "growing";
        else trend = "flat";
      }

      return {
        windowDays,
        totalRequests: windowRequests,
        totalBytes: windowBytes,
        current7DaysRequests: current7Requests,
        previous7DaysRequests: previous7Requests,
        current7DaysBytes: current7Bytes,
        previous7DaysBytes: previous7Bytes,
        requestDecayPercent,
        bytesDecayPercent,
        trend,
      };
    };

    const daily = windowDayKeys.map((day) => {
      const getEventMetric = (event: LegacyUsageEvent) => byEvent.get(event)?.get(day);
      const write = getEventMetric("legacy_write");
      const writeBlocked = getEventMetric("legacy_write_blocked");
      const read = getEventMetric("legacy_read");
      const readMiss = getEventMetric("legacy_read_miss");

      return {
        day,
        legacyWriteRequests: Number(write?.requestCount || 0),
        legacyWriteBytes: Number(write?.totalBytes || 0),
        legacyWriteBlockedRequests: Number(writeBlocked?.requestCount || 0),
        legacyReadRequests: Number(read?.requestCount || 0),
        legacyReadBytes: Number(read?.totalBytes || 0),
        legacyReadMissRequests: Number(readMiss?.requestCount || 0),
      };
    });

    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      windowDays,
      summary: {
        legacyWrite: summarizeEvent("legacy_write"),
        legacyWriteBlocked: summarizeEvent("legacy_write_blocked"),
        legacyRead: summarizeEvent("legacy_read"),
        legacyReadMiss: summarizeEvent("legacy_read_miss"),
      },
      daily,
    });
  } catch (error: any) {
    console.error("❌ Failed to build legacy usage metrics:", error);
    return res.status(500).json({ success: false, message: "Failed to load legacy usage metrics" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/upload/avatar — Upload or replace user avatar (multipart/form-data)
// ──────────────────────────────────────────────────────────────────────────────
uploadRoutes.post("/avatar", ...uploadAvatar, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const processedFile = (req as any).processedFile;

    if (!processedFile) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Get current avatar so the old asset can be cleaned up after replacement
    const user = await collections.users().findOne(
      { id: userId },
      { projection: { avatar: 1 } }
    );

    await deleteOldFile(user?.avatar);

    // Save only the public URL to MongoDB
    await collections.users().updateOne(
      { id: userId },
      { $set: { avatar: processedFile.urlPath } }
    );

    return res.json({
      success: true,
      url: processedFile.urlPath,
    });
  } catch (error: any) {
    console.error("❌ Avatar upload failed:", error);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/upload — General file upload (backward compatible)
// Accepts EITHER:
//   • multipart/form-data with field "file" (new disk-based path)
//   • JSON body with { data, mimeType } (legacy base64 path — kept for audio in Sandesh)
// ──────────────────────────────────────────────────────────────────────────────
uploadRoutes.post("/", ...uploadGeneral, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const processedFile = (req as any).processedFile;

    // ── New path: multipart/form-data upload was processed by multer+sharp ──
    if (processedFile) {
      return res.json({
        success: true,
        url: processedFile.urlPath,
        id: processedFile.filename,
      });
    }

    // ── Legacy path: JSON body with base64 data (kept for backward compat) ──
    if (!ALLOW_LEGACY_BASE64_UPLOADS) {
      const attemptedSize = typeof req.body?.data === "string"
        ? Math.ceil((req.body.data.length * 3) / 4)
        : 0;
      queueLegacyUsageMetric("legacy_write_blocked", {
        mimeType: req.body?.mimeType,
        sizeBytes: attemptedSize,
        source: "upload_route",
      });

      return res.status(410).json({
        success: false,
        message: "Legacy JSON uploads are deprecated. Please upload using multipart/form-data.",
      });
    }

    res.set("X-Upload-Legacy-Path", "base64-json");
    res.set("Warning", '299 - "Legacy base64 upload path is deprecated and will be removed."');

    const { data, mimeType } = req.body;

    if (!data || !mimeType) {
      return res.status(400).json({ success: false, message: "Missing data or mimeType" });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac",
    ];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Allowed: Images & Audio (MP3, WAV, OGG, M4A, AAC)",
      });
    }

    const sizeInBytes = Math.ceil((data.length * 3) / 4);
    const maxSizeBytes = 5 * 1024 * 1024;
    if (sizeInBytes > maxSizeBytes) {
      return res.status(400).json({ success: false, message: "File too large. Max 5MB." });
    }

    const imageId = uuidv4();

    console.warn("⚠️ [UPLOAD] Deprecated base64 upload path used", {
      userId,
      mimeType,
      sizeInBytes,
    });

    await collections.uploadedImages().insertOne({
      id: imageId,
      user_id: userId,
      data,
      mime_type: mimeType,
      size_bytes: sizeInBytes,
      created_at: new Date(),
    });

    queueLegacyUsageMetric("legacy_write", {
      mimeType,
      sizeBytes: sizeInBytes,
      source: "upload_route",
    });

    const imageUrl = `/api/images/${imageId}`;
    res.json({ success: true, url: imageUrl, id: imageId });
  } catch (error: any) {
    console.error("❌ Upload failed:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/images/:id — Serve images from MongoDB (legacy base64 storage)
// ──────────────────────────────────────────────────────────────────────────────
export const imageServeRouter = Router();

imageServeRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const image = await collections.uploadedImages().findOne({ id });

    if (!image) {
      queueLegacyUsageMetric("legacy_read_miss", {
        mimeType: "unknown",
        sizeBytes: 0,
        source: "image_serve_route",
      });
      return res.status(404).json({ message: "Image not found" });
    }

    const imageBuffer = Buffer.from(image.data, "base64");

    queueLegacyUsageMetric("legacy_read", {
      mimeType: image.mime_type,
      sizeBytes: imageBuffer.length,
      source: "image_serve_route",
    });

    res.set({
      "Content-Type": image.mime_type,
      "Content-Length": imageBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    res.send(imageBuffer);
  } catch (error: any) {
    console.error("❌ Image serve failed:", error);
    res.status(500).json({ message: "Failed to serve image" });
  }
});
