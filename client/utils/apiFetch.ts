/**
 * API Fetch Wrapper
 *
 * Automatically handles JWT access token injection and silent 
 * refresh for 401 Unauthorized responses.
 */

// Access token lives in module scope — survives re-renders, dies on page refresh
let _accessToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // sends the httpOnly RT cookie automatically
    });

    if (!res.ok) {
      // Refresh failed (expired, reuse detected) — force sign-out
      setAccessToken(null);
      localStorage.removeItem('safar.cached_user');
      window.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
      return null;
    }

    const { accessToken } = await res.json();
    setAccessToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

// apiFetch is a drop-in replacement for your current wrapper.
// Signature is identical — all existing call sites work unchanged.
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const makeRequest = (token: string | null) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Keep credentials: include for any non-JWT cookie needs (e.g. CSRF)
      credentials: 'include',
    });

  // First attempt
  let res = await makeRequest(_accessToken);

  if (res.status !== 401) return res;

  // AT expired or missing — attempt silent refresh.
  // Queue concurrent 401s: if 3 calls fire at once, only ONE refresh request goes out.
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => {
      _refreshPromise = null;
    });
  }

  const newToken = await _refreshPromise;

  if (!newToken) {
    // Refresh failed — return the 401 as-is so callers can react
    return res;
  }

  // Retry original request with new token
  res = await makeRequest(newToken);
  return res;
}

/** Kept for API compatibility with authService if it existed. */
export function resetCsrfToken(): void {
  // no-op
}
