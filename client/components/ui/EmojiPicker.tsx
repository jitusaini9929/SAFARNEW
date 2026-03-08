import { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    position?: 'top' | 'bottom';
    align?: 'left' | 'right';
}

export function EmojiPicker({ open, onClose, onSelect, position = 'top', align = 'right' }: EmojiPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

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

    if (!open) return null;

    // Detect dark mode
    const isDark =
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    const positionClass =
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

    const alignClass = align === 'left' ? 'left-0' : 'right-0';

    return (
        <div
            ref={containerRef}
            className={`absolute ${alignClass} ${positionClass} z-50`}
            style={{ width: 352 }}
        >
            <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <Picker
                    data={data}
                    onEmojiSelect={(emoji: any) => {
                        onSelect(emoji.native);
                    }}
                    theme={isDark ? 'dark' : 'light'}
                    previewPosition="none"
                    skinTonePosition="search"
                    set="native"
                    perLine={8}
                    maxFrequentRows={2}
                    categories={[
                        'frequent',
                        'people',
                        'nature',
                        'foods',
                        'activity',
                        'places',
                        'objects',
                        'symbols',
                        'flags',
                    ]}
                />
            </div>
        </div>
    );
}
