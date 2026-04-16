import { getDb } from "../server/db";

export type PlannerEventType =
  | "topic_completed"
  | "topic_skipped"
  | "topic_status_changed"
  | "reschedule_triggered"
  | "plan_created"
  | "plan_deleted"
  | "plan_pace_changed"
  | "session_started"
  | "session_ended"
  | "streak_broken"
  | "daily_checkin";

export interface PlannerEvent {
  userId: string;
  planId: string;
  event: PlannerEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

function eventsCollection() {
  return getDb().collection<PlannerEvent>("planner_events");
}

/**
 * Fire-and-forget event logger. Never blocks the response.
 * Errors are silently logged to console, never thrown.
 */
export function logPlannerEvent(
  userId: string,
  planId: string,
  event: PlannerEventType,
  payload: Record<string, unknown> = {}
): void {
  const doc: PlannerEvent = {
    userId,
    planId,
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  void eventsCollection()
    .insertOne(doc)
    .catch((error) => {
      console.error("[PLANNER_EVENTS] Failed to log event:", event, error);
    });
}

/**
 * Query events for a specific plan. Used for future analytics.
 */
export async function getEventsByPlan(
  planId: string,
  opts?: {
    event?: PlannerEventType;
    limit?: number;
    since?: string;
  }
): Promise<PlannerEvent[]> {
  const filter: Record<string, unknown> = { planId };

  if (opts?.event) {
    filter.event = opts.event;
  }

  if (opts?.since) {
    filter.timestamp = { $gte: opts.since };
  }

  return eventsCollection()
    .find(filter)
    .sort({ timestamp: -1 })
    .limit(opts?.limit || 100)
    .toArray();
}

/**
 * Index creation for the events collection.
 * Call once during server startup.
 */
export async function ensureEventIndexes(): Promise<void> {
  try {
    const col = eventsCollection();
    await col.createIndex({ planId: 1, timestamp: -1 });
    await col.createIndex({ userId: 1, event: 1, timestamp: -1 });
    console.log("[PLANNER_EVENTS] Indexes ensured");
  } catch (error) {
    console.error("[PLANNER_EVENTS] Index creation failed:", error);
  }
}
