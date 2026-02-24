import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMehfilStore, MehfilRoom } from '@/store/mehfilStore';
import { authService } from '@/utils/authService';
import ThoughtCard from './ThoughtCard';
import Composer from './Composer';
import MehfilSidebar from './MehfilSidebar';
import SandeshCard from './SandeshCard';
import { toast } from 'sonner';
import ThemeToggle from '@/components/ui/theme-toggle';
import GlobalSidebar from '@/components/GlobalSidebar';

import { Search, Settings, LogOut, Home, Menu, Info, ShieldAlert, AlertCircle, ChevronDown, ChevronUp, Clock, Ban, Ghost } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface PostingBanPayload {
  isActive: boolean;
  isPermanent: boolean;
  bannedUntil: string | null;
  message: string;
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
    chipClass: 'from-[#7A1F3D] to-[#4B1027]',
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
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGlobalSidebarOpen, setIsGlobalSidebarOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<MehfilFeedRoom>('ALL');
  const [postingBan, setPostingBan] = useState<PostingBanPayload | null>(null);
  const [banRemainingMs, setBanRemainingMs] = useState(0);
  const [hasMoreThoughts, setHasMoreThoughts] = useState(true);
  const [isLoadingThoughts, setIsLoadingThoughts] = useState(false);

  const userIdRef = useRef<string | undefined>(undefined);
  const currentFeedPageRef = useRef(0);
  const hasMoreThoughtsRef = useRef(true);
  const isLoadingThoughtsRef = useRef(false);

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
    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (userData?.user) {
          setUser(userData.user);
          userIdRef.current = userData.user.id;
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const isPaused = import.meta.env.MEHFIL_PAUSED === 'true';

  if (isPaused) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500 animate-pulse">
            Mehfil under construction
          </h1>
          <p className="text-slate-400 text-lg">Check back soon</p>
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
    const socketUrl = backendUrl || window.location.origin;
    const newSocket = io(`${socketUrl}/mehfil`, {
      path: '/socket.io',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to Mehfil server');
    });

    newSocket.on('thoughts', (payload: { thoughts: any[]; page?: number; hasMore?: boolean }) => {
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
      addThought(thought);
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
      toast.success(message || 'Thought shared successfully.');
    });

    newSocket.on('thoughtRejected', ({ message, ban }) => {
      if (ban?.isActive) {
        applyPostingBanState(ban);
        toast.error(message || ban.message || "you have been banned from posting messages");
        return;
      }

      toast.warning(message || "Thought doesn't meet community guidelines.");
    });

    newSocket.on('thoughtRerouted', ({ room }) => {
      const destination = room === 'REFLECTIVE' ? 'Thoughts' : 'Academic Hall';
      toast.info(`Your thought was routed to ${destination}.`);
    });

    newSocket.on('error', (error) => {
      const message = error?.message || 'Mehfil is unavailable right now.';
      console.error('Mehfil socket error:', error);
      toast.error(message);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Mehfil server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [backendUrl, addThought, updateThought, removeThought, updateRelatableCount, setUserReaction]);

  useEffect(() => {
    if (!socket) return;

    const requestThoughtPage = (page: number) => {
      isLoadingThoughtsRef.current = true;
      setIsLoadingThoughts(true);
      socket.emit('loadThoughts', { page, limit: FEED_PAGE_SIZE, room: 'ALL' });
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
      requestThoughtPage(1);
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

    const handleScrollLoad = () => {
      if (isLoadingThoughtsRef.current || !hasMoreThoughtsRef.current) return;

      const viewportBottom = window.innerHeight + window.scrollY;
      const documentBottom = document.documentElement.scrollHeight;
      const isNearBottom = viewportBottom >= documentBottom - 600;

      if (!isNearBottom) return;

      const nextPage = currentFeedPageRef.current + 1;
      isLoadingThoughtsRef.current = true;
      setIsLoadingThoughts(true);
      socket.emit('loadThoughts', { page: nextPage, limit: FEED_PAGE_SIZE, room: 'ALL' });
    };

    window.addEventListener('scroll', handleScrollLoad, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollLoad);
  }, [socket]);

  const handleSendThought = async (content: string, isAnonymous: boolean, room: MehfilFeedRoom) => {
    if (!socket || !user) {
      toast.error('Unable to post right now. Please refresh and retry.');
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

  const filteredThoughts = roomFilteredThoughts.filter((t) =>
    t.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.authorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAll = activeRoom === 'ALL';
  const isReflective = activeRoom === 'REFLECTIVE';
  const roomPalette = isAll
    ? {
      page: 'bg-[#fff7fa] dark:bg-slate-950',
      selection: 'selection:bg-rose-200/50',
      blobA: 'bg-rose-400/30 dark:bg-rose-500/20',
      blobB: 'bg-pink-300/30 dark:bg-pink-500/20',
      ring: 'focus:ring-rose-500/20 focus:border-rose-500/50',
      tabActive: 'bg-gradient-to-r from-[#7A1F3D] to-[#4B1027] text-white shadow-[#7A1F3D]/35',
      tabIdle: 'text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-500/10 dark:hover:bg-rose-500/20',
    }
    : isReflective
      ? {
        page: 'bg-[#f5f3ff] dark:bg-slate-950',
        selection: 'selection:bg-indigo-200/50',
        blobA: 'bg-indigo-400/30 dark:bg-indigo-500/20',
        blobB: 'bg-violet-300/30 dark:bg-violet-500/20',
        ring: 'focus:ring-indigo-500/20 focus:border-indigo-500/50',
        tabActive: 'bg-indigo-600 text-white shadow-indigo-500/30',
        tabIdle: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20',
      }
      : {
        page: 'bg-[#f8fafc] dark:bg-slate-950',
        selection: 'selection:bg-teal-200/50',
        blobA: 'bg-teal-400/30 dark:bg-teal-500/20',
        blobB: 'bg-cyan-300/30 dark:bg-cyan-500/20',
        ring: 'focus:ring-teal-500/20 focus:border-teal-500/50',
        tabActive: 'bg-teal-600 text-white shadow-teal-500/30',
        tabIdle: 'text-teal-700 bg-teal-50 hover:bg-teal-100 dark:text-teal-300 dark:bg-teal-500/10 dark:hover:bg-teal-500/20',
      };

  return (
    <div className={`min-h-[100dvh] ${roomPalette.page} text-foreground ${roomPalette.selection} overflow-x-hidden font-sans`}>
      <div className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${roomPalette.page}`}>
        <div className={`gradient-blob ${roomPalette.blobA} w-[800px] h-[800px] -top-64 -left-32`} />
        <div className={`gradient-blob ${roomPalette.blobB} w-[600px] h-[600px] top-1/2 -right-32`} />
        <div className="gradient-blob bg-sky-300/30 dark:bg-sky-500/20 w-[500px] h-[500px] bottom-0 left-1/3 opacity-40" />
      </div>

      <nav className="fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 min-h-16 glass-2-0 rounded-2xl z-50 px-3 sm:px-6 py-2 sm:py-0 flex items-center justify-between border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 gap-2">
        <Link to="/landing" className="flex items-center gap-3 group cursor-pointer text-inherit no-underline">
          <div className={`px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r ${ROOM_CONFIG[activeRoom].chipClass} transform transition-transform group-hover:scale-105 shadow-lg flex items-center justify-center`}>
            <span className="text-white font-bold text-base sm:text-lg tracking-tight whitespace-nowrap break-normal">Mehfil</span>
          </div>
        </Link>

        <div className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm w-72 lg:w-96 focus:ring-2 transition-all focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100 ${roomPalette.ring}`}
            placeholder={`Search in ${ROOM_CONFIG[activeRoom].title}...`}
            type="text"
          />
        </div>




        <div className="flex items-center gap-1.5 sm:gap-3">
          <ThemeToggle />

          <button
            onClick={() => setIsGlobalSidebarOpen(true)}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors hidden sm:block"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>          <div className="flex items-center gap-2 sm:gap-3 pl-2 ml-1 sm:ml-2 border-l border-slate-200 dark:border-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 group outline-none">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">
                      {user?.name || 'Guest User'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 tracking-wide uppercase">Member</p>
                  </div>
                  <Avatar className="w-10 h-10 sm:w-[52px] sm:h-[52px] rounded-xl border-2 border-white dark:border-slate-700 shadow-sm cursor-pointer transition-transform group-hover:scale-105">
                    <AvatarImage src={user?.avatar} className="rounded-xl" />
                    <AvatarFallback className="rounded-xl bg-teal-100 text-teal-700 font-bold">
                      {user?.name?.[0]?.toUpperCase() || 'G'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl border-slate-200 dark:border-slate-800 p-2 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                <DropdownMenuItem onClick={handleProfile} className="rounded-xl cursor-pointer py-2.5 focus:bg-slate-100 dark:focus:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800 my-1" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl cursor-pointer py-2.5 focus:bg-rose-50 dark:focus:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-24 sm:pt-28 pb-8 sm:pb-12">
        <main className="scrollbar-blend">
          <section className="mb-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-xl flex flex-col items-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/70 rounded-2xl w-full sm:w-fit">
              {(['ALL', 'ACADEMIC', 'REFLECTIVE'] as MehfilFeedRoom[]).map((room) => (
                <button
                  key={room}
                  onClick={() => setActiveRoom(room)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap break-normal ${room === activeRoom ? roomPalette.tabActive : roomPalette.tabIdle
                    }`}
                >
                  {ROOM_CONFIG[room].title}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
              {ROOM_CONFIG[activeRoom].subtitle}
            </p>
          </section>


          {/* Background Blobs */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
            <div className="absolute rounded-full blur-[120px] -z-10 opacity-60 bg-teal-200 w-[600px] h-[600px] -top-48 -left-24 dark:bg-teal-900/20"></div>
            <div className="absolute rounded-full blur-[120px] -z-10 opacity-60 bg-indigo-200 w-[500px] h-[500px] top-1/2 -right-24 dark:bg-indigo-900/20"></div>
            <div className="absolute rounded-full blur-[120px] -z-10 opacity-60 bg-purple-100 w-[400px] h-[400px] bottom-0 left-1/4 dark:bg-purple-900/20"></div>
            <div className="absolute rounded-full blur-[120px] -z-10 opacity-60 bg-emerald-100 w-[300px] h-[300px] top-1/4 right-1/3 opacity-40 dark:bg-emerald-900/20"></div>
          </div>


          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 max-w-7xl mx-auto relative z-10">

            {/* Center Feed - Spans 8 columns */}
            <main className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">

              <div className="backdrop-blur-2xl bg-white/40 dark:bg-black/40 border border-white/40 dark:border-white/10 shadow-glass rounded-[2rem] p-4 sm:p-6 lg:p-8 transition-all duration-500 hover:shadow-glass-hover">
                <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Community Space</h1>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                      The student lounge for unfiltered thoughts and academic life-hacks.
                    </p>
                  </div>
                </div>

                {/* Guidelines Notice Section */}
                <div className="mb-8 bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-900/80 dark:to-slate-800/80 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Community Guidelines</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Rules Column */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <Info className="w-3.5 h-3.5" /> Posting Rules
                      </h4>
                      <ul className="space-y-3">
                        <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                          <span><strong>Academic Hall:</strong> Research, study hacks, and career help only. No venting.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span><strong>Thoughts:</strong> Emotional support and venting. Move here for personal struggles.</span>
                        </li>
                        <li className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span><strong>Blocked:</strong> Hate speech, harassment, NSFW content, or severe toxicity is strictly banned.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Consequences Column */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Consequences
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5">
                          <div className="p-1.5 bg-amber-500/10 rounded-lg">
                            <Ban className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="text-xs leading-tight">
                            <span className="font-bold block text-slate-900 dark:text-white">Report-Based Bans</span>
                            <span className="text-slate-500 dark:text-slate-400">1+ reports trigger automatic bans (2D → 7D → Permanent).</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5">
                          <div className="p-1.5 bg-rose-500/10 rounded-lg">
                            <Ghost className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div className="text-xs leading-tight">
                            <span className="font-bold block text-slate-900 dark:text-white">Shadow Banning</span>
                            <span className="text-slate-500 dark:text-slate-400">Repeated spam results in silent silencing—others won't see you.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <Clock className="w-3 h-3" /> All posts are analyzed by AI for quality control
                  </div>
                </div>

                <Composer
                  onSendThought={handleSendThought}
                  userAvatar={user?.avatar}
                  activeRoom={activeRoom}
                  placeholder={ROOM_CONFIG[activeRoom].placeholder}
                />
              </div>

              {/* Mobile Sandesh (only visible on small screens) */}
              <div className="lg:hidden">
                <SandeshCard />
              </div>

              <div className="space-y-6">
                {filteredThoughts.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-lg">
                      No thoughts in {ROOM_CONFIG[activeRoom].title} yet. Start the conversation.
                    </p>
                  </div>
                ) : (
                  filteredThoughts.map((thought) => (
                    <ThoughtCard
                      key={thought.id}
                      thought={thought}
                      onReact={() => handleReact(thought.id)}
                      onEdit={handleEdit}
                      onDelete={() => handleDelete(thought.id)}
                      hasReacted={userReactions.has(thought.id)}
                      isOwnThought={thought.userId === user?.id}
                    />
                  ))
                )}

                {isLoadingThoughts && (
                  <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
                    Loading more posts...
                  </div>
                )}

                {!hasMoreThoughts && thoughts.length > 0 && (
                  <div className="text-center py-3 text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    You have reached the end of the feed.
                  </div>
                )}
              </div>
            </main>

            {/* Right Sidebar - Sandesh (visible on large screens, sticky) - Spans 4 columns */}
            <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-28 h-fit">
              <SandeshCard />
            </aside>

          </div>

        </main>
      </div>

      <MehfilSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <GlobalSidebar
        isOpen={isGlobalSidebarOpen}
        onClose={() => setIsGlobalSidebarOpen(false)}
        onOpenMehfilSidebar={() => setIsSidebarOpen(true)}
      />

      {postingBan?.isActive && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/90 text-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Posting Restricted</h3>
            <p className="mt-2 text-slate-200">you have been banned from posting messages</p>
            {postingBan.isPermanent ? (
              <p className="mt-4 text-sm text-rose-300 font-semibold">Ban duration: Permanent</p>
            ) : (
              <div className="mt-4 rounded-2xl bg-slate-800/70 border border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Time Remaining</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-300 tabular-nums">
                  {formatBanRemaining(banRemainingMs)}
                </p>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">
              You can still read thoughts, but posting is blocked until unban.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mehfil;
