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
        <div className="glass-card rounded-3xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0 overflow-hidden">
                    <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi1LkGfmpsHrFqbSlKeCCUVtnQTd7NK9pxaQPplgc4XzyDf4J5LVys45owEb9Y_xulDf6SIwceZzq0VkhOPG2ZG-lERjt-l662b6iPkP7-Ogy-n5o24u0kNhkxY25VvBXaaKWVEKrkZzPMFU7xf6xGYY6pt7CCIplmvAT0ieYmDyye2RmNxxgNE8YgaK8VtEwR_XIcH10bX_CnIwTF9EmDHkx10IDdOQgc1d-7S2MluvQVMU6V17tFibYAps377IeuqQ_gNoG7suBQ"
                        alt="user"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex-grow">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                        onKeyDown={handleKeyDown}
                        placeholder="What's on your mind?"
                        className="w-full bg-muted/50 border-0 rounded-2xl py-3 px-5 text-sm focus:ring-2 focus:ring-primary/20 transition-all focus:outline-none placeholder:text-muted-foreground"
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {/* Topic Type Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="glass-button flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground hover:text-primary"
                        >
                            <BarChart3 className="w-4 h-4" />
                            {topicType === 'discussion' ? 'Discussion' : 'Venting out'}
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showDropdown && (
                            <div className="mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
                                <button
                                    onClick={() => {
                                        setTopicType('discussion');
                                        setShowDropdown(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${topicType === 'discussion' ? 'bg-primary/20 text-primary' : 'text-foreground'
                                        }`}
                                >
                                    Discussion
                                </button>
                                <button
                                    onClick={() => {
                                        setTopicType('venting');
                                        setShowDropdown(false);
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${topicType === 'venting' ? 'bg-primary/20 text-primary' : 'text-foreground'
                                        }`}
                                >
                                    Venting out
                                </button>
                            </div>
                        )}
                    </div>
                    <button className="glass-button flex items-center gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                        <ImageIcon className="w-4 h-4" />
                        Gallery
                    </button>
                </div>
                <button
                    onClick={handleSend as any}
                    disabled={!canSubmit}
                    className={`bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all hover:-translate-y-0.5 ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    <Send className="w-4 h-4" />
                    Publish
                </button>
            </div>
        </div>
    );
};

export default Composer;
