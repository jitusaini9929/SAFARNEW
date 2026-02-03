import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/authService';
import MessageCard from './MessageCard';
import Composer from './Composer';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { Contrast, Search, Settings, LogOut, Home } from 'lucide-react';
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

interface MehfilProps {
    backendUrl?: string;
}

const Mehfil: React.FC<MehfilProps> = ({ backendUrl = 'http://localhost:3000' }) => {
    const navigate = useNavigate();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [user, setUser] = useState<any>(null);
    const { theme, toggleTheme } = useTheme();

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

    const {
        topics,
        messages,
        currentTopicId,
        sessionId,
        setTopics,
        setMessages,
        setCurrentTopic,
        addMessage,
        updateRelatableCount,
    } = useChatStore();

    // Initialize Socket.IO connection
    useEffect(() => {
        const newSocket = io(backendUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
            console.log('Connected to Mehfil chat server');
            newSocket.emit('topic:load');
        });

        newSocket.on('topic:list', (topicList) => {
            setTopics(topicList);
            if (topicList.length > 0 && !currentTopicId) {
                setCurrentTopic(topicList[0].id);
                // Load messages for first topic
                newSocket.emit('topic:select', topicList[0].id);
            }
        });

        newSocket.on('topic:messages', (messageList) => {
            setMessages(messageList);
        });

        newSocket.on('message:new', (message) => {
            addMessage(message);
        });

        newSocket.on('poll:updated', ({ messageId, relatableCount }) => {
            updateRelatableCount(messageId, relatableCount);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from Mehfil chat server');
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [backendUrl, setTopics, setMessages, setCurrentTopic, addMessage, updateRelatableCount, currentTopicId]);

    // Emit topic:select when currentTopicId changes to load messages from database
    useEffect(() => {
        if (socket && currentTopicId) {
            socket.emit('topic:select', currentTopicId);
        }
    }, [socket, currentTopicId]);

    const handleSendMessage = (text: string, imageUrl?: string) => {
        // Emit to server - the message will be added when server broadcasts 'message:new'
        if (socket && currentTopicId) {
            socket.emit('message:create', {
                topicId: currentTopicId,
                text,
                imageUrl,
                sessionId,
                author: user?.name || 'Anonymous',
            });
        }
    };

    const handleRelate = (messageId: string, option: number) => {
        if (!socket) return;
        socket.emit('poll:vote', { messageId, sessionId, option });
    };

    const [searchTerm, setSearchTerm] = useState('');

    const currentMessages = messages
        .filter((m) => m.topicId === currentTopicId)
        .filter((m) => m.text.toLowerCase().includes(searchTerm.toLowerCase()) || m.author.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-foreground selection:bg-teal-200/50 overflow-x-hidden font-sans">
            {/* Gradient Blobs Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#f8fafc] dark:bg-slate-950">
                <div className="gradient-blob bg-teal-400/30 dark:bg-teal-500/20 w-[800px] h-[800px] -top-64 -left-32"></div>
                <div className="gradient-blob bg-indigo-300/30 dark:bg-indigo-500/20 w-[600px] h-[600px] top-1/2 -right-32"></div>
                <div className="gradient-blob bg-sky-300/30 dark:bg-sky-500/20 w-[500px] h-[500px] bottom-0 left-1/3 opacity-40"></div>
            </div>

            {/* Floating Navbar */}
            <nav className="fixed top-4 left-4 right-4 h-16 glass-2-0 rounded-2xl z-50 px-6 flex items-center justify-between border border-white/40 dark:border-white/10 shadow-lg shadow-black/5">
                <Link to="/landing" className="flex items-center gap-3 group cursor-pointer text-inherit no-underline">
                    <div className="relative flex items-center justify-center">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 transform transition-transform group-hover:rotate-6 shadow-lg shadow-teal-500/30 flex items-center justify-center text-white font-black text-lg">
                            M
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></div>
                        </div>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Mehfil</span>
                </Link>

                <div className="relative hidden md:block">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm w-96 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                        placeholder="Search discussions, topics, and pools..."
                        type="text"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Link to="/landing" className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Home">
                        <Home className="w-5 h-5" />
                    </Link>


                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <Contrast className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 pl-2 ml-2 border-l border-slate-200 dark:border-slate-800">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 group outline-none">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-bold leading-none text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                                            {user?.name || 'Guest User'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 tracking-wide uppercase">Beta Member</p>
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

            {/* Main Content Layout */}
            <div className="w-full px-6 lg:px-8 xl:px-12 pt-28 pb-12 flex gap-8 min-h-screen">
                {/* Left Sidebar */}
                <LeftSidebar />

                {/* Main Feed */}
                <main className="flex-1 max-w-6xl scrollbar-blend">
                    <Composer onSendMessage={handleSendMessage} />

                    <div className="space-y-6">
                        {currentMessages.length === 0 ? (
                            // Demo content if empty
                            <>
                                <MessageCard
                                    message={{
                                        id: 'demo1',
                                        topicId: '1',
                                        author: 'John Doe',
                                        text: "Honestly, balancing finals prep with part-time work feels impossible right now. Does anyone else feel like they're just running on caffeine and hope? ☕️😩",
                                        relatableCount: 521,
                                        flagCount: 0,
                                        createdAt: new Date(Date.now() - 7200000).toISOString()
                                    }}
                                    onRelate={() => { }}
                                    userVote={1}
                                />
                                <MessageCard
                                    message={{
                                        id: 'demo2',
                                        topicId: '1',
                                        author: 'Sarah A.',
                                        text: "Is anyone else finding the new campus library hours really inconvenient? I can barely get any work done. It closes at 8 PM now instead of midnight! 📚😤",
                                        relatableCount: 120,
                                        flagCount: 0,
                                        createdAt: new Date(Date.now() - 900000).toISOString()
                                    }}
                                    onRelate={() => { }}
                                />
                            </>
                        ) : (
                            currentMessages.map((message) => (
                                <MessageCard
                                    key={message.id}
                                    message={message}
                                    onRelate={(option) => handleRelate(message.id, option)}
                                />
                            ))
                        )}
                    </div>
                </main>

                {/* Right Sidebar */}
                <RightSidebar />
            </div>
        </div>
    );
};

export default Mehfil;
