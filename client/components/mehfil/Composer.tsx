import React, { useState } from 'react';
import { Send, Image as ImageIcon, BarChart3, ChevronDown } from 'lucide-react';

interface ComposerProps {
    onSendMessage: (text: string, imageUrl?: string) => void;
}

const MAX_CHARS = 1000;

const Composer: React.FC<ComposerProps> = ({ onSendMessage }) => {
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [topicType, setTopicType] = useState<'discussion' | 'venting'>('discussion');
    const [showDropdown, setShowDropdown] = useState(false);

    const charCount = text.length;
    const isOverLimit = charCount > MAX_CHARS;
    const canSubmit = charCount > 0 && !isOverLimit;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSendMessage(text, imageUrl || undefined);
        setText('');
        setImageUrl('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
            e.preventDefault();
            handleSend(e as any);
        }
    };

    return (
        <div className="glass-card rounded-3xl p-6 mb-8 border border-white/50 dark:border-white/5 shadow-xl shadow-teal-900/5 dark:shadow-black/20">
            <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shrink-0 overflow-hidden shadow-inner p-0.5">
                    <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi1LkGfmpsHrFqbSlKeCCUVtnQTd7NK9pxaQPplgc4XzyDf4J5LVys45owEb9Y_xulDf6SIwceZzq0VkhOPG2ZG-lERjt-l662b6iPkP7-Ogy-n5o24u0kNhkxY25VvBXaaKWVEKrkZzPMFU7xf6xGYY6pt7CCIplmvAT0ieYmDyye2RmNxxgNE8YgaK8VtEwR_XIcH10bX_CnIwTF9EmDHkx10IDdOQgc1d-7S2MluvQVMU6V17tFibYAps377IeuqQ_gNoG7suBQ"
                        alt="user"
                        className="w-full h-full object-cover rounded-xl"
                    />
                </div>
                <div className="flex-grow">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) {
                                e.preventDefault();
                                handleSend(e as any);
                            }
                        }}
                        placeholder="What's on your mind? Share a thought, ask a question, or vent..."
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-base focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all focus:outline-none placeholder:text-slate-400 text-slate-800 dark:text-slate-200 min-h-[140px] resize-none"
                    />

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-2">
                            {/* Topic Type Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 whitespace-nowrap"
                                >
                                    <div className={`p-1 rounded-md ${topicType === 'discussion' ? 'bg-teal-100 text-teal-600' : 'bg-rose-100 text-rose-600'}`}>
                                        <BarChart3 className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="capitalize">{topicType}</span>
                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                </button>
                                {showDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden z-20 animate-in slide-in-from-top-2">
                                        <button
                                            onClick={() => {
                                                setTopicType('discussion');
                                                setShowDropdown(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 ${topicType === 'discussion' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600' : 'text-slate-600 dark:text-slate-400'}`}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                            Discussion
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTopicType('venting');
                                                setShowDropdown(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 ${topicType === 'venting' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'text-slate-600 dark:text-slate-400'}`}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                            Venting out
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap">
                                <ImageIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Gallery</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-bold ${isOverLimit ? 'text-rose-500' : 'text-slate-400'}`}>
                                {charCount}/{MAX_CHARS}
                            </span>
                            <button
                                onClick={handleSend as any}
                                disabled={!canSubmit}
                                className={`bg-gradient-to-tr from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 whitespace-nowrap`}
                            >
                                <Send className="w-3.5 h-3.5" />
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Composer;
