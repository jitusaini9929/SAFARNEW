import { useCallback, useEffect, useMemo, useState } from "react";
import M3TopNavbar from "@/components/M3TopNavbar";
import { API_BASE, apiFetch } from "@/utils/apiFetch";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessMehfilModeration } from "@/utils/mehfilModerationAccess";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportReason = {
  reason: string;
  category?: string;
  status?: string;
};

type ModerationReportItem = {
  thoughtId: string;
  reportCount: number;
  statuses: string[];
  reasons: ReportReason[];
  latestAt: string;
  thought: {
    id: string;
    content: string;
    status: string;
    removedReason?: string;
    createdAt: string;
    category?: string;
  } | null;
  reportedUser: {
    id: string;
    email: string | null;
    name: string | null;
    mehfilBannedUntil?: string | null;
    mehfilBannedForever?: boolean;
  };
};

type StatusFilter = "open" | "all" | "review_needed" | "pending" | "actioned" | "dismissed";

function formatCategoryLabel(reason: ReportReason): string {
  const raw = reason.category || reason.reason || "";
  const normalized = String(raw).trim().toLowerCase();
  if (normalized.startsWith("other:")) return "Other";
  if (normalized === "spam") return "Spam or misleading";
  if (normalized === "harassment") return "Harassment or hate speech";
  if (normalized === "inappropriate") return "Inappropriate content";
  return raw || "Unknown";
}

function formatReasonDetail(reason: ReportReason): string {
  const text = String(reason.reason || "");
  if (text.toLowerCase().startsWith("other:")) {
    return text.slice(6).trim() || "No details provided.";
  }
  return text;
}

function formatDate(value: string | Date | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MehfilReportModeration() {
  const { user, status } = useAuth();
  const [items, setItems] = useState<ModerationReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const allowed = canAccessMehfilModeration(user?.email);

  const loadReports = useCallback(async () => {
    if (!allowed) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: String(page),
        limit: "30",
      });
      const response = await apiFetch(`${API_BASE}/admin/mehfil/reports?${params}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load reports");
      }
      const next = Array.isArray(payload.reports) ? payload.reports : [];
      setItems((prev) => (page === 1 ? next : [...prev, ...next]));
      setHasMore(Boolean(payload.hasMore));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load reported posts");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [allowed, page, statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openCount = useMemo(
    () => items.filter((item) => item.statuses.some((s) => s === "pending" || s === "review_needed")).length,
    [items],
  );

  const resolveReport = async (thoughtId: string, action: "dismiss" | "ban_user") => {
    setResolvingId(thoughtId);
    try {
      const response = await apiFetch(
        `${API_BASE}/admin/mehfil/reports/thoughts/${thoughtId}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({ action }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to resolve report");
      }

      if (action === "ban_user") {
        toast.success("User banned and post removed from the feed.");
      } else {
        toast.success("Report dismissed — post restored and ban cleared.");
      }

      setItems((prev) => prev.filter((item) => item.thoughtId !== thoughtId));
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setResolvingId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: "open", label: "Needs action" },
    { id: "review_needed", label: "In review" },
    { id: "pending", label: "Pending" },
    { id: "all", label: "All reports" },
    { id: "actioned", label: "Banned" },
    { id: "dismissed", label: "Dismissed" },
  ];

  return (
    <div className="mehfil-m3 min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-background dark:text-foreground">
      <M3TopNavbar moduleName="PROFILE" homeRoute="/dashboard" />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mehfil reported posts</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Review community reports. Approve to ban; deny to restore the user and post.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadReports} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setPage(1);
                setStatusFilter(tab.id);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === tab.id
                  ? "bg-rose-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {statusFilter === "open" && !isLoading && (
          <p className="mb-4 text-sm text-slate-500">
            {openCount} item(s) on this page need a decision.
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
            <p className="text-sm text-slate-500">No reported posts in this view.</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {items.map((item) => {
              const isResolving = resolvingId === item.thoughtId;
              const isBanned =
                Boolean(item.reportedUser.mehfilBannedForever) ||
                (item.reportedUser.mehfilBannedUntil &&
                  new Date(item.reportedUser.mehfilBannedUntil).getTime() > Date.now());
              const canDecide = item.statuses.some(
                (s) => s === "pending" || s === "review_needed",
              );

              return (
                <li
                  key={item.thoughtId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.statuses.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px] uppercase">
                          {s.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-[10px]">
                        {item.reportCount} report{item.reportCount === 1 ? "" : "s"}
                      </Badge>
                      {isBanned && (
                        <Badge className="bg-rose-600 text-[10px] hover:bg-rose-600">
                          User currently banned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Last report: {formatDate(item.latestAt)}
                    </p>
                  </div>

                  <div className="space-y-4 px-5 py-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Reported user
                      </p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {item.reportedUser.name || "Unknown"}
                      </p>
                      <p className="text-sm text-slate-500">{item.reportedUser.email || item.reportedUser.id}</p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Post</p>
                      <div className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        {item.thought?.content || (
                          <span className="italic text-slate-400">Post content unavailable</span>
                        )}
                      </div>
                      {item.thought && (
                        <p className="mt-2 text-xs text-slate-400">
                          Room: {item.thought.category || "—"} · Status: {item.thought.status}
                          {item.thought.removedReason
                            ? ` · Hidden: ${item.thought.removedReason}`
                            : ""}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Report reasons
                      </p>
                      <ul className="mt-2 space-y-2">
                        {item.reasons.map((reason, index) => (
                          <li
                            key={`${item.thoughtId}-reason-${index}`}
                            className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                          >
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              {formatCategoryLabel(reason)}
                            </span>
                            <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                              {formatReasonDetail(reason)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {canDecide ? (
                      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <p className="text-center text-base font-bold text-amber-900 dark:text-amber-100">
                          Should we ban them?
                        </p>
                        <p className="mt-1 text-center text-xs text-amber-800/80 dark:text-amber-200/70">
                          Deny = innocent (restore post, clear ban). Approve = apply posting ban.
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            className="h-11 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-400"
                            disabled={isResolving}
                            onClick={() => resolveReport(item.thoughtId, "dismiss")}
                          >
                            {isResolving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Deny (no ban)
                              </>
                            )}
                          </Button>
                          <Button
                            className="h-11 bg-rose-600 text-white hover:bg-rose-700"
                            disabled={isResolving}
                            onClick={() => resolveReport(item.thoughtId, "ban_user")}
                          >
                            {isResolving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Approve (ban)
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-400">
                        This report was already resolved.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && !isLoading && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Load more
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
