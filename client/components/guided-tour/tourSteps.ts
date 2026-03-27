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
            content: "This is your Pomodoro-style focus timer. Watch your progress as you work towards your goal.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='mode-tabs']",
            title: "Timer Modes",
            content: "Switch between Focus sessions and short/long breaks. Balance focus with rest for optimal productivity!",
            placement: "bottom",
        },
        {
            target: "[data-tour='start-button']",
            title: "Start Your Session",
            content: "Click to begin your focus session. The timer will count down, and a ladybug tracks your progress!",
            placement: "top",
        },
        {
            target: "[data-tour='theme-button']",
            title: "Change Theme",
            content: "Customize your focus environment with beautiful gradient themes - Autumn, Beach, Aurora, and more.",
            placement: "right",
        },
        {
            target: "[data-tour='duration-slider']",
            title: "Set Duration",
            content: "Adjust the timer duration from 5 to 120 minutes to match your focus goals.",
            placement: "right",
        },
        {
            target: "[data-tour='add-task']",
            title: "Track Tasks",
            content: "View your task history that you have added Throught the Ekagra mode",
            placement: "right",
        },
        {
            target: "[data-tour='analytics-link']",
            title: "View Analytics",
            content: "Check your focus statistics, streaks, and weekly progress to stay motivated!",
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
            content: "Click here to add a new daily or weekly goal. Stay focused on what matters most!",
            placement: "bottom",
        },
        {
            target: "[data-tour='goal-cards']",
            title: "Your Goals",
            content: "Each card shows a goal with its status. Check the box to mark it complete, or delete goals you no longer need.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='focus-distribution']",
            title: "Focus Distribution",
            content: "Track how many daily and weekly goals you've completed at a glance.",
            placement: "left",
        },
        {
            target: "[data-tour='weekly-progress']",
            title: "Weekly Progress",
            content: "This chart shows your goal completion trend over the past week. Stay consistent!",
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
        {
            target: "[data-tour='consistency-chart']",
            title: "Consistency Trend",
            content: "This graph tracks your daily goal completion percentage over the last 7 days.",
            placement: "top",
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
            title: "Your Planner Dashboard",
            content: "This is your main syllabus command center. You can track exam readiness, subject progress, and daily execution from one place.",
            placement: "bottom",
            spotlightPadding: 16,
        },
        {
            target: "[data-tour='planner-countdown']",
            title: "Exam Countdown",
            content: "Set your exam type and timeline to keep urgency visible. This counter helps you plan backward from your target date.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-metrics']",
            title: "Progress Metrics",
            content: "Watch completion %, finished topics, daily target, and month planning volume. These numbers reveal whether your pace is enough.",
            placement: "bottom",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-view-toggle']",
            title: "Three Working Views",
            content: "Use Planner view to build structure, Kanban for status movement, and Log view for date-wise planning. Start in Planner, then switch as needed.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-autoplan']",
            title: "Auto-Plan Generator",
            content: "Once you add enough topics, click Run Auto-Plan to auto-distribute pending work across upcoming days.",
            placement: "left",
        },
        {
            target: "[data-tour='planner-setup-tray']",
            title: "Setup Tray: Start Here",
            content: "This tray is the first setup step for new plans: define your exam context, then start adding subjects before building chapters and topics.",
            placement: "top",
            spotlightPadding: 14,
        },
        {
            target: "[data-tour='planner-exam-input']",
            title: "Exam Type Field",
            content: "Type your exam (UPSC, JEE, NEET, etc.) and press Enter or click outside to save. This personalizes the planning context.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-subject-input']",
            title: "Add Your First Subject",
            content: "Enter a subject like Physics, Math, Polity, or Reasoning. Keep subjects broad; you will break them into chapters next.",
            placement: "bottom",
        },
        {
            target: "[data-tour='planner-add-subject']",
            title: "Create Subject",
            content: "Click Inject to create the subject card. After this, add chapters inside that subject and then add individual topics inside each chapter.",
            placement: "left",
        },
        {
            target: "[data-tour='planner-subjects-area']",
            title: "Subject Tree Workflow",
            content: "Inside each subject card, add chapters, then topics, set dates, and update status from Not Started to In Progress and Done. This is your full end-to-end study flow.",
            placement: "top",
            spotlightPadding: 14,
        },
    ],
};

// =====================================================
// Tour Descriptions (shown in the prompt modal before starting)
// =====================================================
export const tourDescriptions: Record<string, string> = {
    "nishtha-checkin": "Track your daily emotions and moods with a simple, honest check-in.",
    "focus-timer": "A Pomodoro-style timer to help you stay focused and productive.",
    "meditation": "Guided breathing exercises to help you relax and find calm.",
    "mehfil": "An anonymous community space to share thoughts and support each other.",
    "nishtha-journal": "A personal writing space to reflect on your day and build self-awareness.",
    "nishtha-goals": "Set daily and weekly goals to stay on track with what matters to you.",
    "nishtha-streaks": "See how consistent you've been — your streaks and activity calendar at a glance.",
    "nishtha-suggestions": "Curated wellness tips and insights personalized for your journey.",
    "study-planner": "A complete guided flow to set up your syllabus, schedule topics, and track progress to exam day.",
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
