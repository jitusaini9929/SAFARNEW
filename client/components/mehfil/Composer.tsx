import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ComposerProps {
    onSendThought: (content: string, isAnonymous: boolean) => void;
    userAvatar?: string | null;
}

const MAX_CHARS = 500;

const Composer: React.FC<ComposerProps> = ({ onSendThought, userAvatar }) => {
    const [content, setContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const charCount = content.length;
    const isOverLimit = charCount > MAX_CHARS;
    const canSubmit = charCount > 0 && !isOverLimit && !isSubmitting;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        try {
            setIsSubmitting(true);
            // Simulate a brief delay or just call immediately.
            // The parent handleSendThought does a socket emit which is instant.
            await onSendThought(content, isAnonymous);
            setContent('');
            setIsAnonymous(false);
        } catch (error) {
            console.error("Failed to send thought", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="glass-card rounded-3xl p-6 mb-8 border border-white/50 dark:border-white/5 shadow-xl shadow-teal-900/5 dark:shadow-black/20">
            <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shrink-0 overflow-hidden shadow-inner">
                    {userAvatar ? (
                        <img
                            src={userAvatar}
                            alt="Your avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl font-bold">
                            ?
                        </div>
                    )}
                </div>
                <div className="flex-grow">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                                e.preventDefault();
                                handleSend(e as any);
                            }
                        }}
                        placeholder="What's on your mind? Share your thoughts with the community..."
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-base focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all focus:outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200 min-h-[140px] resize-none"
                    />

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                Post anonymously
                            </label>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-bold ${isOverLimit ? 'text-rose-500' : 'text-slate-400'}`}>
                                {charCount} /{MAX_CHARS}
                            </span>
                            <button
                                onClick={handleSend as any}
                                disabled={!canSubmit}
                                className="bg-gradient-to-tr from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 whitespace-nowrap"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Posting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        Share Thought
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Composer;
