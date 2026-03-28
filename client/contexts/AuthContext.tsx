import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@shared/api";
import { authService } from "@/utils/authService";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthChangedDetail = {
  isAuthenticated: boolean;
  user: User | null;
};

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  refreshUser: (force?: boolean) => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCachedUser());
  const [status, setStatus] = useState<AuthStatus>(() =>
    authService.getCachedUser() ? "authenticated" : "loading",
  );

  const refreshUser = useCallback(async (force = false) => {
    const authData = await authService.getCurrentUser({ force });
    if (authData?.user) {
      setUser(authData.user);
      setStatus("authenticated");
      return authData.user;
    }

    setUser(null);
    setStatus("unauthenticated");
    return null;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const bootstrapAuth = async () => {
      const cachedUser = authService.getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        setStatus("authenticated");
      }

      const initializedUser = await authService.initAuth();
      if (isCancelled) return;

      if (initializedUser) {
        setUser(initializedUser);
        setStatus("authenticated");
        return;
      }

      setUser(null);
      setStatus("unauthenticated");
    };

    bootstrapAuth();

    const onAuthChanged = (event: Event) => {
      const customEvent = event as CustomEvent<AuthChangedDetail>;
      const nextUser = customEvent.detail?.user ?? null;
      setUser(nextUser);
      setStatus(customEvent.detail?.isAuthenticated ? "authenticated" : "unauthenticated");
    };

    window.addEventListener("auth:changed", onAuthChanged as EventListener);

    return () => {
      isCancelled = true;
      window.removeEventListener("auth:changed", onAuthChanged as EventListener);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      refreshUser,
    }),
    [user, status, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
