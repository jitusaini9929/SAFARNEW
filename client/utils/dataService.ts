import { MoodEntry, JournalEntry, Goal } from "@shared/api";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const dataService = {
    // --- Moods ---
    async getMoods(): Promise<MoodEntry[]> {
        const res = await fetch(`${API_URL}/moods`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch moods");
        return res.json();
    },

    async addMood(mood: string, intensity: number, notes: string): Promise<MoodEntry> {
        const res = await fetch(`${API_URL}/moods`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mood, intensity, notes }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to add mood");
        return res.json();
    },

    // --- Journal ---
    async getJournalEntries(): Promise<JournalEntry[]> {
        const res = await fetch(`${API_URL}/journal`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch journal entries");
        return res.json();
    },

    async addJournalEntry(content: string, moodId?: string, tags?: string[]): Promise<JournalEntry> {
        const res = await fetch(`${API_URL}/journal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, moodId, tags }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to add journal entry");
        return res.json();
    },

    async deleteJournalEntry(id: string): Promise<void> {
        const res = await fetch(`${API_URL}/journal/${id}`, {
            method: "DELETE",
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to delete journal entry");
    },

    // --- Goals ---
    async getGoals(): Promise<Goal[]> {
        const res = await fetch(`${API_URL}/goals`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch goals");
        return res.json();
    },

    async addGoal(text: string, type: string): Promise<Goal> {
        const res = await fetch(`${API_URL}/goals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, type }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to add goal");
        return res.json();
    },

    async updateGoal(id: string, completed: boolean): Promise<void> {
        const res = await fetch(`${API_URL}/goals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to update goal");
    },

    async deleteGoal(id: string): Promise<void> {
        const res = await fetch(`${API_URL}/goals/${id}`, {
            method: "DELETE",
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to delete goal");
    },

    // --- Streaks ---
    async getStreaks(): Promise<{ loginStreak: number; checkInStreak: number; goalCompletionStreak: number; lastActiveDate: string | null }> {
        const res = await fetch(`${API_URL}/streaks`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch streaks");
        return res.json();
    },

    // --- Achievements ---
    async getAchievements(): Promise<{
        achievements: Array<{
            achievement_id: string;
            acquired_at: string;
            is_active: number;
            name: string;
            type: 'badge' | 'title';
            category: string;
            tier: number | null;
            display_priority: number;
        }>;
        counts: { badges: number; titles: number };
    }> {
        const res = await fetch(`${API_URL}/achievements`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch achievements");
        return res.json();
    },

    async getActiveTitle(): Promise<{ title: string | null; type?: string }> {
        const res = await fetch(`${API_URL}/achievements/active-title`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch active title");
        return res.json();
    },

    async getAllAchievements(): Promise<{
        achievements: Array<{
            id: string;
            name: string;
            description: string | null;
            type: 'badge' | 'title';
            category: string;
            tier: number | null;
            requirement: string;
            holderCount: number;
            earned: boolean;
            progress: number;
            currentValue: number;
            targetValue: number;
        }>;
    }> {
        const res = await fetch(`${API_URL}/achievements/all`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to fetch all achievements");
        return res.json();
    },

    async selectAchievement(achievementId: string | null): Promise<{ message: string; selectedId: string | null; title?: string; type?: string }> {
        const res = await fetch(`${API_URL}/achievements/select`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ achievementId }),
            credentials: 'include',
        });
        if (!res.ok) throw new Error("Failed to select achievement");
        return res.json();
    },
};
