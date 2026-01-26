import { create } from 'zustand';

export interface Message {
    id: string;
    topicId: string;
    author: string;
    text: string;
    imageUrl?: string;
    relatableCount: number;
    flagCount: number;
    createdAt: string;
}

export interface Topic {
    id: string;
    name: string;
    description: string;
    messageCount: number;
}

interface ChatStore {
    topics: Topic[];
    messages: Message[];
    currentTopicId: string;
    sessionId: string;
    userVotes: Set<string>;
    setTopics: (topics: Topic[]) => void;
    setMessages: (messages: Message[]) => void;
    setCurrentTopic: (topicId: string) => void;
    addMessage: (message: Message) => void;
    updateRelatableCount: (messageId: string, count: number) => void;
    addUserVote: (messageId: string) => void;
}

function generateSessionId() {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('sessionId', id);
    }
    return id;
}

export const useChatStore = create<ChatStore>((set) => ({
    topics: [],
    messages: [],
    currentTopicId: '',
    sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('sessionId') || generateSessionId() : '',
    userVotes: new Set(),
    setTopics: (topics) => set({ topics }),
    setMessages: (messages) => set({ messages }),
    setCurrentTopic: (topicId) => set({ currentTopicId: topicId }),
    addMessage: (message) => set((state) => ({ messages: [message, ...state.messages] })),
    updateRelatableCount: (messageId, count) => set((state) => ({
        messages: state.messages.map((m) => m.id === messageId ? { ...m, relatableCount: count } : m),
    })),
    addUserVote: (messageId) => set((state) => ({
        userVotes: new Set([...state.userVotes, messageId]),
    })),
}));
