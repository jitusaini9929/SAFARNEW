import React, { useState, useEffect } from 'react';
import { Bell, Loader2, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/utils/authService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface Sandesh {
    id: string;
    content: string;
    importance: 'normal' | 'high';
    created_at: string;
}

const SandeshCard = () => {
    const [sandesh, setSandesh] = useState<Sandesh | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    // Check if current user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                const email = currentUser?.user?.email;
                const adminEmails = ['steve123@example.com'];

                if (email && adminEmails.includes(email.toLowerCase())) {
                    setIsAdmin(true);
                }
            } catch (err) {
                console.error('Error checking admin status', err);
            }
        };
        checkAdmin();
    }, []);

    const fetchSandesh = async () => {
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh`);
            if (res.ok) {
                const data = await res.json();
                setSandesh(data.sandesh);

                // Check for new announcement
                if (data.sandesh) {
                    const lastReadId = localStorage.getItem('mehfil_last_read_sandesh_id');
                    if (lastReadId !== data.sandesh.id) {
                        setHasUnread(true);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch sandesh', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSandesh();
    }, []);

    const markAsRead = () => {
        if (sandesh && hasUnread) {
            localStorage.setItem('mehfil_last_read_sandesh_id', sandesh.id);
            setHasUnread(false);
        }
    };

    const handlePost = async () => {
        if (!newContent.trim()) return;

        setIsPosting(true);
        try {
            const res = await fetch(`${API_URL}/mehfil/sandesh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: newContent }),
                credentials: 'include', // Important for session cookie
            });

            if (res.ok) {
                toast.success('Update posted successfully');
                setNewContent('');
                setShowInput(false);
                fetchSandesh();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to post update');
            }
        } catch (err) {
            toast.error('Error posting update');
        } finally {
            setIsPosting(false);
        }
    };

    if (loading) return null;

    return (
        <div
            className="backdrop-blur-2xl bg-white/40 dark:bg-black/40 border border-white/40 dark:border-white/10 shadow-glass rounded-[2rem] p-6 h-fit transition-all duration-300 hover:shadow-glass-hover group"
            onClick={markAsRead}
            onMouseEnter={markAsRead}
        >
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="p-2 bg-teal-500/10 dark:bg-teal-400/10 rounded-xl relative">
                        <Bell className={`w-5 h-5 text-teal-600 dark:text-teal-400 ${hasUnread ? 'animate-swing' : ''}`} />
                        {hasUnread && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                        )}
                    </span>
                    Sandesh
                </h2>

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowInput(!showInput);
                            }}
                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <Plus className="w-4 h-4 text-slate-500" />
                        </Button>
                    )}
                </div>
            </div>

            {showInput && (
                <div className="mb-6 animate-in slide-in-from-top-2 bg-white/40 dark:bg-black/20 p-4 rounded-2xl border border-white/20">
                    <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Write an update..."
                        className="w-full text-sm p-3 rounded-xl bg-transparent border-0 focus:ring-0 placeholder-slate-400 resize-none min-h-[80px] text-slate-800 dark:text-slate-200"
                    />
                    <div className="flex justify-end pt-2 border-t border-white/10 mt-2">
                        <Button
                            size="sm"
                            onClick={handlePost}
                            disabled={isPosting || !newContent.trim()}
                            className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl"
                        >
                            {isPosting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                            Post
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-4 pr-1">
                {sandesh ? (
                    <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 rounded-2xl p-5 border border-white/20 group hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                AD
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Admin</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {formatDistanceToNow(new Date(sandesh.created_at), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {sandesh.content}
                        </p>
                        {sandesh.importance === 'high' && (
                            <div className="mt-3 bg-red-500/10 dark:bg-red-500/20 rounded-lg p-2.5 inline-block">
                                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">Important</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                        No active announcements.
                    </div>
                )}
            </div>

        </div>
    );
};

export default SandeshCard;
