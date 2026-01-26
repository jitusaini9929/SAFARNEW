import React from 'react';
import { Message } from '@/store/chatStore';
import { Waves, ArrowRight } from 'lucide-react';

interface RecentThoughtsProps {
    messages: Message[];
    onMessageClick?: (messageId: string) => void;
}

const RecentThoughts: React.FC<RecentThoughtsProps> = ({ messages, onMessageClick }) => {
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    const getAvatarGradient = (index: number) => {
        const gradients = [
            'from-pink-400 to-rose-400',
            'from-amber-400 to-orange-400',
            'from-violet-400 to-indigo-400',
            'from-cyan-400 to-blue-400',
            'from-emerald-400 to-teal-400',
        ];
        return gradients[index % gradients.length];
    };

    const recentMessages = messages.slice(0, 5);

    return (
        <div className="glass-2-0 rounded-[2rem] p-6 h-[calc(100vh-9rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Waves className="w-5 h-5 text-primary" />
                    Recent Thoughts
                </h2>
                <div className="flex items-center bg-primary/10 dark:bg-primary/20 px-3 py-1.5 rounded-full">
                    <div className="pulse-live">
                        <span></span>
                        <span></span>
                    </div>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Live</span>
                </div>
            </div>

            {/* Messages List */}
            <div className="overflow-y-auto flex-grow space-y-4 pr-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {recentMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No recent thoughts yet
                    </div>
                ) : (
                    recentMessages.map((message, index) => (
                        <div
                            key={message.id}
                            onClick={() => onMessageClick?.(message.id)}
                            className="backdrop-blur-xl bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 rounded-2xl p-5 border border-white/20 cursor-pointer group hover:-translate-y-1"
                        >
                            {/* Author Info */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                                    {message.author.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-bold">{message.author}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">
                                        {formatTime(message.createdAt)}
                                    </p>
                                </div>
                            </div>

                            {/* Message Preview */}
                            <p className="text-sm text-foreground/80 line-clamp-2 mb-4 leading-relaxed">
                                {message.text}
                            </p>

                            {/* Relate Progress */}
                            <div className="bg-black/5 dark:bg-black/20 rounded-lg p-2.5">
                                <div className="flex justify-between items-center mb-1.5 px-1">
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                                        Relate
                                    </span>
                                    <span className="text-[10px] font-black text-muted-foreground">
                                        {message.relatableCount > 0 ? '89%' : '0%'}
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/30 dark:bg-black/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: message.relatableCount > 0 ? '89%' : '0%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Discover More Button */}
            <div className="mt-6 pt-6 border-t border-white/20">
                <button className="w-full glass-button py-3 rounded-xl text-sm font-bold text-primary flex items-center justify-center gap-2 hover:scale-105 transition-transform">
                    Discover More
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default RecentThoughts;
