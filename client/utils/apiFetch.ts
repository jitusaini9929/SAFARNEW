/**
 * API Fetch Wrapper
 *
 * Drop-in replacement for `fetch()`.
 * CSRF protection is currently PAUSED — this is a plain passthrough.
 * To re-enable CSRF, restore the token-fetching logic.
 */

export async function apiFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<Response> {
    return fetch(input, init);
}

/** No-op — CSRF is paused. Kept for API compatibility with authService. */
export function resetCsrfToken(): void {
    // no-op
}
