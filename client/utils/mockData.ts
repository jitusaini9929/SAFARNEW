// Mock data structure for the SSC Student Emotional Well-Being & Productivity Portal

export type MoodType = "peaceful" | "happy" | "okay" | "motivated" | "anxious" | "low" | "frustrated" | "overwhelmed" | "numb";

export interface MoodEntry {
  id: string;
  mood: MoodType;
  intensity: number;
  notes: string;
  timestamp: Date;
}

export interface JournalEntry {
  id: string;
  content: string;
  timestamp: Date;
}

export interface Goal {
  id: string;
  text: string;
  type: "daily" | "weekly";
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  examType?: "CGL" | "CHSL" | "GD" | "Other";
  preparationStage?: "Beginner" | "Intermediate" | "Advanced";
}

export interface StreakData {
  loginStreak: number;
  checkInStreak: number;
  goalCompletionStreak: number;
  lastActiveDate: Date;
}

export interface AppState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  moods: MoodEntry[];
  journal: JournalEntry[];
  goals: Goal[];
  streak: StreakData;
  lastCheckIn?: MoodEntry;
}

// Initialize default state
const getDefaultState = (): AppState => ({
  user: null,
  isAuthenticated: false,
  moods: [],
  journal: [],
  goals: [],
  streak: {
    loginStreak: 0,
    checkInStreak: 0,
    goalCompletionStreak: 0,
    lastActiveDate: new Date(),
  },
});

// Local storage management
const STORAGE_KEY = "ssc_wellness_app";

export const mockDataManager = {
  // Get current state from localStorage
  getState: (): AppState => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : getDefaultState();
    } catch {
      return getDefaultState();
    }
  },

  // Save state to localStorage
  saveState: (state: AppState): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  },

  // Login user
  loginUser: (name: string, email: string): AppState => {
    const state = mockDataManager.getState();
    state.user = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    };
    state.isAuthenticated = true;
    mockDataManager.saveState(state);
    return state;
  },

  // Sign up user
  signupUser: (
    name: string,
    email: string,
    examType?: string,
    preparationStage?: string
  ): AppState => {
    const state = mockDataManager.getState();
    state.user = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      examType: examType as "CGL" | "CHSL" | "GD" | "Other" | undefined,
      preparationStage: preparationStage as
        | "Beginner"
        | "Intermediate"
        | "Advanced"
        | undefined,
    };
    state.isAuthenticated = true;
    mockDataManager.saveState(state);
    return state;
  },

  // Logout user
  logoutUser: (): AppState => {
    const state = getDefaultState();
    mockDataManager.saveState(state);
    return state;
  },

  // Add mood entry
  addMood: (mood: MoodType, intensity: number, notes: string): AppState => {
    const state = mockDataManager.getState();
    const entry: MoodEntry = {
      id: Math.random().toString(36).substr(2, 9),
      mood,
      intensity,
      notes,
      timestamp: new Date(),
    };
    state.moods.push(entry);
    state.lastCheckIn = entry;
    state.streak.checkInStreak += 1;
    mockDataManager.saveState(state);
    return state;
  },

  // Add journal entry
  addJournalEntry: (content: string): AppState => {
    const state = mockDataManager.getState();
    const entry: JournalEntry = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      timestamp: new Date(),
    };
    state.journal.push(entry);
    mockDataManager.saveState(state);
    return state;
  },

  // Add goal
  addGoal: (text: string, type: "daily" | "weekly"): AppState => {
    const state = mockDataManager.getState();
    const goal: Goal = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      completed: false,
      createdAt: new Date(),
    };
    state.goals.push(goal);
    mockDataManager.saveState(state);
    return state;
  },

  // Toggle goal completion
  toggleGoal: (goalId: string): AppState => {
    const state = mockDataManager.getState();
    const goal = state.goals.find((g) => g.id === goalId);
    if (goal) {
      goal.completed = !goal.completed;
      if (goal.completed) {
        goal.completedAt = new Date();
      }
    }
    mockDataManager.saveState(state);
    return state;
  },

  // Get mood statistics for the week
  getMoodStats: () => {
    const state = mockDataManager.getState();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekMoods = state.moods.filter((m) => m.timestamp > weekAgo);

    const moodCounts = {
      happy: 0,
      neutral: 0,
      sad: 0,
      worried: 0,
      stressed: 0,
    };

    weekMoods.forEach((mood) => {
      moodCounts[mood.mood]++;
    });

    return moodCounts;
  },

  // Get today's mood
  getTodayMood: (): MoodEntry | undefined => {
    const state = mockDataManager.getState();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return state.moods.find((m) => {
      const moodDate = new Date(m.timestamp);
      moodDate.setHours(0, 0, 0, 0);
      return moodDate.getTime() === today.getTime();
    });
  },

  // Get today's goals
  getTodayGoals: (): Goal[] => {
    const state = mockDataManager.getState();
    return state.goals.filter((g) => g.type === "daily");
  },

  // Calculate goals progress percentage
  getGoalsProgress: (): number => {
    const goals = mockDataManager.getTodayGoals();
    if (goals.length === 0) return 0;
    const completed = goals.filter((g) => g.completed).length;
    return Math.round((completed / goals.length) * 100);
  },

  // Get motivational quotes
  getRandomQuote: (): string => {
    const quotes = [
      "Every day is a fresh start. You've got this! 💪",
      "Progress over perfection. Keep moving forward.",
      "Your mental health matters. Take breaks when needed.",
      "Small steps lead to big changes. Be patient with yourself.",
      "You are stronger than you think. Believe in yourself!",
      "Breathe. You're doing better than you think.",
      "Self-care is not selfish. Prioritize your well-being.",
      "Success is a journey, not a destination.",
      "You deserve rest and happiness.",
      "Every effort counts. Be proud of yourself.",
      "Your struggle is temporary. Brighter days are coming.",
      "Focus on progress, not perfection.",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  },

  // Get personalized suggestion based on mood
  getPersonalizedSuggestion: (mood: MoodType): string => {
    const suggestions: Record<MoodType, string[]> = {
      happy: [
        "You're feeling great! Share your positive energy with others.",
        "Channel this positive energy into your studies today!",
        "Great mood! This is perfect for tackling difficult topics.",
      ],
      neutral: [
        "You're feeling neutral. Try a light study session or a short walk.",
        "This is a good time to review or revise previous topics.",
        "Keep your routine steady and consistent.",
      ],
      sad: [
        "It's okay to feel sad. Take a break and do something you enjoy.",
        "Consider journaling about what's on your mind.",
        "Connect with friends or family for support.",
      ],
      worried: [
        "Feeling worried? Let's break your tasks into smaller goals.",
        "Remember, you've overcome challenges before. You can do this!",
        "Try meditation or deep breathing exercises to calm your mind.",
      ],
      stressed: [
        "You're feeling stressed. Take a proper break and relax.",
        "Try stress relief techniques: exercise, meditation, or a hobby.",
        "Review your preparation plan and adjust if needed.",
      ],
    };

    const options = suggestions[mood];
    return options[Math.floor(Math.random() * options.length)];
  },
};
