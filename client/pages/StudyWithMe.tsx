import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/utils/authService";
import { Moon, Sun, Plus, Home, Settings, Play, Pause, RotateCcw, Leaf, Sparkles, LogOut, ArrowRight, BarChart2, Clock, Zap, Target, Flame, Calendar } from "lucide-react";
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

export default function StudyWithMe() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    // Updated mode type to match User's previous change preference ("Timer" instead of "pomodoro")
    const [mode, setMode] = useState<"Timer" | "short" | "long">("Timer");
    const [sliderValue, setSliderValue] = useState(25);
    const [minutes, setMinutes] = useState(25);
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [totalSeconds, setTotalSeconds] = useState(25 * 60);
    const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
    const [isTasksOpen, setIsTasksOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const sessionLoggedRef = useRef(false);

    // Reset log ref when timer starts
    useEffect(() => {
        if (isRunning) {
            sessionLoggedRef.current = false;
        }
    }, [isRunning]);

    // Log session when timer completes naturally
    useEffect(() => {
        // Check for 'Timer' (formerly pomodoro) mode
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

    // Updated settings key to match "Timer" mode
    const modeSettings = {
        Timer: { minutes: 25, label: "Pomodoro" },
        short: { minutes: 5, label: "Short break" },
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
        setTotalSeconds(value * 60);
        setRemainingSeconds(value * 60);
        setIsRunning(false);
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
        setShowAnalytics(false); // Close analytics to show timer
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
            {/* Sidebar (Only visible if Analytics NOT open or on large screens? 
                Actually new design covers full page or replaces content. 
                User requested "Compact Study Dashboard", looks like full page replacement.
                But I'll keep the sidebar if they want to navigate away.
             */}
            {!showAnalytics && (
                <aside className="hidden lg:flex w-64 flex-col p-6 border-r glass-high z-20">
                    <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
                            F
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                            Focus
                        </span>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="space-y-2">
                            <button onClick={toggleTheme} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group">
                                {theme === "dark" ?
                                    <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-90 transition-transform" /> :
                                    <Moon className="w-5 h-5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
                                }
                                <span className="font-medium">
                                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                                </span>
                            </button>

                            <button onClick={() => setIsTasksOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group">
                                <Plus className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Add task</span>
                            </button>

                            <button onClick={() => navigate("/")} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group text-muted-foreground hover:text-foreground">
                                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Back to Home</span>
                            </button>
                        </div>

                        <div className="pt-6 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timer Duration</span>
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{sliderValue} min</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="120"
                                step="5"
                                value={sliderValue}
                                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
                                <span>5M</span>
                                <span>60M</span>
                                <span>120M</span>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="text-sm text-muted-foreground font-semibold">
                        <button
                            onClick={() => setShowAnalytics(true)}
                            className="flex items-center gap-3 hover:text-primary transition-colors"
                        >
                            <BarChart2 className="w-5 h-5" />
                            <span>Analytics</span>
                        </button>
                    </div>
                </aside>
            )}

            {/* Tasks Sidebar */}
            <TasksSidebar isOpen={isTasksOpen} onClose={() => setIsTasksOpen(false)} />

            {/* Main Content or Analytics Split View */}
            {showAnalytics ? (
                <div className="flex-1 overflow-auto bg-background-light dark:bg-background-dark">
                    <FocusAnalytics
                        onBack={() => setShowAnalytics(false)}
                        onSetTimer={handleSetTimer}
                    />
                </div>
            ) : (
                <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 min-h-screen">
                    {/* Timer Card */}
                    <div className="glass-high w-full max-w-2xl rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden transition-all duration-300 border-4 border-green-500 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
                        {/* Decorative Nature Icons */}
                        <Leaf className="absolute -bottom-10 -right-10 w-32 h-32 text-primary/10 rotate-45 pointer-events-none" />
                        <Sparkles className="absolute top-10 -left-10 w-24 h-24 text-primary/5 -rotate-12 pointer-events-none" />

                        {/* Mode Tabs */}
                        <div className="inline-flex bg-muted/50 p-2 rounded-full mb-12 backdrop-blur-sm relative z-20">
                            {(["Timer", "short", "long"] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleModeChange(m)}
                                    className={`px-8 py-3 rounded-full text-base font-semibold transition-all ${mode === m
                                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(45,212,191,0.4)]"
                                        : "text-muted-foreground hover:text-primary"
                                        }`}
                                >
                                    {modeSettings[m].label}
                                </button>
                            ))}
                        </div>

                        {/* Timer Display */}
                        <div className="text-8xl md:text-9xl leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground tracking-tight mb-12 drop-shadow-xl font-['Poppins']">
                            {formatTime(minutes, seconds)}
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={resetTimer}
                                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            <button
                                onClick={toggleTimer}
                                className="group relative px-16 py-5 bg-primary hover:bg-primary/90 text-primary-foreground text-xl font-bold rounded-2xl shadow-[0_0_25px_rgba(45,212,191,0.3)] transition-all duration-300 hover:shadow-[0_0_35px_rgba(45,212,191,0.5)] hover:-translate-y-1 active:translate-y-0 overflow-hidden"
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
                        <div className="text-center mb-8 text-base font-semibold tracking-wide text-muted-foreground opacity-80 uppercase">
                            {isRunning ? "Stay focused, you're doing great!" : "Ready to focus?"}
                        </div>

                        {/* Progress Bar with Ladybug */}
                        <div className="relative h-4 bg-muted/50 rounded-full backdrop-blur-sm shadow-inner overflow-visible z-10">
                            <div
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-primary rounded-l-full transition-all duration-1000"
                                style={{
                                    width: `${progress}%`,
                                    boxShadow: progress > 0 ? "0 0 20px rgba(45, 212, 191, 0.5)" : "none",
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
                        <div className="flex justify-between mt-4 px-1 text-muted-foreground/40">
                            <Leaf className="w-4 h-4" />
                            <Leaf className="w-5 h-5 -mt-1" />
                            <Leaf className="w-6 h-6 -mt-2" />
                            <Leaf className="w-5 h-5 -mt-1" />
                            <Leaf className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Mobile Controls */}
                    <div className="lg:hidden fixed bottom-4 left-4 right-4 glass-high rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <button onClick={toggleTheme} className="p-3 rounded-xl bg-muted">
                                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 mx-4">
                                <input
                                    type="range"
                                    min="5"
                                    max="120"
                                    step="5"
                                    value={sliderValue}
                                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                                    className="w-full accent-primary"
                                />
                                <div className="text-center text-xs text-muted-foreground">{sliderValue} min</div>
                            </div>
                            <button onClick={() => navigate("/")} className="p-3 rounded-xl bg-muted">
                                <Home className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {/* Floating Profile Icon - Top Right */}
            <div className="fixed top-6 right-8 z-[60]">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="rounded-full h-10 w-10 p-0 hover:bg-white/10 glass-button border border-white/20">
                            <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                                <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
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

            {/* Floating Sparkle */}
            <div className="fixed bottom-8 right-8 text-primary/20 animate-pulse hidden lg:block pointer-events-none">
                <Sparkles className="w-10 h-10" />
            </div>

            {/* Styles */}
            <style>{`
                @keyframes crawl {
                  0% { transform: translateX(0); }
                  50% { transform: translateX(5px); }
                  100% { transform: translateX(0); }
                }
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 16px;
                  width: 16px;
                  border-radius: 50%;
                  background: hsl(var(--primary));
                  cursor: pointer;
                  box-shadow: 0 0 10px rgba(45, 212, 191, 0.6);
                  margin-top: -6px;
                }
                input[type=range]::-webkit-slider-runnable-track {
                  width: 100%;
                  height: 4px;
                  cursor: pointer;
                  background: ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
                  border-radius: 2px;
                }
              `}</style>
        </div>
    );
}
