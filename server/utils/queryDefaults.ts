/**
 * Shared constants for MongoDB query safety and HTTP cache defaults.
 *
 * maxTimeMS — Prevents slow/runaway queries from hogging connections forever.
 * A 10-second limit is generous enough for all our aggregations while still
 * protecting against pathological edge cases (missing index, collection scan, etc.).
 */

/** Default MongoDB query timeout in milliseconds. */
export const QUERY_TIMEOUT_MS = 10_000;

/** Aggressive timeout for simple findOne/countDocuments operations. */
export const QUERY_FAST_TIMEOUT_MS = 5_000;

/** HTTP Cache-Control header values for private user data. */
export const CACHE_CONTROL = {
    /** User-specific data that changes infrequently (moods history, journal). */
    SHORT: 'private, no-cache',
    /** Computed stats that are expensive to generate (focus stats, streaks). */
    MEDIUM: 'private, max-age=15',
    /** Expensive reports with their own server-side cache (analytics). */
    LONG: 'private, max-age=300',
} as const;
