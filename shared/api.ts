export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  examType?: string;
  preparationStage?: string;
  gender?: string;
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: string;
  intensity: number;
  notes: string;
  timestamp: string;
}

export interface Goal {
  id: string;
  userId: string;
  text: string;
  type: "daily" | "weekly";
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  created_at?: string;
  completed_at?: string;
  expires_at?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
}

export interface Streak {
  id: string;
  userId: string;
  loginStreak: number;
  checkInStreak: number;
  goalCompletionStreak: number;
  lastActiveDate: string;
}
