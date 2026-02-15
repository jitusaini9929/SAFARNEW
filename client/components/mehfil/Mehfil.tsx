import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMehfilStore, MehfilRoom } from '@/store/mehfilStore';
import { authService } from '@/utils/authService';
import ThoughtCard from './ThoughtCard';
import Composer from './Composer';
import MehfilSidebar from './MehfilSidebar';
import { toast } from 'sonner';

import { Search, Settings, LogOut, Home, HelpCircle, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { mehfilTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";

interface MehfilProps {
  backendUrl?: string;
}

const ROOM_CONFIG: Record<MehfilRoom, {
  title: string;
  subtitle: string;
  placeholder: string;
  chipClass: string;
}> = {
  ACADEMIC: {
    title: 'Academic Hall',
    subtitle: 'Ask questions, share exam strategy, and help each other improve.',
    placeholder: 'Ask a question or share a study insight...',
    chipClass: 'from-teal-500 to-cyan-500',
  },
  REFLECTIVE: {
    title: 'Zen Corner',
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
  const [activeRoom, setActiveRoom] = useState<MehfilRoom>('ACADEMIC');

  const userIdRef = useRef<string | undefined>(undefined);

  const {
    thoughts,
    userReactions,
    setThoughts,
    addThought,
    updateRelatableCount,
    setUserReaction,
    setUserReactions,
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

  const { startTour } = useGuidedTour();

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

    newSocket.on('thoughts', (payload: { thoughts: any[] }) => {
      const thoughtList = payload?.thoughts || [];
      setThoughts(thoughtList);

      const reactedThoughtIds = thoughtList
        .filter((t: any) => Boolean(t.hasReacted))
        .map((t: any) => t.id);
      setUserReactions(reactedThoughtIds);
    });

    newSocket.on('thoughtCreated', (thought) => {
      addThought(thought);
    });

    newSocket.on('reactionUpdated', ({ thoughtId, relatableCount, userId, hasReacted }) => {
      updateRelatableCount(thoughtId, relatableCount);
      if (userIdRef.current && userId === userIdRef.current) {
        if (typeof hasReacted === 'boolean') {
          setUserReaction(thoughtId, hasReacted);
        }
      }
    });

    newSocket.on('thoughtRejected', ({ message }) => {
      toast.warning(message || "Thought doesn't meet community guidelines.");
    });

    newSocket.on('thoughtRerouted', ({ room }) => {
      const destination = room === 'REFLECTIVE' ? 'Zen Corner' : 'Academic Hall';
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
  }, [backendUrl, setThoughts, addThought, updateRelatableCount, setUserReactions, setUserReaction]);

  useEffect(() => {
    if (!socket) return;

    const syncSocketState = () => {
      if (user?.id) {
        socket.emit('register', {
          id: user.id,
          name: user.name || 'User',
          avatar: user.avatar || '',
        });
      }

      socket.emit('joinRoom', { room: activeRoom });
      socket.emit('loadThoughts', { page: 1, limit: 20, room: activeRoom });
    };

    if (socket.connected) {
      syncSocketState();
    }

    socket.on('connect', syncSocketState);
    return () => {
      socket.off('connect', syncSocketState);
    };
  }, [socket, user?.id, user?.name, user?.avatar, activeRoom]);

  const handleSendThought = async (content: string, isAnonymous: boolean, room: MehfilRoom) => {
    if (!socket || !user) {
      toast.error('Unable to post right now. Please refresh and retry.');
      return;
    }

    socket.emit('newThought', {
      content,
      imageUrl: null,
      isAnonymous,
      room,
    });
  };

  const handleReact = (thoughtId: string) => {
    if (!socket || !user) return;
    socket.emit('toggleReaction', { thoughtId });
  };

  const filteredThoughts = thoughts.filter((t) =>
    t.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.authorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isReflective = activeRoom === 'REFLECTIVE';
  const roomPalette = isReflective
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
    <div className={`min-h-screen ${roomPalette.page} text-foreground ${roomPalette.selection} overflow-x-hidden font-sans`}>
      <div className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${roomPalette.page}`}>
        <div className={`gradient-blob ${roomPalette.blobA} w-[800px] h-[800px] -top-64 -left-32`} />
        <div className={`gradient-blob ${roomPalette.blobB} w-[600px] h-[600px] top-1/2 -right-32`} />
        <div className="gradient-blob bg-sky-300/30 dark:bg-sky-500/20 w-[500px] h-[500px] bottom-0 left-1/3 opacity-40" />
      </div>

      <nav className="fixed top-4 left-4 right-4 h-16 glass-2-0 rounded-2xl z-50 px-6 flex items-center justify-between border border-white/40 dark:border-white/10 shadow-lg shadow-black/5">
        <Link to="/landing" className="flex items-center gap-3 group cursor-pointer text-inherit no-underline">
          <div className={`px-4 py-1.5 rounded-xl bg-gradient-to-r ${ROOM_CONFIG[activeRoom].chipClass} transform transition-transform group-hover:scale-105 shadow-lg flex items-center justify-center`}>
            <span className="text-white font-bold text-lg tracking-tight">Mehfil</span>
          </div>
        </Link>

        <div className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm w-96 focus:ring-2 transition-all focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100 ${roomPalette.ring}`}
            placeholder={`Search in ${ROOM_CONFIG[activeRoom].title}...`}
            type="text"
          />
        </div>

        <div className="flex items-center gap-3">
          <Link to="/landing" className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Home">
            <Home className="w-5 h-5" />
          </Link>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title="Mehfil Hub"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTour(mehfilTour)}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3 pl-2 ml-2 border-l border-slate-200 dark:border-slate-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 group outline-none">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100">
                      {user?.name || 'Guest User'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 tracking-wide uppercase">Member</p>
                  </div>
                  <Avatar className="w-10 h-10 border-2 border-white dark:border-slate-700 shadow-sm cursor-pointer transition-transform group-hover:scale-105">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-teal-100 text-teal-700 font-bold">
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

      <div className="w-full max-w-4xl mx-auto px-6 pt-28 pb-12">
        <main className="scrollbar-blend">
          <section className="mb-6 rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/70 rounded-2xl w-fit">
              {(['ACADEMIC', 'REFLECTIVE'] as MehfilRoom[]).map((room) => (
                <button
                  key={room}
                  onClick={() => setActiveRoom(room)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    room === activeRoom ? roomPalette.tabActive : roomPalette.tabIdle
                  }`}
                >
                  {ROOM_CONFIG[room].title}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {ROOM_CONFIG[activeRoom].subtitle}
            </p>
          </section>

          <Composer
            onSendThought={handleSendThought}
            userAvatar={user?.avatar}
            activeRoom={activeRoom}
            placeholder={ROOM_CONFIG[activeRoom].placeholder}
          />

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
                  hasReacted={userReactions.has(thought.id)}
                  isOwnThought={thought.userId === user?.id}
                />
              ))
            )}
          </div>
        </main>
      </div>

      <MehfilSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <TourPrompt tour={mehfilTour} featureName="Mehfil" />
    </div>
  );
};

export default Mehfil;
