import { apiFetch, API_BASE, refreshAccessToken, resetCsrfToken, setAccessToken } from "@/utils/apiFetch";
import { User, Streak } from "@shared/api";

interface AuthResponse {
  user: User;
  streaks?: Streak;
}

type GetCurrentUserOptions = {
  force?: boolean;
};

const AUTH_CACHE_KEY = "safar.cached_user";
const CURRENT_USER_CACHE_TTL_MS = 60 * 1000;
let initAuthPromise: Promise<User | null> | null = null;
let currentUserPromise: Promise<AuthResponse | null> | null = null;
let lastCurrentUserResult: AuthResponse | null = null;
let lastCurrentUserFetchedAt = 0;

function setCurrentUserCache(result: AuthResponse | null) {
  lastCurrentUserResult = result;
  lastCurrentUserFetchedAt = Date.now();
}

function clearCurrentUserCache() {
  lastCurrentUserResult = null;
  lastCurrentUserFetchedAt = 0;
  currentUserPromise = null;
}

function getFreshCurrentUserCache(): AuthResponse | null | undefined {
  if (!lastCurrentUserFetchedAt) return undefined;
  if (Date.now() - lastCurrentUserFetchedAt > CURRENT_USER_CACHE_TTL_MS) {
    return undefined;
  }
  return lastCurrentUserResult;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.id === "string" ? (parsed as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  if (typeof window === "undefined") return;

  try {
    if (!user) {
      window.localStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Non-fatal cache failure
  }
}

function emitAuthChanged(isAuthenticated: boolean, user?: User | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("auth:changed", {
      detail: { isAuthenticated, user: user || null },
    }),
  );
}

export const authService = {
  async login(email: string, password: string, rememberMe?: boolean): Promise<User> {
    const normalizedEmail = normalizeEmail(email);
    const response = await apiFetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password, rememberMe }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const { accessToken, user } = await response.json();
    setAccessToken(accessToken);
    writeCachedUser(user);
    setCurrentUserCache({ user });
    emitAuthChanged(true, user);
    return user;
  },

  async signup(
    name: string,
    email: string,
    password: string,
    examType?: string,
    preparationStage?: string,
    gender?: string,
    profileImage?: string,
  ): Promise<User> {
    const normalizedEmail = normalizeEmail(email);
    const response = await apiFetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email: normalizedEmail,
        password,
        examType,
        preparationStage,
        gender,
        profileImage,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Signup failed");
    }

    const { accessToken, user } = await response.json();
    setAccessToken(accessToken);
    writeCachedUser(user);
    setCurrentUserCache({ user });
    emitAuthChanged(true, user);
    return user;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setAccessToken(null);
      writeCachedUser(null);
      clearCurrentUserCache();
      emitAuthChanged(false, null);
      resetCsrfToken();
    }
  },

  async initAuth(): Promise<User | null> {
    if (initAuthPromise) return initAuthPromise;

    initAuthPromise = (async () => {
      const cachedUser = readCachedUser();
      const refreshResult = await refreshAccessToken();

      if (refreshResult.status === "auth_failed") {
        writeCachedUser(null);
        setCurrentUserCache(null);
        emitAuthChanged(false, null);
        return null;
      }

      if (refreshResult.status !== "ok") {
        if (cachedUser) {
          setCurrentUserCache({ user: cachedUser });
          emitAuthChanged(true, cachedUser);
          return cachedUser;
        }

        setCurrentUserCache(null);
        return null;
      }

      const authData = await this.getCurrentUser();
      if (authData?.user) {
        return authData.user;
      }

      if (cachedUser) {
        setCurrentUserCache({ user: cachedUser });
        emitAuthChanged(true, cachedUser);
        return cachedUser;
      }

      setCurrentUserCache(null);
      emitAuthChanged(false, null);
      return null;
    })().finally(() => {
      initAuthPromise = null;
    });

    return initAuthPromise;
  },

  async getCurrentUser(options: GetCurrentUserOptions = {}): Promise<AuthResponse | null> {
    if (currentUserPromise) {
      return currentUserPromise;
    }

    if (!options.force) {
      const cached = getFreshCurrentUserCache();
      if (cached !== undefined) {
        return cached;
      }
    }

    currentUserPromise = (async () => {
      try {
        const response = await apiFetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          const cachedUser = readCachedUser();
          if (cachedUser) {
            return { user: cachedUser };
          }
          return null;
        }

        if (!response.ok) {
          const cachedUser = readCachedUser();
          if (cachedUser) {
            return { user: cachedUser };
          }
          throw new Error(`Auth check failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data?.user) {
          writeCachedUser(data.user);
          emitAuthChanged(true, data.user);
        }
        return data;
      } catch {
        const cachedUser = readCachedUser();
        if (cachedUser) {
          return { user: cachedUser };
        }
        return null;
      }
    })()
      .then((result) => {
        setCurrentUserCache(result);
        return result;
      })
      .finally(() => {
        currentUserPromise = null;
      });

    return currentUserPromise;
  },

  async updateProfile(data: {
    name?: string;
    examType?: string;
    preparationStage?: string;
    gender?: string;
    avatar?: string;
  }): Promise<User> {
    const response = await apiFetch(`${API_BASE}/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    const updatedUser = await response.json();
    writeCachedUser(updatedUser);
    setCurrentUserCache({ user: updatedUser });
    emitAuthChanged(true, updatedUser);
    return updatedUser;
  },

  getCachedUser(): User | null {
    return readCachedUser();
  },

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiFetch(`${API_BASE}/upload/avatar`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Avatar upload failed");
    }

    const result = await response.json();
    return result.url;
  },

  async getLoginHistory(): Promise<{ timestamp: string }[]> {
    try {
      const response = await apiFetch(`${API_BASE}/auth/login-history`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    } catch {
      return [];
    }
  },

  async requestPasswordReset(email: string): Promise<string> {
    const normalizedEmail = normalizeEmail(email);
    const response = await apiFetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to request password reset");
    }

    const data = await response.json();
    return data.message || "Reset link sent. Please check your email inbox.";
  },

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/auth/reset-password/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to reset password");
    }
  },
};
