import { apiFetch, resetCsrfToken } from "@/utils/apiFetch";
import { User, Streak } from "@shared/api";

interface AuthResponse {
  user: User;
  streaks?: Streak;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
    emitAuthChanged(true, user);
    return user;
  },

  async logout(): Promise<void> {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    emitAuthChanged(false, null);
    resetCsrfToken();
  },

  async getCurrentUser(): Promise<AuthResponse | null> {
    try {
      const response = await apiFetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch {
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
