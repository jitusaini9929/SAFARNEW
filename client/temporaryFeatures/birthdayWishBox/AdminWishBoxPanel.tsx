import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 25;

type AdminWish = {
  id: string;
  userId: string;
  displayName: string | null;
  isAnonymous: boolean;
  message: string;
  status: string;
  createdAt: string;
  moderation?: {
    reason?: string | null;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

type AdminWishResponse = {
  wishes: AdminWish[];
  page: number;
  hasMore: boolean;
};

const AdminWishBoxPanel: React.FC = () => {
  const [wishes, setWishes] = useState<AdminWish[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWishes = async (nextPage: number, replace = false) => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch(
        `${API_BASE}/admin/wishbox/wishes?status=${statusFilter}&page=${nextPage}&limit=${PAGE_SIZE}`,
        { method: "GET" },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Unable to load wishes.");
        return;
      }

      const data = (await res.json()) as AdminWishResponse;
      setWishes((prev) => (replace ? data.wishes : [...prev, ...data.wishes]));
      setHasMore(Boolean(data.hasMore));
      setPage(data.page);
    } catch (error) {
      console.error("[WISHBOX] Admin fetch failed:", error);
      setErrorMessage("Unable to load wishes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setWishes([]);
    setPage(1);
    setHasMore(true);
    loadWishes(1, true);
  }, [statusFilter]);

  const updateStatus = async (wishId: string, status: "approved" | "rejected") => {
    try {
      const res = await apiFetch(`${API_BASE}/admin/wishbox/wishes/${wishId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || "Failed to update wish.");
        return;
      }

      setWishes((prev) => prev.filter((wish) => wish.id !== wishId));
    } catch (error) {
      console.error("[WISHBOX] Admin update failed:", error);
      setErrorMessage("Failed to update wish.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {["pending", "approved", "rejected", "flagged", "all"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
          {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        {wishes.map((wish) => (
          <div key={wish.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{wish.user?.name || wish.displayName || wish.userId}</span>
              <span className="rounded-full border border-slate-200 px-2 py-0.5 dark:border-white/10">{wish.status}</span>
            </div>
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{wish.message}</p>
            {wish.moderation?.reason && (
              <p className="mt-2 text-xs text-slate-400">AI reason: {wish.moderation.reason}</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => updateStatus(wish.id, "approved")}>
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={() => updateStatus(wish.id, "rejected")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <Button variant="outline" onClick={() => loadWishes(page + 1)} disabled={isLoading}>
          {isLoading ? "Loading..." : "Load More"}
        </Button>
      )}
    </div>
  );
};

export default AdminWishBoxPanel;
