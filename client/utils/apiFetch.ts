/**
 * CSRF-aware Fetch Wrapper
 *
 * Drop-in replacement for `fetch()` that automatically:
 *  1. Fetches a CSRF token from GET /api/csrf-token on first state-changing request
 *  2. Attaches `x-csrf-token` header to POST / PUT / PATCH / DELETE requests
 *  3. Passes all other arguments through unchanged
 *
 * Usage: import { apiFetch } from "@/utils/apiFetch";
 *        // then use `apiFetch(url, opts)` exactly like `fetch(url, opts)`
 */

const API_URL = import.meta.env.VITE_API_URL || "/api";

let csrfToken: string | null = null;
let fetchingPromise: Promise<string | null> | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function ensureCsrfToken(): Promise<string | null> {
    if (csrfToken) return csrfToken;
    if (fetchingPromise) return fetchingPromise;

    fetchingPromise = (async () => {
        try {
            const res = await fetch(`${API_URL}/csrf-token`, { credentials: "include" });
            if (!res.ok) {
                console.warn("[CSRF] Failed to fetch token, status:", res.status);
                return null;
            }
            const data = await res.json();
            csrfToken = data.csrfToken || null;
            return csrfToken;
        } catch (err) {
            console.warn("[CSRF] Failed to fetch token:", err);
            return null;
        } finally {
            fetchingPromise = null;
        }
    })();

    return fetchingPromise;
}

/**
 * CSRF-aware fetch. Automatically injects x-csrf-token header for
 * POST, PUT, PATCH, DELETE requests.
 */
export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<Response> {
    const method = (init?.method || "GET").toUpperCase();

    if (!SAFE_METHODS.has(method)) {
        const token = await ensureCsrfToken();
        if (token) {
            const headers = new Headers(init?.headers);
            headers.set("x-csrf-token", token);
            init = { ...init, headers };
        }
    }

    return fetch(input, init);
}

/** Reset cached token (call on logout). */
export function resetCsrfToken(): void {
    csrfToken = null;
    fetchingPromise = null;
}
