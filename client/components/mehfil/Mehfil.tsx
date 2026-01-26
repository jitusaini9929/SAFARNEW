import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/authService';
import MessageCard from './MessageCard';
import Composer from './Composer';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { Contrast, Search, Bell, Settings, LogOut } from 'lucide-react';
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

    const handleSendMessage = (text: string, imageUrl?: string) => {
        const newMessage = {
            id: Date.now().toString(),
            topicId: currentTopicId || '1',
            author: user?.name || 'You',
            text,
            imageUrl,
            relatableCount: 0,
            flagCount: 0,
            createdAt: new Date().toISOString()
        };

        // Optimistically add message immediately
        addMessage(newMessage);

        // Emit if socket is available
        if (socket && currentTopicId) {
            socket.emit('message:create', {
                topicId: currentTopicId,
                text,
                imageUrl,
                sessionId,
            });
        }
    };

    const handleRelate = (messageId: string, option: number) => {
        if (!socket) return;
        socket.emit('poll:vote', { messageId, sessionId, option });
    };

    const currentMessages = messages.filter((m) => m.topicId === currentTopicId);

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-foreground selection:bg-teal-200/50 overflow-x-hidden font-sans">
            {/* Gradient Blobs Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="gradient-blob bg-teal-200 w-[700px] h-[700px] -top-48 -left-24"></div>
                <div className="gradient-blob bg-indigo-100 w-[600px] h-[600px] top-1/2 -right-24"></div>
                <div className="gradient-blob bg-mint w-[400px] h-[400px] bottom-0 left-1/4 opacity-50"></div>
            </div>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 h-16 glass-2-0 border-b z-50 px-6 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-8 group cursor-pointer text-inherit no-underline">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/20">M</div>
                        <span className="text-lg font-bold tracking-tight">Mehfil</span>
                    </div>
                </Link>

                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        className="bg-white/40 dark:bg-black/20 border-0 rounded-full py-2 pl-10 pr-4 text-sm w-80 focus:ring-2 focus:ring-teal-500/20 transition-all focus:outline-none placeholder:text-muted-foreground"
                        placeholder="Search discussions..."
                        type="text"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full glass-button text-muted-foreground hover:text-foreground"
                    >
                        <Contrast className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/40">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold leading-none">{user?.name || 'Guest'}</p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-1">Beta Member</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                            {user?.avatar ? (
                                <img alt="avatar" className="w-full h-full object-cover" src={user.avatar} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm">
                                    {user?.name?.[0]?.toUpperCase() || 'G'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Layout */}
            <div className="max-w-[1440px] mx-auto pt-20 px-6 pb-12 flex gap-6 justify-center">
                {/* Left Sidebar */}
                <LeftSidebar />

                {/* Main Feed */}
                <main className="flex-grow max-w-2xl w-full">
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
