import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/utils/authService';
import { X, Sun, Moon, Play, Pause, Flame, Target, BarChart3, Info, GripHorizontal, ChevronDown, Check } from 'lucide-react';

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

export default function StudyWithMe() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
    const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
    const [isDark, setIsDark] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [customMinutes, setCustomMinutes] = useState(25);
    const [activePreset, setActivePreset] = useState<number | null>(null); // Changed default to null
    const [showCustomSettings, setShowCustomSettings] = useState(false); // For custom timer toggle

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
    }, [navigate]);

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
                break: Math.max(5, Math.floor(customMinutes / 5)),
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
    const cardBgClass = isDark ? 'bg-[#18181b]' : 'bg-white';
    const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
    const mutedTextClass = isDark ? 'text-gray-400' : 'text-gray-500';
    const primaryColorClass = 'text-[#06b6d4]'; // Cyan-500

    // Active Timer Screen
    if (selectedSession) {
        const progressPercent = ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100;

        return (
            <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300 flex items-center justify-center p-4`}>
                <div className="w-full max-w-md flex flex-col items-center gap-8">
                    {/* Header */}
                    <div className="w-full flex justify-between items-center px-4">
                        <button
                            onClick={finishSession}
                            className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors`}
                        >
                            <X className={mutedTextClass} size={24} />
                        </button>
                        <h1 className="text-xl font-bold tracking-tight">
                            {isBreak ? 'Break Time' : 'Focus Session'}
                        </h1>
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors`}
                        >
                            {isDark ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-gray-500" size={20} />}
                        </button>
                    </div>

                    {/* Timer Circle */}
                    <div className="relative w-72 h-72">
                        {/* Glow effect */}
                        <div className={`absolute inset-0 rounded-full blur-2xl ${isBreak ? 'bg-green-500/20' : 'bg-cyan-500/20'} animate-pulse`}></div>

                        <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={isDark ? '#27272a' : '#e5e7eb'}
                                strokeWidth="3"
                            />
                            <circle
                                cx="50" cy="50" r="45"
                                fill="none"
                                stroke={isBreak ? '#22c55e' : '#06b6d4'}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 45}`}
                                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
                                className="transition-all duration-1000 ease-linear"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <div className={`text-6xl font-bold tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className={`text-sm font-medium uppercase tracking-widest mt-2 ${isBreak ? 'text-green-500' : 'text-cyan-500'}`}>
                                {isBreak ? 'Rest' : 'Focus'}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={toggleTimer}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95 ${isBreak
                                    ? 'bg-green-500 hover:bg-green-400 shadow-green-500/30'
                                    : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/30'
                                } text-white`}
                        >
                            {isRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                        </button>
                    </div>

                    <p className={`text-xs ${mutedTextClass} mt-4`}>
                        Use <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">Space</span> to pause
                    </p>
                </div>
            </div>
        );
    }

    // Dashboard Screen
    return (
        <div className={`min-h-screen ${bgClass} ${textClass} font-sans transition-colors duration-300 flex items-center justify-center p-4`}>
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">

                {/* Navbar */}
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="hover:opacity-75 transition-opacity">
                            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                                Study With Me <span className="text-xl">📚</span>
                            </h1>
                        </button>
                        <div className={`h-4 w-px ${isDark ? 'bg-gray-800' : 'bg-gray-300'} mx-1`}></div>
                        <p className={`text-xs ${mutedTextClass} font-medium`}>Daily focus optimizer</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isDark ? 'text-yellow-400' : 'text-gray-500'}`}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className={`p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${mutedTextClass}`}>
                            {/* Settings icon placeholder using GripHorizontal as substitute if Settings not imported, checking imports... grip is visually different but works as placeholder or add Settings to import */}
                            <GripHorizontal size={20} />
                        </button>
                    </div>
                </div>

                <main className="grid grid-cols-12 gap-4">
                    {/* Timer Selection Section */}
                    <div className="col-span-12 flex flex-col gap-3">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {sessionTypes.map((session) => (
                                <button
                                    key={session.duration}
                                    onClick={() => startSession(session)}
                                    className={`relative p-3 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${activePreset === session.duration
                                            ? 'bg-[#06b6d4] text-white shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_-3px_rgba(6,182,212,0.6)] transform -translate-y-[2px]'
                                            : `${cardBgClass} border ${borderClass} hover:border-[#06b6d4]/50 hover:-translate-y-[2px]`
                                        }`}
                                >
                                    <span className="text-xl font-bold">{session.label}</span>
                                    <span className={`text-[10px] uppercase tracking-wider font-medium ${activePreset === session.duration ? 'opacity-90' : mutedTextClass}`}>
                                        min focus
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Custom Timer & Settings Row */}
                        <div className={`w-full ${cardBgClass} border ${borderClass} rounded-lg px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group`}>
                            <div className="flex items-center gap-2">
                                {/* Tune icon placeholder */}
                                <GripHorizontal className="text-[#06b6d4]" size={20} />
                                <span className={`font-medium text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Custom Timer Settings</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-gray-400">POMODORO MODE</span>
                                <ChevronDown className="text-gray-400" size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Analytics Section */}
                    <div className="col-span-12 flex flex-col gap-3 mt-2">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} uppercase tracking-wider`}>Performance Analytics</h2>
                            </div>
                            <div className="flex gap-2">
                                <button className={`text-[10px] font-bold border ${borderClass} ${mutedTextClass} px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors uppercase`}>Export</button>
                                <button className="text-[10px] font-bold bg-[#06b6d4]/10 text-[#06b6d4] px-2 py-1 rounded hover:bg-[#06b6d4]/20 transition-colors uppercase">Weekly View</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                            {/* Daily Overview Chart */}
                            <div className={`col-span-12 lg:col-span-4 ${cardBgClass} border ${borderClass} rounded-lg p-4 flex flex-col min-h-[240px]`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Daily Overview</h3>
                                        <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {getTotalStudyTime().hours}h {getTotalStudyTime().mins}m
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+12%</span>
                                </div>
                                <div className="flex items-end justify-between h-full gap-1.5 px-1">
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                        const h = [40, 65, 85, 55, 30, 20, 15][i];
                                        const isToday = i === 2; // Mocking Wednesday as today based on screenshot
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer h-full justify-end">
                                                <div
                                                    className={`w-full rounded-sm transition-colors ${isToday
                                                            ? 'bg-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                                            : `${isDark ? 'bg-gray-800' : 'bg-gray-100'} group-hover:bg-[#06b6d4]/30`
                                                        }`}
                                                    style={{ height: `${h}%` }}
                                                ></div>
                                                <span className={`text-[9px] font-bold ${isToday ? 'text-[#06b6d4]' : 'text-gray-400'}`}>{day}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Heatmap */}
                            <div className={`col-span-12 lg:col-span-5 ${cardBgClass} border ${borderClass} rounded-lg p-4 flex flex-col min-h-[240px]`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-tight">Focus Intensity Heatmap</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] text-gray-400">Less</span>
                                        <div className="flex gap-0.5">
                                            {heatmapColors.slice(1).map((c, i) => (
                                                <div key={i} className={`w-2 h-2 rounded-sm ${c.split(' ')[0]} ${c.split(' ')[1] || ''}`}></div>
                                            ))}
                                        </div>
                                        <span className="text-[9px] text-gray-400">More</span>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center overflow-x-auto">
                                    <div className="min-w-[400px]" style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto repeat(24, 1fr)',
                                        gap: '3px'
                                    }}>
                                        {/* Time Labels */}
                                        <div className="text-[8px] text-gray-400 h-3"></div>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className="text-[8px] text-gray-400 text-center col-span-2">
                                                {(i * 2).toString().padStart(2, '0')}
                                            </div>
                                        ))}

                                        {/* Days Rows */}
                                        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, dIndex) => (
                                            <>
                                                <div key={`label-${day}`} className="text-[9px] font-bold text-gray-400 pr-2 self-center">{day}</div>
                                                {Array.from({ length: 24 }).map((_, hIndex) => {
                                                    const val = Math.floor(Math.random() * 5); // Random intensity
                                                    const colorClass = heatmapColors[val];
                                                    return (
                                                        <div key={`${day}-${hIndex}`} className={`aspect-square rounded-[2px] ${colorClass}`}></div>
                                                    );
                                                })}
                                            </>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Side Column */}
                            <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                                {/* Focus Streak */}
                                <div className={`flex-1 ${cardBgClass} border ${borderClass} rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                                    <div className={`w-9 h-9 rounded-lg ${isDark ? 'bg-orange-500/10' : 'bg-orange-100'} flex items-center justify-center text-orange-500`}>
                                        <Flame size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Focus Streak</h4>
                                        <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {completedSessions.length > 0 ? `${completedSessions.length} Days` : '0 Days'}
                                        </p>
                                    </div>
                                </div>

                                {/* Daily Goal */}
                                <div className={`flex-1 ${cardBgClass} border ${borderClass} rounded-lg p-3 flex flex-col justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Daily Goal</h4>
                                        <span className="text-[10px] text-pink-500 font-bold">
                                            {Math.round(Math.min((getTotalStudyTime().total / 240) * 100, 100))}%
                                        </span>
                                    </div>
                                    <div className={`w-full h-1.5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                                        <div
                                            className="h-full bg-pink-500 transition-all duration-500"
                                            style={{ width: `${Math.min((getTotalStudyTime().total / 240) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Total Focus */}
                                <div className={`flex-1 ${cardBgClass} border ${borderClass} rounded-lg p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}>
                                    <div className={`w-9 h-9 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'} flex items-center justify-center text-emerald-500`}>
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Total Focus</h4>
                                        <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{getTotalStudyTime().total} mins</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity / Bottom Bar */}
                    <div className="col-span-12">
                        <div className={`w-full ${cardBgClass} border ${borderClass} rounded-lg px-4 py-2.5 flex justify-between items-center`}>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Activity</span>
                                <div className="flex -space-x-1.5">
                                    <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-gray-900 bg-cyan-900' : 'border-white bg-cyan-100'}`}></div>
                                    <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-gray-900 bg-cyan-800' : 'border-white bg-cyan-200'}`}></div>
                                    <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-gray-900 bg-cyan-700' : 'border-white bg-cyan-300'}`}></div>
                                </div>
                            </div>
                            <button className="text-[10px] font-bold text-[#06b6d4] hover:underline uppercase tracking-tight">
                                Explore Full History →
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            <script dangerouslySetInnerHTML={{
                __html: `
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                }
            `}} />
        </div>
    );
}
