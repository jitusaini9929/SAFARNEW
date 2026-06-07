import { useCallback, useEffect, useState } from "react";
import type { PremiumFeaturesResponse } from "@shared/api";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, API_BASE } from "@/utils/apiFetch";

let cachedFeatures: PremiumFeaturesResponse | null = null;
let inflightRequest: Promise<PremiumFeaturesResponse | null> | null = null;

async function fetchPremiumFeatures(): Promise<PremiumFeaturesResponse | null> {
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const response = await apiFetch(`${API_BASE}/premium/features`, {
        credentials: "include",
      });
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as PremiumFeaturesResponse;
      cachedFeatures = data;
      return data;
    } catch {
      return null;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export function invalidatePremiumFeaturesCache() {
  cachedFeatures = null;
}

export function usePremiumFeatures() {
  const { isAuthenticated, status } = useAuth();
  const [mehfilDm, setMehfilDm] = useState(Boolean(cachedFeatures?.mehfilDm));
  const [isLoading, setIsLoading] = useState(status === "loading" || (isAuthenticated && !cachedFeatures));

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      cachedFeatures = null;
      setMehfilDm(false);
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    const data = await fetchPremiumFeatures();
    const nextValue = Boolean(data?.mehfilDm);
    setMehfilDm(nextValue);
    setIsLoading(false);
    return nextValue;
  }, [isAuthenticated]);

  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setMehfilDm(false);
      setIsLoading(false);
      return;
    }

    if (cachedFeatures) {
      setMehfilDm(Boolean(cachedFeatures.mehfilDm));
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [isAuthenticated, status, refresh]);

  return { mehfilDm, isLoading, refresh };
}
