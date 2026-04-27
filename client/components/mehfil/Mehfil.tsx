import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useMehfilStore, MehfilRoom } from '@/store/mehfilStore';
import { useDMStore } from '@/store/dmStore';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/utils/authService';
import LanguageToggle from '../LanguageToggle';
import ThoughtCard from './ThoughtCard';
import Composer from './Composer';
import MehfilSidebar from './MehfilSidebar';
import type { MehfilSidebarView } from './MehfilSidebar';
import SandeshCard from './SandeshCard';
import { DMLayer } from './dm/DMLayer';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ui/theme-toggle';
import GlobalSidebar from '@/components/GlobalSidebar';
import { closeMehfilSocket, getMehfilSocket } from '@/lib/socket';
import { useTranslation } from 'react-i18next';

import { Search, Settings, LogOut, Menu, Info, ShieldAlert, AlertCircle, ChevronDown, ChevronUp, Clock, Ban, Ghost, Bell, MessageCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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
  const initializeDM = useDMStore((state) => state.initialize);
  const loadSavedHandles = useDMStore((state) => state.loadSavedHandles);
  const dmRequestError = useDMStore((state) => state.requestError);
  const incomingRequestsCount = useDMStore((state) => state.incomingRequests.length);

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

  useEffect(() => {
    if (dmRequestError) {
      toast.error(dmRequestError);
    }
  }, [dmRequestError]);

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
        initializeDM(socket, user.id, user.name || 'You');
        loadSavedHandles();
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
  }, [socket, user?.id, user?.name, user?.avatar, initializeDM, loadSavedHandles]);

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

  const isAll = activeRoom === 'ALL';
  const isReflective = activeRoom === 'REFLECTIVE';
  const roomPalette = isAll
    ? {
      page: 'bg-[#f8f7f5] dark:bg-[#0a0a0b]',
      selection: 'selection:bg-rose-200/50',
      blobA: 'bg-rose-400/10 dark:bg-rose-500/20',
      blobB: 'bg-pink-300/10 dark:bg-pink-500/20',
      ring: 'focus:ring-rose-500/20 focus:border-rose-500/50',
      tabActive: 'bg-gradient-to-r from-mehfil-maroon to-mehfil-plum text-white shadow-lg shadow-mehfil-maroon/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      tabIdle: 'text-rose-700 hover:text-rose-800 hover:bg-white/60 dark:text-rose-300 dark:hover:bg-white/10 dark:hover:text-rose-200',
    }
    : isReflective
      ? {
        page: 'bg-[#f8f7f5] dark:bg-[#0a0a0b]',
        selection: 'selection:bg-indigo-200/50',
        blobA: 'bg-indigo-400/10 dark:bg-indigo-500/20',
        blobB: 'bg-violet-300/10 dark:bg-violet-500/20',
        ring: 'focus:ring-indigo-500/20 focus:border-indigo-500/50',
        tabActive: 'bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 text-white shadow-lg shadow-indigo-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
        tabIdle: 'text-indigo-700 hover:text-indigo-800 hover:bg-white/60 dark:text-indigo-300 dark:hover:bg-white/10 dark:hover:text-indigo-200',
      }
      : {
        page: 'bg-[#f8f7f5] dark:bg-[#0a0a0b]',
        selection: 'selection:bg-teal-200/50',
        blobA: 'bg-teal-400/10 dark:bg-teal-500/20',
        blobB: 'bg-cyan-300/10 dark:bg-cyan-500/20',
        ring: 'focus:ring-teal-500/20 focus:border-teal-500/50',
        tabActive: 'bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 text-white shadow-lg shadow-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
        tabIdle: 'text-teal-700 hover:text-teal-800 hover:bg-white/60 dark:text-teal-300 dark:hover:bg-white/10 dark:hover:text-indigo-200',
      };

  return (
    <div className={`min-h-[100dvh] ${roomPalette.page} text-foreground ${roomPalette.selection} overflow-x-hidden font-sans`}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {ariaLiveMessage}
      </div>

      <div className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${roomPalette.page}`}>
        <div className={`gradient-blob ${roomPalette.blobA} w-[800px] h-[800px] -top-64 -left-32`} />
        <div className={`gradient-blob ${roomPalette.blobB} w-[600px] h-[600px] top-1/2 -right-32`} />
        <div className="gradient-blob bg-sky-300/30 dark:bg-sky-500/20 w-[500px] h-[500px] bottom-0 left-1/3 opacity-40" />
      </div>

      <nav className="relative w-full min-h-14 sm:min-h-16 glass-2-0 rounded-2xl z-50 px-2 sm:px-4 md:px-6 py-2 sm:py-0 flex items-center justify-between border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-2xl shadow-lg shadow-black/5 dark:shadow-black/20 gap-1.5 sm:gap-2 mt-2 sm:mt-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setIsGlobalSidebarOpen(true)}
            className="p-1.5 sm:p-2 md:p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title={t('mehfil.menu')}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <Link to="/home" className="flex items-center gap-2 sm:gap-3 group cursor-pointer text-inherit no-underline shrink-0">
            <div className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r ${ROOM_CONFIG[activeRoom].chipClass} transform transition-transform group-hover:scale-105 shadow-lg flex items-center justify-center`}>
              <span className="text-white font-bold text-sm sm:text-lg tracking-tight whitespace-nowrap break-normal">{t('mehfil.title')}</span>
            </div>
          </Link>
        </div>

        <div className="relative flex-1 min-w-0 md:flex-none group">
          <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 w-4 h-4 z-10" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`relative bg-black/5 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-1.5 sm:py-2 md:py-2.5 pl-9 sm:pl-10 pr-3 sm:pr-4 text-sm w-full md:w-72 lg:w-96 focus:ring-2 focus:bg-white/50 dark:focus:bg-black/60 transition-all focus:outline-none placeholder:text-slate-500 text-slate-900 dark:text-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.2)] backdrop-blur-md ${roomPalette.ring}`}
            placeholder={t('mehfil.search_placeholder')}
            type="text"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 shrink-0">
          {/* Desktop Navigation Icons */}
          <div className="hidden sm:flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          <button
            onClick={() => {
              setMehfilSidebarInitialView('connections');
              setIsSidebarOpen(true);
            }}
            className={`relative p-1.5 sm:p-2 md:p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${hasUnreadSandesh ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
            title={t('mehfil.connection_requests')}
            aria-label="Open connections"
          >
            <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${hasUnreadSandesh ? 'animate-swing' : ''}`} />
            {incomingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-bold text-white">
                {incomingRequestsCount}
              </span>
            )}
            {incomingRequestsCount === 0 && hasUnreadSandesh && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </button>

            <div className="hidden sm:flex items-center gap-2 md:gap-5 md:pr-6 border-l border-slate-200 dark:border-slate-800 ml-1 sm:ml-2 pl-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-8 h-8 sm:w-[40px] sm:h-[40px] p-0.5 rounded-full transition-all duration-200 hover:scale-105 cursor:pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 outline-none">
                  <Avatar className="w-full h-full rounded-full border border-slate-200 dark:border-white/10 transition-transform">
                    <AvatarImage src={user?.avatar} className="object-cover" />
                    <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs ring-1 ring-inset ring-slate-900/10 dark:ring-white/10">
                      {user?.name?.[0]?.toUpperCase() || 'G'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-slate-200 dark:border-slate-800 p-2 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                <DropdownMenuItem onClick={handleProfile} className="rounded-xl cursor-pointer py-2.5 focus:bg-slate-100 dark:focus:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('mehfil.profile_settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800 my-1" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl cursor-pointer py-2.5 focus:bg-rose-50 dark:focus:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('mehfil.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pb-6 sm:pb-8 md:pb-12">
        <main className="scrollbar-blend">
          <section className="mb-4 sm:mb-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-2xl flex flex-col items-center text-center shadow-glass transition-all">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 glass-2-0 rounded-2xl border border-slate-200/60 dark:border-white/5 w-full sm:w-fit shadow-inner bg-white/20 dark:bg-black/30">
              {(['ALL', 'ACADEMIC', 'REFLECTIVE'] as MehfilFeedRoom[]).map((room) => (
                <button
                  key={room}
                  onClick={() => setActiveRoom(room)}
                  className={`px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap break-normal outline-none ${room === activeRoom ? `scale-[1.02] ${roomPalette.tabActive}` : `hover:scale-105 ${roomPalette.tabIdle}`
                    }`}
                >
                  {t(`mehfil.rooms.${room.toLowerCase()}`)}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300 max-w-3xl leading-relaxed">
              {t(`mehfil.subtitles.${activeRoom.toLowerCase()}`)}
            </p>
          </section>




          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-7xl mx-auto relative z-10">

            {/* Center Feed - Spans 8 columns */}
            <main className="md:col-span-7 lg:col-span-8 flex flex-col gap-3 sm:gap-4 md:gap-6">

              <div className="backdrop-blur-2xl bg-white/40 dark:bg-black/40 border border-slate-200 dark:border-white/5 shadow-glass rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 md:p-6 lg:p-8 transition-all duration-500 hover:shadow-glass-hover">
                <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1 sm:mb-2">{t('mehfil.community_space')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                      {t('mehfil.community_desc')}
                    </p>
                  </div>
                </div>

                {/* Guidelines Notice Section — collapsible */}
                <div className="composer-glow-card mb-4 sm:mb-6 md:mb-8 w-full" style={{ padding: 0 }}>
                  <Collapsible
                    open={guidelinesOpen}
                    onOpenChange={setGuidelinesOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="guideline-btn group w-full flex items-center justify-between gap-2.5 px-5 py-3.5 cursor-pointer outline-none rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-indigo-500/10 rounded-xl">
                            <ShieldAlert className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                          </div>
                          <span className="text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-300 dark:to-violet-300 bg-clip-text text-transparent">
                            {t('mehfil.guidelines')}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-5 sm:px-6 pb-5 pt-2 animate-in slide-in-from-top-2 duration-200 flex flex-col">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {/* Rules Column */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> {t('mehfil.posting_rules')}
                          </h4>
                          <ul className="space-y-3">
                            <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                              <span>{t('mehfil.academic_rule')}</span>
                            </li>
                            <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <span>{t('mehfil.thoughts_rule')}</span>
                            </li>
                          </ul>
                        </div>

                        {/* Consequences Column */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" /> {t('mehfil.consequences')}
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                              <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                <Ban className="w-4 h-4 text-amber-500" />
                              </div>
                              <div className="text-xs leading-tight">
                                <span className="font-bold block text-slate-900 dark:text-white">{t('mehfil.report_bans')}</span>
                                <span className="text-slate-600 dark:text-slate-400">{t('mehfil.report_desc')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100/50 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                              <div className="p-1.5 bg-rose-500/10 rounded-lg">
                                <Ghost className="w-4 h-4 text-rose-500" />
                              </div>
                              <div className="text-xs leading-tight">
                                <span className="font-bold block text-slate-900 dark:text-white">{t('mehfil.shadow_banning')}</span>
                                <span className="text-slate-600 dark:text-slate-400">{t('mehfil.spam_desc')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>


                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {isGuestReadOnly ? (
                  <div className="rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-500/10 px-4 py-3.5 text-sm text-amber-800 dark:text-amber-200">
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
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <MessageCircle className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-slate-500 mt-2">
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
                  <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                    {t('mehfil.loading_more')}
                  </div>
                )}

                {!hasMoreThoughts && thoughts.length > 0 && (
                  <div className="text-center py-3 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
          setMehfilSidebarInitialView(view ?? 'saved');
          setIsSidebarOpen(true);
        }}
      />
      <DMLayer />

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
