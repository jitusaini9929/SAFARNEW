import { create } from 'zustand';

export type MehfilRoom = 'ACADEMIC' | 'REFLECTIVE';
export type MehfilCategory = MehfilRoom | 'BULLSHIT';

export interface Thought {
    id: string;
    userId: string;
    isAnonymous?: boolean;
    authorName: string;
    authorAvatar?: string | null;
    content: string;
    imageUrl?: string | null;
    relatableCount: number;
    createdAt: string | Date;
    category?: MehfilCategory;
    aiTags?: string[];
    aiScore?: number | null;
}

interface MehfilStore {
    thoughts: Thought[];
    userReactions: Set<string>; // Set of thought IDs the user has reacted to
    setThoughts: (thoughts: Thought[]) => void;
    addThought: (thought: Thought) => void;
    updateThought: (thought: Thought) => void;
    removeThought: (thoughtId: string) => void;
    updateRelatableCount: (thoughtId: string, count: number) => void;
    toggleUserReaction: (thoughtId: string) => void;
    setUserReaction: (thoughtId: string, hasReacted: boolean) => void;
    setUserReactions: (thoughtIds: string[]) => void;
}

export const useMehfilStore = create<MehfilStore>((set) => ({
    thoughts: [],
    userReactions: new Set(),
    setThoughts: (thoughts) => set({ thoughts }),
    addThought: (thought) => set((state) => ({
        thoughts: [thought, ...state.thoughts]
    })),
    updateThought: (thought) => set((state) => ({
        thoughts: state.thoughts.map((t) => (t.id === thought.id ? { ...t, ...thought } : t)),
    })),
    removeThought: (thoughtId) => set((state) => ({
        thoughts: state.thoughts.filter((t) => t.id !== thoughtId)
    })),
    updateRelatableCount: (thoughtId, count) => set((state) => ({
        thoughts: state.thoughts.map((t) =>
            t.id === thoughtId ? { ...t, relatableCount: count } : t
        ),
    })),
    toggleUserReaction: (thoughtId) => set((state) => {
        const newReactions = new Set(state.userReactions);
        if (newReactions.has(thoughtId)) {
            newReactions.delete(thoughtId);
        } else {
            newReactions.add(thoughtId);
        }
        return { userReactions: newReactions };
    }),
    setUserReaction: (thoughtId, hasReacted) => set((state) => {
        const newReactions = new Set(state.userReactions);
        if (hasReacted) {
            newReactions.add(thoughtId);
        } else {
            newReactions.delete(thoughtId);
        }
        return { userReactions: newReactions };
    }),
    setUserReactions: (thoughtIds) => set({
        userReactions: new Set(thoughtIds)
    }),
}));
