import { Router } from "express";
import crypto from "crypto";

type LiveCountsStatsResponse = {
  success?: boolean;
  followerCount?: number;
};

const router = Router();

const DEFAULT_CHANNEL_ID = "UCsbT4wZ_FUUpJGtVa4mooow";
const LIVECOUNTS_API_HOST = "https://api.livecounts.io";
const LIVECOUNTS_SERVICE = "youtube-live-subscriber-counter";
const CACHE_TTL_MS = Number(process.env.LIVECOUNTS_CACHE_TTL_MS || 30000);

type CounterCacheEntry = {
  count: number;
  cachedAt: number;
};

const counterCache = new Map<string, CounterCacheEntry>();
const inflightFetches = new Map<string, Promise<number>>();

function hexDigest(algorithm: "sha256" | "sha384" | "ripemd160", value: string) {
  return crypto.createHash(algorithm).update(value, "utf8").digest("hex");
}

function buildLivecountsHeaders() {
  const xCatto = Date.now().toString();
  const xAjay = hexDigest("ripemd160", xCatto);
  const xMidas = hexDigest("sha384", hexDigest("sha256", `${xCatto}64`));

  return {
    "x-catto": xCatto,
    "x-ajay": xAjay,
    "x-midas": xMidas,
    "User-Agent": "+https://github.com/bitinn/node-fetch",
  };
}

async function fetchLiveSubscriberCount(channelId: string): Promise<number> {
  const endpoint = `${LIVECOUNTS_API_HOST}/${LIVECOUNTS_SERVICE}/stats/${encodeURIComponent(channelId)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(endpoint, {
      headers: buildLivecountsHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Livecounts request failed (${response.status}): ${text.slice(0, 160)}`);
    }

    const data = (await response.json()) as LiveCountsStatsResponse;
    if (!data?.success || typeof data.followerCount !== "number") {
      throw new Error("Livecounts payload missing followerCount");
    }

    return data.followerCount;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const liveCounterRoutes = router;

router.get("/youtube-subs", async (req, res) => {
  const channelId = String(req.query.channelId || process.env.LIVECOUNTS_CHANNEL_ID || DEFAULT_CHANNEL_ID).trim();

  if (!channelId) {
    return res.status(400).json({
      success: false,
      message: "Missing channelId",
    });
  }

  const now = Date.now();
  const cached = counterCache.get(channelId);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      subscriberCount: cached.count,
      channelId,
      cached: true,
      fetchedAt: new Date(cached.cachedAt).toISOString(),
      source: "livecounts",
    });
  }

  try {
    const inflight = inflightFetches.get(channelId);
    const subscriberCount = inflight
      ? await inflight
      : await (() => {
          const pending = fetchLiveSubscriberCount(channelId)
            .finally(() => {
              inflightFetches.delete(channelId);
            });
          inflightFetches.set(channelId, pending);
          return pending;
        })();

    counterCache.set(channelId, {
      count: subscriberCount,
      cachedAt: now,
    });

    return res.status(200).json({
      success: true,
      subscriberCount,
      channelId,
      cached: false,
      fetchedAt: new Date(now).toISOString(),
      source: "livecounts",
    });
  } catch (error) {
    const fallback = counterCache.get(channelId);
    if (fallback) {
      return res.status(200).json({
        success: true,
        subscriberCount: fallback.count,
        channelId,
        cached: true,
        stale: true,
        source: "livecounts-fallback-cache",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Failed to fetch live subscriber count",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
