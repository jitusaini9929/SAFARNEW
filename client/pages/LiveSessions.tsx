import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMehfilSocket } from "@/lib/socket";
import {
  Calendar,
  Play,
  Square,
  StickyNote,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import M3TopNavbar from "@/components/M3TopNavbar";
import GlobalSidebar from "@/components/GlobalSidebar";
import "@/styles/live-sessions.css";

const FILTER_MAP = {
  live: "active",
  completed: "ended",
} as const;

type FilterTab = keyof typeof FILTER_MAP;
type ApiStatus = (typeof FILTER_MAP)[FilterTab];
type SidebarNav = "live-sessions" | "completed" | "resources";

type LiveSessionResource = {
  label: string;
  url: string;
};

type LiveSession = {
  id: string;
  title?: string;
  status: string;
  scheduledStartAt?: string | null;
  description?: string | null;
  youtubeEmbedUrl?: string | null;
  isRecordingAvailable?: boolean;
  thumbnailUrl?: string | null;
  canManage?: boolean;
  resources?: LiveSessionResource[];
  isChatEnabled?: boolean;
};

function MaterialIcon({
  name,
  className,
  filled,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span className={cn("material-symbols-outlined", filled && "filled", className)}>
      {name}
    </span>
  );
}

async function parseErrorResponse(res: Response, fallback: string): Promise<string> {
  return res
    .json()
    .then((body) => String(body?.message || body?.error || fallback))
    .catch(() => fallback);
}

function formatScheduledDate(value?: string | null): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatusLabel(status: string): string {
  if (status === "scheduled") return "Upcoming";
  if (status === "ended") return "Completed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusBadge({ status }: { status: string }) {
  const isLive = status === "live";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold lc-label",
        isLive
          ? "bg-[var(--lc-error)] text-[var(--lc-on-error)]"
          : status === "ended"
            ? "bg-[var(--lc-surface-container-high)] text-[var(--lc-on-surface-variant)] border border-[var(--lc-outline-variant)]"
            : "bg-[var(--lc-primary)]/15 text-[var(--lc-primary)]",
      )}
    >
      {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-current" />}
      {formatStatusLabel(status)}
    </span>
  );
}

export default function LiveSessions() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>("live");
  const [sidebarNav, setSidebarNav] = useState<SidebarNav>("live-sessions");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGlobalSidebarOpen, setIsGlobalSidebarOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    Array<{ name: string; text: string; timestamp?: number }>
  >([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [socket, setSocket] = useState<ReturnType<typeof getMehfilSocket> | null>(null);

  const apiStatus: ApiStatus = FILTER_MAP[filterTab];

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const selectedSession = useMemo(
    () =>
      filteredSessions.find((s) => s.id === selectedSessionId) ||
      filteredSessions[0] ||
      null,
    [selectedSessionId, filteredSessions],
  );

  const isSteve = currentUser?.email === "steve123@example.com";

  const manageableSession = useMemo(() => {
    if (!isSteve || apiStatus !== "active") return null;
    return (
      sessions.find(
        (s) => s.canManage && (s.status === "live" || s.status === "scheduled"),
      ) || null
    );
  }, [apiStatus, sessions, isSteve]);

  const showNewSessionButton = isSteve;

  useEffect(() => {
    if (
      !selectedSession?.id ||
      selectedSession.status === "ended" ||
      selectedSession.status === "cancelled"
    ) {
      setChatMessages([]);
      return;
    }

    const newSocket = getMehfilSocket();

    const handleHistory = (history: Array<{ name: string; text: string }>) => {
      setChatMessages(history);
    };

    const handleMessage = (msg: { name: string; text: string }) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    newSocket.on("live:history", handleHistory);
    newSocket.on("live:message", handleMessage);

    newSocket.emit("live:join", {
      sessionId: selectedSession.id,
      name: currentUser?.name || "User",
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("live:leave", { sessionId: selectedSession.id });
      newSocket.off("live:history", handleHistory);
      newSocket.off("live:message", handleMessage);
    };
  }, [selectedSession?.id, selectedSession?.status, currentUser?.name]);

  const handleSendMessage = () => {
    const text = typedMessage.trim();
    if (!text || !socket || !selectedSession?.id) return;

    socket.emit("live:message", {
      sessionId: selectedSession.id,
      name: currentUser?.name || "User",
      text,
    });
    setTypedMessage("");
  };

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ status: apiStatus });
      const res = await apiFetch(`${API_BASE}/live-sessions?${params.toString()}`);

      if (!res.ok) {
        throw new Error(await parseErrorResponse(res, "Failed to load live sessions"));
      }

      const data = await res.json();
      const list: LiveSession[] = Array.isArray(data?.liveSessions) ? data.liveSessions : [];

      setSessions(list);
      setSelectedSessionId((prev) =>
        prev && list.some((s) => s.id === prev) ? prev : list[0]?.id || "",
      );
    } catch (err) {
      setSessions([]);
      setError(err instanceof Error ? err.message : "Failed to load live sessions");
    } finally {
      setIsLoading(false);
    }
  }, [apiStatus]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSidebarNav = (nav: SidebarNav) => {
    setSidebarNav(nav);
    if (nav === "live-sessions") setFilterTab("live");
    if (nav === "completed") setFilterTab("completed");
  };

  const handleViewLive = () => {
    const live = sessions.find((s) => s.status === "live");
    if (live) {
      setFilterTab("live");
      setSidebarNav("live-sessions");
      setSelectedSessionId(live.id);
      return;
    }
    setFilterTab("live");
    setSidebarNav("live-sessions");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterTab("live");
    setSidebarNav("live-sessions");
  };

  async function startLive(sessionId: string) {
    const url = youtubeUrl.trim();
    if (!url) {
      toast.error("Paste the YouTube Live URL first.");
      return;
    }

    setIsActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/live-sessions/${sessionId}/start`, {
        method: "PATCH",
        body: JSON.stringify({ youtubeUrl: url }),
      });

      if (!res.ok) {
        throw new Error(await parseErrorResponse(res, "Failed to start live class"));
      }

      toast.success("Live class started");
      setYoutubeUrl("");
      setFilterTab("live");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start live class");
    } finally {
      setIsActionLoading(false);
      loadSessions();
    }
  }

  async function createSession() {
    const title = newTitle.trim();
    if (!title) {
      toast.error("Please enter a session title.");
      return;
    }
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = { title, status: "scheduled" };
      const res = await apiFetch(`${API_BASE}/live-sessions`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await parseErrorResponse(res, "Failed to create session"));
      }
      toast.success("Session created!");
      setNewTitle("");
      setShowCreateForm(false);
      setFilterTab("live");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsCreating(false);
      loadSessions();
    }
  }

  async function endLive(sessionId: string) {
    setIsActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/live-sessions/${sessionId}/end`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(await parseErrorResponse(res, "Failed to end live class"));
      }

      toast.success("Live class ended");
      setFilterTab("completed");
      setSidebarNav("completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end live class");
    } finally {
      setIsActionLoading(false);
      loadSessions();
    }
  }

  const chatDisabled =
    !selectedSession ||
    selectedSession.status === "ended" ||
    selectedSession.status === "cancelled";

  const showEmptyCanvas =
    !isLoading && !error && filteredSessions.length === 0;

  const showSessionContent = filteredSessions.length > 0 && selectedSession;

  return (
    <div className="live-classroom min-h-[100dvh] flex flex-col overflow-hidden">
      <M3TopNavbar
        moduleName="PORTAL"
        onSidebarToggle={() => setIsGlobalSidebarOpen(true)}
        homeRoute="/home"
      />

      <GlobalSidebar
        isOpen={isGlobalSidebarOpen}
        onClose={() => setIsGlobalSidebarOpen(false)}
        homeRoute="/home"
      />

      <div className="flex flex-1 w-full min-h-0 overflow-hidden">
        <LiveClassroomSidebar
          activeNav={sidebarNav}
          onNav={handleSidebarNav}
          onViewLive={handleViewLive}
          onSettings={() => navigate("/settings")}
        />

        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-6 lg:gap-8 w-full max-w-none">
            <div className="rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-sm border lc-ghost-border bg-[var(--lc-surface-container-lowest)] dark:bg-[var(--lc-surface-container-low)]">
              <div className="flex items-center gap-2 text-[var(--lc-primary)] text-sm lc-label uppercase tracking-wider font-semibold">
                <MaterialIcon name="podcasts" className="text-[18px]" />
                Live Classes
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 items-center gap-3 max-w-full">
                  <div className="relative flex-1 min-w-0">
                    <MaterialIcon
                      name="search"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--lc-on-surface-variant)] text-[20px] pointer-events-none"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sessions..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--lc-surface-container-low)] dark:bg-[var(--lc-surface-container-lowest)] border border-[var(--lc-outline-variant)] focus:border-[var(--lc-primary)] focus:ring-1 focus:ring-[var(--lc-primary)] text-sm outline-none transition-all placeholder:text-[var(--lc-on-surface-variant)]/60 text-[var(--lc-on-surface)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSessions()}
                    className="p-2 rounded-xl border border-[var(--lc-outline-variant)] text-[var(--lc-on-surface-variant)] hover:bg-[var(--lc-surface-container-high)] hover:text-[var(--lc-on-surface)] transition-colors flex items-center justify-center shrink-0"
                    aria-label="Refresh sessions"
                  >
                    <MaterialIcon name="refresh" className="text-[20px]" />
                  </button>
                  {showNewSessionButton && (
                    <button
                      type="button"
                      onClick={() => setShowCreateForm((v) => !v)}
                      className="lc-btn-primary px-4 py-2 rounded-xl lc-label text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <MaterialIcon name="add" className="text-[20px]" />
                      New Session
                    </button>
                  )}
                </div>
              </div>
            </div>

            {showCreateForm && (
              <div className="rounded-2xl p-6 border lc-ghost-border bg-[var(--lc-surface-container-lowest)] dark:bg-[var(--lc-surface-container-low)] shadow-sm">
                <p className="text-sm lc-label uppercase tracking-wider font-semibold text-[var(--lc-primary)] mb-4">
                  Create New Session
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Session title (e.g. Maths Live Class – Chapter 5)"
                    className="flex-1 w-full px-4 py-3 rounded-xl border border-[var(--lc-outline-variant)] bg-[var(--lc-surface-container-low)] text-sm text-[var(--lc-on-surface)] outline-none focus:border-[var(--lc-primary)] focus:ring-1 focus:ring-[var(--lc-primary)]"
                  />
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={createSession}
                      disabled={isCreating}
                      className="lc-btn-primary px-5 py-2.5 rounded-xl lc-label text-sm font-semibold disabled:opacity-60"
                    >
                      {isCreating ? "Creating..." : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewTitle("");
                      }}
                      className="px-5 py-2.5 rounded-xl border border-[var(--lc-outline-variant)] text-[var(--lc-on-surface-variant)] hover:bg-[var(--lc-surface-container-high)] text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterTab("live");
                    setSidebarNav("live-sessions");
                  }}
                  className={cn(
                    "px-5 py-2 rounded-full lc-label text-sm font-medium flex items-center gap-2 transition-all shadow-sm",
                    filterTab === "live"
                      ? "bg-[var(--lc-primary)] text-[var(--lc-on-primary)]"
                      : "bg-[var(--lc-surface-container-low)] text-[var(--lc-on-surface-variant)] hover:bg-[var(--lc-surface-container-high)] border border-[var(--lc-outline-variant)]",
                  )}
                >
                  {filterTab === "live" && (
                    <MaterialIcon name="check" className="text-[18px]" />
                  )}
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterTab("completed");
                    setSidebarNav("completed");
                  }}
                  className={cn(
                    "px-5 py-2 rounded-full lc-label text-sm font-medium transition-all",
                    filterTab === "completed"
                      ? "bg-[var(--lc-primary)] text-[var(--lc-on-primary)] flex items-center gap-2 shadow-sm"
                      : "bg-[var(--lc-surface-container-low)] text-[var(--lc-on-surface-variant)] hover:bg-[var(--lc-surface-container-high)] border border-[var(--lc-outline-variant)]",
                  )}
                >
                  {filterTab === "completed" && (
                    <MaterialIcon name="check" className="text-[18px]" />
                  )}
                  Completed
                </button>
              </div>

              {manageableSession && (
                <div className="rounded-2xl p-5 border lc-ghost-border bg-[var(--lc-surface-container-low)] shadow-sm">
                  <p className="text-xs lc-label uppercase tracking-wider font-semibold text-[var(--lc-primary)] mb-2">
                    Teacher controls
                  </p>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="lc-headline text-xl font-semibold text-[var(--lc-on-surface)]">
                        {manageableSession.title}
                      </h2>
                      {manageableSession.status === "scheduled" && (
                        <input
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="Paste today's YouTube Live URL"
                          className="mt-3 w-full px-4 py-3 rounded-xl border border-[var(--lc-outline-variant)] bg-[var(--lc-surface-container-lowest)] text-sm outline-none focus:border-[var(--lc-primary)]"
                        />
                      )}
                    </div>
                    {manageableSession.status === "live" ? (
                      <button
                        type="button"
                        onClick={() => endLive(manageableSession.id)}
                        disabled={isActionLoading}
                        className="px-5 py-2.5 rounded-xl bg-[var(--lc-error)] text-[var(--lc-on-error)] lc-label text-sm font-semibold flex items-center gap-2 disabled:opacity-60 shrink-0"
                      >
                        <Square className="h-4 w-4" />
                        End Live
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startLive(manageableSession.id)}
                        disabled={isActionLoading}
                        className="lc-btn-primary px-5 py-2.5 rounded-xl lc-label text-sm font-semibold flex items-center gap-2 disabled:opacity-60 shrink-0"
                      >
                        <MaterialIcon name="sensors" className="text-[18px]" />
                        Start Live
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isLoading && (
                <EmptyStateCanvas>
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--lc-surface-container-high)] border-t-[var(--lc-primary)] mb-2 z-10" />
                  <p className="text-[var(--lc-on-surface-variant)] z-10">Loading live sessions...</p>
                </EmptyStateCanvas>
              )}

              {error && !isLoading && (
                <EmptyStateCanvas>
                  <MaterialIcon
                    name="error"
                    className="text-4xl text-[var(--lc-error)] mb-2 z-10"
                  />
                  <h3 className="lc-headline text-xl font-semibold text-[var(--lc-on-surface)] z-10">
                    Could not load sessions
                  </h3>
                  <p className="text-[var(--lc-on-surface-variant)] text-center max-w-sm z-10">{error}</p>
                  <button
                    type="button"
                    onClick={() => loadSessions()}
                    className="mt-4 px-6 py-2 rounded-full bg-[var(--lc-surface-container-high)] text-[var(--lc-primary)] lc-label text-sm font-semibold hover:bg-[var(--lc-surface-container-highest)] transition-colors z-10 border border-[var(--lc-primary)]/20"
                  >
                    Try again
                  </button>
                </EmptyStateCanvas>
              )}

              {showEmptyCanvas && (
                <EmptyStateCanvas>
                  <div className="w-20 h-20 rounded-full bg-[var(--lc-surface-container-high)] flex items-center justify-center mb-2 z-10">
                    <MaterialIcon
                      name="videocam_off"
                      filled
                      className="text-4xl text-[var(--lc-primary)]/60 dark:text-[var(--lc-primary)]/60"
                    />
                  </div>
                  <h3 className="lc-headline text-xl font-semibold text-[var(--lc-on-surface)] z-10">
                    No active sessions found
                  </h3>
                  <p className="text-[var(--lc-on-surface-variant)] text-center max-w-sm z-10 text-sm">
                    There are currently no live sessions matching this filter. You can start a new
                    session or check completed ones.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 px-6 py-2 rounded-full bg-[var(--lc-surface-container-high)] text-[var(--lc-primary)] lc-label text-sm font-semibold hover:bg-[var(--lc-surface-container-highest)] transition-colors z-10 border border-[var(--lc-primary)]/20"
                  >
                    Clear Filters
                  </button>
                </EmptyStateCanvas>
              )}

              {showSessionContent && (
                <>
                  <LiveSessionPlayer session={selectedSession} />
                  {filteredSessions.length > 1 && (
                    <SessionGrid
                      sessions={filteredSessions}
                      selectedSessionId={selectedSession.id}
                      onSelect={setSelectedSessionId}
                    />
                  )}
                </>
              )}
            </div>
            </div>
          </main>

          <DiscussionsPanel
            chatMessages={chatMessages}
            typedMessage={typedMessage}
            setTypedMessage={setTypedMessage}
            onSendMessage={handleSendMessage}
            currentUser={currentUser}
            chatDisabled={chatDisabled}
          />
        </div>
      </div>
    </div>
  );
}

function LiveClassroomSidebar({
  activeNav,
  onNav,
  onViewLive,
  onSettings,
}: {
  activeNav: SidebarNav;
  onNav: (nav: SidebarNav) => void;
  onViewLive: () => void;
  onSettings: () => void;
}) {
  const navItem = (nav: SidebarNav, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => onNav(nav)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
        activeNav === nav
          ? "text-[var(--lc-primary)] font-bold bg-[var(--lc-surface-container-highest)] scale-[0.99]"
          : "text-[var(--lc-on-surface-variant)] hover:text-[var(--lc-primary)] hover:bg-[var(--lc-surface-container-high)]",
      )}
    >
      <MaterialIcon name={icon} className="text-[22px]" />
      <span>{label}</span>
    </button>
  );

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 min-h-0 bg-[var(--lc-surface-container-low)] dark:bg-[var(--lc-surface-container-low)] p-6 border-r border-[var(--lc-outline-variant)]">
      <div className="mb-6 shrink-0">
        <h2 className="lc-headline text-lg font-semibold text-[var(--lc-on-surface)]">
          Live Classroom
        </h2>
        <p className="text-sm text-[var(--lc-on-surface-variant)]">All teacher sessions</p>
      </div>
      <nav className="flex-1 space-y-2 min-h-0 overflow-y-auto">
        {navItem("live-sessions", "sensors", "Live Sessions")}
        {navItem("completed", "task_alt", "Completed")}
        {navItem("resources", "folder_open", "Resources")}
      </nav>
      <button
        type="button"
        onClick={onViewLive}
        className="w-full py-3 px-4 lc-btn-primary rounded-xl lc-label font-semibold shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4 shrink-0"
      >
        <MaterialIcon name="play_arrow" className="text-sm" />
        View Live
      </button>
      <div className="mt-4 pt-4 border-t border-[var(--lc-outline-variant)] shrink-0">
        <button
          type="button"
          onClick={onSettings}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[var(--lc-on-surface-variant)] hover:text-[var(--lc-primary)] hover:bg-[var(--lc-surface-container-high)] transition-all text-sm"
        >
          <MaterialIcon name="settings" className="text-[20px]" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

function EmptyStateCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border lc-ghost-border h-96 flex flex-col items-center justify-center gap-4 shadow-sm relative overflow-hidden bg-[var(--lc-surface-container-lowest)] dark:bg-[var(--lc-surface-container-low)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[var(--lc-primary)]/10 via-transparent to-transparent opacity-50" />
      {children}
    </div>
  );
}

function LiveSessionPlayer({ session }: { session: LiveSession }) {
  const showEmbed = !!(
    session.youtubeEmbedUrl &&
    (session.status === "live" || session.isRecordingAvailable)
  );

  return (
    <section className="rounded-2xl overflow-hidden border lc-ghost-border bg-[var(--lc-surface-container-lowest)] dark:bg-[var(--lc-surface-container-low)] shadow-sm">
      <div className="relative aspect-video bg-black">
        {showEmbed && session.youtubeEmbedUrl ? (
          <iframe
            title={session.title || "Live session"}
            src={session.youtubeEmbedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : session.thumbnailUrl ? (
          <img
            src={session.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1a1c1e]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--lc-primary)]/20 text-[var(--lc-primary)]">
              <Play className="h-10 w-10 fill-current" />
            </div>
          </div>
        )}
        <div className="absolute left-4 top-4">
          <StatusBadge status={session.status} />
        </div>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="lc-headline text-2xl font-semibold tracking-tight text-[var(--lc-on-surface)]">
              {session.title || "Untitled live class"}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium text-[var(--lc-on-surface-variant)]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatScheduledDate(session.scheduledStartAt)}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--lc-outline-variant)] text-[var(--lc-primary)] text-sm font-medium hover:bg-[var(--lc-surface-container-high)] transition-colors shrink-0"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>

        {session.description && (
          <p className="max-w-3xl text-sm leading-6 text-[var(--lc-on-surface-variant)]">
            {session.description}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {(session.resources || []).map((resource) => (
            <a
              key={`${resource.label}-${resource.url}`}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-[var(--lc-outline-variant)] bg-[var(--lc-surface-container-low)] p-4 text-sm font-semibold text-[var(--lc-primary)] hover:bg-[var(--lc-surface-container-high)] transition-colors"
            >
              <StickyNote className="h-5 w-5" />
              {resource.label}
            </a>
          ))}
          {(!session.resources || session.resources.length === 0) && (
            <div className="rounded-xl border border-dashed border-[var(--lc-outline-variant)] bg-[var(--lc-surface-container-low)] p-4 text-sm text-[var(--lc-on-surface-variant)] md:col-span-2">
              No resources added for this session.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SessionGrid({
  sessions,
  selectedSessionId,
  onSelect,
}: {
  sessions: LiveSession[];
  selectedSessionId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelect(session.id)}
          className={cn(
            "rounded-2xl p-5 text-left transition hover:-translate-y-0.5 border shadow-sm bg-[var(--lc-surface-container-lowest)] dark:bg-[var(--lc-surface-container-low)]",
            selectedSessionId === session.id
              ? "border-[var(--lc-primary)] ring-1 ring-[var(--lc-primary)]"
              : "border-[var(--lc-outline-variant)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 lc-headline text-lg font-semibold text-[var(--lc-on-surface)]">
              {session.title}
            </h3>
            <StatusBadge status={session.status} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--lc-on-surface-variant)]">
            <Calendar className="h-4 w-4" />
            {formatScheduledDate(session.scheduledStartAt)}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--lc-primary)]/15 px-3 py-1 text-xs font-semibold text-[var(--lc-primary)] lc-label">
            {session.status === "live"
              ? "Join Live"
              : session.status === "ended"
                ? "View Replay"
                : "View Details"}
          </p>
        </button>
      ))}
    </section>
  );
}

function DiscussionsPanel({
  chatMessages,
  typedMessage,
  setTypedMessage,
  onSendMessage,
  currentUser,
  chatDisabled,
}: {
  chatMessages: Array<{ name: string; text: string; timestamp?: number }>;
  typedMessage: string;
  setTypedMessage: (v: string) => void;
  onSendMessage: () => void;
  currentUser: { name?: string } | null;
  chatDisabled: boolean;
}) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <aside className="hidden lg:flex w-[320px] xl:w-[380px] shrink-0 flex-col min-h-0 border-l border-[var(--lc-outline-variant)] bg-[var(--lc-surface-container-lowest)] dark:bg-[var(--lc-surface-container-low)]">
      <div className="flex flex-col flex-1 min-h-0 p-6">
        <h2 className="lc-headline text-xl font-bold text-[var(--lc-primary)] mb-4 pb-4 border-b border-[var(--lc-outline-variant)] shrink-0">
          Discussions
        </h2>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {chatMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
              <MaterialIcon
                name="forum"
                className="text-4xl text-[var(--lc-on-surface-variant)]/30 mb-2"
              />
              <p className="text-[var(--lc-on-surface-variant)] text-sm">
                No messages yet. Be the first to start the conversation.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto pr-1 min-h-0">
              {chatMessages.map((message, index) => {
                const isCurrentUser =
                  message.name === (currentUser?.name || "User") || message.name === "You";
                return (
                  <div
                    key={`${message.name}-${message.text}-${index}`}
                    className={cn("flex gap-3", isCurrentUser && "flex-row-reverse")}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lc-primary)]/20 text-xs font-bold text-[var(--lc-primary)]">
                      {message.name.charAt(0)}
                    </div>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm",
                        isCurrentUser
                          ? "bg-[var(--lc-primary)] text-[var(--lc-on-primary)] border-transparent"
                          : "bg-[var(--lc-surface-container-low)] text-[var(--lc-on-surface)] border-[var(--lc-outline-variant)]",
                      )}
                    >
                      {!isCurrentUser && (
                        <p className="mb-1 font-bold text-[var(--lc-primary)] text-xs">
                          {message.name}
                        </p>
                      )}
                      <p className="break-words">{message.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--lc-outline-variant)] shrink-0">
          <div className="relative">
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              disabled={chatDisabled}
              placeholder={
                chatDisabled
                  ? "Chat disabled for completed classes"
                  : "Send a message to class..."
              }
              className="w-full bg-[var(--lc-surface-container-low)] dark:bg-[var(--lc-surface-container-lowest)] border border-[var(--lc-outline-variant)] rounded-xl pl-4 pr-12 py-3 text-sm outline-none transition-all placeholder:text-[var(--lc-on-surface-variant)]/60 text-[var(--lc-on-surface)] focus:border-[var(--lc-primary)] focus:ring-1 focus:ring-[var(--lc-primary)] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onSendMessage}
              disabled={chatDisabled}
              className="absolute right-3 inset-y-0 flex items-center text-[var(--lc-primary)] hover:opacity-80 transition-colors disabled:opacity-40"
              aria-label="Send message"
            >
              <MaterialIcon name="send" className="text-[20px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
