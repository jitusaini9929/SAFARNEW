import { sendNotificationToUser } from "./push-notifications";

const AGGREGATION_WINDOW_MS = Number(process.env.COMMUNITY_PUSH_BATCH_WINDOW_MS || 10 * 60 * 1000);

type AggregationEntry = {
  count: number;
  lastActorName?: string | null;
  timer?: NodeJS.Timeout;
};

const likeAggregates = new Map<string, AggregationEntry>();
const commentAggregates = new Map<string, AggregationEntry>();

function scheduleFlush(
  map: Map<string, AggregationEntry>,
  userId: string,
  kind: "like" | "comment",
) {
  const entry = map.get(userId);
  if (!entry) return;

  if (entry.timer) clearTimeout(entry.timer);

  entry.timer = setTimeout(async () => {
    map.delete(userId);

    const count = entry.count;
    const actorName = entry.lastActorName?.trim();
    const title = kind === "like" ? "Mehfil likes" : "Mehfil comments";
    const body =
      count === 1 && actorName
        ? `${actorName} ${kind === "like" ? "liked" : "commented on"} your post`
        : `${count} new ${kind === "like" ? "likes" : "comments"} on your Mehfil posts`;

    await sendNotificationToUser(userId, {
      type: kind === "like" ? "community_like" : "community_comment",
      title,
      body,
      channel: "community",
      deepLink: "safar://mehfil",
      priority: "normal",
    });
  }, AGGREGATION_WINDOW_MS);
}

function queueAggregate(
  map: Map<string, AggregationEntry>,
  userId: string,
  actorName: string | null | undefined,
  kind: "like" | "comment",
) {
  const existing = map.get(userId);
  if (existing) {
    existing.count += 1;
    if (actorName) existing.lastActorName = actorName;
    return;
  }

  map.set(userId, {
    count: 1,
    lastActorName: actorName || null,
  });

  scheduleFlush(map, userId, kind);
}

export function queueCommunityLikeNotification(userId: string, actorName?: string | null) {
  if (!userId) return;
  queueAggregate(likeAggregates, userId, actorName, "like");
}

export function queueCommunityCommentNotification(userId: string, actorName?: string | null) {
  if (!userId) return;
  queueAggregate(commentAggregates, userId, actorName, "comment");
}
