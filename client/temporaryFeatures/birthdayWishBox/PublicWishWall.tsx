import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 8;

type PublicWish = {
  id: string;
  message: string;
  displayName: string | null;
  isAnonymous?: boolean;
  publicVisible?: boolean;
  status?: string;
  createdAt?: string;
};

type PublicWishResponse = {
  wishes: PublicWish[];
  page: number;
  hasMore: boolean;
};

type PublicWishWallProps = {
  active?: boolean;
};

const PublicWishWall: React.FC<PublicWishWallProps> = ({ active }) => {
  const [wishes, setWishes] = useState<PublicWish[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);

  const formattedWishes = useMemo(
    () =>
      wishes.map((wish) => ({
        ...wish,
        displayName: wish.displayName || "Anonymous",
        formattedDate: wish.createdAt
          ? new Date(wish.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            })
          : null,
      })),
    [wishes],
  );

  const loadWishes = async (nextPage: number, replace = false) => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch(
        `${API_BASE}/wishbox/wishes/public?page=${nextPage}&limit=${PAGE_SIZE}`,
        { method: "GET" },
      );

      if (res.status === 403) {
        const data = await res.json().catch(() => null);
        setClosedMessage(data?.message || "Wish Box is now closed.");
        setHasMore(false);
        return;
      }

      if (!res.ok) {
        setErrorMessage("Unable to load wishes.");
        return;
      }

      const data = (await res.json()) as PublicWishResponse;
      setWishes((prev) => (replace ? data.wishes : [...prev, ...data.wishes]));
      setHasMore(Boolean(data.hasMore));
      setPage(data.page);
    } catch (error) {
      console.error("[WISHBOX] Failed to load public wishes:", error);
      setErrorMessage("Unable to load wishes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    setWishes([]);
    setPage(1);
    setHasMore(true);
    setClosedMessage(null);
    loadWishes(1, true);
  }, [active]);

  if (closedMessage) {
    return (
      <div className="rounded-2xl border border-amber-200/70 bg-amber-50 p-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
        <p className="text-sm font-semibold">{closedMessage}</p>
        <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-100/70">
          Thank you for sending your love and wishes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
          {errorMessage}
        </div>
      )}

      {formattedWishes.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          No wishes have been approved yet. Be the first to share a heartfelt message.
        </div>
      ) : (
        <div className="grid gap-4">
          {formattedWishes.map((wish) => (
            <div
              key={wish.id}
              className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              {(wish.isAnonymous || wish.status) && (
                <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em]">
                  {wish.isAnonymous && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-800 dark:bg-purple-400/15 dark:text-purple-100">
                      Anonymous
                    </span>
                  )}
                  {wish.status && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      {wish.status}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {wish.message}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-600 dark:text-slate-300">- {wish.displayName}</span>
                {wish.formattedDate && <span>{wish.formattedDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full rounded-2xl"
          onClick={() => loadWishes(page + 1)}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Load More"}
        </Button>
      )}
    </div>
  );
};

export default PublicWishWall;
