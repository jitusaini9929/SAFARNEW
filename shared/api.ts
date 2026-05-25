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

export type GoalKind = "one_time" | "today" | "repeat" | "scheduled";
export type GoalUnitType = "binary" | "count" | "duration_minutes" | "checklist";
export type GoalExecutionMode = "manual" | "timed" | "hybrid";
export type GoalExecutionStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "partial"
  | "missed"
  | "cancelled"
  | "expired"
  | "rolled_over";
export type GoalCarryForwardMode = "none" | "remaining" | "full" | "ask";

export interface Goal {
  id: string;
  userId: string;
  text: string;
  title?: string;
  description?: string | null;
  source?: "manual" | "ekagra";
  importedFromGoal?: boolean;
  completedViaFocus?: boolean;
  goalKind?: GoalKind;
  unitType?: GoalUnitType;
  executionMode?: GoalExecutionMode;
  linkedFocusEnabled?: boolean;
  plannedFocusMinutes?: number | null;
  targetValue?: number | null;
  achievedValue?: number;
  status?: GoalExecutionStatus;
  carryForwardMode?: GoalCarryForwardMode;
  type: "daily" | "weekly";
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  studiedMinutes?: number | null;
  startedAt?: string | null;
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
  studied_minutes?: number | null;
  expires_at?: string;
  lifecycle_status?: "active" | "missed" | "rolled_over" | "abandoned";
  scheduled_date?: string;
  imported_from_goal?: boolean;
  completed_via_focus?: boolean;
  goal_kind?: GoalKind;
  unit_type?: GoalUnitType;
  execution_mode?: GoalExecutionMode;
  linked_focus_enabled?: boolean;
  planned_focus_minutes?: number | null;
  target_value?: number | null;
  achieved_value?: number;
  status_value?: GoalExecutionStatus;
  carry_forward_mode?: GoalCarryForwardMode;
}

export type EkagraSessionSource = "manual" | "imported" | "goal_created" | "goal_continue" | "carry_forward";
export type EkagraSessionStatus = "active" | "paused" | "completed" | "ended_early" | "discarded";
export type EkagraTimerMode = "Timer" | "short" | "long";
export type EkagraSessionType = "goal" | "named";
export type EkagraAnalyticsSessionType = "focus" | "short_break" | "long_break";
export type EkagraAnalyticsQualityStatus = "completed";

export interface EkagraModeSession {
  id: string;
  userId: string;
  goalId: string;
  goalTitle: string;
  sessionType?: EkagraSessionType;
  sessionTitle?: string;
  source: EkagraSessionSource;
  status: EkagraSessionStatus;
  mode: EkagraTimerMode;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  importedFromGoal?: boolean;
  pauseCount?: number;
  sessionStartedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  endedAt?: string | null;
  discardedAt?: string | null;
  user_id?: string;
  goal_id?: string;
  goal_title?: string;
  session_type?: EkagraSessionType;
  session_title?: string;
  total_seconds?: number;
  remaining_seconds?: number;
  is_running?: boolean;
  imported_from_goal?: boolean;
  pause_count?: number;
  session_started_at?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  ended_at?: string | null;
  discarded_at?: string | null;
}

export interface EkagraAnalyticsRecentSession {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  actualMinutes: number;
  completed: boolean;
  status: "completed";
  taskText: string | null;
  associatedGoalId?: string | null;
  pauseCount: number;
  sessionType: EkagraAnalyticsSessionType;
}

export interface EkagraAnalyticsTopTask {
  label: string;
  minutes: number;
  count: number;
}

export interface EkagraTimerDurationUsage {
  durationMinutes: number;
  count: number;
  sessionType: EkagraAnalyticsSessionType;
}

export interface EkagraAnalyticsFocusSession {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number;
  actualMinutes: number;
  status: "completed";
  rawStatus: "completed" | "ended_early";
  taskText: string | null;
  associatedGoalId?: string | null;
  pauseCount: number;
}

export interface EkagraAnalyticsStats {
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  timerUsageCount: number;
  breakSessionsCount: number;
  shortBreakSessionsCount: number;
  longBreakSessionsCount: number;
  longDurationSessionCount: number;
  averageTimerMinutes: number;
  mostUsedTimerDurationMinutes: number | null;
  totalSessions: number;
  completedSessions: number;
  endedEarlySessions: number;
  abandonedSessions: number;
  weeklyData: number[];
  weeklyBreaks: number[];
  focusStreak: number;
  hourlyDistribution: number[];
  recentSessions: EkagraAnalyticsRecentSession[];
  focusSessions: EkagraAnalyticsFocusSession[];
  topTasks: EkagraAnalyticsTopTask[];
  timerDurationUsage: EkagraTimerDurationUsage[];
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
  version?: number;
  month: string;
  generatedAt: string;
  executiveSummary: {
    consistencyScore: number;
    completionRate: number;
    focusDepth: number;
    daysLoggedIn: number;
    daysInMonth: number;
    evaluationDays: number;
    consistentDays: number;
    goalsCreated: number;
    goalsCompleted: number;
    totalFocusMinutes: number;
    totalManualStudyMinutes: number;
    focusDays: number;
    reflectionDays: number;
    checkInDays: number;
    journalDays: number;
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
  radar: Array<{ subject: string; score: number; fullMark: number }>;
}
