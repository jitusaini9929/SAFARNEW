import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/utils/authService";
import { Moon, Sun, Plus, Home, Settings, Play, Pause, RotateCcw, Leaf, Sparkles, LogOut, ArrowRight, BarChart2, Clock, Zap, Target, Flame, Calendar, Palette, ChevronLeft, ChevronRight, Trees, Waves, Sunset, MoonStar, Sparkle, HelpCircle } from "lucide-react";
import TasksSidebar from "./TasksSidebar";
import FocusAnalytics from "./FocusAnalytics";
import { focusService } from "@/utils/focusService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
}

const focusThemes: FocusTheme[] = [
    { id: "autumn", name: "Autumn", accent: "#cd6b25ff", accentRgb: "205, 107, 37", gradient: "linear-gradient(135deg, #2d5016 0%, #4a7c2e 50%, #cd6b25 100%)", icon: <Trees className="w-4 h-4" /> },
    { id: "beach", name: "Beach", accent: "#1b8ec3ff", accentRgb: "27, 142, 195", gradient: "linear-gradient(135deg, #0a4d68 0%, #1b8ec3 50%, #88d4f5 100%)", icon: <Waves className="w-4 h-4" /> },
    { id: "nostalgia", name: "Nostalgia", accent: "#1cbc31ff", accentRgb: "28, 188, 49", gradient: "linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)", icon: <Sunset className="w-4 h-4" /> },
    { id: "waterfall", name: "Waterfall", accent: "#2e7144ff", accentRgb: "46, 113, 68", gradient: "linear-gradient(135deg, #1e3a5f 0%, #2e7144 50%, #4ade80 100%)", icon: <MoonStar className="w-4 h-4" /> },
    { id: "aurora", name: "Aurora", accent: "#1c527cff", accentRgb: "28, 82, 124", gradient: "linear-gradient(135deg, #1c527c 0%, #7c3aed 50%, #ec4899 100%)", icon: <Sparkle className="w-4 h-4" /> },
];

export default function StudyWithMe() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [mode, setMode] = useState<"Timer" | "short" | "long">("Timer");
    const [sliderValue, setSliderValue] = useState(25);
    const [breakSliderValue, setBreakSliderValue] = useState(5);
    const [minutes, setMinutes] = useState(25);
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [totalSeconds, setTotalSeconds] = useState(25 * 60);
    const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const sessionLoggedRef = useRef(false);

    // New states for theme and sidebar
    const [currentTheme, setCurrentTheme] = useState<FocusTheme>(focusThemes[0]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Deep link handling for analytics
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'analytics') {
            setShowAnalytics(true);
        }
    }, []);

    // Reset log ref when timer starts
    useEffect(() => {
        if (isRunning) {
            sessionLoggedRef.current = false;
        }
    }, [isRunning]);

    // Log session when timer completes naturally
    useEffect(() => {
        if (remainingSeconds === 0 && !isRunning && mode === 'Timer' && !sessionLoggedRef.current) {
            sessionLoggedRef.current = true;

            const duration = sliderValue;
            focusService.logSession({
                durationMinutes: duration,
                breakMinutes: 0,
                completed: true
            }).then(() => {
                console.log('Session logged successfully');
            }).catch(e => console.error('Log failed', e));
        }
    }, [remainingSeconds, isRunning, mode, sliderValue]);

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

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRunning && remainingSeconds > 0) {
            interval = setInterval(() => {
                setRemainingSeconds((prev) => prev - 1);
            }, 1000);
        } else if (remainingSeconds === 0) {
            setIsRunning(false);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, remainingSeconds]);

    useEffect(() => {
        const mins = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        setMinutes(mins);
        setSeconds(secs);
    }, [remainingSeconds]);

    const handleModeChange = (newMode: "Timer" | "short" | "long") => {
        setMode(newMode);
        const newMinutes = modeSettings[newMode].minutes;
        setTotalSeconds(newMinutes * 60);
        setRemainingSeconds(newMinutes * 60);
        setSliderValue(newMinutes);
        setIsRunning(false);
    };

    const handleSliderChange = (value: number) => {
        setSliderValue(value);
        if (mode === 'Timer') {
            setTotalSeconds(value * 60);
            setRemainingSeconds(value * 60);
            setIsRunning(false);
        }
    };

    const handleBreakSliderChange = (value: number) => {
        setBreakSliderValue(value);
        if (mode === 'short') {
            setTotalSeconds(value * 60);
            setRemainingSeconds(value * 60);
            setIsRunning(false);
        }
    };

    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setRemainingSeconds(totalSeconds);
    };

    const formatTime = (mins: number, secs: number) => {
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

    const handleSetTimer = (minutes: number) => {
        setSliderValue(minutes);
        setMinutes(minutes);
        setSeconds(0);
        setTotalSeconds(minutes * 60);
        setRemainingSeconds(minutes * 60);
        setIsRunning(false);
        setMode("Timer");
        setShowAnalytics(false);
    };

    const handleThemeChange = (newTheme: FocusTheme) => {
        setCurrentTheme(newTheme);
        setShowThemeSelector(false);
    };

    return (
        <div
            className="flex h-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300"
            style={{ '--theme-accent': currentTheme.accent, '--theme-accent-rgb': currentTheme.accentRgb } as React.CSSProperties}
        >
            {/* Gradient Background */}
            <div
                className="fixed inset-0 z-0 transition-all duration-700"
                style={{ background: currentTheme.gradient }}
            >
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-black/30 dark:bg-black/50" />
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
                        <div
                            className={`flex items-center gap-3 mb-8 cursor-pointer ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            onClick={() => navigate("/landing")}
                        >
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                                style={{ backgroundColor: currentTheme.accent }}
                            >
                                F
                            </div>
                            {!isSidebarCollapsed && (
                                <span
                                    className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r"
                                    style={{ backgroundImage: `linear-gradient(to right, ${currentTheme.accent}, ${currentTheme.accent}88)` }}
                                >
                                    Focus
                                </span>
                            )}
                        </div>

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

                            <button
                                onClick={() => navigate("/landing")}
                                className={`flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group text-muted-foreground hover:text-foreground ${isSidebarCollapsed ? 'justify-center' : ''}`}
                                title="Back to Home"
                            >
                                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                {!isSidebarCollapsed && <span className="font-medium">Back to Home</span>}
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
            <TasksSidebar isOpen={isTasksOpen} onClose={() => setIsTasksOpen(false)} />

            {/* Main Content or Analytics */}
            {showAnalytics ? (
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 relative z-30">
                    <FocusAnalytics
                        onBack={() => setShowAnalytics(false)}
                        onSetTimer={handleSetTimer}
                    />
                </div>
            ) : (
                <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
                    {/* Timer Card */}
                    <div
                        className="w-full max-w-2xl rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden transition-all duration-300 border-4 bg-white/20 dark:bg-slate-900/50 backdrop-blur-md"
                        style={{ borderColor: currentTheme.accent }}
                    >
                        {/* Decorative Nature Icons */}
                        <Leaf className="absolute -bottom-10 -right-10 w-32 h-32 opacity-10 rotate-45 pointer-events-none" style={{ color: currentTheme.accent }} />
                        <Sparkles className="absolute top-10 -left-10 w-24 h-24 opacity-5 -rotate-12 pointer-events-none" style={{ color: currentTheme.accent }} />

                        {/* Mode Tabs */}
                        <div data-tour="mode-tabs" className="inline-flex bg-muted/50 p-2 rounded-full mb-12 backdrop-blur-sm relative z-20">
                            {(["Timer", "short", "long"] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleModeChange(m)}
                                    className={`px-4 py-2 md:px-8 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all ${mode === m
                                        ? "text-white shadow-lg"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    style={mode === m ? {
                                        backgroundColor: currentTheme.accent,
                                        boxShadow: `0 0 20px ${currentTheme.accent}66`
                                    } : {}}
                                >
                                    {modeSettings[m].label}
                                </button>
                            ))}
                        </div>

                        {/* Timer Display */}
                        <div data-tour="timer-display" className="text-6xl md:text-8xl lg:text-9xl leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground tracking-tight mb-8 md:mb-12 drop-shadow-xl font-['Poppins']">
                            {formatTime(minutes, seconds)}
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={resetTimer}
                                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:opacity-80 transition-all"
                                style={{ '--hover-color': currentTheme.accent } as React.CSSProperties}
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>

                            <button
                                data-tour="start-button"
                                onClick={toggleTimer}
                                className="group relative px-8 py-4 md:px-16 md:py-5 text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden"
                                style={{
                                    backgroundColor: currentTheme.accent,
                                    boxShadow: `0 0 30px ${currentTheme.accent}50`
                                }}
                            >
                                <span className="relative z-10 uppercase tracking-widest flex items-center gap-3">
                                    {isRunning ? (
                                        <>
                                            <Pause className="w-6 h-6" /> Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-6 h-6" /> Start
                                        </>
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </button>
                        </div>
                    </div>

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
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4">
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

            {/* Floating Profile Icon */}
            <div className="fixed top-6 right-8 z-[60]">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-white/10 border border-white/20 bg-white/10 backdrop-blur-md">
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                                <AvatarFallback className="text-white font-bold" style={{ backgroundColor: currentTheme.accent }}>
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
