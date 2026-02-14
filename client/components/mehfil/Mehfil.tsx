import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMehfilStore } from '@/store/mehfilStore';
import { authService } from '@/utils/authService';
import ThoughtCard from './ThoughtCard';
import Composer from './Composer';
import MehfilSidebar from './MehfilSidebar';

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

const Mehfil: React.FC<MehfilProps> = ({ backendUrl }) => {
    const navigate = useNavigate();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [user, setUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const {
        thoughts,
        userReactions,
        setThoughts,
        addThought,
        updateRelatableCount,
        toggleUserReaction,
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

    // Fetch real user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await authService.getCurrentUser();
                if (userData?.user) {
                    setUser(userData.user);
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    // Guided tour integration
    const { startTour } = useGuidedTour();

    // Initialize Socket.IO connection
    useEffect(() => {
        // Connect to same origin (auto-detects in production)
        // If backendUrl is provided, use it; otherwise omit to use current origin
        const socketUrl = backendUrl || window.location.origin;
        const newSocket = io(socketUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('Connected to Mehfil server');
            newSocket.emit('thoughts:load');
        });

        newSocket.on('thoughts:list', (thoughtList) => {
            setThoughts(thoughtList);

            // Load user reactions for these thoughts
            if (user?.id && thoughtList.length > 0) {
                const thoughtIds = thoughtList.map((t: any) => t.id);
                newSocket.emit('thoughts:get_user_reactions', {
                    userId: user.id,
                    thoughtIds
                });
            }
        });

        newSocket.on('thought:new', (thought) => {
            addThought(thought);
        });

        newSocket.on('thought:reaction_updated', ({ thoughtId, relatableCount }) => {
            updateRelatableCount(thoughtId, relatableCount);
        });

        newSocket.on('thoughts:user_reactions', (reactedThoughtIds: string[]) => {
            setUserReactions(reactedThoughtIds);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from Mehfil server');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [backendUrl, setThoughts, addThought, updateRelatableCount, setUserReactions, user?.id]);

    const handleSendThought = (content: string, imageUrl?: string) => {
        if (socket && user) {
            socket.emit('thought:create', {
                userId: user.id,
                authorName: user.name,
                authorAvatar: user.avatar,
                content,
                imageUrl,
            });
        }
    };

    const handleReact = (thoughtId: string) => {
        if (!socket || !user) return;
        socket.emit('thought:react', {
            thoughtId,
            userId: user.id,
        });
        toggleUserReaction(thoughtId);
    };

    const filteredThoughts = thoughts.filter((t) =>
        t.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-foreground selection:bg-teal-200/50 overflow-x-hidden font-sans">
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#f8fafc] dark:bg-slate-950">
                <div className="gradient-blob bg-teal-400/30 dark:bg-teal-500/20 w-[800px] h-[800px] -top-64 -left-32"></div>
                <div className="gradient-blob bg-indigo-300/30 dark:bg-indigo-500/20 w-[600px] h-[600px] top-1/2 -right-32"></div>
                <div className="gradient-blob bg-sky-300/30 dark:bg-sky-500/20 w-[500px] h-[500px] bottom-0 left-1/3 opacity-40"></div>
            </div>

            <nav className="fixed top-4 left-4 right-4 h-16 glass-2-0 rounded-2xl z-50 px-6 flex items-center justify-between border border-white/40 dark:border-white/10 shadow-lg shadow-black/5">
                <Link to="/landing" className="flex items-center gap-3 group cursor-pointer text-inherit no-underline">
                    <div className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-500 transform transition-transform group-hover:scale-105 shadow-lg shadow-rose-500/30 flex items-center justify-center">
                        <span className="text-white font-bold text-lg tracking-tight">Mehfil</span>
                    </div>
                </Link>

                <div className="relative hidden md:block">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm w-96 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                        placeholder="Search thoughts..."
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
                                        <p className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
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
                    <Composer onSendThought={handleSendThought} userAvatar={user?.avatar} />

                    <div className="space-y-6">
                        {filteredThoughts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-400 text-lg">No thoughts yet. Be the first to share!</p>
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

            {/* Sidebar */}
            <MehfilSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <TourPrompt tour={mehfilTour} featureName="Mehfil" />
        </div>
    );
};

export default Mehfil;
