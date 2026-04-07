import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import FocusAnalytics from "./FocusAnalytics";
import { Moon, Sun, History, Plus, Home, Settings, Play, Pause, RotateCcw, Leaf, Sparkles, LogOut, ArrowRight, BarChart2, Clock, Zap, Target, Flame, Calendar, Palette, ChevronLeft, ChevronRight, Trees, Waves, Sunset, MoonStar, Sparkle, HelpCircle, Volume2, VolumeX, Music, LayoutDashboard, Layers3, X } from "lucide-react";
import TasksSidebar, { type Task } from "./TasksSidebar";
import { TimerCard } from "../components/focus/TimerCard";
import { PiPNudgeToast } from "@/components/focus/PiPNudgeToast";
import { useFocus } from "@/contexts/FocusContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ui/theme-toggle";
import { useTheme } from "@/contexts/ThemeContext";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { focusTimerTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import MobileDrawer from "@/components/ui/mobile-drawer";
import { Heart, MessageSquare, Wind, Menu, Shield } from "lucide-react";
import { EkagraModeSession } from "@shared/api";

// Theme configuration
interface FocusTheme {
    id: string;
    name: string;
    accent: string;
    accentRgb: string;
    gradient: string;
    icon: React.ReactNode;
    videoUrl: string;
}

interface FocusMusicTrack {
    id: string;
    name: string;
    url: string;
}

const focusThemes: FocusTheme[] = [


    {
        id: "serene",
        name: "Serene",
        accent: "#1b8ec3ff",
        accentRgb: "27, 142, 195",
        gradient: "linear-gradient(135deg, #0a4d68 0%, #1b8ec3 50%, #88d4f5 100%)",
        icon: <Waves className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_2.mp4"
    },
    {
        id: "nostalgia",
        name: "Nostalgia",
        accent: "#1cbc31ff",
        accentRgb: "28, 188, 49",
        gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
        icon: <Sunset className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_3.mp4"
    },
    {
        id: "amber",
        name: "Amber",
        accent: "#2e7144ff",
        accentRgb: "46, 113, 68",
        gradient: "linear-gradient(135deg, #1e3a5f 0%, #2e7144 50%, #4ade80 100%)",
        icon: <MoonStar className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_4.mp4"
    },
    {
        id: "solitude",
        name: "Solitude",
        accent: "#1c527cff",
        accentRgb: "28, 82, 124",
        gradient: "linear-gradient(135deg, #1c527c 0%, #7c3aed 50%, #ec4899 100%)",
        icon: <Sparkle className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_1.mp4"
    },
];

const MUSIC_TRACK_STORAGE_KEY = "focus-music-track-id";

const focusMusicTracks: FocusMusicTrack[] = [
    {
        id: "serene-flow",
        name: "Serene Flow",
        url: "https://del1.vultrobjects.com/qms-images/Safar/music_1.mp3",
    },
    {
        id: "nostalgia-breeze",
        name: "Nostalgia Breeze",
        url: "https://del1.vultrobjects.com/qms-images/Safar/relaxingtime-sleep-music-vol16-195422.mp3",
    },
    {
        id: "amber-pulse",
        name: "Amber Pulse",
        url: "https://del1.vultrobjects.com/qms-images/Safar/WhatsApp_Audio_2026-02-18_at_10.05.04_AM.mpeg",
    },
    {
        id: "solitude-deep",
        name: "Solitude Deep",
        url: "https://del1.vultrobjects.com/qms-images/Safar/music_3.mp3",
    },
];

const getInitialMusicTrackId = () => {
    try {
        const savedTrackId = localStorage.getItem(MUSIC_TRACK_STORAGE_KEY);
        if (savedTrackId && focusMusicTracks.some((track) => track.id === savedTrackId)) {
            return savedTrackId;
        }

        const savedMusicUrl = String(localStorage.getItem("focus_music_source") || "").trim();
        if (savedMusicUrl) {
            const matchedTrack = focusMusicTracks.find((track) => track.url === savedMusicUrl);
            if (matchedTrack) {
                return matchedTrack.id;
            }
        }
    } catch {
        // Fall back to first track.
    }

    return focusMusicTracks[0].id;
};

const TIMER_MINUTES_MIN = 5;
const TIMER_STEP_MINUTES = 5;
const TIMER_SLIDER_MAX = 120;
const BREAK_MINUTES_MIN = 5;
const BREAK_STEP_MINUTES = 5;
const BREAK_MAX_MINUTES = 60;

const createTaskId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeMinutes = (value: number, min = TIMER_MINUTES_MIN, step = TIMER_STEP_MINUTES) => {
    if (!Number.isFinite(value)) return min;
    const rounded = Math.round(value / step) * step;
    return Math.max(min, rounded);
};

const getTasksStorageKey = (userId?: string) => (userId ? `focus-tasks-${userId}` : "focus-tasks");

const normalizeStoredTask = (raw: any): Task | null => {
    if (!raw || typeof raw !== "object") return null;

    const text = String(raw.text || "").trim();
    if (!text) return null;

    const legacyTimestamp =
        typeof raw.id === "number" && Number.isFinite(raw.id) ? raw.id : Date.now();
    const createdAtCandidate =
        typeof raw.createdAt === "string" && raw.createdAt.trim()
            ? raw.createdAt
            : new Date(legacyTimestamp).toISOString();
    const createdAtDate = new Date(createdAtCandidate);
    const safeCreatedAt = Number.isFinite(createdAtDate.getTime())
        ? createdAtDate.toISOString()
        : new Date().toISOString();

    const completedAtDate =
        typeof raw.completedAt === "string" && raw.completedAt.trim()
            ? new Date(raw.completedAt)
            : raw.completed
                ? new Date(legacyTimestamp)
                : null;

    return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `legacy-${legacyTimestamp}`,
        text,
        completed: Boolean(raw.completed),
        createdAt: safeCreatedAt,
        completedAt:
            completedAtDate && Number.isFinite(completedAtDate.getTime())
                ? completedAtDate.toISOString()
                : null,
        importedFromGoal: Boolean(raw.importedFromGoal || raw.imported_from_goal),
    };
};

const loadTasks = (userId?: string): Task[] => {
    try {
        const key = getTasksStorageKey(userId);
        const saved = localStorage.getItem(key);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed)
            ? parsed
                .map((task) => normalizeStoredTask(task))
                .filter((task): task is Task => Boolean(task))
            : [];
    } catch {
        return [];
    }
};

const saveTasks = (tasks: Task[], userId?: string) => {
    try {
        const key = getTasksStorageKey(userId);
        localStorage.setItem(key, JSON.stringify(tasks));
    } catch {
        // Ignore storage failures.
    }
};

const clearTasks = (userId?: string) => {
    try {
        localStorage.removeItem(getTasksStorageKey(userId));
    } catch {
        // Ignore storage failures.
    }
};

const sortTasks = (items: Task[]) =>
    [...items].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

const mapGoalToTask = (goal: any): Task => ({
    id: String(goal.id),
    text: String(goal.title || goal.text || "").trim(),
    completed: Boolean(goal.completed),
    createdAt: String(goal.createdAt || goal.created_at || new Date().toISOString()),
    completedAt: goal.completedAt || goal.completed_at || null,
    importedFromGoal: Boolean(goal.importedFromGoal || goal.imported_from_goal),
});

const extractEkagraTasks = (goals: any[]) =>
    sortTasks(
        goals
            .filter((goal) => goal?.source === "ekagra")
            .map((goal) => mapGoalToTask(goal))
            .filter((task) => task.text.length > 0),
    );

export default function StudyWithMe() {
    const navigate = useNavigate();
    const { user, status } = useAuth();
    const { theme } = useTheme();
    const {
        timerState,
        toggleTimer,
        resetTimer,
        togglePiP,
        isPiPActive,
        setMode,
        setTimerDuration,
        setBreakDuration,
        isMusicPlaying,
        isMusicMuted,
        musicVolume,
        setMusicSource,
        toggleMusic,
        toggleMusicMuted,
        setMusicVolume,
        setLongBreakDuration,
        longBreakDuration,
        setAssociatedGoal,
        associatedGoalId,
        associatedGoalTitle,
        hasPendingResume,
        resumeStoredSession,
        discardStoredSession,
        applyRuntimeSnapshot,
    } = useFocus(); // Use Context

    const [searchParams, setSearchParams] = useSearchParams();

    // Destructure from Context State
    const { minutes, seconds, isRunning, mode, totalSeconds, remainingSeconds } = timerState;

    // Local UI state (not shared)
    const [sliderValue, setSliderValue] = useState(25);
    const [breakSliderValue, setBreakSliderValue] = useState(5);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showEkagraGuide, setShowEkagraGuide] = useState(false);

    // Sync slider with global state if needed, or just let slider drive global
    useEffect(() => {
        if (mode === 'Timer') setSliderValue(normalizeMinutes(Math.floor(totalSeconds / 60)));
        if (mode === 'short') setBreakSliderValue(normalizeMinutes(Math.floor(totalSeconds / 60), BREAK_MINUTES_MIN, BREAK_STEP_MINUTES));
        if (mode === 'long') setBreakSliderValue(normalizeMinutes(Math.floor(totalSeconds / 60), BREAK_MINUTES_MIN, BREAK_STEP_MINUTES));
    }, [mode, totalSeconds]);


    // New states for theme and sidebar
    const [currentTheme, setCurrentTheme] = useState<FocusTheme>(() => {
        try {
            const saved = localStorage.getItem('focus-theme-id');
            return focusThemes.find(t => t.id === saved) || focusThemes[0];
        } catch {
            return focusThemes[0];
        }
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [showMusicSelector, setShowMusicSelector] = useState(false);
    const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string>(getInitialMusicTrackId);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [completedTask, setCompletedTask] = useState<Task | null>(null);
    const [awaitingProceed, setAwaitingProceed] = useState(false);
    const [showDurationPrompt, setShowDurationPrompt] = useState(false);
    const [nextDurationInput, setNextDurationInput] = useState("");
    const [sessionOverlayTrigger, setSessionOverlayTrigger] = useState(0);
    const [runtimeSessions, setRuntimeSessions] = useState<EkagraModeSession[]>([]);
    const [runtimeActiveSessionId, setRuntimeActiveSessionId] = useState<string | null>(null);
    const runtimeSessionIdRef = useRef<string | null>(null);
    const [showNamedSessionPrompt, setShowNamedSessionPrompt] = useState(false);
    const [namedSessionTitleInput, setNamedSessionTitleInput] = useState("");

    const linkedGoalTask = associatedGoalId ? tasks.find((task) => task.id === associatedGoalId) : undefined;
    const linkedActiveTask = linkedGoalTask && !linkedGoalTask.completed ? linkedGoalTask : undefined;
    const activeTask = associatedGoalId
        ? linkedActiveTask
        : tasks.find((task) => !task.completed);
    const currentTask = activeTask;
    const activeRuntimeSession = useMemo(() => {
        if (!runtimeSessions.length) return null;
        const directMatch = runtimeSessions.find((session) => session.id === runtimeActiveSessionId);
        if (directMatch) return directMatch;
        return runtimeSessions.find((session) => String(session.status || "").toLowerCase() === "active") || null;
    }, [runtimeSessions, runtimeActiveSessionId]);
    const activeRuntimeSessionTitle =
        String(
            activeRuntimeSession?.sessionTitle
            || (activeRuntimeSession as any)?.session_title
            || activeRuntimeSession?.goalTitle
            || (activeRuntimeSession as any)?.goal_title
            || "",
        ).trim() || null;
    const activeRuntimeSessionType = String(
        activeRuntimeSession?.sessionType || (activeRuntimeSession as any)?.session_type || "",
    ).toLowerCase();

    const refreshRuntimeSessions = useCallback(async () => {
        if (status !== "authenticated" || !user?.id) {
            setRuntimeSessions([]);
            setRuntimeActiveSessionId(null);
            runtimeSessionIdRef.current = null;
            return;
        }

        try {
            const [sessions, activeSession] = await Promise.all([
                dataService.getEkagraSessions({ forceFresh: true }),
                dataService.getActiveEkagraSession({ forceFresh: true }),
            ]);

            setRuntimeSessions(sessions);
            const activeId = activeSession?.id || null;
            setRuntimeActiveSessionId(activeId);
            runtimeSessionIdRef.current = activeId;
        } catch (error) {
            console.error("Refresh runtime sessions error:", error);
        }
    }, [status, user?.id]);

    // Audio/Video refs and states
    const videoRef = useRef<HTMLVideoElement>(null);
    const [customTimerInput, setCustomTimerInput] = useState("");
    const completionSoundRef = useRef<HTMLAudioElement | null>(null);
    const completionHandledRef = useRef(false);
    const selectedMusicTrack = focusMusicTracks.find((track) => track.id === selectedMusicTrackId) || focusMusicTracks[0];

    // Deep link handling for analytics
    useEffect(() => {
        if (searchParams.get('view') === 'analytics') {
            setShowAnalytics(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (status !== "authenticated" || !user?.id) return;

        const isVisible = () =>
            typeof document === "undefined" || document.visibilityState === "visible";

        const poll = () => {
            if (!isVisible()) return;
            void refreshRuntimeSessions();
        };

        poll();

        const onVisibilityChange = () => {
            if (isVisible()) {
                void refreshRuntimeSessions();
            }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        const id = window.setInterval(() => {
            poll();
        }, 20000);

        return () => {
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.clearInterval(id);
        };
    }, [refreshRuntimeSessions, status, user?.id]);

    // Goal linking via URL params (from Goals page "▶ Focus" button)
    useEffect(() => {
        const goalId = searchParams.get('goalId');
        const goalTitle = searchParams.get('goalTitle');
        if (goalId) {
            setAssociatedGoal(goalId, goalTitle);

            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('goalId');
            nextParams.delete('goalTitle');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setAssociatedGoal, setSearchParams]);

    const persistTasks = useCallback(async (nextTasks: Task[]) => {
        const sortedTasks = sortTasks(nextTasks);

        if (status !== "authenticated" || !user?.id) {
            setTasks(sortedTasks);
            saveTasks(sortedTasks, user?.id);
            return;
        }

        const currentMap = new Map(tasks.map((task) => [task.id, task]));
        const nextMap = new Map(sortedTasks.map((task) => [task.id, task]));

        try {
            setTasks(sortedTasks);

            const deletions = tasks
                .filter((task) => !nextMap.has(task.id))
                .map((task) => dataService.deleteGoal(task.id));

            const updates = sortedTasks.flatMap((task) => {
                const previous = currentMap.get(task.id);
                if (!previous) return [];

                const operations: Promise<unknown>[] = [];
                if (previous.text !== task.text) {
                    operations.push(dataService.updateGoalDetails(task.id, { title: task.text }));
                }

                if (previous.completed !== task.completed || previous.completedAt !== task.completedAt) {
                    operations.push(dataService.updateGoal(task.id, task.completed, task.completedAt || undefined));
                }

                return operations;
            });

            await Promise.all([...deletions, ...updates]);
        } catch (error) {
            console.error("Persist Ekagra tasks error:", error);
            setTasks(tasks);
        }
    }, [status, tasks, user?.id]);

    const updateTasks = useCallback((updater: (prev: Task[]) => Task[]) => {
        const next = updater(tasks);
        void persistTasks(next);
    }, [persistTasks, tasks]);

    // Auto-complete task only when an Ekagra focus timer finishes.
    const prevRemainingRef = useRef(remainingSeconds);
    useEffect(() => {
        const justCompleted = remainingSeconds === 0 && prevRemainingRef.current > 0;
        prevRemainingRef.current = remainingSeconds;

        if (remainingSeconds > 0) {
            completionHandledRef.current = false;
        }

        if (!justCompleted || completionHandledRef.current || mode !== "Timer") return;
        completionHandledRef.current = true;

        const runtimeSessionId = runtimeSessionIdRef.current || runtimeActiveSessionId;
        const runtimeSession = runtimeSessionId
            ? runtimeSessions.find((session) => session.id === runtimeSessionId)
            : null;
        const runtimeSessionType = String(
            runtimeSession?.sessionType || (runtimeSession as any)?.session_type || "",
        ).toLowerCase();
        const runtimeGoalId = String(runtimeSession?.goalId || (runtimeSession as any)?.goal_id || "");
        const isNamedSession = runtimeSessionType === "named" || runtimeGoalId.startsWith("named:");
        if (runtimeSessionId && status === "authenticated" && user?.id) {
            void (async () => {
                try {
                    await dataService.completeEkagraSession(runtimeSessionId, {
                        mode: "Timer",
                        elapsedSeconds: Math.max(0, totalSeconds - remainingSeconds),
                        remainingSeconds: Math.max(0, remainingSeconds),
                        sessionStartedAt: null,
                    });
                    runtimeSessionIdRef.current = null;
                    setRuntimeActiveSessionId(null);
                    await refreshRuntimeSessions();
                } catch (error) {
                    console.error("Auto-complete Ekagra session error:", error);
                }
            })();
        }

        const taskToComplete = currentTask;
        if (taskToComplete && !isNamedSession) {
            const completedAt = new Date().toISOString();
            updateTasks((prev) =>
                prev.map(task =>
                    task.id === taskToComplete.id ? { ...task, completed: true, completedAt } : task
                )
            );
            setCompletedTask(null);
            setAwaitingProceed(false);
            setShowDurationPrompt(false);
            if (associatedGoalId && !isNamedSession) {
                setAssociatedGoal(null, null);
            }
        }
    }, [
        associatedGoalId,
        currentTask,
        mode,
        refreshRuntimeSessions,
        remainingSeconds,
        runtimeActiveSessionId,
        runtimeSessions,
        setAssociatedGoal,
        status,
        totalSeconds,
        updateTasks,
        user?.id,
    ]);

    useEffect(() => {
        let cancelled = false;

        const bootstrapTasks = async () => {
            const localTasks = loadTasks(user?.id);

            if (status !== "authenticated" || !user?.id) {
                if (!cancelled) {
                    setTasks(sortTasks(localTasks));
                    setCompletedTask(null);
                    setAwaitingProceed(false);
                }
                return;
            }

            try {
                const goals = await dataService.getGoals();
                if (cancelled) return;

                let ekagraTasks = extractEkagraTasks(goals);

                if (ekagraTasks.length === 0 && localTasks.length > 0) {
                    for (const task of localTasks) {
                        const createdGoal = await dataService.addGoal({
                            title: task.text,
                            startedAt: task.createdAt,
                            source: "ekagra",
                        });

                        if (task.completed) {
                            await dataService.updateGoal(
                                createdGoal.id,
                                true,
                                task.completedAt || task.createdAt,
                            );
                        }
                    }

                    clearTasks(user.id);

                    const refreshedGoals = await dataService.getGoals();
                    if (cancelled) return;
                    ekagraTasks = extractEkagraTasks(refreshedGoals);
                }

                setTasks(ekagraTasks);
            } catch (error) {
                console.error("Bootstrap Ekagra tasks error:", error);
                if (!cancelled) {
                    setTasks(sortTasks(localTasks));
                }
            }

            if (!cancelled) {
                setCompletedTask(null);
                setAwaitingProceed(false);
            }
        };

        void bootstrapTasks();

        return () => {
            cancelled = true;
        };
    }, [status, user?.id]);

    // Guided tour integration
    const { startTour } = useGuidedTour();

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Logout failed:", error);
        }
        navigate("/login");
    };

    const handleProfile = () => {
        navigate("/profile");
    };

    const modeSettings = {
        Timer: { minutes: sliderValue, label: "Pomodoro" },
        short: { minutes: breakSliderValue, label: "Short break" },
        long: { minutes: longBreakDuration, label: "Long break" },
    };

    // Removed local timer Effects (handled by FocusContext)

    const handleModeChange = (newMode: "Timer" | "short" | "long") => {
        setMode(newMode);
    };

    const handleSliderChange = (value: number) => {
        const normalized = normalizeMinutes(value);
        setSliderValue(normalized);
        setTimerDuration(normalized);
    };

    const handleBreakSliderChange = (value: number) => {
        const normalized = normalizeMinutes(value, BREAK_MINUTES_MIN, BREAK_STEP_MINUTES);
        setBreakSliderValue(normalized);
        if (mode === 'long') {
            setLongBreakDuration(normalized);
        } else {
            setBreakDuration(normalized);
        }
    };

    // Removed local toggleTimer, resetTimer, formatTime

    // Derived progress
    const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

    const handleSetTimer = (minutes: number) => {
        const normalized = normalizeMinutes(minutes);
        setSliderValue(normalized);
        setTimerDuration(normalized);
        setMode("Timer");
        setShowAnalytics(false);
    };

    const timerSliderValue = Math.min(sliderValue, TIMER_SLIDER_MAX);

    const applyCustomTimer = () => {
        const parsed = parseInt(customTimerInput.trim(), 10);
        if (!Number.isFinite(parsed)) return;
        const normalized = normalizeMinutes(parsed);

        if (mode === 'Timer') {
            setSliderValue(normalized);
            setTimerDuration(normalized);
        } else if (mode === 'short') {
            setBreakSliderValue(normalized);
            setBreakDuration(normalized);
        } else if (mode === 'long') {
            setLongBreakDuration(normalized);
        }
        setCustomTimerInput("");
    };

    const handleCustomTimerInputChange = (value: string) => {
        setCustomTimerInput(value.replace(/\D/g, ""));
    };

    const handleCustomTimerInputKeyDown = (key: string) => {
        if (key === "Enter") applyCustomTimer();
    };

    const nextTask = awaitingProceed ? activeTask : undefined;

    const handleProceedToNext = () => {
        if (!nextTask) {
            // All tasks done — reset completion state and open task sidebar
            setAwaitingProceed(false);
            setCompletedTask(null);
            setIsTasksOpen(true);
            return;
        }
        setNextDurationInput(String(sliderValue));
        setShowDurationPrompt(true);
    };

    const handleNextDurationChange = (value: string) => {
        setNextDurationInput(value.replace(/\D/g, ""));
    };

    const confirmNextDuration = () => {
        const parsed = parseInt(nextDurationInput.trim(), 10);
        if (!Number.isFinite(parsed)) return;
        const normalized = normalizeMinutes(parsed);
        handleSetTimer(normalized);
        setShowDurationPrompt(false);
        setAwaitingProceed(false);
        setCompletedTask(null);
        setNextDurationInput("");
    };

    const cancelNextDuration = () => {
        setShowDurationPrompt(false);
    };

    const handleThemeChange = (newTheme: FocusTheme) => {
        setCurrentTheme(newTheme);
        setShowThemeSelector(false);
        try { localStorage.setItem('focus-theme-id', newTheme.id); } catch { }
    };

    const handleResetTimer = useCallback(async () => {
        const runtimeSessionId = runtimeSessionIdRef.current || runtimeActiveSessionId;
        const runtimeSession = runtimeSessionId
            ? runtimeSessions.find((session) => session.id === runtimeSessionId)
            : null;
        const runtimeSessionType = String(
            runtimeSession?.sessionType || (runtimeSession as any)?.session_type || "",
        ).toLowerCase();
        const runtimeGoalId = String(runtimeSession?.goalId || (runtimeSession as any)?.goal_id || "");
        const isNamedSession = runtimeSessionType === "named" || runtimeGoalId.startsWith("named:");

        if (mode === "Timer" && runtimeSessionId && isNamedSession && status === "authenticated" && user?.id) {
            const plannedSeconds = Math.max(
                1,
                Number(runtimeSession?.totalSeconds ?? (runtimeSession as any)?.total_seconds ?? totalSeconds) || totalSeconds,
            );
            const remaining = Math.max(
                0,
                Number(runtimeSession?.remainingSeconds ?? (runtimeSession as any)?.remaining_seconds ?? remainingSeconds) || remainingSeconds,
            );
            const elapsedSeconds = Math.max(0, plannedSeconds - remaining);
            try {
                await dataService.completeEkagraSession(runtimeSessionId, {
                    mode: "Timer",
                    elapsedSeconds,
                    remainingSeconds: Math.max(0, remaining),
                    sessionStartedAt: runtimeSession?.sessionStartedAt || (runtimeSession as any)?.session_started_at || null,
                });
                runtimeSessionIdRef.current = null;
                setRuntimeActiveSessionId(null);
                await refreshRuntimeSessions();
            } catch (error) {
                console.error("Complete Ekagra session error:", error);
            }
        }

        resetTimer();
    }, [
        mode,
        refreshRuntimeSessions,
        remainingSeconds,
        resetTimer,
        runtimeActiveSessionId,
        runtimeSessions,
        status,
        totalSeconds,
        user?.id,
    ]);

    const handleUnlinkGoal = () => {
        setAssociatedGoal(null, null);
    };

    const handleManualTaskAdd = async (text: string) => {
        const trimmedText = text.trim();
        if (!trimmedText) return;

        setCompletedTask(null);
        setAwaitingProceed(false);
        setShowDurationPrompt(false);

        if (associatedGoalId) {
            setAssociatedGoal(null, null);
        }

        if (status !== "authenticated" || !user?.id) {
            const newTask: Task = {
                id: createTaskId(),
                text: trimmedText,
                completed: false,
                createdAt: new Date().toISOString(),
                completedAt: null,
            };
            const nextTasks = sortTasks([...tasks, newTask]);
            setTasks(nextTasks);
            saveTasks(nextTasks, user?.id);
            return;
        }

        try {
            const createdGoal = await dataService.addGoal({
                title: trimmedText,
                startedAt: new Date().toISOString(),
                source: "ekagra",
            });
            setTasks((prev) => sortTasks([...prev, mapGoalToTask(createdGoal)]));
        } catch (error) {
            console.error("Add Ekagra task error:", error);
        }
    };

    const handleCompleteCurrentTask = useCallback(async () => {
        const runtimeSessionId = runtimeSessionIdRef.current || runtimeActiveSessionId;
        const runtimeSession = runtimeSessionId
            ? runtimeSessions.find((session) => session.id === runtimeSessionId)
            : null;
        const runtimeSessionType = String(
            runtimeSession?.sessionType || (runtimeSession as any)?.session_type || "",
        ).toLowerCase();
        const runtimeGoalId = String(runtimeSession?.goalId || (runtimeSession as any)?.goal_id || "");
        const isNamedSession = runtimeSessionType === "named" || runtimeGoalId.startsWith("named:");

        if (!runtimeSessionId && !currentTask) return;

        const plannedSeconds = Math.max(
            1,
            Number(runtimeSession?.totalSeconds ?? (runtimeSession as any)?.total_seconds ?? totalSeconds) || totalSeconds,
        );
        const remaining = Math.max(
            0,
            Number(runtimeSession?.remainingSeconds ?? (runtimeSession as any)?.remaining_seconds ?? remainingSeconds) || remainingSeconds,
        );
        const elapsedSeconds = Math.max(0, plannedSeconds - remaining);

        if (runtimeSessionId && status === "authenticated" && user?.id) {
            try {
                await dataService.completeEkagraSession(runtimeSessionId, {
                    mode: "Timer",
                    elapsedSeconds,
                    remainingSeconds: Math.max(0, remaining),
                    sessionStartedAt: null,
                });
                runtimeSessionIdRef.current = null;
                setRuntimeActiveSessionId(null);
                await refreshRuntimeSessions();
            } catch (error) {
                console.error("Complete Ekagra session error:", error);
            }
        }

        if (!isNamedSession) {
            const goalIdToComplete = runtimeGoalId && !runtimeGoalId.startsWith("named:")
                ? runtimeGoalId
                : currentTask?.id;
            if (!goalIdToComplete) return;
            const completedAt = new Date().toISOString();
            if (status === "authenticated" && user?.id) {
                try {
                    await dataService.updateGoal(goalIdToComplete, true, completedAt);
                    setTasks((prev) => sortTasks(prev.map((task) =>
                        task.id === goalIdToComplete ? { ...task, completed: true, completedAt } : task
                    )));
                } catch (error) {
                    console.error("Complete Ekagra task error:", error);
                    return;
                }
            } else {
                const nextTasks = sortTasks(tasks.map((task) =>
                    task.id === goalIdToComplete ? { ...task, completed: true, completedAt } : task
                ));
                setTasks(nextTasks);
                saveTasks(nextTasks, user?.id);
            }
        }

        if (isRunning) {
            toggleTimer();
        }
        resetTimer();

        if (associatedGoalId && !isNamedSession) {
            setAssociatedGoal(null, null);
        }

        setCompletedTask(null);
        setAwaitingProceed(false);
        setShowDurationPrompt(false);
    }, [
        associatedGoalId,
        currentTask,
        isRunning,
        refreshRuntimeSessions,
        remainingSeconds,
        resetTimer,
        runtimeActiveSessionId,
        runtimeSessions,
        setAssociatedGoal,
        status,
        tasks,
        toggleTimer,
        totalSeconds,
        user?.id,
    ]);

    const handleCompleteSessionGoal = useCallback(async (goalId: string, completedAt: string, _sessionStatus: string) => {
        if (status !== "authenticated" || !user?.id) return;

        try {
            await dataService.updateGoal(goalId, true, completedAt);
            setTasks((prev) => sortTasks(prev.map((task) =>
                task.id === goalId ? { ...task, completed: true, completedAt } : task
            )));
            if (associatedGoalId === goalId) {
                setAssociatedGoal(null, null);
            }
        } catch (error) {
            console.error("Complete Ekagra task from session error:", error);
        }
    }, [associatedGoalId, setAssociatedGoal, status, user?.id]);

    const handleCreateSessionFromOverlay = useCallback(async (title: string) => {
        await handleManualTaskAdd(title);
    }, [handleManualTaskAdd]);

    const handleOpenSessionOverlay = useCallback(() => {
        setIsTasksOpen(false);
        setSessionOverlayTrigger((value) => value + 1);
    }, []);

    const handlePauseLiveSession = useCallback(async () => {
        const runtimeSessionId = runtimeSessionIdRef.current || runtimeActiveSessionId;
        if (runtimeSessionId && status === "authenticated" && user?.id) {
            try {
                await dataService.updateEkagraSession(runtimeSessionId, {
                    status: "paused",
                    mode: "Timer",
                    totalSeconds: Math.max(1, totalSeconds),
                    remainingSeconds: Math.max(0, remainingSeconds),
                    isRunning: false,
                });
                setRuntimeActiveSessionId(null);
                await refreshRuntimeSessions();
            } catch (error) {
                console.error("Pause Ekagra session error:", error);
            }
        }

        if (isRunning) {
            toggleTimer();
        }
    }, [isRunning, refreshRuntimeSessions, remainingSeconds, runtimeActiveSessionId, status, toggleTimer, totalSeconds, user?.id]);

    const handleResumeSession = useCallback(async (sessionId: string) => {
        if (status !== "authenticated" || !user?.id) return;

        const session = runtimeSessions.find((entry) => entry.id === sessionId);
        if (!session) return;

        const goalId = String(session.goalId || (session as any).goal_id || "").trim();
        const goalTitle = String(session.goalTitle || (session as any).goal_title || "").trim();
        const sessionTitle = String(session.sessionTitle || (session as any).session_title || goalTitle || "").trim();
        const sessionType = String(session.sessionType || (session as any).session_type || "").toLowerCase();
        const isNamedSession = sessionType === "named" || goalId.startsWith("named:");
        const nextTotalSeconds = Math.max(1, Number(session.totalSeconds ?? (session as any).total_seconds ?? totalSeconds));
        const nextRemainingSeconds = Math.max(0, Math.min(nextTotalSeconds, Number(session.remainingSeconds ?? (session as any).remaining_seconds ?? nextTotalSeconds)));

        if (!isNamedSession && (!goalId || !goalTitle)) return;
        if (isNamedSession && !sessionTitle) return;

        try {
            const resumed = await dataService.updateEkagraSession(sessionId, {
                status: "active",
                mode: "Timer",
                totalSeconds: nextTotalSeconds,
                remainingSeconds: nextRemainingSeconds,
                isRunning: true,
                sessionStartedAt: session.sessionStartedAt || (session as any).session_started_at || null,
                goalTitle: isNamedSession ? sessionTitle : goalTitle,
                source: String(session.source || "").toLowerCase() === "imported"
                    ? "imported"
                    : isNamedSession
                        ? "manual"
                        : "goal_continue",
                importedFromGoal: Boolean(session.importedFromGoal || (session as any).imported_from_goal),
            });

            if (isNamedSession) {
                setAssociatedGoal(null, null);
            } else {
                setAssociatedGoal(goalId, goalTitle);
            }
            applyRuntimeSnapshot({
                mode: "Timer",
                totalSeconds: nextTotalSeconds,
                remainingSeconds: nextRemainingSeconds,
                isRunning: false,
                associatedGoalId: isNamedSession ? null : goalId,
                associatedGoalTitle: isNamedSession ? null : goalTitle,
                sessionStartedAt: session.sessionStartedAt || (session as any).session_started_at || null,
            });

            runtimeSessionIdRef.current = resumed.id;
            setRuntimeActiveSessionId(resumed.id);
            toggleTimer();
            await refreshRuntimeSessions();
        } catch (error) {
            try {
                const normalizedSource = String(session.source || "").toLowerCase();
                const source = normalizedSource === "imported"
                    ? "imported"
                    : isNamedSession
                        ? "manual"
                        : "goal_continue";
                const activated = await dataService.activateEkagraSession({
                    ...(isNamedSession
                        ? { sessionType: "named" as const, sessionTitle }
                        : { goalId, goalTitle }),
                    source,
                    importedFromGoal: Boolean(session.importedFromGoal || (session as any).imported_from_goal),
                    overrideActive: true,
                    mode: "Timer",
                    totalSeconds: nextTotalSeconds,
                    remainingSeconds: nextRemainingSeconds,
                    isRunning: true,
                    sessionStartedAt: session.sessionStartedAt || (session as any).session_started_at || null,
                });
                runtimeSessionIdRef.current = activated.id;
                setRuntimeActiveSessionId(activated.id);
                toggleTimer();
                await refreshRuntimeSessions();
            } catch (resumeError) {
                console.error("Resume Ekagra session error:", resumeError);
            }
        }
    }, [applyRuntimeSnapshot, refreshRuntimeSessions, runtimeSessions, setAssociatedGoal, status, toggleTimer, totalSeconds, user?.id]);

    const handleDiscardSession = useCallback(async (sessionId: string) => {
        if (status !== "authenticated" || !user?.id) return;

        try {
            await dataService.discardEkagraSession(sessionId);
            if ((runtimeSessionIdRef.current || runtimeActiveSessionId) === sessionId) {
                runtimeSessionIdRef.current = null;
                setRuntimeActiveSessionId(null);
                if (isRunning) {
                    toggleTimer();
                }
            }
            await refreshRuntimeSessions();
        } catch (error) {
            console.error("Discard Ekagra session error:", error);
        }
    }, [isRunning, refreshRuntimeSessions, runtimeActiveSessionId, status, toggleTimer, user?.id]);

    const handleDeleteSession = useCallback(async (sessionId: string) => {
        if (status !== "authenticated" || !user?.id) return;

        try {
            if (sessionId.startsWith("planned-imported-")) {
                const goalId = sessionId.slice("planned-imported-".length).trim();
                if (goalId) {
                    await dataService.revertImportedGoalFromEkagra(goalId);
                    const refreshedGoals = await dataService.getGoals();
                    setTasks(extractEkagraTasks(refreshedGoals));
                }
                return;
            }

            const wasRuntimeSession = (runtimeSessionIdRef.current || runtimeActiveSessionId) === sessionId;
            await dataService.deleteEkagraSession(sessionId);
            if (wasRuntimeSession) {
                runtimeSessionIdRef.current = null;
                setRuntimeActiveSessionId(null);
                if (isRunning) {
                    toggleTimer();
                }
            }
            if (associatedGoalId && wasRuntimeSession) {
                setAssociatedGoal(null, null);
            }
            await refreshRuntimeSessions();
        } catch (error) {
            console.error("Delete Ekagra session error:", error);
        }
    }, [associatedGoalId, isRunning, refreshRuntimeSessions, runtimeActiveSessionId, status, toggleTimer, user?.id]);

    const handleSwitchLiveSession = useCallback(() => {
        if (!currentTask) {
            setIsTasksOpen(true);
            return;
        }
        if (!isRunning && mode === "Timer") {
            toggleTimer();
        }
    }, [currentTask, isRunning, mode, toggleTimer]);

    const handleSelectPlannedSessionGoal = useCallback(async (goalId: string, goalTitle: string) => {
        const safeGoalId = String(goalId || "").trim();
        if (!safeGoalId) return;

        const taskTitle = tasks.find((task) => task.id === safeGoalId)?.text || "";
        const safeGoalTitle = String(goalTitle || taskTitle || "").trim() || null;

        setAssociatedGoal(safeGoalId, safeGoalTitle);
        if (mode !== "Timer") {
            setMode("Timer");
        }
    }, [mode, setAssociatedGoal, setMode, tasks]);

    const handleStartNamedSession = useCallback(async (title: string) => {
        const sessionTitle = String(title || "").trim();
        if (!sessionTitle || status !== "authenticated" || !user?.id) return;

        try {
            const activated = await dataService.activateEkagraSession({
                sessionType: "named",
                sessionTitle,
                source: "manual",
                overrideActive: true,
                mode: "Timer",
                totalSeconds: Math.max(1, totalSeconds),
                remainingSeconds: Math.max(0, remainingSeconds),
                isRunning: true,
                sessionStartedAt: new Date().toISOString(),
            });
            runtimeSessionIdRef.current = activated.id;
            setRuntimeActiveSessionId(activated.id);
            setAssociatedGoal(null, null);
            await refreshRuntimeSessions();
            toggleTimer();
        } catch (error) {
            console.error("Activate named Ekagra session error:", error);
        }
    }, [refreshRuntimeSessions, remainingSeconds, setAssociatedGoal, status, toggleTimer, totalSeconds, user?.id]);

    const handleToggleTimer = useCallback(async () => {
        if (mode !== "Timer" || status !== "authenticated" || !user?.id) {
            toggleTimer();
            return;
        }

        const runtimeSessionId = runtimeSessionIdRef.current || runtimeActiveSessionId;
        const baseTask = currentTask || linkedGoalTask;
        const goalId = associatedGoalId || baseTask?.id;
        const goalTitle = associatedGoalTitle || baseTask?.text;
        const importedFromGoal = Boolean(baseTask?.importedFromGoal || linkedGoalTask?.importedFromGoal);

        if (isRunning) {
            toggleTimer();
            if (!runtimeSessionId) return;

            try {
                await dataService.updateEkagraSession(runtimeSessionId, {
                    status: "paused",
                    mode: "Timer",
                    totalSeconds: Math.max(1, totalSeconds),
                    remainingSeconds: Math.max(0, remainingSeconds),
                    isRunning: false,
                });
                setRuntimeActiveSessionId(null);
                await refreshRuntimeSessions();
            } catch (error) {
                console.error("Pause runtime Ekagra session error:", error);
            }
            return;
        }

        if (!goalId || !goalTitle) {
            setNamedSessionTitleInput("");
            setShowNamedSessionPrompt(true);
            return;
        }

        try {
            const activated = await dataService.activateEkagraSession({
                goalId: String(goalId),
                goalTitle: String(goalTitle),
                source: importedFromGoal ? "imported" : "goal_continue",
                importedFromGoal,
                overrideActive: true,
                mode: "Timer",
                totalSeconds: Math.max(1, totalSeconds),
                remainingSeconds: Math.max(0, remainingSeconds),
                isRunning: true,
                sessionStartedAt: new Date().toISOString(),
            });
            runtimeSessionIdRef.current = activated.id;
            setRuntimeActiveSessionId(activated.id);
            await refreshRuntimeSessions();
        } catch (error) {
            console.error("Activate runtime Ekagra session error:", error);
        }

        toggleTimer();
    }, [associatedGoalId, associatedGoalTitle, currentTask, isRunning, linkedGoalTask, mode, refreshRuntimeSessions, remainingSeconds, runtimeActiveSessionId, status, toggleTimer, totalSeconds, user?.id]);

    const handleConfirmNamedSession = useCallback(async () => {
        const title = namedSessionTitleInput.trim();
        if (!title) return;
        setShowNamedSessionPrompt(false);
        setNamedSessionTitleInput("");
        await handleStartNamedSession(title);
    }, [handleStartNamedSession, namedSessionTitleInput]);

    const handleCancelNamedSession = useCallback(() => {
        setShowNamedSessionPrompt(false);
        setNamedSessionTitleInput("");
    }, []);

    const liveSessionPreview = useMemo<EkagraModeSession | null>(() => {
        if (status === "authenticated" && user?.id) return null;
        if (mode !== "Timer") return null;

        const baseTask = currentTask || linkedGoalTask;
        const goalId = associatedGoalId || baseTask?.id;
        const goalTitle = associatedGoalTitle || baseTask?.text;
        if (!goalId || !goalTitle) return null;

        const importedFromGoal = Boolean(baseTask?.importedFromGoal || linkedGoalTask?.importedFromGoal);
        const nowIso = new Date().toISOString();

        return {
            id: "live-runtime-session",
            userId: user?.id || "local",
            goalId: String(goalId),
            goalTitle: String(goalTitle),
            source: importedFromGoal ? "imported" : "manual",
            status: isRunning ? "active" : "paused",
            mode: "Timer",
            totalSeconds: Math.max(1, totalSeconds),
            remainingSeconds: Math.max(0, remainingSeconds),
            isRunning,
            importedFromGoal,
            pauseCount: 0,
            sessionStartedAt: null,
            createdAt: nowIso,
            updatedAt: nowIso,
            completedAt: null,
            endedAt: null,
            discardedAt: null,
        };
    }, [
        mode,
        awaitingProceed,
        currentTask,
        linkedGoalTask,
        associatedGoalId,
        associatedGoalTitle,
        isRunning,
        totalSeconds,
        remainingSeconds,
        user?.id,
    ]);

    const handleVolumeChange = (newVolume: number) => {
        setMusicVolume(newVolume);
    };

    const handleMusicTrackChange = (nextTrackId: string) => {
        setSelectedMusicTrackId(nextTrackId);
        try {
            localStorage.setItem(MUSIC_TRACK_STORAGE_KEY, nextTrackId);
        } catch {
            // Ignore storage failures.
        }
    };

    // Keep global music source aligned with the user's selected music track.
    useEffect(() => {
        setMusicSource(selectedMusicTrack.url);
    }, [selectedMusicTrack.url, setMusicSource]);

    // Update video source when theme changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.src = currentTheme.videoUrl;
        }
    }, [currentTheme]);

    return (
        <div
            className="flex min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-background text-foreground font-sans transition-colors duration-300 relative"
            style={{ '--theme-accent': currentTheme.accent, '--theme-accent-rgb': currentTheme.accentRgb } as React.CSSProperties}
        >
            {/* Video Background */}
            <div className="fixed inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    src={currentTheme.videoUrl}
                >
                    <source src={currentTheme.videoUrl} type="video/mp4" />
                </video>
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
            </div>

            {/* Sidebar */}
            {!showAnalytics && (
                <aside
                    className={`hidden lg:flex flex-col border-r bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'
                        }`}
                >
                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-12 bg-white dark:bg-slate-800 border border-border rounded-r-lg flex items-center justify-center hover:bg-muted transition-colors shadow-md"
                    >
                        {isSidebarCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>

                    <div className={`p-4 ${isSidebarCollapsed ? 'px-2' : 'p-6'}`}>
                        {/* Logo */}
                        <div className="flex items-center gap-2 mb-8">
                            {!isSidebarCollapsed && (
                                <button
                                    onClick={() => navigate("/home")}
                                    className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                                    title="Back to Home"
                                >
                                    <Home className="w-5 h-5" style={{ color: currentTheme.accent }} />
                                    <span
                                        className="text-lg font-bold"
                                        style={{ color: currentTheme.accent }}
                                    >
                                        Home
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="space-y-2 flex-1">






                            {/* Global Navigation Section */}
                            {!isSidebarCollapsed && (
                                <div className="pt-4 pb-2">
                                    <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Navigation</p>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => navigate("/dashboard")}
                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-all group"
                                        >
                                            <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                                            <span className="text-sm font-medium">Dashboard</span>
                                        </button>
                                        <button
                                            onClick={() => navigate("/nishtha/check-in")}
                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-all group"
                                        >
                                            <Heart className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium">Nishtha</span>
                                        </button>
                                        <button
                                            onClick={() => navigate("/mehfil")}
                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-all group"
                                        >
                                            <MessageSquare className="w-4 h-4 text-cyan-500" />
                                            <span className="text-sm font-medium">Mehfil</span>
                                        </button>
                                        <button
                                            onClick={() => navigate("/meditation")}
                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-all group"
                                        >
                                            <Wind className="w-4 h-4 text-teal-500" />
                                            <span className="text-sm font-medium">Dhyan</span>
                                        </button>
                                        <button
                                            onClick={() => navigate("/courses")}
                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-all group"
                                        >
                                            <Shield className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium">Courses</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Theme Selector */}
                            <button
                                data-tour="theme-button"
                                onClick={() => setShowThemeSelector(!showThemeSelector)}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group ${isSidebarCollapsed ? 'justify-center' : ''}`}
                                title="Change Theme"
                            >
                                <Palette className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: currentTheme.accent }} />
                                {!isSidebarCollapsed && <span className="font-medium">Theme</span>}
                            </button>

                            {/* Music Selector Button */}
                            <button
                                onClick={() => setShowMusicSelector(true)}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group ${isSidebarCollapsed ? 'justify-center' : ''}`}
                                title="Change Music Track"
                            >
                                <Music className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: currentTheme.accent }} />
                                {!isSidebarCollapsed && <span className="font-medium">Music Track</span>}
                            </button>
                        </div>

                        {/* Timer Duration Slider */}
                        {!isSidebarCollapsed && (
                            <div data-tour="duration-slider" className="pt-6 border-t border-border/50 mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timer Duration</span>
                                    <span
                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: `${currentTheme.accent}20`, color: currentTheme.accent }}
                                    >
                                        {sliderValue} min
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={TIMER_MINUTES_MIN}
                                    max={TIMER_SLIDER_MAX}
                                    step={TIMER_STEP_MINUTES}
                                    value={timerSliderValue}
                                    onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                    style={{ accentColor: currentTheme.accent }}
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                                    <span>{TIMER_MINUTES_MIN}M</span>
                                    <span>60M</span>
                                    <span>{TIMER_SLIDER_MAX}M</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="Enter minutes"
                                        value={customTimerInput}
                                        onChange={(e) => handleCustomTimerInputChange(e.target.value)}
                                        onKeyDown={(e) => handleCustomTimerInputKeyDown(e.key)}
                                        className="min-w-0 flex-1 h-9 text-sm bg-muted px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 outline-none dark:bg-gray-800 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyCustomTimer}
                                        className="shrink-0 whitespace-nowrap h-9 text-sm font-semibold px-3 rounded-md bg-muted hover:bg-muted/80"
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Break Duration Slider */}
                        {!isSidebarCollapsed && (
                            <div className="pt-6 border-t border-border/50 mt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Set Break</span>
                                    <span
                                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: `${currentTheme.accent}20`, color: currentTheme.accent }}
                                    >
                                        {breakSliderValue} min
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={BREAK_MINUTES_MIN}
                                    max={BREAK_MAX_MINUTES}
                                    step={BREAK_STEP_MINUTES}
                                    value={breakSliderValue}
                                    onChange={(e) => handleBreakSliderChange(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                    style={{ accentColor: currentTheme.accent }}
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                                    <span>{BREAK_MINUTES_MIN}M</span>
                                    <span>{Math.floor(BREAK_MAX_MINUTES / 2)}M</span>
                                    <span>{BREAK_MAX_MINUTES}M</span>
                                </div>
                            </div>
                        )}

                    </div>
                </aside>
            )}

            {/* Theme Selector Popup */}
            {showThemeSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">Choose Visual Theme</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {focusThemes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleThemeChange(t)}
                                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${currentTheme.id === t.id
                                        ? 'border-current shadow-lg'
                                        : 'border-transparent bg-muted/50 hover:bg-muted'
                                        }`}
                                    style={{ borderColor: currentTheme.id === t.id ? t.accent : undefined }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                        style={{ backgroundColor: t.accent }}
                                    >
                                        {t.icon}
                                    </div>
                                    <span className="font-medium">{t.name}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowThemeSelector(false)}
                            className="mt-4 w-full py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Music Selector Popup */}
            {showMusicSelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Choose Music Track</h3>
                            <button 
                                onClick={() => setShowMusicSelector(false)}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {focusMusicTracks.map((track) => (
                                <button
                                    key={track.id}
                                    onClick={() => {
                                        handleMusicTrackChange(track.id);
                                        setShowMusicSelector(false);
                                    }}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-center ${selectedMusicTrackId === track.id
                                        ? 'border-current shadow-lg bg-muted/30'
                                        : 'border-transparent bg-muted/50 hover:bg-muted'
                                        }`}
                                    style={{ borderColor: selectedMusicTrackId === track.id ? currentTheme.accent : undefined }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                                        style={{ backgroundColor: currentTheme.accent }}
                                    >
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-sm">{track.name}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowMusicSelector(false)}
                            className="mt-6 w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <Dialog
                open={showNamedSessionPrompt}
                onOpenChange={(open) => {
                    if (!open) handleCancelNamedSession();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Name this session</DialogTitle>
                        <DialogDescription>
                            Add a title so you can recognize it later in Ekagra history.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={namedSessionTitleInput}
                            onChange={(e) => setNamedSessionTitleInput(e.target.value)}
                            placeholder="e.g., Read Maths"
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelNamedSession}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmNamedSession} disabled={!namedSessionTitleInput.trim()}>
                            Start Session
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Next Task Duration Prompt */}
            <Dialog
                open={showDurationPrompt}
                onOpenChange={(open) => {
                    setShowDurationPrompt(open);
                    if (!open) setNextDurationInput("");
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Timer Duration</DialogTitle>
                        <DialogDescription>
                            Choose the focus duration for your next task.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={nextDurationInput}
                            onChange={(e) => handleNextDurationChange(e.target.value)}
                            placeholder={`${TIMER_MINUTES_MIN} minutes`}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={cancelNextDuration}>
                            Cancel
                        </Button>
                        <Button onClick={confirmNextDuration} disabled={!nextDurationInput.trim()}>
                            Set Timer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>



            {/* Tasks Sidebar */}
            <TasksSidebar
                isOpen={isTasksOpen}
                onClose={() => setIsTasksOpen(false)}
                tasks={tasks}
                onTasksChange={persistTasks}
                sessions={runtimeSessions}
                activeSessionId={runtimeActiveSessionId}
                liveSessionPreview={liveSessionPreview}
                onResumeSession={handleResumeSession}
                onDiscardSession={handleDiscardSession}
                onDeleteSession={handleDeleteSession}
                onCompleteSessionGoal={handleCompleteSessionGoal}
                onPauseLiveSession={handlePauseLiveSession}
                onCompleteLiveSession={handleCompleteCurrentTask}
                onSwitchLiveSession={handleSwitchLiveSession}
                onSelectPlannedSessionGoal={handleSelectPlannedSessionGoal}
                onCreateSession={handleCreateSessionFromOverlay}
                sessionOverlayTrigger={sessionOverlayTrigger}
            />

            {/* Main Content or Analytics */}
            {showAnalytics ? (
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 relative z-30 flex flex-col items-center justify-center p-4">
                    <FocusAnalytics onBack={() => setShowAnalytics(false)} />
                </div>
            ) : (
                <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 pt-24 sm:pt-4 min-h-full pb-32 landscape:pb-24">
                    {associatedGoalId && associatedGoalTitle && (
                        <div className="w-full max-w-2xl mb-4 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-white backdrop-blur-md shadow-lg">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Linked Goal</div>
                                        {linkedGoalTask?.importedFromGoal && (
                                            <span className="inline-flex items-center rounded-full border border-emerald-200/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                                                Imported from Goals
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                                        <Target className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{associatedGoalTitle}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleUnlinkGoal}
                                    className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                                >
                                    Unlink
                                </button>
                            </div>
                        </div>
                    )}
                    {!associatedGoalId && activeRuntimeSessionType === "named" && activeRuntimeSessionTitle && (
                        <div className="w-full max-w-2xl mb-4 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 text-white backdrop-blur-md shadow-lg">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Named Session</div>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                                        <Target className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{activeRuntimeSessionTitle}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Timer Card */}
                    <TimerCard
                        minutes={minutes}
                        seconds={seconds}
                        isRunning={isRunning}
                        mode={mode}
                        currentTheme={currentTheme}
                        onToggle={handleToggleTimer}
                        onReset={handleResetTimer}
                        onTogglePiP={togglePiP}
                        onSetMode={handleModeChange}
                        isPiPActive={isPiPActive}
                    />

                    {/* Progress Section */}
                    <div className="w-full max-w-lg mt-16 relative">
                        <div className="text-center mb-8 text-base font-semibold tracking-wide text-white/80 uppercase">
                            {isRunning ? "Stay focused, you're doing great!" : "Ready to focus?"}
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-4 bg-white/20 rounded-full backdrop-blur-sm shadow-inner overflow-visible z-10">
                            <div
                                className="absolute left-0 top-0 h-full rounded-l-full transition-all duration-1000"
                                style={{
                                    width: `${progress}%`,
                                    backgroundColor: currentTheme.accent,
                                    boxShadow: progress > 0 ? `0 0 20px ${currentTheme.accent}80` : "none",
                                }}
                            />

                            {/* Ladybug Indicator */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-1000"
                                style={{ left: `${Math.min(progress, 98)}%` }}
                            >
                                <div
                                    className="relative -ml-4 w-10 h-8 cursor-pointer group transform transition-transform hover:scale-110"
                                    title="Keep going!"
                                    style={{
                                        animation: isRunning ? "crawl 2s infinite ease-in-out" : "none",
                                    }}
                                >
                                    {/* Ladybug */}
                                    <div className="w-8 h-8 bg-red-500 rounded-full relative shadow-lg">
                                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-black rounded-full" />
                                        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-black rounded-full" />
                                        <div className="absolute top-1.5 right-2.5 w-1.5 h-1.5 bg-black rounded-full" />
                                        <div className="absolute bottom-1.5 left-2 w-1.5 h-1.5 bg-black rounded-full" />
                                        <div className="absolute bottom-1.5 right-3 w-1.5 h-1.5 bg-black rounded-full" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
                                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/30 -translate-x-1/2" />
                                        <div className="absolute -right-2 top-0 w-2 h-2 border-t-2 border-r-2 border-black rounded-tr-lg -rotate-12" />
                                        <div className="absolute -right-2 bottom-0 w-2 h-2 border-b-2 border-r-2 border-black rounded-br-lg rotate-12" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Checkpoints */}
                        <div className="mt-3 flex items-end justify-between px-1 text-[10px] font-semibold text-white/60">
                            {[25, 50, 75, 100].map((point) => (
                                <div key={point} className="flex flex-col items-center gap-1">
                                    <span className="h-2 w-px bg-white/30" />
                                    <span>{point}%</span>
                                </div>
                            ))}
                        </div>

                        {/* Growth Icons */}
                        <div className="flex justify-between mt-4 px-1 opacity-40">
                            <Leaf className="w-4 h-4" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-5 h-5 -mt-1" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-6 h-6 -mt-2" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-5 h-5 -mt-1" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-4 h-4" style={{ color: currentTheme.accent }} />
                        </div>
                    </div>


                </main>
            )}

            {/* Mobile Drawer */}
            <MobileDrawer
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                title="Focus Menu"
                className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl"
            >
                <div className="flex flex-col gap-6 p-4">
                    {/* Navigation */}
                    <div className="space-y-2">
                        <button
                            onClick={() => {
                                setIsTasksOpen(true);
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all font-medium"
                        >
                            <History className="w-5 h-5" style={{ color: currentTheme.accent }} />
                            <span>History</span>
                        </button>
                        <button
                            onClick={() => navigate("/home")}
                            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all font-medium"
                        >
                            <Home className="w-5 h-5" style={{ color: currentTheme.accent }} />
                            Back to Home
                        </button>

                        <div className="pt-2 pb-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Apps</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => navigate("/dashboard")}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all"
                                >
                                    <LayoutDashboard className="w-6 h-6 text-indigo-500" />
                                    <span className="text-xs font-bold">Dashboard</span>
                                </button>
                                <button
                                    onClick={() => navigate("/nishtha/check-in")}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all"
                                >
                                    <Heart className="w-6 h-6 text-emerald-500" />
                                    <span className="text-xs font-bold">Nishtha</span>
                                </button>
                                <button
                                    onClick={() => navigate("/mehfil")}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all"
                                >
                                    <MessageSquare className="w-6 h-6 text-cyan-500" />
                                    <span className="text-xs font-bold">Mehfil</span>
                                </button>
                                <button
                                    onClick={() => navigate("/meditation")}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all"
                                >
                                    <Wind className="w-6 h-6 text-teal-500" />
                                    <span className="text-xs font-bold">Dhyan</span>
                                </button>
                                <button
                                    onClick={() => navigate("/courses")}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all"
                                >
                                    <Shield className="w-6 h-6 text-emerald-500" />
                                    <span className="text-xs font-bold">Courses</span>
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowThemeSelector(true);
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all font-medium"
                        >
                            <Palette className="w-5 h-5" style={{ color: currentTheme.accent }} />
                            Change Theme
                        </button>
                        <button
                            onClick={() => {
                                setShowMusicSelector(true);
                                setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all font-medium"
                        >
                            <Music className="w-5 h-5" style={{ color: currentTheme.accent }} />
                            <span>Music Track</span>
                        </button>
                    </div>

                    {/* Timer Settings */}
                    <div className="space-y-6 pt-6 border-t border-border/50">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-muted-foreground uppercase">Timer Duration</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                                    {sliderValue} min
                                </span>
                            </div>
                            <input
                                type="range"
                                min={TIMER_MINUTES_MIN}
                                max={TIMER_SLIDER_MAX}
                                step={TIMER_STEP_MINUTES}
                                value={timerSliderValue}
                                onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: currentTheme.accent }}
                            />
                            <div className="mt-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter minutes"
                                    value={customTimerInput}
                                    onChange={(e) => handleCustomTimerInputChange(e.target.value)}
                                    onKeyDown={(e) => handleCustomTimerInputKeyDown(e.key)}
                                    className="min-w-0 flex-1 h-9 text-sm bg-muted px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 outline-none dark:bg-gray-800 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={applyCustomTimer}
                                    className="shrink-0 whitespace-nowrap h-9 text-sm font-semibold px-3 rounded-md bg-muted hover:bg-muted/80"
                                >
                                    Set
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-muted-foreground uppercase">Break Duration</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                                    {breakSliderValue} min
                                </span>
                            </div>
                            <input
                                type="range"
                                min={BREAK_MINUTES_MIN}
                                max={BREAK_MAX_MINUTES}
                                step={BREAK_STEP_MINUTES}
                                value={breakSliderValue}
                                onChange={(e) => handleBreakSliderChange(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: currentTheme.accent }}
                            />
                        </div>
                    </div>


                </div>
            </MobileDrawer>

            {/* Premium Floating Toolbar */}
            <div className={`fixed top-6 right-4 sm:right-8 z-[60] flex items-center p-1.5 rounded-full backdrop-blur-2xl border transition-all duration-500 shadow-2xl ${
                showAnalytics 
                ? "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-white/10" 
                : "bg-white/10 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            }`}>
                <div className="flex items-center gap-1.5 px-1">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className={`lg:hidden flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                            showAnalytics
                                ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                : "hover:bg-white/10 text-white"
                        }`}
                        title="Open Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* History Button */}
                    <button
                        onClick={() => setIsTasksOpen(true)}
                        className={`flex items-center gap-2 h-10 px-4 rounded-full transition-all group ${
                            showAnalytics 
                            ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200" 
                            : "hover:bg-white/10 text-white"
                        }`}
                        title="Session History"
                    >
                        <History className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">History</span>
                    </button>

                    <button
                        onClick={handleOpenSessionOverlay}
                        className={`flex items-center gap-2 h-10 px-4 rounded-full transition-all group ${
                            showAnalytics
                                ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                : "hover:bg-white/10 text-white"
                        }`}
                        title="Focus Sessions"
                    >
                        <Layers3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Sessions</span>
                    </button>

                    <button
                        onClick={() => setShowEkagraGuide(true)}
                        className={`flex items-center gap-2 h-10 px-4 rounded-full transition-all group ${
                            showAnalytics
                                ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                                : "hover:bg-white/10 text-white"
                        }`}
                        title="Ekagra Usage Guide"
                    >
                        <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:inline">Guide</span>
                    </button>

                    <div className={`w-px h-4 mx-1 ${showAnalytics ? "bg-slate-300 dark:bg-slate-700" : "bg-slate-900/20 dark:bg-white/20"}`} />

                    {/* Theme Toggle */}
                    <ThemeToggle 
                        className={`!w-10 !h-10 flex items-center justify-center !rounded-full transition-all ${
                            showAnalytics 
                            ? "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200" 
                            : "hover:bg-white/10 text-white"
                        }`} 
                    />

                    {/* Music Control Pill */}
                    <div className={`flex items-center gap-1 h-10 px-2 rounded-full transition-all ${
                        showAnalytics 
                        ? "bg-slate-100 dark:bg-slate-800/40" 
                        : "bg-white/5 border border-white/10 backdrop-blur-md"
                    }`}>
                        <button
                            onClick={toggleMusic}
                            className={`p-1.5 rounded-full transition-all ${showAnalytics ? "hover:bg-slate-200 dark:hover:bg-slate-700" : "hover:bg-slate-900/10 dark:hover:bg-white/10"}`}
                            style={{ color: isMusicPlaying ? currentTheme.accent : 'inherit' }}
                            title={isMusicPlaying ? "Pause Music" : "Play Music"}
                        >
                            {isMusicPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Music className="w-3.5 h-3.5" />}
                        </button>
                        
                        <div className="flex items-center gap-2 relative">
                             <button
                                onClick={toggleMusicMuted}
                                className={`p-1.5 rounded-full transition-colors shrink-0 ${showAnalytics ? "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700" : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/10 dark:hover:bg-white/10"}`}
                                title={isMusicMuted ? "Unmute" : "Mute"}
                            >
                                {isMusicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={musicVolume}
                                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                className={`w-16 sm:w-20 md:w-24 h-1.5 rounded-full appearance-none cursor-pointer ${
                                    showAnalytics ? "bg-slate-300" : "bg-white/20"
                                } accent-white focus:outline-none`}
                                title="Music Volume"
                            />
                        </div>
                    </div>

                    {/* Analytics Toggle */}
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`hidden sm:flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                            showAnalytics 
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                            : "hover:bg-white/10 text-white"
                        }`}
                        title={showAnalytics ? "Return to Timer" : "View Analytics"}
                    >
                        {showAnalytics ? <LayoutDashboard className="w-4 h-4" /> : <BarChart2 className="w-4 h-4" />}
                    </button>

                    {/* Profile Avatar with Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="relative group outline-none ml-1">
                                <div className={`p-0.5 rounded-full border-2 transition-all group-hover:scale-105 group-active:scale-95 ${
                                    showAnalytics ? "border-slate-200 dark:border-slate-800" : "border-white/20"
                                }`}>
                                    <Avatar className="h-8 w-8 rounded-full shadow-lg">
                                        <AvatarImage src={user?.avatar} className="rounded-full" />
                                        <AvatarFallback className="rounded-full text-white font-black text-[10px]" style={{ backgroundColor: currentTheme.accent }}>
                                            {user?.name ? user.name[0].toUpperCase() : 'G'}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                {isMusicPlaying && (
                                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: currentTheme.accent }}></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: currentTheme.accent }}></span>
                                    </span>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl backdrop-blur-xl border-white/20">
                            <div className="px-3 py-3 mb-2 flex items-center gap-3 bg-muted/40 rounded-xl">
                                <Avatar className="h-10 w-10 border border-white/20">
                                    <AvatarImage src={user?.avatar} />
                                    <AvatarFallback style={{ backgroundColor: currentTheme.accent }}>{user?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{user?.name || 'Guest'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">SSC Aspirant</p>
                                </div>
                            </div>
                            <DropdownMenuSeparator className="opacity-50" />
                            <DropdownMenuItem onClick={handleProfile} className="cursor-pointer gap-2.5 p-3 rounded-lg hover:bg-muted font-medium">
                                <Settings className="w-4 h-4 opacity-70" />
                                <span>Profile Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="opacity-50" />
                            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2.5 p-3 rounded-lg text-destructive hover:bg-destructive/10 font-medium">
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {showEkagraGuide && (
                <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-3xl max-h-[85dvh] rounded-3xl border border-white/20 bg-slate-900/95 text-white shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold">Ekagra Mode Detailed Guide</h2>
                                <p className="text-xs text-white/70 mt-1">Har major control ka kaam aur practical usage steps.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowEkagraGuide(false)}
                                className="p-2 rounded-lg hover:bg-white/10"
                                title="Close guide"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-sm leading-relaxed">
                            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-white/90">
                                <h3 className="text-sm font-bold mb-2">What changed (quick recap)</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Sessions list ab Analytics tab me move ho gayi hai.</li>
                                    <li>End Session par session completed mark hota hai.</li>
                                    <li>Delete session se instantly clean-up hota hai.</li>
                                    <li>Linked goal banner end/delete ke baad auto clear hota hai.</li>
                                </ul>
                            </div>
                            <section className="space-y-2">
                                <h3 className="font-bold text-base">1. Session start kaise karein</h3>
                                <ol className="list-decimal pl-5 space-y-1 text-white/90">
                                    <li>Goal card se Start Focus dabao ya yahan manual task add karo.</li>
                                    <li>Timer duration set karo (slider ya custom input).</li>
                                    <li>Play dabao — Running session start ho jayega.</li>
                                </ol>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-base">2. Timer controls ka meaning</h3>
                                <ul className="list-disc pl-5 space-y-1 text-white/90">
                                    <li><strong>Play/Pause</strong>: session ko run ya hold karta hai.</li>
                                    <li><strong>Reset</strong>: current timer cycle ko reset karta hai.</li>
                                    <li><strong>Mode</strong>: Timer, short break, long break select kar sakte ho.</li>
                                    <li><strong>End Session</strong>: session ko close karke completed mark karta hai.</li>
                                    <li><strong>PiP</strong>: timer ko mini floating view me rakhta hai.</li>
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-base">3. Sessions panel (History/Sessions)</h3>
                                <ul className="list-disc pl-5 space-y-1 text-white/90">
                                    <li><strong>Sessions</strong>: Running Now + Paused sessions manage karne ke liye.</li>
                                    <li><strong>Switch</strong>: kisi paused session par wapas jao.</li>
                                    <li><strong>End Session</strong>: session close hota hai aur completed mark hota hai.</li>
                                    <li><strong>Delete</strong>: session ko list se remove karta hai.</li>
                                    <li><strong>History</strong>: overview/snapshot yahan milega; detailed list Analytics tab me hai.</li>
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-base">4. Linked goal behavior</h3>
                                <ul className="list-disc pl-5 space-y-1 text-white/90">
                                    <li>Linked goal top section me visible rahega.</li>
                                    <li>Goal imported ho to badge dikhega.</li>
                                    <li>Unlink button se current timer ko goal se alag kar sakte ho.</li>
                                    <li>End/Delete ke baad linked goal banner auto clear ho jata hai.</li>
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-base">5. Audio + environment controls</h3>
                                <ul className="list-disc pl-5 space-y-1 text-white/90">
                                    <li>Theme button se visual background change hota hai.</li>
                                    <li>Music play/pause aur mute controls quick toolbar me hain.</li>
                                    <li>Volume slider fixed hai, direct adjust kar sakte ho.</li>
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h3 className="font-bold text-base">6. Recommended usage flow</h3>
                                <ol className="list-decimal pl-5 space-y-1 text-white/90">
                                    <li>Goal pick karo ya manual task add karo.</li>
                                    <li>Duration realistic set karo (progress bar ke niche checkpoints follow karo).</li>
                                    <li>Session run karo, interruptions par pause use karo.</li>
                                    <li>End Session par status auto decide hoga — phir Analytics me Session Quality check karo.</li>
                                    <li>Consistency review ke liye Analytics ke Sessions tab pe jao.</li>
                                </ol>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Styles */}
            <style>{`
                @keyframes crawl {
                  0% { transform: translateX(0); }
                  50% { transform: translateX(5px); }
                  100% { transform: translateX(0); }
                }
              `}</style>

            {/* Tour Prompt */}
            <TourPrompt tour={focusTimerTour} featureName="Focus Timer" />
            <PiPNudgeToast />

            <Dialog open={hasPendingResume} onOpenChange={(open) => { if (!open) discardStoredSession(); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Resume your session?</DialogTitle>
                        <DialogDescription>
                            We found an unfinished focus timer from your last page load.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={discardStoredSession}>
                            Start Fresh
                        </Button>
                        <Button onClick={resumeStoredSession}>
                            Resume
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
