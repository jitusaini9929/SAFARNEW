import { collections } from "../../db";
import { WISHBOX_CONFIG, isWishBoxAdminWindowOpen } from "./wishbox.config";
import { invalidateWishboxPublicCaches, invalidateWishboxStatsCache } from "./wishbox.cache";
import { moderateWishesBatch } from "./wishbox.moderation";

let workerTimer: NodeJS.Timeout | null = null;
let isRunning = false;

async function runModerationCycle() {
  if (isRunning) return;
  if (!isWishBoxAdminWindowOpen()) return;

  isRunning = true;

  try {
    const pending = await collections.birthdayWishes()
      .find({ eventKey: WISHBOX_CONFIG.eventKey, status: "pending" })
      .sort({ createdAt: 1 })
      .limit(WISHBOX_CONFIG.maxBatchSize)
      .toArray();

    if (!pending.length) {
      return;
    }

    const decisions = await moderateWishesBatch(
      pending.map((wish) => ({ id: wish.id, message: wish.message })),
    );

    const decisionMap = new Map(decisions.map((entry) => [entry.id, entry.decision]));
    const now = new Date();

    await Promise.all(
      pending.map(async (wish) => {
        const decision = decisionMap.get(wish.id);
        if (!decision) return;

        const publicVisible = decision.status === "approved" && !wish.isAnonymous;

        await collections.birthdayWishes().updateOne(
          { id: wish.id, eventKey: WISHBOX_CONFIG.eventKey },
          {
            $set: {
              status: decision.status,
              publicVisible,
              updatedAt: now,
              moderation: {
                method: "ai",
                language: decision.language || "unknown",
                toxicityScore: Number(decision.toxicityScore || 0),
                categories: Array.isArray(decision.categories) ? decision.categories : [],
                reason: decision.reason || null,
                checkedAt: now,
              },
            },
          },
        );
      }),
    );

    await invalidateWishboxStatsCache();
    await invalidateWishboxPublicCaches();
  } catch (error) {
    console.error("[WISHBOX] Moderation worker failed:", error);
  } finally {
    isRunning = false;
  }
}

export function startWishboxWorker(): void {
  if (workerTimer) return;

  if (!WISHBOX_CONFIG.enabled) {
    return;
  }

  workerTimer = setInterval(runModerationCycle, WISHBOX_CONFIG.moderationIntervalMs);
  setTimeout(runModerationCycle, 1500);
}
