import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Radio,
  Search,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  Share2,
  Play,
  Square,
  MessageSquare,
  StickyNote,
  Send,
  Plus,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import TopNavbar from "@/components/TopNavbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch, API_BASE } from "@/utils/apiFetch";

const FILTER_MAP = {
  upcoming: "scheduled",
  live: "live",
  completed: "ended",
} as const;

type FilterTab = keyof typeof FILTER_MAP;
type ApiStatus = (typeof FILTER_MAP)[FilterTab];
type SidebarTab = "chat" | "notes";

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

const MOCK_CHAT_MESSAGES = [
  { name: "Marcus L.", text: "Could you clarify the second step? It was a bit fast." },
  { name: "You", text: "I think it is the standard substitution method. Check the notes." },
  { name: "Elena S.", text: "The visualization on this section is helpful." },
];

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
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold",
        isLive
          ? "bg-[#ba1a1a] text-white"
          : status === "ended"
            ? "bg-[#e1dfdc] text-[#636360]"
            : "bg-[#dee0ff] text-[#10268f]",
      )}
    >
      {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
      {formatStatusLabel(status)}
    </span>
  );
}

export default function LiveSessions() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId")?.trim() || "";

  const [filterTab, setFilterTab] = useState<FilterTab>("live");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const apiStatus: ApiStatus = FILTER_MAP[filterTab];

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || sessions[0] || null,
    [selectedSessionId, sessions],
  );

  const manageableSession = useMemo(
    () => sessions.find((s) => s.canManage && s.status === apiStatus) || null,
    [apiStatus, sessions],
  );

  const loadSessions = useCallback(async () => {
    if (!courseId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ courseId, status: apiStatus });
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
  }, [apiStatus, courseId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end live class");
    } finally {
      setIsActionLoading(false);
      loadSessions();
    }
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-[#f9f9fc] text-[#1a1c1e]">
        <TopNavbar />
        <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-6 py-12">
          <div className="rounded-[2rem] border border-[#c5c5d5] bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#dee0ff] text-[#10268f]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold text-[#1a1c1e]">
              Open live classes from a course
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#454652]">
              This screen needs a course id in the URL, for example{" "}
              <span className="font-semibold text-[#10268f]">
                /live-sessions?courseId=COURSE_ID
              </span>
              .
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f9f9fc] text-[#1a1c1e]">
      <TopNavbar />

      <main className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1040px] flex-col gap-6 p-4 lg:p-6">
            <div className="flex flex-col gap-4 rounded-[2rem] border border-[#c5c5d5] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#10268f]">
                  <Radio className="h-4 w-4" />
                  Live Classes
                </p>
                <h1 className="mt-2 font-['Plus_Jakarta_Sans'] text-3xl font-bold tracking-tight">
                  Course live classroom
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#757684]" />
                  <input
                    className="w-full rounded-full border border-[#c5c5d5] bg-[#f3f3f6] py-2 pl-10 pr-4 text-sm outline-none ring-[#10268f] focus:ring-2 sm:w-64"
                    placeholder="Search sessions..."
                    readOnly
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadSessions()}
                  className="rounded-full border-[#757684] text-[#10268f]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 rounded-full bg-[#eeeef0] p-1">
              {(
                [
                  ["upcoming", "Upcoming"],
                  ["live", "Live"],
                  ["completed", "Completed"],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-bold transition",
                    filterTab === tab
                      ? "bg-[#10268f] text-white shadow-sm"
                      : "text-[#454652] hover:bg-[#e1dfdc]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {manageableSession && (
              <div className="rounded-[2rem] border border-[#c5c5d5] bg-[#f3f3f6] p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#10268f]">
                      Teacher controls
                    </p>
                    <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-xl font-bold">
                      {manageableSession.title}
                    </h2>
                    {apiStatus === "scheduled" && (
                      <input
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="Paste today's YouTube Live URL"
                        className="mt-3 w-full rounded-full border border-[#c5c5d5] bg-white px-4 py-3 text-sm outline-none ring-[#10268f] focus:ring-2"
                      />
                    )}
                  </div>

                  {apiStatus === "live" ? (
                    <Button
                      type="button"
                      onClick={() => endLive(manageableSession.id)}
                      disabled={isActionLoading}
                      className="rounded-full bg-[#ba1a1a] px-6 text-white hover:bg-[#93000a]"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      End Live
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => startLive(manageableSession.id)}
                      disabled={isActionLoading}
                      className="rounded-full bg-[#10268f] px-6 text-white hover:bg-[#293ba2]"
                    >
                      <Radio className="mr-2 h-4 w-4" />
                      Start Live
                    </Button>
                  )}
                </div>
              </div>
            )}

            {selectedSession ? (
              <LiveSessionPlayer session={selectedSession} />
            ) : (
              <SessionsEmptyState
                isLoading={isLoading}
                error={error}
                onRetry={loadSessions}
              />
            )}

            <SessionGrid
              sessions={sessions}
              selectedSessionId={selectedSession?.id || ""}
              isLoading={isLoading}
              error={error}
              onRetry={loadSessions}
              onSelect={setSelectedSessionId}
            />
          </div>
        </section>

        <ClassActivitySidebar
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          session={selectedSession}
        />
      </main>
    </div>
  );
}

function LiveSessionPlayer({ session }: { session: LiveSession }) {
  const showEmbed = !!(
    session.youtubeEmbedUrl &&
    (session.status === "live" || session.isRecordingAvailable)
  );

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#c5c5d5] bg-white shadow-sm">
      <div className="relative aspect-video bg-black">
        {showEmbed && session.youtubeEmbedUrl ? (
          <iframe
            title={session.title || "Live session"}
            src={session.youtubeEmbedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : session.thumbnailUrl ? (
          <img
            src={session.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1a1c1e]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#dee0ff] text-[#10268f]">
              <Play className="h-10 w-10 fill-current" />
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4">
          <StatusBadge status={session.status} />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight lg:text-3xl">
              {session.title || "Untitled live class"}
            </h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-[#454652]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatScheduledDate(session.scheduledStartAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Course session
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="rounded-full border-[#757684] text-[#10268f]"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {session.description && (
          <p className="max-w-3xl text-sm leading-6 text-[#454652]">{session.description}</p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {(session.resources || []).map((resource) => (
            <a
              key={`${resource.label}-${resource.url}`}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-[1.25rem] border border-[#c5c5d5] bg-[#f9f9fc] p-4 text-sm font-semibold text-[#10268f] hover:bg-[#dee0ff]"
            >
              <StickyNote className="h-5 w-5" />
              {resource.label}
            </a>
          ))}

          {(!session.resources || session.resources.length === 0) && (
            <div className="rounded-[1.25rem] border border-dashed border-[#c5c5d5] bg-[#f9f9fc] p-4 text-sm text-[#757684]">
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
  isLoading,
  error,
  onRetry,
  onSelect,
}: {
  sessions: LiveSession[];
  selectedSessionId: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (id: string) => void;
}) {
  if (!sessions.length) {
    return (
      <SessionsEmptyState isLoading={isLoading} error={error} onRetry={onRetry} />
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-2">
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => onSelect(session.id)}
          className={cn(
            "rounded-[1.5rem] border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
            selectedSessionId === session.id
              ? "border-[#10268f]"
              : "border-[#c5c5d5]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 font-['Plus_Jakarta_Sans'] text-lg font-bold">
              {session.title}
            </h3>
            <StatusBadge status={session.status} />
          </div>

          <p className="mt-3 flex items-center gap-2 text-sm text-[#454652]">
            <Calendar className="h-4 w-4" />
            {formatScheduledDate(session.scheduledStartAt)}
          </p>

          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#dee0ff] px-3 py-1 text-xs font-bold text-[#10268f]">
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

function SessionsEmptyState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-[#c5c5d5] bg-white p-8 text-center shadow-sm">
      {isLoading ? (
        <>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#dee0ff] border-t-[#10268f]" />
          <p className="font-semibold text-[#454652]">Loading live sessions...</p>
        </>
      ) : error ? (
        <>
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#ba1a1a]" />
          <p className="font-semibold text-[#93000a]">{error}</p>
          <Button onClick={() => onRetry()} className="mt-4 rounded-full bg-[#10268f] text-white">
            Try again
          </Button>
        </>
      ) : (
        <>
          <Video className="mx-auto mb-3 h-10 w-10 text-[#10268f]" />
          <p className="font-semibold text-[#454652]">No sessions found for this filter.</p>
        </>
      )}
    </div>
  );
}

function ClassActivitySidebar({
  activeTab,
  onTabChange,
  session,
}: {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  session: LiveSession | null;
}) {
  return (
    <aside className="hidden w-[380px] flex-col border-l border-[#c5c5d5] bg-[#f3f3f6] xl:flex">
      <div className="border-b border-[#c5c5d5] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#10268f]">
            Class Activity
          </h2>
          <Button className="rounded-full bg-[#10268f] text-white hover:bg-[#293ba2]">
            Ask a Question
          </Button>
        </div>

        <div className="mt-4 flex gap-2 rounded-full bg-[#eeeef0] p-1">
          {(
            [
              ["chat", MessageSquare, "Chat"],
              ["notes", StickyNote, "Notes"],
            ] as const
          ).map(([tab, Icon, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-bold transition",
                activeTab === tab
                  ? "bg-[#10268f] text-white shadow-sm"
                  : "text-[#454652] hover:bg-[#e1dfdc]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "chat" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {MOCK_CHAT_MESSAGES.map((message, index) => (
              <div
                key={`${message.name}-${message.text}`}
                className={cn(
                  "flex gap-3",
                  message.name === "You" && "flex-row-reverse",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dee0ff] text-xs font-bold text-[#10268f]">
                  {message.name.charAt(0)}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-[1rem] border border-[#c5c5d5] p-3 text-sm shadow-sm",
                    index === 1
                      ? "bg-[#2e40a6] text-white"
                      : "bg-white text-[#1a1c1e]",
                  )}
                >
                  {message.name !== "You" && (
                    <p className="mb-1 font-bold text-[#10268f]">{message.name}</p>
                  )}
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#c5c5d5] bg-white p-4">
            <div className="relative">
              <textarea
                rows={1}
                placeholder={
                  session?.isChatEnabled === false
                    ? "Chat disabled for this class"
                    : "Send a message..."
                }
                disabled={session?.isChatEnabled === false}
                className="w-full resize-none rounded-[1rem] border border-[#c5c5d5] bg-[#f3f3f6] py-3 pl-4 pr-12 text-sm outline-none ring-[#10268f] focus:ring-2 disabled:opacity-60"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#10268f] hover:bg-[#dee0ff]"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="rounded-[1.25rem] border border-[#c5c5d5] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#757684]">
              Timestamp: 12:45
            </p>
            <p className="mt-2 text-sm leading-6">
              Review the key derivation after class and add course notes here.
            </p>
          </div>

          <button
            type="button"
            className="flex w-full flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed border-[#c5c5d5] p-6 text-[#757684] hover:border-[#10268f] hover:text-[#10268f]"
          >
            <Plus className="mb-2 h-6 w-6" />
            Add a new note
          </button>
        </div>
      )}
    </aside>
  );
}
