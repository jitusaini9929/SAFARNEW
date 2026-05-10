// ═══════════════════════════════════════════════════════════════════════════
// SCALABILITY FIX #3 — VIRTUALIZED THOUGHT LIST (react-window)
// ═══════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FIXES:
//   Without virtualization, ALL thoughts are rendered as DOM nodes.
//   500+ thoughts = thousands of DOM elements = browser tab freezes on
//   low-end devices. react-window only renders visible items.
//
// HOW TO ACTIVATE:
//   1. Run: pnpm add react-window
//   2. Run: pnpm add -D @types/react-window
//   3. Import and use <VirtualThoughtList /> in Mehfil.tsx instead of
//      the current `filteredThoughts.map(...)` block.
//
// USAGE IN Mehfil.tsx:
//   Replace the current thought rendering block:
//
//   BEFORE:
//     <div className="space-y-6">
//       {filteredThoughts.length === 0 ? (...) : (
//         filteredThoughts.map((thought) => (
//           <ThoughtCard key={thought.id} ... />
//         ))
//       )}
//     </div>
//
//   AFTER:
//     import VirtualThoughtList from './VirtualThoughtList';
//     ...
//     <VirtualThoughtList
//       thoughts={filteredThoughts}
//       userReactions={userReactions}
//       currentUserId={user?.id}
//       onReact={handleReact}
//     />
// ═══════════════════════════════════════════════════════════════════════════

import React, { useRef, useCallback } from 'react';
import { VariableSizeList as List } from 'react-window';
import { Thought } from '@/store/mehfilStore';
import ThoughtCard from './ThoughtCard';

interface VirtualThoughtListProps {
    thoughts: Thought[];
    userReactions: Set<string>;
    currentUserId: string | undefined;
    onReact: (thoughtId: string) => void;
}

// Estimated heights — ThoughtCard varies based on content length + image
const BASE_CARD_HEIGHT = 180;       // Text-only thought (short content)
const IMAGE_EXTRA_HEIGHT = 280;     // Additional height for image posts
const LONG_TEXT_THRESHOLD = 200;    // Characters before we add extra height
const LONG_TEXT_EXTRA = 60;         // Extra height per long text chunk
const GAP = 24;                     // gap-6 = 24px spacing between cards

const VirtualThoughtList: React.FC<VirtualThoughtListProps> = ({
    thoughts,
    userReactions,
    currentUserId,
    onReact,
}) => {
    const listRef = useRef<List>(null);

    // Estimate row height based on content
    const getItemSize = useCallback((index: number): number => {
        const thought = thoughts[index];
        if (!thought) return BASE_CARD_HEIGHT + GAP;

        let height = BASE_CARD_HEIGHT;

        // Add height for images
        if (thought.imageUrl) {
            height += IMAGE_EXTRA_HEIGHT;
        }

        // Add height for long text content
        const contentLength = thought.content?.length || 0;
        if (contentLength > LONG_TEXT_THRESHOLD) {
            const extraChunks = Math.ceil((contentLength - LONG_TEXT_THRESHOLD) / 100);
            height += extraChunks * LONG_TEXT_EXTRA;
        }

        return height + GAP;
    }, [thoughts]);

    if (thoughts.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 text-lg">No thoughts yet. Be the first to share!</p>
            </div>
        );
    }

    // Calculate total container height (viewport height minus navbar + composer)
    const containerHeight = typeof window !== 'undefined'
        ? window.innerHeight - 200  // 200px = navbar(80) + composer(~120)
        : 600;

    return (
        <List
            ref={listRef}
            height={containerHeight}
            itemCount={thoughts.length}
            itemSize={getItemSize}
            width="100%"
            overscanCount={3}   // Render 3 items above/below viewport for smooth scroll
            className="scrollbar-blend"
            style={{ overflow: 'auto' }}
        >
            {({ index, style }) => {
                const thought = thoughts[index];
                return (
                    <div style={{ ...style, paddingBottom: GAP }}>
                        <ThoughtCard
                            key={thought.id}
                            thought={thought}
                            onReact={() => onReact(thought.id)}
                            hasReacted={userReactions.has(thought.id)}
                            isOwnThought={thought.userId === currentUserId}
                        />
                    </div>
                );
            }}
        </List>
    );
};

export default VirtualThoughtList;
