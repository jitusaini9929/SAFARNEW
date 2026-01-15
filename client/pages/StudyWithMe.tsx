import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/utils/authService';
import { X, Sun, Moon, Play, Pause, Flame, Target, BarChart3, Info, GripHorizontal, ChevronDown, Check, ArrowRight, Plus } from 'lucide-react';

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

interface TaskItem {
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
    const [isDark, setIsDark] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [customMinutes, setCustomMinutes] = useState(25);
    const [activePreset, setActivePreset] = useState<number | null>(null); // Changed default to null
    const [showCustomSettings, setShowCustomSettings] = useState(false); // For custom timer toggle
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [newTaskInput, setNewTaskInput] = useState('');

    const addTask = () => {
        if (!newTaskInput.trim()) return;
        const newTask: TaskItem = {
            id: Date.now().toString(),
            text: newTaskInput,
            completed: false
        };
        setTasks([...tasks, newTask]);
        setNewTaskInput('');
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    };

    const handleKeyDownTask = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addTask();
        }
    };

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

            {/* Provided "Deep Focus Session" Design with Integrated Logic */ }
            < div className = {`flex h-screen w-full overflow-hidden ${isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-white text-slate-800'}`
    }>
        {/* Left Panel - Timer */ }
        < div className = "flex-1 flex flex-col border-r border-slate-100 dark:border-slate-800 relative" >
                        <div className="flex justify-between items-center p-6 w-full">
                            <button onClick={finishSession} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="text-slate-400" size={24} strokeWidth={2} />
                            </button>
                            <button onClick={() => setIsDark(!isDark)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                {isDark ? <Sun className="text-slate-400" size={24} strokeWidth={2} /> : <Moon className="text-slate-400" size={24} strokeWidth={2} />}
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500 mb-4">
                                <div className={`w-1.5 h-1.5 rounded-full bg-[#00BCD4] animate-pulse`}></div>
                                <span className="text-xs font-bold uppercase tracking-wider">{isBreak ? 'Rest Mode' : 'Focus Mode'}</span>
                            </div>
                            
                            <h1 className="text-2xl font-bold mb-12 dark:text-white">
                                {isBreak ? 'Time to Recharge' : 'Deep Focus Session'}
                            </h1>
                            
                            <div className="relative w-72 h-72 mb-12 flex items-center justify-center">
                                {/* Outer Ring Border */}
                                <div className="absolute inset-0 rounded-full border-[6px] border-slate-100 dark:border-slate-800"></div>
                                
                                {/* SVG Ring */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90 timer-glow" style={{ filter: 'drop-shadow(0 0 15px rgba(0, 188, 212, 0.4))' }}>
                                    <circle 
                                        className="text-[#00BCD4] transition-all duration-1000 ease-linear" 
                                        cx="144" cy="144" r="141" 
                                        fill="transparent" 
                                        stroke="currentColor" 
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 141}`}
                                        strokeDashoffset={`${2 * Math.PI * 141 * (1 - progressPercent / 100)}`}
                                    ></circle>
                                </svg>
                                
                                {/* Inner Gradient Circle (Static for now based on image, or could be dynamic) */}
                                <div className="w-48 h-48 rounded-full bg-[#00BCD4] flex items-center justify-center shadow-lg relative z-10">
                                    <div className="w-4 h-4 rounded-full bg-white/90"></div>
                                </div>
                                
                                {/* Rotating Hand */}
                                <div className="absolute inset-0 flex justify-center pointer-events-none z-20" 
                                     style={{ 
                                         transform: `rotate(${progressPercent * 3.6}deg)`,
                                         transition: 'transform 1s linear'
                                     }}>
                                    {/* Hand - Lengthened slightly as requested */}
                                    <div className="w-1.5 h-[55%] bg-[#00BCD4] origin-bottom relative top-0 rounded-full -translate-y-[22%]">
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-[#00BCD4] rounded-full shadow-sm"></div>
                                    </div>
                                </div>
                                
                                {/* Cardinal Points Markers */}
                                <div className="absolute inset-0">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-slate-800 dark:bg-slate-200 rounded-b-full"></div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-4 bg-slate-800 dark:bg-slate-200 rounded-t-full"></div>
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-4 bg-slate-800 dark:bg-slate-200 rounded-r-full"></div>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-4 bg-slate-800 dark:bg-slate-200 rounded-l-full"></div>
                                </div>
                            </div>
                            
                            <div className="text-center mb-8">
                                <div className="text-6xl font-light tracking-tight dark:text-white tabular-nums">
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="text-sm text-slate-400 mt-2 font-medium">time remaining</div>
                            </div>
                            
                            <button onClick={toggleTimer} className="flex items-center gap-2 text-[#00BCD4] font-bold hover:opacity-80 transition-opacity uppercase tracking-widest text-sm mb-12">
                                {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                {isRunning ? 'Pause' : 'Start'}
                            </button>
                            
                            <button onClick={finishSession} className="w-full max-w-sm bg-[#00BCD4] text-white font-bold py-4 rounded-full shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
                                Finish Session
                            </button>
                        </div>
                    </div >

        {/* Right Panel - Tasks */ }
        < div className = "w-[500px] flex flex-col p-8 bg-slate-50/50 dark:bg-slate-900/50 border-l border-slate-100 dark:border-slate-800" >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <GripHorizontal className="text-[#00BCD4]" size={24} />
                                <h2 className="text-xl font-bold dark:text-white">Tasks</h2>
                            </div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{tasks.filter(t => t.completed).length}/{tasks.length} done</span>
                        </div>
                        
                        <div className="relative mb-6">
                            <input 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-6 pr-16 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#00BCD4] focus:border-transparent outline-none transition-all shadow-sm" 
                                placeholder="Add a task for this session..." 
                                type="text"
                                value={newTaskInput}
                                onChange={(e) => setNewTaskInput(e.target.value)}
                                onKeyDown={handleKeyDownTask}
                            />
                            <button onClick={addTask} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#00BCD4] text-white p-2 rounded-xl hover:bg-cyan-600 transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>

    {
        tasks.length === 0 ? (
            <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center px-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                    <Check className="text-slate-400" size={32} />
                </div>
                <h3 className="text-slate-600 dark:text-slate-300 font-semibold mb-2">No tasks yet.</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                    Add tasks to track what you want to accomplish during this session.
                </p>
            </div>
        ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {tasks.map(task => (
                <div key={task.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${task.completed
                        ? 'bg-slate-100 dark:bg-slate-800/50 border-transparent opacity-60'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                    }`}>
                    <button
                        onClick={() => toggleTask(task.id)}
                        className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${task.completed
                                ? 'bg-[#00BCD4] border-[#00BCD4] text-white'
                                : 'border-slate-300 hover:border-[#00BCD4]'
                            }`}
                    >
                        {task.completed && <Check size={14} strokeWidth={4} />}
                    </button>
                    <p className={`text-base font-medium leading-relaxed pt-0.5 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                        {task.text}
                    </p>
                </div>
            ))}
        </div>
    )
    }
                    </div >
                </div >
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
                    <div
                        className={`w-full ${cardBgClass} border ${borderClass} rounded-lg px-4 py-2 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group`}
                        onClick={() => setShowCustomSettings(!showCustomSettings)}
                    >
                        <div className="flex items-center gap-2">
                            <GripHorizontal className="text-[#06b6d4]" size={20} />
                            <span className={`font-medium text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Custom Timer Settings</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-gray-400">POMODORO MODE</span>
                            <ChevronDown className={`text-gray-400 transition-transform ${showCustomSettings ? 'rotate-180' : ''}`} size={18} />
                        </div>
                    </div>

                    {/* Expandable Custom Settings Panel */}
                    {showCustomSettings && (
                        <div className={`w-full ${cardBgClass} border ${borderClass} rounded-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200`}>
                            <div className="flex flex-col gap-2">
                                <label className={`text-xs font-bold ${mutedTextClass} uppercase`}>Duration (minutes)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="5"
                                        max="120"
                                        step="5"
                                        value={customMinutes}
                                        onChange={(e) => setCustomMinutes(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
                                    />
                                    <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} w-16 text-center`}>{customMinutes}m</span>
                                </div>
                            </div>
                            <button
                                onClick={startCustomSession}
                                className="w-full bg-[#06b6d4] hover:bg-cyan-600 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={16} fill="currentColor" />
                                START CUSTOM SESSION
                            </button>
                        </div>
                    )}
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
