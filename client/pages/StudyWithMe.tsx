import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/utils/authService';
import MainLayout from '@/components/MainLayout';
import { X, Sun, Moon, Play, Pause, Flame, Target, BarChart3, Clock, GripHorizontal, ChevronDown, Check, ArrowRight, ArrowLeft, Plus } from 'lucide-react';

interface Session {
    start: Date;
    end: Date;
    duration: number;
}

interface SessionType {
    duration: number;
    break: number;
    label: string;
}

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

interface FocusStats {
    totalFocusMinutes: number;
    totalBreakMinutes: number;
    totalSessions: number;
    completedSessions: number;
    weeklyData: number[];
    focusStreak: number;
    goalsSet: number;
    goalsCompleted: number;
    dailyGoalMinutes: number;
    dailyGoalProgress: number;
}

export default function StudyWithMe() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
    const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
    const [isDark, setIsDark] = useState(() => {
        // Initialize based on current document theme
        return document.documentElement.classList.contains('dark');
    });
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [customMinutes, setCustomMinutes] = useState(25);
    const [customBreakMinutes, setCustomBreakMinutes] = useState(5);
    const [activePreset, setActivePreset] = useState<number | null>(null);
    const [showCustomSettings, setShowCustomSettings] = useState(false);

    // Task management state
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');

    // Focus stats from API
    const [focusStats, setFocusStats] = useState<FocusStats>({
        totalFocusMinutes: 0,
        totalBreakMinutes: 0,
        totalSessions: 0,
        completedSessions: 0,
        weeklyData: [0, 0, 0, 0, 0, 0, 0],
        focusStreak: 0,
        goalsSet: 0,
        goalsCompleted: 0,
        dailyGoalMinutes: 240,
        dailyGoalProgress: 0
    });

    const sessionTypes: SessionType[] = [
        { duration: 25, break: 5, label: '25' },
        { duration: 30, break: 5, label: '30' },
        { duration: 45, break: 10, label: '45' },
        { duration: 60, break: 10, label: '60' },
        { duration: 90, break: 15, label: '90' },
    ];

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        // Fetch focus stats
        fetchFocusStats();
    }, [navigate]);

    const fetchFocusStats = async () => {
        try {
            const res = await fetch('/api/focus-sessions/stats', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setFocusStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch focus stats:', error);
        }
    };

    const logFocusSession = async (durationMinutes: number, breakMinutes: number, completed: boolean) => {
        try {
            await fetch('/api/focus-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ durationMinutes, breakMinutes, completed })
            });
            // Refresh stats after logging
            fetchFocusStats();
        } catch (error) {
            console.error('Failed to log focus session:', error);
        }
    };

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            handleSessionComplete();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft]);

    // Keyboard shortcut for space to pause/resume
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore if typing in an input or textarea
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.code === 'Space' && selectedSession) {
                e.preventDefault();
                toggleTimer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSession, isRunning]);

    const handleSessionComplete = () => {
        setIsRunning(false);

        if (!isBreak && currentSessionStart && selectedSession) {
            const sessionEnd = new Date();
            setCompletedSessions(prev => [...prev, {
                start: currentSessionStart,
                end: sessionEnd,
                duration: selectedSession.duration
            }]);
            setCurrentSessionStart(null);

            // Log completed focus session to database
            logFocusSession(selectedSession.duration, selectedSession.break, true);

            // Start break
            setIsBreak(true);
            setTimeLeft(selectedSession.break * 60);
            setIsRunning(true);
        } else if (isBreak && selectedSession) {
            setIsBreak(false);
            setTimeLeft(selectedSession.duration * 60);
        }
    };

    const startSession = (session: SessionType) => {
        setSelectedSession(session);
        setTimeLeft(session.duration * 60);
        setIsBreak(false);
        setIsRunning(false);
        setActivePreset(session.duration);
    };

    const startCustomSession = () => {
        if (customMinutes > 0) {
            startSession({
                duration: customMinutes,
                break: customBreakMinutes > 0 ? customBreakMinutes : 5,
                label: `${customMinutes}`
            });
        }
    };

    const toggleTimer = () => {
        if (!isRunning && !currentSessionStart && !isBreak) {
            setCurrentSessionStart(new Date());
        }
        setIsRunning(!isRunning);
    };

    const finishSession = () => {
        setSelectedSession(null);
        setTimeLeft(0);
        setIsRunning(false);
        setIsBreak(false);
        setCurrentSessionStart(null);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalStudyTime = () => {
        const totalMinutes = completedSessions.reduce((acc, session) => acc + session.duration, 0);
        return {
            hours: Math.floor(totalMinutes / 60),
            mins: totalMinutes % 60,
            total: totalMinutes
        };
    };

    // Task management functions
    const addTask = () => {
        if (newTaskText.trim()) {
            setTasks(prev => [...prev, {
                id: Date.now().toString(),
                text: newTaskText.trim(),
                completed: false
            }]);
            setNewTaskText('');
        }
    };

    const toggleTask = (taskId: string) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        ));
    };

    const completedTaskCount = tasks.filter(t => t.completed).length;

    // Helper to generate random heatmap data for visualization
    const heatmapData = Array.from({ length: 7 * 24 }, () => Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0);
    const heatmapColors = [
        'bg-cyan-100/20 dark:bg-cyan-900/10', // 0
        'bg-cyan-100 dark:bg-cyan-900',       // 1
        'bg-cyan-300 dark:bg-cyan-700',       // 2
        'bg-cyan-500 dark:bg-cyan-500',       // 3
        'bg-cyan-700 dark:bg-cyan-300',       // 4
    ];

    if (!user) return null;

    const bgClass = isDark ? 'bg-[#09090b]' : 'bg-[#f1f5f9]';
    const textClass = isDark ? 'text-gray-100' : 'text-gray-800';
    // Glassmorphism card styling
    const cardBgClass = isDark
        ? 'bg-slate-900/70 backdrop-blur-xl shadow-lg shadow-black/20'
        : 'bg-white/70 backdrop-blur-xl shadow-lg shadow-gray-200/50';
    const borderClass = isDark ? 'border-slate-700/50' : 'border-gray-300/60';
    const mutedTextClass = isDark ? 'text-gray-400' : 'text-gray-500';
    const primaryColorClass = 'text-[#06b6d4]'; // Cyan-500

    // Active Timer Screen
    if (selectedSession) {
        // remainingPercent: 100% at start, 0% when done (for fading effects)
        const remainingPercent = (timeLeft / (selectedSession.duration * 60)) * 100;
        // progressPercent: 0% at start, 100% when done (for needle rotation)
        const progressPercent = 100 - remainingPercent;
        // Needle rotation angle (0 to 360 degrees)
        const needleAngle = (progressPercent / 100) * 360;
        // Session counter
        const sessionCount = completedSessions.length;

        return (
            <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300 flex`}>
                <main className="flex-1 flex flex-col md:flex-row">

                    {/* Left Panel - Timer (60%) */}
                    <div className="flex-[3] flex flex-col items-center p-6 md:p-8">

                        {/* Header */}
                        <div className="w-full flex justify-between items-center mb-6">
                            <button
                                onClick={finishSession}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'} transition-colors`}
                            >
                                <X className={mutedTextClass} size={24} />
                            </button>
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'} transition-colors`}
                            >
                                {isDark ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-gray-500" size={20} />}
                            </button>
                        </div>

                        {/* Focus Counter Badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}>
                            <span className={isBreak ? 'text-green-500' : 'text-cyan-500'}>
                                {isBreak ? 'BREAK' : 'FOCUS'}
                            </span>
                            <span>{sessionCount} / 4</span>
                        </div>

                        {/* Focus/Break Tabs - Glassmorphism */}
                        <div className="flex gap-3 mb-10 flex-wrap justify-center">
                            <button
                                onClick={() => {
                                    setIsBreak(false);
                                    setTimeLeft(selectedSession.duration * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-lg ${!isBreak
                                    ? 'bg-cyan-500/90 text-white shadow-lg shadow-cyan-500/20'
                                    : `bg-slate-800/50 text-gray-300 border border-slate-600/50 hover:bg-slate-700/50`
                                    }`}
                            >
                                <div className="text-[10px] opacity-70">Focus</div>
                                <div>{selectedSession.duration} min</div>
                            </button>
                            <button
                                onClick={() => {
                                    setIsBreak(true);
                                    setTimeLeft(5 * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-lg ${isBreak && timeLeft === 5 * 60
                                    ? 'bg-green-500/90 text-white shadow-lg shadow-green-500/20'
                                    : `bg-slate-800/50 text-gray-300 border border-slate-600/50 hover:bg-slate-700/50`
                                    }`}
                            >
                                <div className="text-[10px] opacity-70">Short Break</div>
                                <div>5 min</div>
                            </button>
                            <button
                                onClick={() => {
                                    setIsBreak(true);
                                    setTimeLeft(25 * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all backdrop-blur-lg ${isBreak && timeLeft === 25 * 60
                                    ? 'bg-green-500/90 text-white shadow-lg shadow-green-500/20'
                                    : `bg-slate-800/50 text-gray-300 border border-slate-600/50 hover:bg-slate-700/50`
                                    }`}
                            >
                                <div className="text-[10px] opacity-70">Long Break</div>
                                <div>25 min</div>
                            </button>
                        </div>

                        {/* Timer Sphere Container */}
                        <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center mb-10 overflow-visible">

                            {/* Outer Ring - SVG Progress Arc (Clean, No Glow) */}
                            <svg
                                className="absolute inset-0 w-full h-full z-10 -rotate-90 overflow-visible"
                                viewBox="0 0 100 100"
                            >
                                {/* Background Ring */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke={isBreak ? 'rgba(34, 197, 94, 0.2)' : 'rgba(6, 182, 212, 0.2)'}
                                    strokeWidth="3"
                                />
                                {/* Progress Arc */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke={isBreak ? 'rgb(34, 197, 94)' : 'rgb(6, 182, 212)'}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 46}`}
                                    strokeDashoffset={`${2 * Math.PI * 46 * (1 - remainingPercent / 100)}`}
                                    style={{ transition: 'stroke-dashoffset 1s ease-linear' }}
                                />
                            </svg>

                            {/* Inner Sphere - Clean Glassmorphism */}
                            <div
                                className="relative w-44 h-44 md:w-56 md:h-56 rounded-full flex items-center justify-center overflow-visible z-20"
                                style={{
                                    background: isBreak
                                        ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.15), rgba(30, 41, 59, 0.9))'
                                        : 'linear-gradient(145deg, rgba(6, 182, 212, 0.15), rgba(30, 41, 59, 0.9))',
                                    boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.05), 0 4px 20px rgba(0, 0, 0, 0.3)',
                                    backdropFilter: 'blur(20px)',
                                    border: `1px solid ${isBreak ? 'rgba(34, 197, 94, 0.25)' : 'rgba(6, 182, 212, 0.25)'}`
                                }}
                            >
                                {/* Highlight Reflection */}
                                <div className="absolute top-4 left-1/4 w-1/2 h-1/4 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-md pointer-events-none"></div>

                                {/* Needle Container - ABOVE the ring (z-50) */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible z-50">
                                    <div
                                        className="relative w-1 h-full flex flex-col items-center overflow-visible"
                                        style={{
                                            transform: `rotate(${needleAngle}deg)`,
                                            transition: 'transform 1s ease-linear'
                                        }}
                                    >
                                        {/* Needle Shaft */}
                                        <div
                                            className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-1.5 rounded-full origin-bottom"
                                            style={{
                                                height: '62%',
                                                background: '#ff0033',
                                                filter: 'drop-shadow(0 0 12px rgba(255, 0, 51, 1)) drop-shadow(0 0 25px rgba(255, 0, 51, 0.7))'
                                            }}
                                        >
                                            {/* Needle Tip */}
                                            <div
                                                className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-6"
                                                style={{
                                                    background: '#ff0033',
                                                    clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)'
                                                }}
                                            ></div>
                                            {/* Needle Glow */}
                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#ff0033] rounded-full blur-[6px] opacity-90"></div>
                                        </div>

                                        {/* Center Dot */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-[#ff0033] rounded-full flex items-center justify-center"
                                            style={{
                                                boxShadow: '0 0 25px #ff0033, 0 0 10px rgba(255, 0, 51, 0.8)'
                                            }}
                                        >
                                            <div className="w-2 h-2 bg-white/40 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Time Display */}
                        <div className="text-center mb-8">
                            <h1 className={`text-5xl md:text-6xl font-light tracking-widest tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatTime(timeLeft).split(':').join(' : ')}
                            </h1>
                            <p className={`text-xs uppercase tracking-widest mt-3 ${mutedTextClass}`}>
                                time remaining
                            </p>
                        </div>

                        {/* Start/Pause Button */}
                        <button
                            onClick={toggleTimer}
                            className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all mb-6 ${isBreak ? 'text-green-500 hover:text-green-400' : 'text-cyan-500 hover:text-cyan-400'
                                }`}
                        >
                            {isRunning ? (
                                <><Pause size={14} /> Pause</>
                            ) : (
                                <><Play size={14} fill="currentColor" /> Start</>
                            )}
                        </button>

                        {/* Finish Session Button */}
                        <button
                            onClick={finishSession}
                            className={`w-full max-w-xs py-3.5 rounded-full font-bold uppercase tracking-widest text-sm transition-all ${isBreak
                                ? 'bg-green-500 hover:bg-green-400 text-white'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                                }`}
                        >
                            Finish Session
                        </button>
                    </div>

                    {/* Right Panel - Tasks (Increased by 20%) */}
                    <aside className={`flex-[2.5] w-full md:max-w-[480px] min-h-[500px] border-l ${isDark ? 'border-cyan-500/20 bg-slate-900/60' : 'border-gray-200 bg-white/60'} flex flex-col p-6 transition-colors duration-300`}>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <GripHorizontal className="text-cyan-500" size={18} />
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tasks</h2>
                            </div>
                            <span className={`text-xs font-medium ${mutedTextClass}`}>
                                {completedTaskCount}/{tasks.length} done
                            </span>
                        </div>

                        {/* Add Task Input */}
                        <div className="relative mb-4">
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                placeholder="Add a task for this session..."
                                className={`w-full ${isDark ? 'bg-slate-800/50 border-slate-700 placeholder:text-slate-500' : 'bg-gray-100 border-gray-200 placeholder:text-gray-400'} border rounded-lg py-3 px-4 pr-12 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm`}
                            />
                            <button
                                onClick={addTask}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-400 text-white p-1.5 rounded-md transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Task List / Empty State */}
                        <div className={`flex-1 border ${isDark ? 'border-slate-700/50' : 'border-gray-200'} rounded-lg overflow-hidden`}>
                            {tasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <GripHorizontal className={`${mutedTextClass} mb-4`} size={32} />
                                    <p className={`${mutedTextClass} font-medium mb-1`}>No tasks yet.</p>
                                    <p className={`text-xs ${mutedTextClass}`}>Add tasks to track what you want to accomplish.</p>
                                </div>
                            ) : (
                                <div className="p-3 flex flex-col gap-3 overflow-y-auto h-full">
                                    {tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(task.id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${task.completed
                                                ? `${isDark ? 'bg-slate-800/30' : 'bg-gray-100/50'} opacity-60`
                                                : `${isDark ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-white hover:bg-gray-50'}`
                                                }`}
                                        >
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-all ${task.completed
                                                ? 'border-cyan-500 bg-cyan-500 text-white'
                                                : `${isDark ? 'border-slate-500' : 'border-gray-300'} hover:border-cyan-400`
                                                }`}>
                                                {task.completed && <Check size={12} />}
                                            </div>
                                            {/* Task Text */}
                                            <span className={`flex-1 text-sm ${task.completed
                                                ? `line-through ${mutedTextClass}`
                                                : `${isDark ? 'text-slate-200' : 'text-slate-700'}`
                                                }`}>
                                                {task.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </main>
            </div>
        );
    }

    // Dashboard Screen
    return (
        <MainLayout userName={user?.name} userAvatar={user?.avatar}>
            <div className="flex-1 h-full overflow-y-auto bg-background/95 font-['Plus_Jakarta_Sans'] transition-colors duration-300">
                {/* Background Gradient */}
                <div
                    className="fixed inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 15% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
                            radial-gradient(circle at 85% 30%, hsl(var(--primary) / 0.1) 0%, transparent 45%),
                            radial-gradient(circle at 50% 80%, hsl(var(--secondary) / 0.1) 0%, transparent 40%)
                        `,
                        backgroundAttachment: 'fixed'
                    }}
                ></div>

                {/* Content Wrapper */}
                <div className="relative z-10 p-4 md:p-6 lg:p-8">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-6 md:mb-8">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1">Focus Session</h1>
                            <p className="text-muted-foreground text-xs sm:text-sm">Track your focus time and boost productivity</p>
                        </div>
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            {isDark ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-muted-foreground" size={20} />}
                        </button>
                    </header>

                    {/* Timer Selection Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
                        {/* Session Duration Selection */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="text-primary w-5 h-5" />
                                    <h3 className="font-semibold text-lg text-foreground">Select Focus Duration</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    {sessionTypes.map((session) => (
                                        <button
                                            key={session.duration}
                                            onClick={() => startSession(session)}
                                            className={`relative p-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 border ${activePreset === session.duration
                                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 border-primary -translate-y-1'
                                                : 'bg-muted/50 border-border hover:border-primary/50 hover:-translate-y-1 text-foreground'
                                                }`}
                                        >
                                            <span className="text-2xl font-bold">{session.label}</span>
                                            <span className={`text-xs uppercase tracking-wider font-medium ${activePreset === session.duration ? 'opacity-90' : 'text-muted-foreground'}`}>
                                                min focus
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Custom Timer Settings */}
                        <div className="lg:col-span-12 glass-high rounded-2xl overflow-hidden">
                            <button
                                onClick={() => setShowCustomSettings(!showCustomSettings)}
                                className="w-full px-6 py-4 flex justify-between items-center hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <GripHorizontal className="text-primary" size={20} />
                                    <span className="font-medium text-sm text-foreground">Custom Timer Settings</span>
                                </div>
                                <ChevronDown className={`text-muted-foreground transition-transform ${showCustomSettings ? 'rotate-180' : ''}`} size={20} />
                            </button>

                            {showCustomSettings && (
                                <div className="px-6 pb-4 flex flex-col gap-4 border-t border-border pt-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <label className="text-sm font-medium text-muted-foreground">Duration (minutes):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={customMinutes}
                                            onChange={(e) => setCustomMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                                            className="w-24 px-3 py-2 rounded-xl border border-border bg-muted/50 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                        <label className="text-sm font-medium text-muted-foreground">Break (minutes):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={customBreakMinutes}
                                            onChange={(e) => setCustomBreakMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                                            className="w-24 px-3 py-2 rounded-xl border border-border bg-muted/50 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startCustomSession();
                                            }}
                                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                                        >
                                            Start Timer
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analytics Section */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="text-primary w-5 h-5" />
                                    <h3 className="font-semibold text-lg text-foreground">Performance Analytics</h3>
                                </div>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase">Weekly View</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                                {/* Weekly Overview Chart */}
                                <div className="lg:col-span-8 bg-muted/30 border border-border rounded-xl p-6 min-h-[300px]">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Weekly Overview</p>
                                            <p className="text-4xl font-bold text-foreground">
                                                {Math.floor(focusStats.totalFocusMinutes / 60)}h {focusStats.totalFocusMinutes % 60}m
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground mb-1">Sessions: {focusStats.completedSessions}/{focusStats.totalSessions}</p>
                                            <p className="text-sm text-muted-foreground">Goals: {focusStats.goalsCompleted}/{focusStats.goalsSet}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between h-40 gap-4">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                            const maxMins = Math.max(...focusStats.weeklyData, 60);
                                            const h = focusStats.weeklyData[i] > 0 ? Math.max(10, (focusStats.weeklyData[i] / maxMins) * 100) : 5;
                                            const today = new Date().getDay();
                                            const dayIndex = today === 0 ? 6 : today - 1;
                                            const isToday = i === dayIndex;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer justify-end h-full">
                                                    <div className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {focusStats.weeklyData[i]}m
                                                    </div>
                                                    <div
                                                        className={`w-full rounded-lg transition-colors ${isToday
                                                            ? 'bg-primary shadow-lg shadow-primary/30'
                                                            : focusStats.weeklyData[i] > 0
                                                                ? 'bg-primary/50'
                                                                : 'bg-muted'
                                                            } group-hover:bg-primary/70`}
                                                        style={{ height: `${h}%`, minHeight: '8px' }}
                                                    ></div>
                                                    <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Stats Side Column */}
                                <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
                                    {/* Focus Streak */}
                                    <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <Flame size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Focus Streak</p>
                                            <p className="text-xl font-bold text-foreground">{focusStats.focusStreak} Days</p>
                                        </div>
                                    </div>

                                    {/* Hours Focused */}
                                    <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                            <Target size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Hours Focused</p>
                                            <p className="text-xl font-bold text-foreground">
                                                {Math.floor(focusStats.totalFocusMinutes / 60)}h {focusStats.totalFocusMinutes % 60}m
                                            </p>
                                        </div>
                                    </div>

                                    {/* Total Focus */}
                                    <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Total Focus</p>
                                            <p className="text-xl font-bold text-foreground">{focusStats.totalFocusMinutes} mins</p>
                                        </div>
                                    </div>

                                    {/* Total Breaks */}
                                    <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-4 hover:bg-muted transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <BarChart3 size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase">Total Breaks</p>
                                            <p className="text-xl font-bold text-foreground">{focusStats.totalBreakMinutes} mins</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
