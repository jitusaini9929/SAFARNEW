import { useEffect, useMemo, useRef, useState } from 'react';

interface EmojiPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    position?: 'top' | 'bottom';
    align?: 'left' | 'right';
}

const EMOJI_GROUPS: Array<{ id: string; label: string; emojis: string[] }> = [
    {
        id: 'recent',
        label: 'Popular',
        emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😴', '😢', '😭', '😡', '🥳', '🙏', '❤️', '🔥', '👍', '👎', '👏', '🙌', '💯', '✨', '🌱'],
    },
    {
        id: 'faces',
        label: 'Faces',
        emojis: ['🙂', '😉', '😇', '🥰', '🤗', '🤩', '😋', '🤤', '😌', '😬', '😐', '🙃', '😅', '😤', '😓', '😷', '🤒', '🤕', '😮', '😲', '😳', '🥺', '😞', '😔', '😣', '😖', '😫', '😩'],
    },
    {
        id: 'gestures',
        label: 'Gestures',
        emojis: ['👍', '👊', '✌️', '🤞', '🤟', '👌', '🤌', '👏', '🙌', '🙏', '💪', '🫶', '👀', '🫡', '🤝', '👋', '✍️', '🧠'],
    },
    {
        id: 'nature',
        label: 'Nature',
        emojis: ['🌱', '🌿', '🍀', '🌳', '🌸', '🌼', '🌻', '🌈', '☀️', '🌙', '⭐', '⚡', '🔥', '💧', '🌊', '❄️', '🌍', '🕊️', '🐶', '🐱', '🐼', '🦁'],
    },
    {
        id: 'objects',
        label: 'Objects',
        emojis: ['📚', '📝', '✏️', '🎯', '🏆', '⏳', '⌛', '⏰', '💡', '🎧', '🎵', '📌', '📎', '🔒', '🔓', '📅', '📈', '📉', '💻', '📱', '🧘', '🕯️'],
    },
    {
        id: 'symbols',
        label: 'Symbols',
        emojis: ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💫', '✨', '💥', '💢', '💤', '✅', '❌', '⚠️', '🚫', '🔁', '➕', '➖'],
    },
];

const ALL_EMOJIS = Array.from(new Set(EMOJI_GROUPS.flatMap((group) => group.emojis)));

export function EmojiPicker({ open, onClose, onSelect, position = 'top', align = 'right' }: EmojiPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeGroupId, setActiveGroupId] = useState<string>(EMOJI_GROUPS[0].id);
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Delay listener to avoid immediate close from the toggle click
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 10);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        setQuery('');
    }, [open]);

    const positionClass =
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

    const alignClass = align === 'left' ? 'left-0' : 'right-0';

    const activeGroup = useMemo(
        () => EMOJI_GROUPS.find((group) => group.id === activeGroupId) ?? EMOJI_GROUPS[0],
        [activeGroupId],
    );

    const visibleEmojis = useMemo(() => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            return activeGroup.emojis;
        }

        return ALL_EMOJIS.filter((emoji) => emoji.includes(normalizedQuery));
    }, [activeGroup.emojis, query]);

    if (!open) return null;

    return (
        <div
            ref={containerRef}
            className={`absolute ${alignClass} ${positionClass} z-50`}
            style={{ width: 352 }}
        >
            <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search emoji"
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>

                <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-slate-700">
                    {EMOJI_GROUPS.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => setActiveGroupId(group.id)}
                            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                                activeGroupId === group.id
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            {group.label}
                        </button>
                    ))}
                </div>

                <div className="max-h-64 overflow-y-auto p-2">
                    <div className="grid grid-cols-8 gap-1">
                        {visibleEmojis.map((emoji) => (
                            <button
                                key={`${activeGroup.id}-${emoji}`}
                                type="button"
                                onClick={() => onSelect(emoji)}
                                className="h-9 rounded-md text-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                aria-label={`Insert ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {!visibleEmojis.length ? (
                        <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            No emoji found
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
