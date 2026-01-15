import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/utils/authService';
import { X, Moon, Sun, Play, Pause, ChevronDown, Plus, Check, Trash2, ListTodo } from 'lucide-react';

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

export default function StudyWithMe() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<SessionType | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [completedSessions, setCompletedSessions] = useState<Session[]>([]);
    const [currentSessionStart, setCurrentSessionStart] = useState<Date | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskText, setNewTaskText] = useState('');
    const [focusTitle, setFocusTitle] = useState('Deep Focus Session');
    const [isDark, setIsDark] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [customStudy, setCustomStudy] = useState(30);
    const [customBreak, setCustomBreak] = useState(5);
    const [showCustom, setShowCustom] = useState(false);
    const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
    const [focusCount, setFocusCount] = useState(0);
    // Custom timer state (hours, minutes, seconds)
    const [studyHours, setStudyHours] = useState(0);
    const [studyMinutes, setStudyMinutes] = useState(25);
    const [studySeconds, setStudySeconds] = useState(0);
    const [breakHours, setBreakHours] = useState(0);
    const [breakMinutes, setBreakMinutes] = useState(5);
    const [breakSeconds, setBreakSeconds] = useState(0);

    const sessionTypes: SessionType[] = [
        { duration: 25, break: 5, label: '25 min' },
        { duration: 30, break: 5, label: '30 min' },
        { duration: 45, break: 10, label: '45 min' },
        { duration: 60, break: 10, label: '60 min' },
        { duration: 90, break: 15, label: '90 min' }
    ];

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await authService.getCurrentUser();
                if (!data || !data.user) {
                    navigate('/login');
                    return;
                }
                setUser(data.user);
            } catch (error) {
                navigate('/login');
            }
        };
        checkAuth();
    }, [navigate]);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning && selectedSession) {
            handleSessionComplete();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft]);

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
            setFocusCount(prev => prev + 1);

            // Auto switch to short break
            setIsBreak(true);
            setTimerMode('shortBreak');
            setTimeLeft(5 * 60);
            setIsRunning(true);
        } else if (isBreak && selectedSession) {
            setIsBreak(false);
            setTimerMode('focus');
            setTimeLeft(selectedSession.duration * 60);
        }
    };

    const startSession = (session: SessionType) => {
        setSelectedSession(session);
        setTimeLeft(session.duration * 60);
        setIsBreak(false);
        setIsRunning(false);
        setShowCustom(false);
    };

    const startCustomSession = () => {
        const totalStudyMinutes = studyHours * 60 + studyMinutes + studySeconds / 60;
        const totalBreakMinutes = breakHours * 60 + breakMinutes + breakSeconds / 60;
        const studySeconds_total = studyHours * 3600 + studyMinutes * 60 + studySeconds;
        const breakSeconds_total = breakHours * 3600 + breakMinutes * 60 + breakSeconds;

        if (studySeconds_total > 0 && breakSeconds_total > 0) {
            setSelectedSession({
                duration: Math.ceil(totalStudyMinutes),
                break: Math.ceil(totalBreakMinutes),
                label: `${studyHours > 0 ? studyHours + 'h ' : ''}${studyMinutes}m${studySeconds > 0 ? ' ' + studySeconds + 's' : ''}`
            });
            setTimeLeft(studySeconds_total);
            setIsBreak(false);
            setIsRunning(false);
            setShowCustom(false);
            setTimerMode('focus');
        }
    };

    const toggleTimer = () => {
        if (!isRunning && !isBreak && !currentSessionStart) {
            setCurrentSessionStart(new Date());
        }
        setIsRunning(!isRunning);
    };

    const finishSession = () => {
        if (currentSessionStart && selectedSession && !isBreak) {
            const sessionEnd = new Date();
            const actualMinutes = Math.floor((sessionEnd.getTime() - currentSessionStart.getTime()) / 60000);
            if (actualMinutes > 0) {
                setCompletedSessions(prev => [...prev, {
                    start: currentSessionStart,
                    end: sessionEnd,
                    duration: actualMinutes
                }]);
            }
        }
        setIsRunning(false);
        setIsBreak(false);
        setCurrentSessionStart(null);
        setSelectedSession(null);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getTotalStudyTime = () => {
        const total = completedSessions.reduce((acc, session) => acc + session.duration, 0);
        const hours = Math.floor(total / 60);
        const mins = total % 60;
        return { hours, mins, total };
    };

    // Calculate hand rotation based on time elapsed
    const getHandRotation = () => {
        if (!selectedSession) return 0;
        const totalSeconds = isBreak ? selectedSession.break * 60 : selectedSession.duration * 60;
        const elapsed = totalSeconds - timeLeft;
        return (elapsed / totalSeconds) * 360;
    };

    // Calculate progress percentage (how much time is remaining)
    const getProgressPercent = () => {
        if (!selectedSession) return 100;
        const totalSeconds = isBreak ? selectedSession.break * 60 : selectedSession.duration * 60;
        return (timeLeft / totalSeconds) * 100;
    };

    // SVG circle circumference for progress ring
    const circleRadius = 46;
    const circumference = 2 * Math.PI * circleRadius;
    const progressOffset = circumference - (getProgressPercent() / 100) * circumference;

    if (!user) return null;

    const bgClass = isDark ? 'bg-zinc-950' : 'bg-zinc-100';
    const textClass = isDark ? 'text-zinc-100' : 'text-zinc-900';
    const cardBgClass = isDark ? 'bg-zinc-900' : 'bg-white';
    const mutedTextClass = isDark ? 'text-zinc-400' : 'text-zinc-500';

    // Session Selection Screen
    if (!selectedSession) {
        return (
            <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300 p-8`}>
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-12">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className={`${mutedTextClass} hover:text-cyan-500 transition-colors`}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`${mutedTextClass} hover:text-cyan-500 transition-colors`}
                        >
                            {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-2">Study With Me 📚</h1>
                        <p className={mutedTextClass}>Choose your focus session duration</p>
                    </div>

                    {/* Session Options */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                        {sessionTypes.map((session, idx) => (
                            <button
                                key={idx}
                                onClick={() => startSession(session)}
                                className="p-6 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/30"
                            >
                                <div className="text-2xl font-bold mb-1">{session.duration}</div>
                                <div className="text-sm opacity-80">minutes</div>
                                <div className="text-xs opacity-60 mt-2">{session.break}min break</div>
                            </button>
                        ))}
                    </div>

                    {/* Custom Timer */}
                    <div className={`${cardBgClass} rounded-2xl p-6 border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                        <button
                            onClick={() => setShowCustom(!showCustom)}
                            className="w-full flex items-center justify-between py-2"
                        >
                            <span className="font-semibold">Custom Timer</span>
                            <ChevronDown className={`w-5 h-5 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
                        </button>

                        {showCustom && (
                            <div className="mt-4 space-y-6">
                                {/* Study Duration */}
                                <div>
                                    <label className={`block text-sm font-medium ${mutedTextClass} mb-3`}>Study Duration</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <div className={`text-xs ${mutedTextClass} mb-1 text-center`}>Hours</div>
                                            <input
                                                type="number"
                                                min="0"
                                                max="23"
                                                value={studyHours}
                                                onChange={(e) => setStudyHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                                className={`w-full px-3 py-3 text-center text-xl font-bold ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                            />
                                        </div>
                                        <span className={`text-2xl font-bold ${mutedTextClass}`}>:</span>
                                        <div className="flex-1">
                                            <div className={`text-xs ${mutedTextClass} mb-1 text-center`}>Minutes</div>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={studyMinutes}
                                                onChange={(e) => setStudyMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                                className={`w-full px-3 py-3 text-center text-xl font-bold ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                            />
                                        </div>
                                        <span className={`text-2xl font-bold ${mutedTextClass}`}>:</span>
                                        <div className="flex-1">
                                            <div className={`text-xs ${mutedTextClass} mb-1 text-center`}>Seconds</div>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={studySeconds}
                                                onChange={(e) => setStudySeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                                className={`w-full px-3 py-3 text-center text-xl font-bold ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Break Duration */}
                                <div>
                                    <label className={`block text-sm font-medium ${mutedTextClass} mb-3`}>Break Duration</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <div className={`text-xs ${mutedTextClass} mb-1 text-center`}>Hours</div>
                                            <input
                                                type="number"
                                                min="0"
                                                max="23"
                                                value={breakHours}
                                                onChange={(e) => setBreakHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                                className={`w-full px-3 py-3 text-center text-xl font-bold ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                            />
                                        </div>
                                        <span className={`text-2xl font-bold ${mutedTextClass}`}>:</span>
                                        <div className="flex-1">
                                            <div className={`text-xs ${mutedTextClass} mb-1 text-center`}>Minutes</div>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={breakMinutes}
                                                onChange={(e) => setBreakMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                                className={`w-full px-3 py-3 text-center text-xl font-bold ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                            />
                                        </div>
                                        <span className={`text-2xl font-bold ${mutedTextClass}`}>:</span>
                                        <div className="flex-1">
                                            <div className={`text-xs ${mutedTextClass} mb-1 text-center`}>Seconds</div>
                                            <input
                                                type="number"
                                                min="0"
                                                max="59"
                                                value={breakSeconds}
                                                onChange={(e) => setBreakSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                                className={`w-full px-3 py-3 text-center text-xl font-bold ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={startCustomSession}
                                    className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl transition-all"
                                >
                                    Start Custom Session
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Analytics Dashboard */}
                    <div className="mt-8 space-y-6">
                        {/* Analytics Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-cyan-700'}`}>Focus Analytics</h2>
                                <p className={mutedTextClass}>Your productivity insights</p>
                            </div>
                            <div className={`flex items-center ${cardBgClass} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} rounded-full px-4 py-2 shadow-sm`}>
                                <span className={`text-sm font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>This Week</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column - Charts */}
                            <div className="lg:col-span-8 space-y-6">
                                {/* Daily Overview */}
                                <div className={`${cardBgClass} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} rounded-3xl p-6 shadow-sm`}>
                                    <div className="flex justify-between items-end mb-6">
                                        <div>
                                            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-cyan-700'} mb-1`}>Daily Overview</h3>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                                    {getTotalStudyTime().hours}h {getTotalStudyTime().mins}m
                                                </span>
                                                {completedSessions.length > 0 && (
                                                    <span className="text-green-500 font-medium text-sm">↑ {completedSessions.length} sessions</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600"></span>
                                                <span className={mutedTextClass}>Focus</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`}></span>
                                                <span className={mutedTextClass}>Break</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bar Chart */}
                                    <div className="h-40 flex items-end gap-2 px-1">
                                        {[40, 65, 85, 45, 25, 70, 55, 75, 35].map((height, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                                <div className={`w-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} rounded-full h-32 relative flex flex-col justify-end overflow-hidden`}>
                                                    <div
                                                        className={`w-full rounded-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all group-hover:opacity-100 ${i === 2 ? 'opacity-100' : 'opacity-60'}`}
                                                        style={{ height: `${height}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-medium ${i === 2 ? (isDark ? 'text-cyan-400' : 'text-cyan-600 font-bold') : mutedTextClass}`}>
                                                    {12 + i}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Activity Trends */}
                                <div className={`${cardBgClass} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} rounded-3xl p-6 shadow-sm`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-cyan-700'}`}>Activity Trends</h3>
                                    </div>
                                    <div className="h-32 grid grid-cols-7 gap-4 items-end">
                                        {[
                                            { day: 'Mon', focus: 40, break: 30 },
                                            { day: 'Tue', focus: 65, break: 50 },
                                            { day: 'Wed', focus: 25, break: 15 },
                                            { day: 'Thu', focus: 80, break: 70 },
                                            { day: 'Fri', focus: 50, break: 55, active: true },
                                            { day: 'Sat', focus: 30, break: 20 },
                                            { day: 'Sun', focus: 15, break: 10 },
                                        ].map((item, i) => (
                                            <div key={i} className="group flex flex-col items-center gap-2 h-full justify-end cursor-pointer">
                                                <div className="flex items-end gap-1 h-full w-full justify-center">
                                                    <div
                                                        className={`w-2 rounded-t-sm ${isDark ? 'bg-cyan-500' : 'bg-cyan-600'} ${item.active ? 'opacity-100' : 'opacity-40'}`}
                                                        style={{ height: `${item.focus}%` }}
                                                    />
                                                    <div
                                                        className="w-2 rounded-t-sm bg-amber-500"
                                                        style={{ height: `${item.break}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs ${item.active ? (isDark ? 'font-bold text-cyan-400' : 'font-bold text-cyan-600') : mutedTextClass}`}>
                                                    {item.day}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Stats Cards */}
                            <div className="lg:col-span-4 space-y-4">
                                {/* Stat Cards */}
                                <div className={`${cardBgClass} border-2 ${isDark ? 'border-cyan-800/30' : 'border-cyan-200'} rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-4`}>
                                    <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'} flex items-center justify-center text-cyan-500 shrink-0`}>
                                        ⏱️
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-zinc-800'}`}>Focus Streak</h4>
                                        <p className={`text-xs ${mutedTextClass}`}>Current: {completedSessions.length} sessions</p>
                                    </div>
                                </div>

                                <div className={`${cardBgClass} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-4`}>
                                    <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-amber-900/30' : 'bg-amber-100'} flex items-center justify-center text-amber-500 shrink-0`}>
                                        🎯
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-zinc-800'}`}>Daily Goal</h4>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`w-16 h-1.5 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'} rounded-full overflow-hidden`}>
                                                <span className="block bg-amber-500 h-full rounded-full" style={{ width: `${Math.min((getTotalStudyTime().total / 240) * 100, 100)}%` }}></span>
                                            </span>
                                            <span className={mutedTextClass}>{getTotalStudyTime().total}/240 min</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`${cardBgClass} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center gap-4`}>
                                    <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-green-900/30' : 'bg-green-100'} flex items-center justify-center text-green-500 shrink-0`}>
                                        📚
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-zinc-800'}`}>Total Minutes</h4>
                                        <p className={`text-xs ${mutedTextClass}`}>{getTotalStudyTime().total} minutes focused</p>
                                    </div>
                                </div>

                                {/* Most Focused Section */}
                                <div className={`${cardBgClass} border ${isDark ? 'border-zinc-800' : 'border-zinc-200'} rounded-3xl p-5 shadow-sm flex-1`}>
                                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-cyan-700'} mb-4`}>Session Summary</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold ${mutedTextClass} w-4`}>01</span>
                                                <div>
                                                    <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>Sessions</p>
                                                    <p className={`text-[10px] ${mutedTextClass}`}>{completedSessions.length} completed</p>
                                                </div>
                                            </div>
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#06b6d4 ${(completedSessions.length / 5) * 100}%, transparent 0)` }}></div>
                                                <div className={`absolute inset-1 ${cardBgClass} rounded-full`}></div>
                                                <span className={`relative text-[9px] font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{Math.min(completedSessions.length * 20, 100)}%</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold ${mutedTextClass} w-4`}>02</span>
                                                <div>
                                                    <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>Focus Time</p>
                                                    <p className={`text-[10px] ${mutedTextClass}`}>{getTotalStudyTime().hours}h {getTotalStudyTime().mins}m</p>
                                                </div>
                                            </div>
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#f59e0b ${Math.min((getTotalStudyTime().total / 240) * 100, 100)}%, transparent 0)` }}></div>
                                                <div className={`absolute inset-1 ${cardBgClass} rounded-full`}></div>
                                                <span className={`relative text-[9px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{Math.min(Math.round((getTotalStudyTime().total / 240) * 100), 100)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Focus Timer Screen (Fullscreen when running)
    return (
        <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300`}>
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Timer Section */}
                <div className={`flex-1 flex flex-col items-center justify-between p-8 lg:p-12 ${cardBgClass} border-r ${isDark ? 'border-zinc-800' : 'border-zinc-300 shadow-lg'} relative`}>
                    {/* Header */}
                    <div className="w-full flex justify-between items-center">
                        <button
                            onClick={finishSession}
                            className={`${mutedTextClass} hover:text-cyan-500 transition-colors`}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`${mutedTextClass} hover:text-cyan-500 transition-colors`}
                        >
                            {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </button>
                    </div>

                    {/* Focus Title */}
                    <div className="flex flex-col items-center mt-4 space-y-4">
                        {/* Session Counter */}
                        <div className={`flex items-center space-x-2 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} px-4 py-1.5 rounded-full`}>
                            <span className={`text-sm font-semibold ${timerMode === 'focus' ? 'text-cyan-500' : timerMode === 'shortBreak' ? 'text-green-500' : 'text-amber-500'}`}>
                                {timerMode === 'focus' ? 'FOCUS' : timerMode === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK'}
                            </span>
                            <span className={mutedTextClass}>{focusCount} / 4</span>
                        </div>

                        {/* Mode Switching Tabs */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setTimerMode('focus');
                                    setIsBreak(false);
                                    if (selectedSession) setTimeLeft(selectedSession.duration * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-6 py-4 rounded-xl transition-all ${timerMode === 'focus'
                                    ? 'bg-cyan-500/20 border-2 border-cyan-500'
                                    : isDark ? 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600' : 'bg-zinc-100 border border-zinc-300 hover:border-zinc-400'
                                    }`}
                            >
                                <div className="text-sm font-medium text-red-400 mb-1">
                                    Focus
                                </div>
                                <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    {selectedSession?.duration || 25} min
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setTimerMode('shortBreak');
                                    setIsBreak(true);
                                    setTimeLeft(5 * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-6 py-4 rounded-xl transition-all ${timerMode === 'shortBreak'
                                    ? 'bg-green-500/20 border-2 border-green-500'
                                    : isDark ? 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600' : 'bg-zinc-100 border border-zinc-300 hover:border-zinc-400'
                                    }`}
                            >
                                <div className="text-sm font-medium text-blue-400 mb-1">
                                    Short Break
                                </div>
                                <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    5 min
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setTimerMode('longBreak');
                                    setIsBreak(true);
                                    setTimeLeft(25 * 60);
                                    setIsRunning(false);
                                }}
                                className={`px-6 py-4 rounded-xl transition-all ${timerMode === 'longBreak'
                                    ? 'bg-amber-500/20 border-2 border-amber-500'
                                    : isDark ? 'bg-zinc-800 border border-zinc-700 hover:border-zinc-600' : 'bg-zinc-100 border border-zinc-300 hover:border-zinc-400'
                                    }`}
                            >
                                <div className="text-sm font-medium text-amber-400 mb-1">
                                    Long Break
                                </div>
                                <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    25 min
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Analog Clock Timer */}
                    <div className="relative w-64 h-64 lg:w-80 lg:h-80 my-8 flex items-center justify-center">
                        {/* Progress Ring (draining animation) */}
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Background ring (gray) */}
                            <circle
                                cx="50" cy="50" r={circleRadius}
                                fill="none"
                                stroke={isDark ? '#3f3f46' : '#d4d4d8'}
                                strokeWidth="3"
                            />
                            {/* Progress ring (cyan/green that drains) */}
                            <circle
                                cx="50" cy="50" r={circleRadius}
                                fill="none"
                                stroke={isBreak ? '#22c55e' : '#06b6d4'}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={progressOffset}
                                className="transition-all duration-1000 ease-linear"
                                style={{
                                    filter: `drop-shadow(0 0 6px ${isBreak ? 'rgba(34, 197, 94, 0.6)' : 'rgba(6, 182, 212, 0.6)'})`
                                }}
                            />
                        </svg>

                        {/* Clock Markers */}
                        <svg className={`absolute inset-0 w-full h-full transform -rotate-90 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} viewBox="0 0 100 100">
                            <g>
                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                                    <line
                                        key={deg}
                                        className={i % 3 === 0 ? (isDark ? 'text-zinc-200' : 'text-zinc-800') : ''}
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeWidth={i % 3 === 0 ? "1.5" : "0.5"}
                                        transform={`rotate(${deg} 50 50)`}
                                        x1="50" x2="50"
                                        y1="5" y2={i % 3 === 0 ? "10" : "8"}
                                    />
                                ))}
                            </g>
                        </svg>

                        {/* Glowing Center - opacity based on remaining time */}
                        <div
                            className={`absolute w-40 h-40 lg:w-48 lg:h-48 rounded-full ${isBreak ? 'bg-green-500/20' : 'bg-cyan-500/20'} flex items-center justify-center transition-opacity duration-1000`}
                            style={{
                                boxShadow: `0 0 40px ${isBreak ? 'rgba(34, 197, 94, 0.2)' : 'rgba(6, 182, 212, 0.2)'}`,
                                opacity: 0.3 + (getProgressPercent() / 100) * 0.7
                            }}
                        >
                            <div
                                className={`w-full h-full rounded-full bg-gradient-to-br ${isBreak ? 'from-green-400 to-green-600' : 'from-cyan-400 to-cyan-600'} transition-opacity duration-1000`}
                                style={{ opacity: 0.4 + (getProgressPercent() / 100) * 0.5 }}
                            ></div>
                        </div>

                        {/* Rotating Hand */}
                        <div
                            className="absolute inset-0 flex items-center justify-center transition-transform duration-1000"
                            style={{ transform: `rotate(${getHandRotation()}deg)` }}
                        >
                            <div className={`relative h-1/2 w-1.5 ${isBreak ? 'bg-green-500' : 'bg-cyan-500'} rounded-full`}
                                style={{
                                    transformOrigin: 'bottom center',
                                    marginBottom: '50%',
                                    filter: `drop-shadow(0 0 8px ${isBreak ? 'rgba(34, 197, 94, 0.8)' : 'rgba(6, 182, 212, 0.8)'})`
                                }}
                            >
                                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 ${isDark ? 'bg-zinc-100' : 'bg-white'} rounded-full border-2 ${isBreak ? 'border-green-500' : 'border-cyan-500'} shadow-lg`}></div>
                            </div>
                        </div>

                        {/* Center Dot */}
                        <div className={`absolute w-8 h-8 ${isDark ? 'bg-zinc-200' : 'bg-white'} rounded-full shadow-inner flex items-center justify-center`}>
                            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-zinc-400' : 'bg-zinc-300'}`}></div>
                        </div>
                    </div>

                    {/* Digital Time Display */}
                    <div className="flex flex-col items-center mb-8">
                        <div className={`text-5xl lg:text-6xl font-light tracking-widest ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                            {formatTime(timeLeft)}
                        </div>
                        <div className={`${mutedTextClass} text-sm mt-2`}>
                            {isBreak ? 'break time' : 'time remaining'}
                        </div>
                        <button
                            onClick={toggleTimer}
                            className="mt-6 text-cyan-500 font-medium hover:text-cyan-400 transition-colors uppercase tracking-widest text-xs border-b border-cyan-500/30 pb-0.5 flex items-center gap-2"
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="w-4 h-4" />
                                    pause
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    start
                                </>
                            )}
                        </button>
                    </div>

                    {/* Finish Button */}
                    <div className="w-full max-w-sm">
                        <button
                            onClick={finishSession}
                            className={`w-full ${isBreak ? 'bg-green-500 hover:bg-green-400 shadow-green-500/30' : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/30'} text-white font-bold py-4 rounded-full transition-all shadow-lg uppercase tracking-widest text-sm`}
                        >
                            Finish Session
                        </button>
                    </div>
                </div>

                {/* Tasks Section */}
                <div className={`flex-1 lg:flex-[1.2] flex flex-col p-8 lg:p-12 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <ListTodo className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Tasks</h2>
                        <span className={`ml-auto text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {tasks.filter(t => t.completed).length}/{tasks.length} done
                        </span>
                    </div>

                    {/* Add Task Input */}
                    <div className={`flex gap-3 mb-6 p-4 rounded-xl ${isDark ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200 shadow-sm'}`}>
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTaskText.trim()) {
                                    setTasks(prev => [...prev, { id: Date.now().toString(), text: newTaskText.trim(), completed: false }]);
                                    setNewTaskText('');
                                }
                            }}
                            placeholder="Add a task for this session..."
                            className={`flex-1 bg-transparent border-none outline-none text-lg ${isDark ? 'text-zinc-200 placeholder-zinc-600' : 'text-zinc-700 placeholder-zinc-400'}`}
                        />
                        <button
                            onClick={() => {
                                if (newTaskText.trim()) {
                                    setTasks(prev => [...prev, { id: Date.now().toString(), text: newTaskText.trim(), completed: false }]);
                                    setNewTaskText('');
                                }
                            }}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-cyan-500 hover:bg-cyan-400'} text-white`}
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tasks List */}
                    <div className={`flex-1 overflow-y-auto space-y-3 rounded-xl p-4 ${isDark ? 'bg-zinc-900/50 border border-zinc-800' : 'bg-white border border-zinc-200 shadow-sm'}`}>
                        {tasks.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center h-full py-12 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                <ListTodo className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-center">No tasks yet.<br />Add tasks to track what you want to accomplish.</p>
                            </div>
                        ) : (
                            tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${task.completed
                                        ? isDark ? 'bg-zinc-800/50 opacity-60' : 'bg-zinc-100 opacity-60'
                                        : isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200'
                                        }`}
                                >
                                    <button
                                        onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.completed
                                            ? 'bg-cyan-500 border-cyan-500 text-white'
                                            : isDark ? 'border-zinc-600 hover:border-cyan-500' : 'border-zinc-300 hover:border-cyan-500'
                                            }`}
                                    >
                                        {task.completed && <Check className="w-4 h-4" />}
                                    </button>
                                    <span className={`flex-1 text-lg ${task.completed
                                        ? 'line-through ' + (isDark ? 'text-zinc-500' : 'text-zinc-400')
                                        : isDark ? 'text-zinc-200' : 'text-zinc-700'
                                        }`}>
                                        {task.text}
                                    </span>
                                    <button
                                        onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}
                                        className={`p-2 rounded-lg transition-all opacity-50 hover:opacity-100 ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Background Glow Effects */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10 opacity-30">
                <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${isBreak ? 'bg-green-500/10' : 'bg-cyan-500/10'} rounded-full blur-[120px]`}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-400/5 rounded-full blur-[100px]"></div>
            </div>
        </div>
    );
}
