import { create } from 'zustand';

export interface Thought {
    id: string;
    userId: string;
    isAnonymous?: boolean;
    authorName: string;
    authorAvatar?: string | null;
    content: string;
    imageUrl?: string | null;
    relatableCount: number;
    createdAt: string;
}

interface MehfilStore {
    thoughts: Thought[];
    userReactions: Set<string>; // Set of thought IDs the user has reacted to
    setThoughts: (thoughts: Thought[]) => void;
    addThought: (thought: Thought) => void;
    updateRelatableCount: (thoughtId: string, count: number) => void;
    toggleUserReaction: (thoughtId: string) => void;
    setUserReactions: (thoughtIds: string[]) => void;
}

export const useMehfilStore = create<MehfilStore>((set) => ({
    thoughts: [],
    userReactions: new Set(),
    setThoughts: (thoughts) => set({ thoughts }),
    addThought: (thought) => set((state) => ({
        thoughts: [thought, ...state.thoughts]
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
    setUserReactions: (thoughtIds) => set({
        userReactions: new Set(thoughtIds)
    }),
}));
