import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/utils/authService";
import { FocusAnalytics } from "@/components/focus/FocusAnalytics";
import { Moon, Sun, Plus, Home, Settings, Play, Pause, RotateCcw, Leaf, Sparkles, LogOut, ArrowRight, BarChart2, Clock, Zap, Target, Flame, Calendar, Palette, ChevronLeft, ChevronRight, Trees, Waves, Sunset, MoonStar, Sparkle, HelpCircle, Volume2, VolumeX, Music, LayoutDashboard } from "lucide-react";
import TasksSidebar, { type Task } from "./TasksSidebar";
import { TimerCard } from "@/components/focus/TimerCard";
import { useFocus } from "@/contexts/FocusContext";
import { focusService } from "@/utils/focusService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ui/theme-toggle";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { focusTimerTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import MobileDrawer from "@/components/ui/mobile-drawer";
import { Menu } from "lucide-react";

// Theme configuration
interface FocusTheme {
    id: string;
    name: string;
    accent: string;
    accentRgb: string;
    gradient: string;
    icon: React.ReactNode;
    videoUrl: string;
    musicUrl: string;
}

const focusThemes: FocusTheme[] = [


    {
        id: "serene",
        name: "Serene",
        accent: "#1b8ec3ff",
        accentRgb: "27, 142, 195",
        gradient: "linear-gradient(135deg, #0a4d68 0%, #1b8ec3 50%, #88d4f5 100%)",
        icon: <Waves className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_2.mp4",
        musicUrl: "https://del1.vultrobjects.com/qms-images/Safar/music_1.mp3"
    },
    {
        id: "nostalgia",
        name: "Nostalgia",
        accent: "#1cbc31ff",
        accentRgb: "28, 188, 49",
        gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)",
        icon: <Sunset className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_3.mp4",
        musicUrl: "https://del1.vultrobjects.com/qms-images/Safar/relaxingtime-sleep-music-vol16-195422.mp3"
    },
    {
        id: "amber",
        name: "Amber",
        accent: "#2e7144ff",
        accentRgb: "46, 113, 68",
        gradient: "linear-gradient(135deg, #1e3a5f 0%, #2e7144 50%, #4ade80 100%)",
        icon: <MoonStar className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_4.mp4",
        musicUrl: "https://del1.vultrobjects.com/qms-images/Safar/music_2.mp3"
    },
    {
        id: "solitude",
        name: "Solitude",
        accent: "#1c527cff",
        accentRgb: "28, 82, 124",
        gradient: "linear-gradient(135deg, #1c527c 0%, #7c3aed 50%, #ec4899 100%)",
        icon: <Sparkle className="w-4 h-4" />,
        videoUrl: "https://del1.vultrobjects.com/qms-images/Safar/theme_1.mp4",
        musicUrl: "https://del1.vultrobjects.com/qms-images/Safar/music_3.mp3"
    },
];

export default function StudyWithMe() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const {
        timerState,
        toggleTimer,
        resetTimer,
        togglePiP,
        isPiPActive,
        setMode,
        setTimerDuration,
        setBreakDuration
    } = useFocus(); // Use Context

    // Destructure from Context State
    const { minutes, seconds, isRunning, mode, totalSeconds, remainingSeconds } = timerState;

    // Local UI state (not shared)
    const [sliderValue, setSliderValue] = useState(25);
    const [breakSliderValue, setBreakSliderValue] = useState(5);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Sync slider with global state if needed, or just let slider drive global
    useEffect(() => {
        if (mode === 'Timer') setSliderValue(Math.floor(totalSeconds / 60));
        if (mode === 'short') setBreakSliderValue(Math.floor(totalSeconds / 60));
    }, [mode, totalSeconds]);


    // New states for theme and sidebar
    const [currentTheme, setCurrentTheme] = useState<FocusTheme>(focusThemes[0]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);

    // Get current task (first uncompleted)
    const currentTask = tasks.find(task => !task.completed);

    // Audio/Video refs and states
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.5);

    // Deep link handling for analytics
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'analytics') {
            setShowAnalytics(true);
        }
    }, [window.location.search]);

    // Auto-complete task on session end (listening to context state)
    useEffect(() => {
        if (remainingSeconds === 0 && !isRunning && mode === 'Timer') {
            // Auto-complete current task logic
            // Note: Logging is handled by Context
            if (currentTask) {
                const updatedTasks = tasks.map(task =>
                    task.id === currentTask.id ? { ...task, completed: true } : task
                );
                setTasks(updatedTasks);
                localStorage.setItem(user?.id ? `focus-tasks-${user.id}` : 'focus-tasks', JSON.stringify(updatedTasks));
            }
        }
    }, [remainingSeconds, isRunning, mode, currentTask, tasks, user]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await authService.getCurrentUser();
                if (userData?.user) {
                    setUser(userData.user);
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

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
        long: { minutes: 15, label: "Long break" },
    };

    // Removed local timer Effects (handled by FocusContext)

    const handleModeChange = (newMode: "Timer" | "short" | "long") => {
        setMode(newMode);
    };

    const handleSliderChange = (value: number) => {
        setSliderValue(value);
        setTimerDuration(value);
    };

    const handleBreakSliderChange = (value: number) => {
        setBreakSliderValue(value);
        setBreakDuration(value);
    };

    // Removed local toggleTimer, resetTimer, formatTime

    // Derived progress
    const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

    const handleSetTimer = (minutes: number) => {
        setSliderValue(minutes);
        setTimerDuration(minutes);
        setMode("Timer");
        setShowAnalytics(false);
    };

    const handleThemeChange = (newTheme: FocusTheme) => {
        setCurrentTheme(newTheme);
        setShowThemeSelector(false);
        // Stop current audio and reset state when changing theme
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsMusicPlaying(false);
    };

    // Audio control handlers
    const toggleMusic = () => {
        if (audioRef.current) {
            if (isMusicPlaying) {
                audioRef.current.pause();
                setIsMusicPlaying(false);
            } else {
                audioRef.current.play().catch(e => console.error('Audio play error:', e));
                setIsMusicPlaying(true);
            }
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    // Initialize audio volume on mount
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, []);

    // Update audio source when theme changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.src = currentTheme.musicUrl;
            audioRef.current.volume = volume;
            audioRef.current.loop = true;
            if (isMusicPlaying) {
                audioRef.current.play().catch(e => console.error('Audio play error:', e));
            }
        }
    }, [currentTheme, isMusicPlaying, volume]);

    // Update video source when theme changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.src = currentTheme.videoUrl;
        }
    }, [currentTheme]);

    return (
        <div
            className="flex h-[100dvh] overflow-hidden bg-background text-foreground font-sans transition-colors duration-300"
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

            {/* Audio Element */}
            <audio
                ref={audioRef}
                loop
                src={currentTheme.musicUrl}
            />

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
                        <button
                            onClick={() => navigate("/landing")}
                            className={`flex items-center gap-3 mb-8 cursor-pointer group hover:opacity-80 transition-opacity ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            title="Back to Home"
                        >
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105"
                                style={{ backgroundColor: currentTheme.accent }}
                            >
                                <Home className="w-5 h-5" />
                            </div>
                            {!isSidebarCollapsed && (
                                <span
                                    className="text-lg font-bold"
                                    style={{ color: currentTheme.accent }}
                                >
                                    Home
                                </span>
                            )}
                        </button>

                        {/* Navigation */}
                        <div className="space-y-2 flex-1">


                            <button
                                data-tour="add-task"
                                onClick={() => setIsTasksOpen(true)}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group ${isSidebarCollapsed ? 'justify-center' : ''}`}
                                title="Add task"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: currentTheme.accent }} />
                                {!isSidebarCollapsed && <span className="font-medium">Add task</span>}
                            </button>



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
                                    min="5"
                                    max="120"
                                    step="5"
                                    value={sliderValue}
                                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                    style={{ accentColor: currentTheme.accent }}
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                                    <span>5M</span>
                                    <span>60M</span>
                                    <span>120M</span>
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
                                    min="1"
                                    max="30"
                                    step="1"
                                    value={breakSliderValue}
                                    onChange={(e) => handleBreakSliderChange(parseInt(e.target.value))}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                    style={{ accentColor: currentTheme.accent }}
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                                    <span>1M</span>
                                    <span>15M</span>
                                    <span>30M</span>
                                </div>
                            </div>
                        )}

                        {/* Analytics Link */}
                        <div className={`text-sm text-muted-foreground font-semibold mt-6 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                            <button
                                data-tour="analytics-link"
                                onClick={() => setShowAnalytics(true)}
                                className={`flex items-center gap-3 hover:opacity-80 transition-colors ${isSidebarCollapsed ? 'p-3' : ''}`}
                                style={{ color: currentTheme.accent }}
                                title="Analytics"
                            >
                                <BarChart2 className="w-5 h-5" />
                                {!isSidebarCollapsed && <span>Analytics</span>}
                            </button>
                        </div>
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

            {/* Tasks Sidebar */}
            <TasksSidebar
                isOpen={isTasksOpen}
                onClose={() => setIsTasksOpen(false)}
                onTasksChange={setTasks}
                userId={user?.id}
            />

            {/* Main Content or Analytics */}
            {showAnalytics ? (
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 relative z-30 flex flex-col items-center justify-center p-4">
                    <FocusAnalytics />
                </div>
            ) : (
                <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                    {/* Timer Card */}
                    <TimerCard
                        minutes={minutes}
                        seconds={seconds}
                        isRunning={isRunning}
                        mode={mode}
                        currentTheme={currentTheme}
                        currentTask={currentTask}
                        onToggle={toggleTimer}
                        onReset={resetTimer}
                        onTogglePiP={togglePiP}
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

                        {/* Growth Icons */}
                        <div className="flex justify-between mt-4 px-1 opacity-40">
                            <Leaf className="w-4 h-4" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-5 h-5 -mt-1" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-6 h-6 -mt-2" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-5 h-5 -mt-1" style={{ color: currentTheme.accent }} />
                            <Leaf className="w-4 h-4" style={{ color: currentTheme.accent }} />
                        </div>
                    </div>

                    {/* Mobile Controls */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        <div className="flex items-center justify-between">

                            <div className="flex-1 mx-4">
                                <input
                                    type="range"
                                    min="5"
                                    max="120"
                                    step="5"
                                    value={sliderValue}
                                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                    className="w-full"
                                    style={{ accentColor: currentTheme.accent }}
                                />
                                <div className="text-center text-xs text-muted-foreground">{sliderValue} min</div>
                            </div>
                            <button onClick={() => setShowThemeSelector(true)} className="p-3 rounded-xl bg-muted">
                                <Palette className="w-5 h-5" style={{ color: currentTheme.accent }} />
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {/* Mobile Menu Button - Hide on Analytics screen */}
            {!showAnalytics && (
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={`lg:hidden fixed top-4 left-4 z-[60] p-2 backdrop-blur-md border rounded-xl shadow-lg transition-colors bg-white/20 border-white/20 text-white`}
                >
                    <Menu className="w-6 h-6" />
                </button>
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
                            <Plus className="w-5 h-5" style={{ color: currentTheme.accent }} />
                            Add Task
                        </button>
                        <button
                            onClick={() => navigate("/landing")}
                            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all font-medium text-muted-foreground"
                        >
                            <Home className="w-5 h-5" />
                            Back to Home
                        </button>
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
                                min="5"
                                max="120"
                                step="5"
                                value={sliderValue}
                                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: currentTheme.accent }}
                            />
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
                                min="1"
                                max="30"
                                step="1"
                                value={breakSliderValue}
                                onChange={(e) => handleBreakSliderChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: currentTheme.accent }}
                            />
                        </div>
                    </div>

                    {/* Analytics Link */}
                    <button
                        onClick={() => {
                            setShowAnalytics(true);
                            setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full p-3 mt-4 rounded-xl hover:bg-muted/50 transition-all font-medium"
                        style={{ color: currentTheme.accent }}
                    >
                        <BarChart2 className="w-5 h-5" />
                        Analytics
                    </button>
                </div>
            </MobileDrawer>

            {/* Floating Controls - Music & Profile */}
            <div className="fixed top-6 right-8 z-[60] flex items-center gap-3">
                {/* Theme Toggle */}
                <ThemeToggle className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white" />


                {/* Music Control */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2">
                    <button
                        onClick={toggleMusic}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        title={isMusicPlaying ? "Pause Music" : "Play Music"}
                    >
                        {isMusicPlaying ? (
                            <Pause className="w-4 h-4 text-white" />
                        ) : (
                            <Music className="w-4 h-4 text-white" />
                        )}
                    </button>
                    <button
                        onClick={toggleMute}
                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <VolumeX className="w-4 h-4 text-white" />
                        ) : (
                            <Volume2 className="w-4 h-4 text-white" />
                        )}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                        title="Volume"
                    />
                </div>

                {/* Analytics Toggle */}
                <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`p-2 rounded-full border border-white/20 transition-all ${showAnalytics
                        ? "bg-white text-slate-900 shadow-lg"
                        : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                        }`}
                    title={showAnalytics ? "Show Timer" : "Show Analytics"}
                >
                    {showAnalytics ? <LayoutDashboard className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />}
                </button>

                {/* Profile Icon */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="rounded-xl h-[52px] w-[52px] p-0 hover:bg-white/10 border border-white/20 bg-white/10 backdrop-blur-md">
                            <Avatar className="h-[52px] w-[52px] rounded-lg border-2 border-white shadow-sm">
                                <AvatarImage src={user?.avatar} alt={user?.name || 'User'} className="rounded-lg" />
                                <AvatarFallback className="rounded-lg text-white font-bold" style={{ backgroundColor: currentTheme.accent }}>
                                    {user?.name ? user.name[0].toUpperCase() : 'G'}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <div className="px-2 py-1.5">
                            <p className="text-sm font-medium text-foreground">{user?.name || 'Guest'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">SSC Aspirant</p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleProfile} className="cursor-pointer gap-2">
                            <Settings className="w-4 h-4" />
                            <span>Profile Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-destructive">
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

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
        </div>
    );
}
