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

export interface DemoResponse {
  message: string;
}

export interface GoalSubtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Goal {
  id: string;
  userId: string;
  text: string;
  title?: string;
  description?: string | null;
  type: "daily" | "weekly";
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
  lifecycleStatus?: "active" | "missed" | "rolled_over" | "abandoned";
  rollover_prompt_pending?: boolean;
  source_goal_id?: string | null;
  scheduledDate?: string | null; // ISO date string for future goals
  category?: "academic" | "health" | "personal" | "other";
  priority?: "high" | "medium" | "low";
  subtasks?: GoalSubtask[];
  created_at?: string;
  completed_at?: string;
  expires_at?: string;
  lifecycle_status?: "active" | "missed" | "rolled_over" | "abandoned";
  scheduled_date?: string;
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

export interface MonthlyReport {
  month: string;
  generatedAt: string;
  executiveSummary: {
    consistencyScore: number;
    completionRate: number;
    focusDepth: number;
    daysLoggedIn: number;
    daysInMonth: number;
    goalsCreated: number;
    goalsCompleted: number;
    totalFocusMinutes: number;
    consistencyMessage: string;
    completionMessage: string;
    focusMessage: string;
  };
  insights: {
    powerHour: {
      startHour: number;
      endHour: number;
      message: string;
    };
    moodConnection: {
      anxiousAverageCompletion: number | null;
      normalAverageCompletion: number | null;
      message: string;
    };
    sundayScaries: {
      weakestDay: string | null;
      weakestDayCompletionRate: number | null;
      message: string;
    };
  };
  badgeSummary: {
    theFinisher: boolean;
    earlyBird: boolean;
    nightOwl: boolean;
    metrics: {
      weeklyCreated: number;
      weeklyCompleted: number;
      completedBefore9: number;
      completedAfter22: number;
    };
  };
  radar: Array<{ subject: string; score: number; fullMark: number }>;
  heatmap: Array<{ date: string; dayOfWeek: string; value: number; intensity: number }>;
}
