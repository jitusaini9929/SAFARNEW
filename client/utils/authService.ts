import { apiFetch, resetCsrfToken } from "@/utils/apiFetch";
import { User, Streak } from "@shared/api";

interface AuthResponse {
  user: User;
  streaks?: Streak;
}

const AUTH_CACHE_KEY = "safar.cached_user";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    // Use localStorage so the cache persists across browser restarts/tab closes.
    // sessionStorage was wiped on tab close, causing unnecessary re-auth on open.
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
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password, rememberMe }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const user = await response.json();
    writeCachedUser(user);
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
    const response = await apiFetch("/api/auth/signup", {
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

    const user = await response.json();
    writeCachedUser(user);
    emitAuthChanged(true, user);
    return user;
  },

  async logout(): Promise<void> {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    writeCachedUser(null);
    emitAuthChanged(false, null);
    resetCsrfToken();
  },

  async getCurrentUser(): Promise<AuthResponse | null> {
    try {
      const response = await apiFetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        writeCachedUser(null);
        emitAuthChanged(false, null);
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
  },

  async updateProfile(data: {
    name?: string;
    examType?: string;
    preparationStage?: string;
    gender?: string;
    avatar?: string;
  }): Promise<User> {
    const response = await apiFetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    return response.json();
  },

  async getLoginHistory(): Promise<{ timestamp: string }[]> {
    try {
      const response = await apiFetch("/api/auth/login-history", {
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
    const response = await apiFetch("/api/auth/forgot-password", {
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
    const response = await apiFetch("/api/auth/reset-password/confirm", {
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
