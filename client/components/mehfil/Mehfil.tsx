import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useMehfilStore, MehfilRoom } from '@/store/mehfilStore';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/utils/authService';
import ThoughtCard from './ThoughtCard';
import Composer from './Composer';
import MehfilSidebar from './MehfilSidebar';
import type { MehfilSidebarView } from './MehfilSidebar';
import SandeshCard from './SandeshCard';
import { toast } from 'sonner';
import GlobalSidebar from '@/components/GlobalSidebar';
import { closeMehfilSocket, getMehfilSocket } from '@/lib/socket';
import { useTranslation } from 'react-i18next';

import "@/styles/mehfil-m3.css";
import M3TopNavbar from "@/components/M3TopNavbar";
import { MdRoomFilterChips } from "./material/MdRoomFilterChips";

import { Info, ShieldAlert, AlertCircle, ChevronDown, Clock, Ban, Ghost, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


interface MehfilProps {
  backendUrl?: string;
}

type MehfilFeedRoom = MehfilRoom | 'ALL';
const FEED_PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 450;
const MIN_SEARCH_QUERY_LENGTH = 3;
const MAX_SEARCH_QUERY_LENGTH = 80;

const normalizeSearchQuery = (value: string) =>
  value.trim().replace(/\s+/g, ' ').slice(0, MAX_SEARCH_QUERY_LENGTH);

interface PostingBanPayload {
  isActive: boolean;
  isPermanent: boolean;
  bannedUntil: string | null;
  message: string;
  reason?: string | null;
}

interface ShadowBanNotice {
  message: string;
  reason?: string | null;
  strikeCount?: number | null;
}

const ROOM_CONFIG: Record<MehfilFeedRoom, {
  title: string;
  subtitle: string;
  placeholder: string;
  chipClass: string;
}> = {
  ALL: {
    title: 'All',
    subtitle: 'See all approved posts from both Academic Hall and Thoughts in one feed.',
    placeholder: 'Share what is on your mind. AI will route it to the right section...',
    chipClass: 'from-mehfil-maroon to-mehfil-plum',
  },
  ACADEMIC: {
    title: 'Academic Hall',
    subtitle: 'Ask questions, share exam strategy, and help each other improve.',
    placeholder: 'Ask a question or share a study insight...',
    chipClass: 'from-teal-500 to-cyan-500',
  },
  REFLECTIVE: {
    title: 'Thoughts',
    subtitle: 'Share what you are feeling and support each other with empathy.',
    placeholder: "How are you feeling? Share what's on your mind...",
    chipClass: 'from-indigo-500 to-violet-500',
  },
};

const Mehfil: React.FC<MehfilProps> = ({ backendUrl }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mehfilSidebarInitialView, setMehfilSidebarInitialView] = useState<MehfilSidebarView>('connections');
  const [isGlobalSidebarOpen, setIsGlobalSidebarOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<MehfilFeedRoom>('ALL');
  const [postingBan, setPostingBan] = useState<PostingBanPayload | null>(null);
  const [shadowBanNotice, setShadowBanNotice] = useState<ShadowBanNotice | null>(null);
  const [banRemainingMs, setBanRemainingMs] = useState(0);
  const [hasMoreThoughts, setHasMoreThoughts] = useState(true);
  const [isLoadingThoughts, setIsLoadingThoughts] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');
  const [hasUnreadSandesh, setHasUnreadSandesh] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const userIdRef = useRef<string | undefined>(undefined);
  const currentFeedPageRef = useRef(0);
  const hasMoreThoughtsRef = useRef(true);
  const isLoadingThoughtsRef = useRef(false);
  const searchQueryRef = useRef('');

  const {
    thoughts,
    userReactions,
    addThought,
    updateThought,
    removeThought,
    updateRelatableCount,
    setUserReaction,
  } = useMehfilStore();
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
    navigate("/login");
  };

  const handleProfile = () => {
    navigate("/profile");
  };

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const isPaused = import.meta.env.VITE_MEHFIL_PAUSED === 'true';

  if (isPaused) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500 animate-pulse">
            {t('mehfil.under_construction')}
          </h1>
          <p className="text-slate-400 text-lg">{t('mehfil.check_back')}</p>
        </div>
      </div>
    );
  }



  const applyPostingBanState = (payload?: PostingBanPayload | null) => {
    if (!payload?.isActive) {
      setPostingBan(null);
      setBanRemainingMs(0);
      return;
    }

    setPostingBan(payload);
    if (payload.isPermanent || !payload.bannedUntil) {
      setBanRemainingMs(Infinity);
      return;
    }

    const remaining = new Date(payload.bannedUntil).getTime() - Date.now();
    setBanRemainingMs(Math.max(0, remaining));
  };

  const formatBanRemaining = (remainingMs: number) => {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    if (!postingBan?.isActive || postingBan.isPermanent || !postingBan.bannedUntil) return;

    const updateRemaining = () => {
      const next = new Date(postingBan.bannedUntil as string).getTime() - Date.now();
      if (next <= 0) {
        setBanRemainingMs(0);
        setPostingBan(null);
        return;
      }
      setBanRemainingMs(next);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);

    return () => window.clearInterval(timer);
  }, [postingBan?.isActive, postingBan?.isPermanent, postingBan?.bannedUntil]);

  useEffect(() => {
    const newSocket = getMehfilSocket(backendUrl);

    newSocket.on('connect', () => {
      console.log('Connected to Mehfil server');
    });

    newSocket.on('thoughts', (payload: { thoughts: any[]; page?: number; hasMore?: boolean; query?: string }) => {
      const responseQuery = typeof payload?.query === 'string' ? payload.query : '';
      if (responseQuery !== searchQueryRef.current) {
        return;
      }

      const thoughtList = payload?.thoughts || [];
      const page = Number(payload?.page ?? 1);
      const hasMore = Boolean(payload?.hasMore);
      const reactedThoughtIds = thoughtList
        .filter((t: any) => Boolean(t.hasReacted))
        .map((t: any) => t.id);

      useMehfilStore.setState((state) => {
        if (page <= 1) {
          return {
            thoughts: thoughtList,
            userReactions: new Set(reactedThoughtIds),
          };
        }

        const seen = new Set(state.thoughts.map((t) => t.id));
        const mergedThoughts = [...state.thoughts];

        for (const incomingThought of thoughtList) {
          if (!seen.has(incomingThought.id)) {
            seen.add(incomingThought.id);
            mergedThoughts.push(incomingThought);
            continue;
          }

          const existingIndex = mergedThoughts.findIndex((entry) => entry.id === incomingThought.id);
          if (existingIndex >= 0) {
            mergedThoughts[existingIndex] = { ...mergedThoughts[existingIndex], ...incomingThought };
          }
        }

        const mergedReactions = new Set(state.userReactions);
        for (const thoughtId of reactedThoughtIds) {
          mergedReactions.add(thoughtId);
        }

        return {
          thoughts: mergedThoughts,
          userReactions: mergedReactions,
        };
      });

      currentFeedPageRef.current = page;
      hasMoreThoughtsRef.current = hasMore;
      isLoadingThoughtsRef.current = false;
      setHasMoreThoughts(hasMore);
      setIsLoadingThoughts(false);
    });

    newSocket.on('thoughtCreated', (thought) => {
      if (searchQueryRef.current) {
        return;
      }
      addThought(thought);
      setAriaLiveMessage(t('mehfil.aria.new_thought') || 'New thought received');
      setTimeout(() => setAriaLiveMessage(''), 3000);
    });

    newSocket.on('thoughtUpdated', (thought) => {
      updateThought(thought);
    });


    newSocket.on('thoughtDeleted', ({ thoughtId }) => {
      removeThought(thoughtId); // You need to ensure removeThought is available in your store
    });

    newSocket.on('reactionUpdated', ({ thoughtId, relatableCount, userId, hasReacted }) => {
      updateRelatableCount(thoughtId, relatableCount);
      if (userIdRef.current && userId === userIdRef.current) {
        if (typeof hasReacted === 'boolean') {
          setUserReaction(thoughtId, hasReacted);
        }
      }
    });

    newSocket.on('postingBanStatus', (payload: PostingBanPayload) => {
      applyPostingBanState(payload);
    });

    newSocket.on('thoughtAccepted', ({ message }) => {
      toast.success(message || t('mehfil.toasts.posted'));
    });

    newSocket.on('thoughtRejected', ({ message, ban }) => {
      if (ban?.isActive) {
        applyPostingBanState(ban);
        toast.error(message || ban.message || t('mehfil.toasts.pban_desc'));
        return;
      }

      toast.warning(message || "Thought doesn't meet community guidelines.");
    });

    newSocket.on('shadowBanNotice', (payload: ShadowBanNotice) => {
      setShadowBanNotice(payload);
      if (payload?.message) {
        toast.warning(payload.message);
      }
    });

    newSocket.on('thoughtRerouted', ({ room }) => {
      const destination = room === 'REFLECTIVE' ? t('mehfil.rooms.reflective') : t('mehfil.rooms.academic');
      toast.info(t('mehfil.toasts.share_to', { room: destination }));
    });

    newSocket.on('error', (error) => {
      const message = error?.message || t('mehfil.toasts.post_error');
      console.error('Mehfil socket error:', error);
      toast.error(message);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Mehfil server');
    });

    setSocket(newSocket);

    return () => {
      closeMehfilSocket();
    };
  }, [backendUrl, addThought, updateThought, removeThought, updateRelatableCount, setUserReaction, t]);

  useEffect(() => {
    if (!socket) return;

    const requestThoughtPage = (page: number, query = searchQueryRef.current) => {
      isLoadingThoughtsRef.current = true;
      setIsLoadingThoughts(true);
      socket.emit('loadThoughts', {
        page,
        limit: FEED_PAGE_SIZE,
        room: 'ALL',
        query: query || undefined,
      });
    };

    const syncSocketState = () => {
      if (user?.id) {
        socket.emit('register', {
          id: user.id,
          name: user.name || 'User',
          avatar: user.avatar || '',
        });
        socket.emit('checkPostingBan');
      }

      // Always load/join the combined feed so no category data is dropped.
      // Tabs still filter locally in the UI.
      socket.emit('joinRoom', { room: 'ALL' });
      currentFeedPageRef.current = 0;
      hasMoreThoughtsRef.current = true;
      setHasMoreThoughts(true);
      requestThoughtPage(1, searchQueryRef.current);
    };

    if (socket.connected) {
      syncSocketState();
    }

    socket.on('connect', syncSocketState);
    return () => {
      socket.off('connect', syncSocketState);
    };
  }, [socket, user?.id, user?.name, user?.avatar]);

  useEffect(() => {
    if (!socket) return;

    const normalizedQuery = normalizeSearchQuery(debouncedSearchTerm);
    const effectiveQuery =
      normalizedQuery.length >= MIN_SEARCH_QUERY_LENGTH ? normalizedQuery : '';

    if (effectiveQuery === searchQueryRef.current) {
      return;
    }

    searchQueryRef.current = effectiveQuery;

    if (!socket.connected) {
      return;
    }

    currentFeedPageRef.current = 0;
    hasMoreThoughtsRef.current = true;
    setHasMoreThoughts(true);
    isLoadingThoughtsRef.current = true;
    setIsLoadingThoughts(true);

    socket.emit('loadThoughts', {
      page: 1,
      limit: FEED_PAGE_SIZE,
      room: 'ALL',
      query: effectiveQuery || undefined,
    });
  }, [socket, debouncedSearchTerm]);

  useEffect(() => {
    if (!socket) return;

    const handleScrollLoad = () => {
      if (isLoadingThoughtsRef.current || !hasMoreThoughtsRef.current) return;

      const viewportBottom = window.innerHeight + window.scrollY;
      const documentBottom = document.documentElement.scrollHeight;
      const isNearBottom = viewportBottom >= documentBottom - 600;

      if (!isNearBottom) return;

      const nextPage = currentFeedPageRef.current + 1;
      isLoadingThoughtsRef.current = true;
      setIsLoadingThoughts(true);
      socket.emit('loadThoughts', {
        page: nextPage,
        limit: FEED_PAGE_SIZE,
        room: 'ALL',
        query: searchQueryRef.current || undefined,
      });
    };

    window.addEventListener('scroll', handleScrollLoad, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollLoad);
  }, [socket]);

  const handleSendThought = async (content: string, isAnonymous: boolean, room: MehfilFeedRoom) => {
    if (!socket || !user) {
      toast.error(t('mehfil.toasts.post_error'));
      return;
    }

    const requestedRoom: MehfilRoom = room === 'ALL' ? 'ACADEMIC' : room;

    socket.emit('newThought', {
      content,
      imageUrl: null,
      isAnonymous,
      room: requestedRoom,
    });
  };

  const handleReact = (thoughtId: string) => {
    if (!socket || !user) return;
    socket.emit('toggleReaction', { thoughtId });
  };

  const handleDelete = (thoughtId: string) => {
    if (!socket || !user) return;
    socket.emit('deleteThought', { thoughtId });
  };

  const handleEdit = (thoughtId: string, content: string) => {
    if (!socket || !user) return;
    socket.emit('editThought', { thoughtId, content });
  };

  const normalizeThoughtRoom = (category?: string | null): MehfilRoom => {
    const value = String(category || '').trim().toUpperCase();
    if (value === 'REFLECTIVE' || value === 'THOUGHTS' || value === 'THOUGHT') return 'REFLECTIVE';
    return 'ACADEMIC';
  };

  const roomFilteredThoughts = thoughts.filter((thought) => {
    const thoughtRoom = normalizeThoughtRoom(thought.category);
    if (activeRoom === 'ALL') return thoughtRoom === 'ACADEMIC' || thoughtRoom === 'REFLECTIVE';
    return thoughtRoom === activeRoom;
  });

  const visibleThoughts = roomFilteredThoughts;

  const isGuestReadOnly = !user?.id;

  const mehfilRoomAttr = activeRoom.toLowerCase() as 'all' | 'academic' | 'reflective';

  return (
    <div
      className="min-h-[100dvh] mehfil-m3 text-foreground overflow-x-hidden font-sans selection:bg-[color-mix(in_srgb,var(--mehfil-room-accent)_25%,transparent)]"
      data-mehfil-room={mehfilRoomAttr}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaLiveMessage}
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[var(--mehfil-bg)]">
        <div className="gradient-blob mehfil-blob-a w-[800px] h-[800px] -top-64 -left-32" />
        <div className="gradient-blob mehfil-blob-b w-[600px] h-[600px] top-1/2 -right-32" />
      </div>

      <M3TopNavbar
        moduleName="MEHFIL"
        onSidebarToggle={() => setIsGlobalSidebarOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showSearch={true}
      />

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-12 mt-4 sm:mt-6">
        <main className="scrollbar-blend">
          <section className="mehfil-filter-section mb-4 sm:mb-6 p-4 sm:p-6 mehfil-m3-card flex flex-col items-center text-center">
            <div className="p-2 w-full flex justify-center">
              <MdRoomFilterChips
                activeRoom={activeRoom}
                rooms={['ALL', 'ACADEMIC', 'REFLECTIVE'] as MehfilFeedRoom[]}
                labels={{
                  ALL: t('mehfil.rooms.all'),
                  ACADEMIC: t('mehfil.rooms.academic'),
                  REFLECTIVE: t('mehfil.rooms.reflective'),
                }}
                tabActiveClass=""
                tabIdleClass=""
                onSelect={(room) => setActiveRoom(room)}
              />
            </div>
            <p className="mt-4 text-sm font-medium mehfil-text-body max-w-3xl leading-relaxed">
              {t(`mehfil.subtitles.${activeRoom.toLowerCase()}`)}
            </p>
          </section>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto relative z-10">

            {/* Center Feed - Spans 8 columns */}
            <main className="md:col-span-7 lg:col-span-8 flex flex-col gap-3 sm:gap-4 md:gap-6">

              <div className="mehfil-m3-card community-space-panel p-5 sm:p-6 lg:p-8">
                <header className="mb-5 sm:mb-6">
                  <h1 className="text-2xl sm:text-[1.75rem] font-bold mehfil-text-title tracking-tight">
                    {t('mehfil.community_space')}
                  </h1>
                  <p className="mt-1.5 text-sm sm:text-[15px] mehfil-text-body leading-relaxed max-w-2xl">
                    {t('mehfil.community_desc')}
                  </p>
                </header>

                <Collapsible
                  open={guidelinesOpen}
                  onOpenChange={setGuidelinesOpen}
                  className="mb-5 sm:mb-6"
                >
                  <div className="mehfil-guidelines-bar rounded-2xl border overflow-hidden transition-colors">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--mehfil-info-muted)_40%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="mehfil-guidelines-icon-wrap flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                            <ShieldAlert className="w-[18px] h-[18px]" aria-hidden />
                          </div>
                          <span className="mehfil-guidelines-label text-sm font-semibold truncate">
                            {t('mehfil.guidelines')}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-5 h-5 shrink-0 mehfil-text-muted transition-transform duration-200",
                            guidelinesOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 sm:px-5 pb-5 pt-1 border-t border-[var(--mehfil-outline-variant)] animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider mehfil-text-muted flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> {t('mehfil.posting_rules')}
                          </h4>
                          <ul className="space-y-3">
                            <li className="flex gap-3 text-sm mehfil-text-body">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--mehfil-room-academic)] mt-1.5 shrink-0" />
                              <span>{t('mehfil.academic_rule')}</span>
                            </li>
                            <li className="flex gap-3 text-sm mehfil-text-body">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--mehfil-room-reflective-muted)] mt-1.5 shrink-0" />
                              <span>{t('mehfil.thoughts_rule')}</span>
                            </li>
                          </ul>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider mehfil-text-muted flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" /> {t('mehfil.consequences')}
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--mehfil-surface-low)] border border-[var(--mehfil-outline-variant)]">
                              <div className="p-1.5 rounded-lg bg-[var(--mehfil-warning-container)]">
                                <Ban className="w-4 h-4 text-[var(--mehfil-warning)]" />
                              </div>
                              <div className="text-xs leading-tight">
                                <span className="font-bold block mehfil-text-title">{t('mehfil.report_bans')}</span>
                                <span className="mehfil-text-body">{t('mehfil.report_desc')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--mehfil-surface-low)] border border-[var(--mehfil-outline-variant)]">
                              <div className="p-1.5 rounded-lg bg-[var(--mehfil-error-container)]">
                                <Ghost className="w-4 h-4 text-[var(--mehfil-error)]" />
                              </div>
                              <div className="text-xs leading-tight">
                                <span className="font-bold block mehfil-text-title">{t('mehfil.shadow_banning')}</span>
                                <span className="mehfil-text-body">{t('mehfil.spam_desc')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>


                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {isGuestReadOnly ? (
                  <div className="rounded-2xl border border-[color-mix(in_srgb,var(--mehfil-warning)_35%,var(--mehfil-outline-variant))] bg-[var(--mehfil-warning-container)] px-4 py-3.5 text-sm text-[var(--mehfil-on-surface)]">
                    <span className="font-semibold">Guest mode:</span> You can read all community posts. Sign in to post, react, comment, and connect.
                    <Link to="/?signin=true" className="ml-2 font-semibold underline underline-offset-2 hover:opacity-80">
                      Sign in
                    </Link>
                  </div>
                ) : (
                  <Composer
                    onSendThought={handleSendThought}
                    userAvatar={user?.avatar}
                    activeRoom={activeRoom}
                    placeholder={t(`mehfil.placeholders.${activeRoom.toLowerCase()}`)}
                  />
                )}
              </div>

              {/* Mobile Sandesh (only visible on small screens) */}
              <div className="md:hidden">
                <SandeshCard onUnreadChange={setHasUnreadSandesh} />
              </div>

              <div className="space-y-6">
                {visibleThoughts.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--mehfil-surface-low)] flex items-center justify-center">
                      <MessageCircle className="w-12 h-12 mehfil-text-muted" />
                    </div>
                    <p className="mehfil-text-body mt-2">
                      {t('mehfil.no_thoughts', { room: t(`mehfil.rooms.${activeRoom.toLowerCase()}`) })}
                    </p>
                  </div>
                ) : (
                  visibleThoughts.map((thought) => (
                    <ThoughtCard
                      key={thought.id}
                      thought={thought}
                      onReact={() => handleReact(thought.id)}
                      onEdit={handleEdit}
                      onDelete={() => handleDelete(thought.id)}
                      hasReacted={userReactions.has(thought.id)}
                      isOwnThought={thought.userId === user?.id}
                      currentUserId={user?.id}
                      readOnly={isGuestReadOnly}
                    />
                  ))
                )}

                {isLoadingThoughts && (
                  <div className="text-center py-4 text-sm mehfil-text-body">
                    {t('mehfil.loading_more')}
                  </div>
                )}

                {!hasMoreThoughts && thoughts.length > 0 && (
                  <div className="text-center py-3 text-xs uppercase tracking-wider mehfil-text-muted">
                    {t('mehfil.end_of_feed')}
                  </div>
                )}
              </div>
            </main>

            {/* Right Sidebar - Sandesh (visible on md+ screens, sticky) - Spans 5/4 columns */}
            <aside className="hidden md:block md:col-span-5 lg:col-span-4 md:sticky md:top-24 lg:top-28 h-fit">
              <SandeshCard onUnreadChange={setHasUnreadSandesh} />
            </aside>

          </div>

        </main>
      </div>

      <MehfilSidebar
        isOpen={isSidebarOpen}
        initialView={mehfilSidebarInitialView}
        onClose={() => setIsSidebarOpen(false)}
      />
      <GlobalSidebar
        isOpen={isGlobalSidebarOpen}
        onClose={() => setIsGlobalSidebarOpen(false)}
        onOpenMehfilSidebar={(view) => {
          setMehfilSidebarInitialView(view === 'connections' ? 'saved' : (view ?? 'saved'));
          setIsSidebarOpen(true);
        }}
      />

      {postingBan?.isActive && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/90 text-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">{t('mehfil.toasts.pban_title')}</h3>
            <p className="mt-2 text-slate-200">{t('mehfil.toasts.pban_desc')}</p>
            {postingBan.reason && (
              <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
                <span className="font-semibold">{t('mehfil.card.report_other')}:</span> {postingBan.reason}
              </div>
            )}
            {postingBan.isPermanent ? (
              <p className="mt-4 text-sm text-rose-300 font-semibold">{t('mehfil.toasts.pban_perm')}</p>
            ) : (
              <div className="mt-4 rounded-2xl bg-slate-800/70 border border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{t('mehfil.toasts.pban_time')}</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-300 tabular-nums">
                  {formatBanRemaining(banRemainingMs)}
                </p>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              {t('mehfil.toasts.pban_hint')}
            </p>
          </div>
        </div>
      )}

      {shadowBanNotice && (
        <div className="fixed inset-0 z-[79] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/90 text-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">{t('mehfil.shadow_banning')}</h3>
            <p className="mt-2 text-slate-200">{shadowBanNotice.message}</p>
            {shadowBanNotice.reason && (
              <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <span className="font-semibold">{t('mehfil.card.report_other')}:</span> {shadowBanNotice.reason}
              </div>
            )}
            {Number.isFinite(shadowBanNotice.strikeCount ?? NaN) && (
              <p className="mt-3 text-xs text-slate-400">
                Strikes recorded: {shadowBanNotice.strikeCount}
              </p>
            )}
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShadowBanNotice(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-bold"
              >
                {t('mehfil.card.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mehfil;
