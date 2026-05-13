import { TourConfig } from "@/contexts/GuidedTourContext";

// =====================================================
// NISHTHA (CheckIn) Tour
// =====================================================
export const checkInTour: TourConfig = {
    id: "nishtha-checkin",
    steps: [
        {
            target: "[data-tour='mood-selection']",
            title: "How are you feeling?",
            content: "Start by selecting the emoji that best represents your current mood. Be honest - this is your safe space!",
            placement: "bottom",
        },
        {
            target: "[data-tour='intensity-slider']",
            title: "Mood Intensity",
            content: "Drag the slider to indicate how intensely you're feeling this emotion. This helps track patterns over time.",
            placement: "bottom",
        },
        {
            target: "[data-tour='quick-tags']",
            title: "Add Context",
            content: "Select tags that relate to what's influencing your mood today - work, family, health, etc.",
            placement: "top",
        },
        {
            target: "[data-tour='submit-checkin']",
            title: "Save Your Check-In",
            content: "Click here to record your mood. Regular check-ins help you understand your emotional patterns.",
            placement: "top",
        },
        {
            target: "[data-tour='sidebar-nav']",
            title: "Explore Nishtha",
            content: "Use the sidebar to access Journal, Goals, Streaks, and personalized Suggestions.",
            placement: "right",
        },
    ],
};

// =====================================================
// FOCUS TIMER (StudyWithMe) Tour
// =====================================================
export const focusTimerTour: TourConfig = {
    id: "focus-timer",
    steps: [
        {
            target: "[data-tour='timer-display']",
            title: "Focus Timer",
            content: "This is your live Ekagra timer. It shows the current countdown for the session you are working on.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='start-button']",
            title: "Start or Pause",
            content: "Start Ekagra immediately, then pause or resume the local timer when you need a break.",
            placement: "top",
        },
        {
            target: "[data-tour='history-button']",
            title: "Session History",
            content: "Open saved focus history here. Unsaved or discarded timers do not appear in analytics.",
            placement: "bottom",
        },
        {
            target: "[data-tour='analytics-link']",
            title: "Timer Analytics",
            content: "Open analytics to review focus time, completed sessions, and your session logs.",
            placement: "bottom",
        },
        {
            target: "[data-tour='theme-button']",
            title: "Change Theme",
            content: "Change the visual background of your focus space from here.",
            placement: "right",
        },
        {
            target: "[data-tour='duration-slider']",
            title: "Set Duration",
            content: "Adjust the timer duration here before you start your next focus session.",
            placement: "right",
        },
    ],
};

// =====================================================
// MEDITATION Tour
// =====================================================
export const meditationTour: TourConfig = {
    id: "meditation",
    steps: [
        {
            target: "[data-tour='session-cards']",
            title: "Choose a Session",
            content: "Browse different meditation styles - Box Breathing, 4-7-8 technique, and more. Each has unique benefits.",
            placement: "bottom",
            spotlightPadding: 20,
        },
        {
            target: "[data-tour='session-info']",
            title: "Session Details",
            content: "View the session description and step-by-step breathing instructions before you begin.",
            placement: "left",
        },
        {
            target: "[data-tour='play-button']",
            title: "Start Meditation",
            content: "Begin your meditation session. Follow the on-screen breathing guidance for inhale, hold, and exhale.",
            placement: "top",
        },
        {
            target: "[data-tour='timer-display']",
            title: "Track Progress",
            content: "Watch the timer and visual breathing guide. The animation helps you maintain the right rhythm.",
            placement: "bottom",
        },
        {
            target: "[data-tour='reset-button']",
            title: "Reset Session",
            content: "Need to start over? Click reset to begin the session from the beginning.",
            placement: "right",
        },
    ],
};

// =====================================================
// MEHFIL (Community) Tour
// =====================================================
export const mehfilTour: TourConfig = {
    id: "mehfil",
    steps: [
        {
            target: "[data-tour='topic-sidebar']",
            title: "Choose a Topic",
            content: "Select a topic from the sidebar to see related community posts. Find conversations that resonate with you.",
            placement: "right",
            spotlightPadding: 12,
        },
        {
            target: "[data-tour='message-feed']",
            title: "Community Posts",
            content: "Read thoughts shared by the community. This is a judgement-free space for honest expression.",
            placement: "left",
            spotlightPadding: 20,
        },
        {
            target: "[data-tour='composer']",
            title: "Share Your Thoughts",
            content: "Type a message to share with the community. You can also add images to express yourself.",
            placement: "top",
        },
        {
            target: "[data-tour='relate-buttons']",
            title: "Connect & Relate",
            content: "Click 'Relate' on posts that resonate with you. It's a way to show support without judgement.",
            placement: "bottom",
        },
        {
            target: "[data-tour='search-bar']",
            title: "Search Posts",
            content: "Looking for something specific? Use search to find posts by text or author.",
            placement: "bottom",
        },
    ],
};


// =====================================================
// JOURNAL Tour
// =====================================================
export const journalTour: TourConfig = {
    id: "nishtha-journal",
    steps: [
        {
            target: "[data-tour='journal-editor']",
            title: "Write Your Thoughts",
            content: "This is your personal writing space. Add a title, choose your mood, and write freely.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='journal-toolbar']",
            title: "Formatting Tools",
            content: "Use bold, italic, or bullet list formatting to organize your thoughts. Pick a mood tag too!",
            placement: "bottom",
        },
        {
            target: "[data-tour='save-entry']",
            title: "Save Your Entry",
            content: "Click here to save your journal entry. It will appear in your history on the right.",
            placement: "top",
        },
        {
            target: "[data-tour='daily-inspiration']",
            title: "Daily Inspiration",
            content: "Browse through reflective prompts. Answer one each day to build a powerful journaling habit.",
            placement: "left",
        },
        {
            target: "[data-tour='journal-history']",
            title: "Your Past Entries",
            content: "All your journal entries appear here. Click 'View all' to see the full history.",
            placement: "left",
        },
    ],
};

// =====================================================
// GOALS Tour
// =====================================================
export const goalsTour: TourConfig = {
    id: "nishtha-goals",
    steps: [
        {
            target: "[data-tour='add-goal']",
            title: "Create a Goal",
            content: "Create a new goal here. Goals stay focused on planning, editing, and manual completion.",
            placement: "bottom",
        },
        {
            target: "[data-tour='goal-cards']",
            title: "Your Goals",
            content: "Your active goals appear here. From each card you can complete, edit, repeat, or delete the goal.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='consistency-chart']",
            title: "Goal Analytics",
            content: "Goal analytics focuses on completion, progress, and saved Ekagra time that you assign after a timer ends.",
            placement: "left",
        },
    ],
};

// =====================================================
// STREAKS Tour
// =====================================================
export const streaksTour: TourConfig = {
    id: "nishtha-streaks",
    steps: [
        {
            target: "[data-tour='streak-cards']",
            title: "Your Streaks",
            content: "See your check-in and login streaks here. The longer you keep them going, the better!",
            placement: "bottom",
            spotlightPadding: 12,
        },
        {
            target: "[data-tour='activity-calendar']",
            title: "Activity Calendar",
            content: "Green checkmarks show days you were active. Try to fill the whole month!",
            placement: "left",
        },
    ],
};

// =====================================================
// SUGGESTIONS Tour
// =====================================================
export const suggestionsTour: TourConfig = {
    id: "nishtha-suggestions",
    steps: [
        {
            target: "[data-tour='suggestions-hero']",
            title: "Your Growth Sanctuary",
            content: "Welcome! This page offers personalized wellness insights tailored just for you.",
            placement: "bottom",
        },
        {
            target: "[data-tour='suggestion-cards']",
            title: "Wellness Categories",
            content: "Explore actionable tips across Stress Relief, Study Breaks, Motivation, and Healthy Habits.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='wellbeing-path']",
            title: "Path to Well-being",
            content: "Follow this guided path of daily tips — morning routines, social connections, and self-care.",
            placement: "top",
        },
    ],
};

// =====================================================
// STUDY PLANNER Tour
// =====================================================
export const studyPlannerTour: TourConfig = {
    id: "study-planner",
    steps: [
        {
            target: "[data-tour='planner-header']",
            title: "Planner Home",
            content: "This is your command center for planning, execution, and progress tracking. We will walk every feature, step by step.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='planner-header-actions']",
            title: "Primary Actions",
            content: "Use the Syllabus tab to build your outline, and Build Schedule assigns dates. Beginner Mode simplifies the flow.",
            placement: "bottom",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-countdown']",
            title: "Exam Countdown",
            content: "Set or update your exam date. The planner uses it to pace your schedule and show days left.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-view-toggle']",
            title: "Views",
            content: "Use these tabs to move between Plan, Syllabus, Calendar, and Insights. Plan is your home for setup, pacing, and today’s work.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-merged-guide']",
            title: "Setup Guide",
            content: "Follow the checklist: exam date, topics, auto-schedule, then review the calendar.",
            placement: "bottom",
            spotlightPadding: 12,
        },
        {
            target: "[data-tour='planner-merged-progress']",
            title: "Progress",
            content: "See completion percent, how many topics are done, and your target pace (topics per day).",
            placement: "bottom",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-merged-add-topics']",
            title: "Add Topics",
            content: "Jump to Syllabus to grow your outline whenever you need more material in the plan.",
            placement: "bottom",
            spotlightPadding: 12,
        },
        {
            target: "[data-tour='planner-merged-today']",
            title: "Today & Upcoming",
            content: "Expand Today for what is due now, scan Overdue if you are behind, and peek at the next planned topics.",
            placement: "right",
            spotlightPadding: 12,
        },
        {
            target: "[data-tour='planner-merged-basics']",
            title: "Basics & Capacity",
            content: "Save Basics for title, exam type, and date. Save Capacity for daily goal and off days — then use Build Schedule (top right) to assign dates.",
            placement: "right",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-plan-actions']",
            title: "Build Schedule",
            content: "Use this button to auto-distribute unfinished topics across available days (respecting your off days and daily goal).",
            placement: "left",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-view-toggle']",
            title: "Switch to Syllabus",
            content: "Click the Syllabus tab to manage subjects, chapters, and topics.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-syllabus-setup']",
            title: "Syllabus Setup",
            content: "Search and filter topics, add subjects, or use Bulk Add for fast import.",
            placement: "bottom",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-subjects-area']",
            title: "Subjects & Topics",
            content: "Add chapters and topics, rename items, set status, schedule dates, add notes, or delete.",
            placement: "bottom",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-view-toggle']",
            title: "Switch to Calendar",
            content: "Click the Calendar tab to review the full schedule.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-calendar-grid']",
            title: "Calendar Grid",
            content: "Pick any day to inspect tasks. Off days and overdue counts are visible at a glance.",
            placement: "right",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-day-panel']",
            title: "Day Details",
            content: "Review that days list, mark done, move dates, move all, or clear the day.",
            placement: "left",
            spotlightPadding: 14,
        },
    ],
};

// =====================================================
// Tour Descriptions (shown in the prompt modal before starting)
// =====================================================
export const tourDescriptions: Record<string, string> = {
    "nishtha-checkin": "Track your daily emotions and moods with a simple, honest check-in.",
    "focus-timer": "Start a local Ekagra timer quickly, then save or discard the session after it ends.",
    "meditation": "Guided breathing exercises to help you relax and find calm.",
    "mehfil": "An anonymous community space to share thoughts and support each other.",
    "nishtha-journal": "A personal writing space to reflect on your day and build self-awareness.",
    "nishtha-goals": "Plan goals, complete them clearly, and review completion-based analytics without timer confusion.",
    "nishtha-streaks": "See your streaks and monthly activity at a glance.",
    "nishtha-suggestions": "Curated wellness tips and insights personalized for your journey.",
    "study-planner": "A full walkthrough of Today, Plan, Syllabus, and Calendar to set up, schedule, and track your study plan.",
};

// Export all tours
export const allTours = {
    checkIn: checkInTour,
    focusTimer: focusTimerTour,
    meditation: meditationTour,
    mehfil: mehfilTour,
    journal: journalTour,
    goals: goalsTour,
    streaks: streaksTour,
    suggestions: suggestionsTour,
    studyPlanner: studyPlannerTour,
};
