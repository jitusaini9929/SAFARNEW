import { useCallback, useEffect, useMemo, useState } from "react";
import M3TopNavbar from "@/components/M3TopNavbar";
import { API_BASE, apiFetch } from "@/utils/apiFetch";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessMehfilModeration } from "@/utils/mehfilModerationAccess";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldAlert, ShieldCheck, Loader2, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportReason = {
  reason: string;
  category?: string;
  status?: string;
};

type ReporterInfo = {
  id: string;
  email: string | null;
  name: string | null;
  falseReportStrikes?: number;
  lastFalseReportStrikeAt?: string | null;
  warningCount?: number;
  lastWarningAt?: string | null;
  reportingBanned?: boolean;
  reportingBannedAt?: string | null;
};

type ModerationReportEntry = {
  id: string;
  reporterId: string;
  reason: string;
  category?: string;
  status?: string;
  createdAt?: string;
  moderatorVerdict?: string | null;
  reporter: ReporterInfo;
};

type ModerationReportItem = {
  thoughtId: string;
  reportCount: number;
  statuses: string[];
  reasons: ReportReason[];
  reports?: ModerationReportEntry[];
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

type SearchUserResult = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    mehfilBannedUntil?: string | null;
    mehfilBannedForever?: boolean;
  };
  flaggedThoughts: {
    id: string;
    content: string;
    status: string;
    createdAt: string;
    category?: string;
    aiTags?: string[];
    aiScore?: number;
    moderationReason?: string;
    isToxic?: boolean;
  }[];
  reportedThoughts: ModerationReportItem[];
};

type StatusFilter = "open" | "all" | "review_needed" | "pending" | "actioned" | "dismissed";

function formatCategoryLabel(reason: ReportReason): string {
  const raw = reason.category || reason.reason || "";
  const normalized = String(raw).trim().toLowerCase();
  if (normalized.startsWith("other:")) return "Other";
  if (normalized === "other") return "Other";
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
  const { user, status, isAdmin } = useAuth();
  const [items, setItems] = useState<ModerationReportItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [markingReportId, setMarkingReportId] = useState<string | null>(null);
  const [reporterActionId, setReporterActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Search states
  const [searchEmail, setSearchEmail] = useState("");
  const [activeSearchEmail, setActiveSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<SearchUserResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const allowed = canAccessMehfilModeration(user?.email, isAdmin);

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

  const performSearch = async (emailToSearch: string) => {
    const trimmed = emailToSearch.trim();
    if (!trimmed) {
      toast.error("Please enter an email to search");
      return;
    }
    setIsSearching(true);
    try {
      const response = await apiFetch(
        `${API_BASE}/admin/mehfil/reports/search-user?email=${encodeURIComponent(trimmed)}`
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to find user");
      }
      setSearchResult(payload);
      setActiveSearchEmail(trimmed);
      toast.success("User reports retrieved successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Search failed or user not found");
      setSearchResult(null);
      setActiveSearchEmail("");
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchEmail("");
    setActiveSearchEmail("");
    setSearchResult(null);
  };

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
      setSearchResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          reportedThoughts: prev.reportedThoughts.filter((item) => item.thoughtId !== thoughtId),
        };
      });
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setResolvingId(null);
    }
  };

  const markFakeReport = async (thoughtId: string, reportId: string) => {
    setMarkingReportId(reportId);
    try {
      const response = await apiFetch(`${API_BASE}/admin/mehfil/reports/${reportId}/mark-fake`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to mark fake report");
      }

      toast.success(payload?.alreadyMarked ? "Already marked as fake." : "Reporter strike recorded.");

      const nextStrikeCount =
        typeof payload?.falseReportStrikes === "number" ? payload.falseReportStrikes : undefined;

      const updateReportList = (reportsList: ModerationReportEntry[] = []) =>
        reportsList.map((report) => {
          if (report.id !== reportId) return report;
          return {
            ...report,
            moderatorVerdict: "fake",
            status: "dismissed",
            reporter: {
              ...report.reporter,
              ...(typeof nextStrikeCount === "number" ? { falseReportStrikes: nextStrikeCount } : {}),
            },
          };
        });

      setItems((prev) =>
        prev.map((item) => {
          if (item.thoughtId !== thoughtId) return item;
          return { ...item, reports: updateReportList(item.reports) };
        }),
      );

      setSearchResult((prev) => {
        if (!prev) return null;
        const nextReported = prev.reportedThoughts.map((item) => {
          if (item.thoughtId !== thoughtId) return item;
          return { ...item, reports: updateReportList(item.reports) };
        });
        return { ...prev, reportedThoughts: nextReported };
      });
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setMarkingReportId(null);
    }
  };

  const warnReporter = async (thoughtId: string, reporterId: string) => {
    setReporterActionId(reporterId);
    try {
      const response = await apiFetch(`${API_BASE}/admin/mehfil/reporters/${reporterId}/warn`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to warn reporter");
      }

      toast.success("Reporter warned.");

      const updateReportList = (reportsList: ModerationReportEntry[] = []) =>
        reportsList.map((report) => {
          if (report.reporterId !== reporterId) return report;
          return {
            ...report,
            reporter: {
              ...report.reporter,
              warningCount:
                typeof payload?.warningCount === "number" ? payload.warningCount : report.reporter.warningCount,
              lastWarningAt: payload?.lastWarningAt ?? report.reporter.lastWarningAt,
            },
          };
        });

      setItems((prev) =>
        prev.map((item) => {
          if (item.thoughtId !== thoughtId) return item;
          return { ...item, reports: updateReportList(item.reports) };
        }),
      );

      setSearchResult((prev) => {
        if (!prev) return null;
        const nextReported = prev.reportedThoughts.map((item) => {
          if (item.thoughtId !== thoughtId) return item;
          return { ...item, reports: updateReportList(item.reports) };
        });
        return { ...prev, reportedThoughts: nextReported };
      });
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setReporterActionId(null);
    }
  };

  const banReporterFromReporting = async (thoughtId: string, reporterId: string) => {
    setReporterActionId(reporterId);
    try {
      const response = await apiFetch(
        `${API_BASE}/admin/mehfil/reporters/${reporterId}/ban-reporting`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to ban reporter from reporting");
      }

      toast.success(payload?.alreadyBanned ? "Reporter already banned from reporting." : "Reporter banned from reporting.");

      const updateReportList = (reportsList: ModerationReportEntry[] = []) =>
        reportsList.map((report) => {
          if (report.reporterId !== reporterId) return report;
          return {
            ...report,
            reporter: {
              ...report.reporter,
              reportingBanned: true,
              reportingBannedAt: payload?.reportingBannedAt ?? report.reporter.reportingBannedAt,
            },
          };
        });

      setItems((prev) =>
        prev.map((item) => {
          if (item.thoughtId !== thoughtId) return item;
          return { ...item, reports: updateReportList(item.reports) };
        }),
      );

      setSearchResult((prev) => {
        if (!prev) return null;
        const nextReported = prev.reportedThoughts.map((item) => {
          if (item.thoughtId !== thoughtId) return item;
          return { ...item, reports: updateReportList(item.reports) };
        });
        return { ...prev, reportedThoughts: nextReported };
      });
    } catch (error: any) {
      toast.error(error?.message || "Action failed");
    } finally {
      setReporterActionId(null);
    }
  };

  const renderReportItem = (item: ModerationReportItem) => {
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
        className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
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
              <Badge className="bg-rose-600 text-[10px] hover:bg-rose-600 text-white border-0">
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
              {(item.reports?.length ? item.reports : item.reasons.map((r) => ({
                id: `${item.thoughtId}:${r.reason}`,
                reporterId: "",
                reason: r.reason,
                category: r.category,
                status: r.status,
                moderatorVerdict: null,
                reporter: { id: "", email: null, name: null },
              } as ModerationReportEntry)))
                .map((report, index) => {
                  const reporterLabel = report.reporter?.name || report.reporter?.email || report.reporterId;
                  const strikeCount = typeof report.reporter?.falseReportStrikes === "number" ? report.reporter.falseReportStrikes : null;
                  const warningCount = typeof report.reporter?.warningCount === "number" ? report.reporter.warningCount : null;
                  const reportingBanned = Boolean(report.reporter?.reportingBanned);
                  const isFake = String(report.moderatorVerdict || "").toLowerCase() === "fake";
                  const canMarkFake = Boolean(report.id && report.reporterId) && !isFake;
                  const isMarking = markingReportId === report.id;
                  const isReporterActing = reporterActionId === report.reporterId;
                  const canWarn = Boolean(report.reporterId);
                  const canBanFromReporting = Boolean(report.reporterId) && !reportingBanned;

                  return (
                    <li
                      key={report.id || `${item.thoughtId}-reason-${index}`}
                      className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Reporter: {reporterLabel || "Unknown"}
                            {strikeCount !== null ? (
                              <span className="ml-2 text-[10px] font-bold text-slate-500">
                                (false strikes: {strikeCount})
                              </span>
                            ) : null}
                            {warningCount !== null ? (
                              <span className="ml-2 text-[10px] font-bold text-slate-500">
                                (warns: {warningCount})
                              </span>
                            ) : null}
                          </p>
                          {report.reporter?.email || report.reporterId ? (
                            <p className="truncate text-[11px] text-slate-500">
                              {report.reporter?.email || report.reporterId}
                            </p>
                          ) : null}
                          {report.createdAt ? (
                            <p className="text-[11px] text-slate-500">
                              Reported at: {formatDate(report.createdAt)}
                            </p>
                          ) : null}
                          {reportingBanned ? (
                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              Reporting banned
                            </p>
                          ) : null}
                        </div>

                        {report.id && report.reporterId ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canMarkFake || isMarking}
                              onClick={() => markFakeReport(item.thoughtId, report.id)}
                            >
                              {isMarking ? <Loader2 className="h-4 w-4 animate-spin" /> : isFake ? "Marked fake" : "Mark fake"}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canWarn || isReporterActing}
                              onClick={() => warnReporter(item.thoughtId, report.reporterId)}
                            >
                              {isReporterActing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Warn the user"}
                            </Button>

                            <Button
                              size="sm"
                              className="bg-rose-600 text-white hover:bg-rose-700"
                              disabled={!canBanFromReporting || isReporterActing}
                              onClick={() => banReporterFromReporting(item.thoughtId, report.reporterId)}
                            >
                              {isReporterActing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ban from reporting"}
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-2">
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {formatCategoryLabel({ reason: report.reason, category: report.category })}
                        </span>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                          {formatReasonDetail({ reason: report.reason })}
                        </p>
                      </div>
                    </li>
                  );
                })}
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
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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

        {/* Search Bar */}
        <div className="mb-6 flex max-w-md items-center gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-rose-500 dark:bg-slate-900 dark:ring-slate-800 dark:focus-within:ring-rose-500">
          <div className="pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <Input
            type="email"
            placeholder="Search by user email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                performSearch(searchEmail);
              }
            }}
            className="border-0 bg-transparent py-1.5 pl-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900 dark:text-white"
          />
          {searchEmail && (
            <button
              onClick={handleClearSearch}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            size="sm"
            className="rounded-xl bg-rose-600 px-4 text-white hover:bg-rose-700"
            onClick={() => performSearch(searchEmail)}
            disabled={isSearching}
            type="button"
          >
            {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
          </Button>
        </div>

        {isSearching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : activeSearchEmail && searchResult ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Moderation Profile</p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {searchResult.user.name || "Unknown User"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{searchResult.user.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  {searchResult.user.mehfilBannedForever ? (
                    <Badge className="bg-rose-600 hover:bg-rose-600 text-white border-0">Permanently Banned</Badge>
                  ) : searchResult.user.mehfilBannedUntil && new Date(searchResult.user.mehfilBannedUntil).getTime() > Date.now() ? (
                    <Badge className="bg-amber-600 hover:bg-amber-600 text-white border-0">
                      Banned until {formatDate(searchResult.user.mehfilBannedUntil)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-350 dark:text-emerald-450 dark:border-emerald-800">Active User</Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearSearch}>
                Clear search & back
              </Button>
            </div>

            {/* AI Flagged Posts Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                AI Flagged Posts ({searchResult.flaggedThoughts.length})
              </h3>
              {searchResult.flaggedThoughts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-350 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm text-slate-500">No posts flagged by AI for this user.</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {searchResult.flaggedThoughts.map((thought) => (
                    <li
                      key={thought.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 p-5 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="bg-rose-600 text-[10px] uppercase text-white border-0">
                            AI FLAGGED
                          </Badge>
                          {thought.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {thought.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(thought.createdAt)}</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        {thought.content}
                      </div>

                      <div className="text-xs space-y-1 text-slate-500 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {thought.aiScore !== undefined && (
                          <p>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">AI Toxicity Score:</span>{" "}
                            {(thought.aiScore * 100).toFixed(1)}%
                          </p>
                        )}
                        {thought.moderationReason && (
                          <p>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">AI Reason:</span>{" "}
                            {thought.moderationReason}
                          </p>
                        )}
                        {thought.aiTags && thought.aiTags.length > 0 && (
                          <p>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">AI Suggested Tags:</span>{" "}
                            {thought.aiTags.join(", ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Reported Posts Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Reported Posts ({searchResult.reportedThoughts.length})
              </h3>
              {searchResult.reportedThoughts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-350 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-sm text-slate-500">No user-reported posts found for this user.</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {searchResult.reportedThoughts.map((item) => renderReportItem(item))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <>
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

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-350 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
                <p className="text-sm text-slate-500">No reported posts in this view.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {items.map((item) => renderReportItem(item))}
              </ul>
            )}

            {hasMore && !isLoading && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
