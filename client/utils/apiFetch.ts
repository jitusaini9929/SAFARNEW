/**
 * API Fetch Wrapper
 *
 * Automatically handles JWT access token injection and silent
 * refresh for 401 Unauthorized responses.
 */

// Access token lives in module scope and is restored via refresh on boot.
let _accessToken: string | null = null;
let _refreshPromise: Promise<RefreshResult> | null = null;
const AUTH_REQUEST_TIMEOUT_MS = 5000;

export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/+$/,
  "",
);

export type RefreshResult =
  | { status: "ok"; accessToken: string }
  | { status: "auth_failed" }
  | { status: "transient_failed" };

export type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
};

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

function clearClientAuthState(): void {
  setAccessToken(null);

  try {
    localStorage.removeItem("safar.cached_user");
  } catch {
    // Ignore storage failures while clearing auth state.
  }

  window.dispatchEvent(
    new CustomEvent("auth:changed", {
      detail: { isAuthenticated: false, user: null },
    }),
  );
}

function isTerminalRefreshFailure(status: number, errorCode: unknown): boolean {
  if (status !== 401 && status !== 409) return false;

  return (
    errorCode === "no_refresh_token" ||
    errorCode === "refresh_token_invalid" ||
    errorCode === "refresh_token_stale" ||
    errorCode === "reuse_detected"
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function doRefresh(): Promise<RefreshResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      let errorCode: unknown = null;

      try {
        const data = await res.json();
        errorCode = data?.error;
      } catch {
        // Non-JSON failures are treated as transient.
      }

      if (isTerminalRefreshFailure(res.status, errorCode)) {
        clearClientAuthState();
        return { status: "auth_failed" };
      }

      return { status: "transient_failed" };
    }

    const { accessToken } = await res.json();
    setAccessToken(accessToken);

    return { status: "ok", accessToken };
  } catch {
    return { status: "transient_failed" };
  }
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => {
      _refreshPromise = null;
    });
  }

  return _refreshPromise;
}

// apiFetch is a drop-in replacement for your current wrapper.
export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { timeoutMs, ...requestOptions } = options;
  const makeRequest = (token: string | null) =>
    fetchWithTimeout(
      url,
      {
        ...requestOptions,
        headers: {
          "Content-Type": "application/json",
          ...(requestOptions.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      },
      timeoutMs,
    );

  let res = await makeRequest(_accessToken);

  if (res.status !== 401) return res;

  const refreshResult = await refreshAccessToken();
  if (refreshResult.status !== "ok") {
    return res;
  }

  res = await makeRequest(refreshResult.accessToken);
  return res;
}

/** Kept for API compatibility with authService if it existed. */
export function resetCsrfToken(): void {
  // no-op
}
