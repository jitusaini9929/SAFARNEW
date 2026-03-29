/**
 * API Fetch Wrapper
 *
 * Automatically handles JWT access token injection and silent
 * refresh for 401 Unauthorized responses.
 */

// Access token lives in module scope and is restored via refresh on boot.
let _accessToken: string | null = null;
let _refreshPromise: Promise<RefreshResult> | null = null;

export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

export type RefreshResult =
  | { status: "ok"; accessToken: string }
  | { status: "auth_failed" }
  | { status: "transient_failed" };

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
  if (status !== 401) return false;

  return (
    errorCode === "no_refresh_token" ||
    errorCode === "refresh_token_invalid" ||
    errorCode === "reuse_detected"
  );
}

async function doRefresh(): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
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
  options: RequestInit = {},
): Promise<Response> {
  const makeRequest = (token: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

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
