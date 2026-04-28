import { cacheDel, cacheInvalidate } from "../../lib/redis-cache";
import { WISHBOX_CONFIG } from "./wishbox.config";

export function getPublicWishesCacheKey(page: number, limit: number): string {
  return `wishbox:${WISHBOX_CONFIG.eventKey}:public:page:${page}:limit:${limit}`;
}

export function getWishboxStatsCacheKey(): string {
  return `wishbox:${WISHBOX_CONFIG.eventKey}:stats`;
}

export async function invalidateWishboxPublicCaches(): Promise<void> {
  await cacheInvalidate(`wishbox:${WISHBOX_CONFIG.eventKey}:public:*`);
}

export async function invalidateWishboxStatsCache(): Promise<void> {
  await cacheDel(getWishboxStatsCacheKey());
}
