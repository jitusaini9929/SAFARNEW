import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/utils/authService';
import { X, Moon, Sun, Play, Pause, ChevronDown, Bold, Italic, List, Paperclip, Image } from 'lucide-react';

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
    const [notes, setNotes] = useState('');
    const [focusTitle, setFocusTitle] = useState('Deep Focus Session');
    const [isDark, setIsDark] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [customStudy, setCustomStudy] = useState(30);
    const [customBreak, setCustomBreak] = useState(5);
    const [showCustom, setShowCustom] = useState(false);

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
        setShowCustom(false);
    };

    const startCustomSession = () => {
        if (customStudy > 0 && customBreak > 0) {
            startSession({
                duration: customStudy,
                break: customBreak,
                label: `${customStudy} min`
            });
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
        const totalSeconds = selectedSession.duration * 60;
        const elapsed = totalSeconds - timeLeft;
        return (elapsed / totalSeconds) * 360;
    };

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
                            <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm ${mutedTextClass} mb-2`}>Study (min)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={customStudy}
                                            onChange={(e) => setCustomStudy(parseInt(e.target.value) || 0)}
                                            className={`w-full px-4 py-3 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm ${mutedTextClass} mb-2`}>Break (min)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={customBreak}
                                            onChange={(e) => setCustomBreak(parseInt(e.target.value) || 0)}
                                            className={`w-full px-4 py-3 ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-300'} border rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${textClass}`}
                                        />
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

                    {/* Today's Stats */}
                    {completedSessions.length > 0 && (
                        <div className={`mt-8 ${cardBgClass} rounded-2xl p-6 border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            <h3 className="font-semibold mb-4">Today's Progress</h3>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-cyan-500">{getTotalStudyTime().hours}h {getTotalStudyTime().mins}m</div>
                                    <div className={`text-sm ${mutedTextClass}`}>Total Time</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-500">{completedSessions.length}</div>
                                    <div className={`text-sm ${mutedTextClass}`}>Sessions</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-500">{getTotalStudyTime().total}</div>
                                    <div className={`text-sm ${mutedTextClass}`}>Minutes</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Focus Timer Screen (Fullscreen when running)
    return (
        <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300`}>
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Timer Section */}
                <div className={`flex-1 flex flex-col items-center justify-between p-8 lg:p-12 ${cardBgClass} border-r ${isDark ? 'border-zinc-800' : 'border-zinc-200'} relative`}>
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
                    <div className="flex flex-col items-center mt-4 space-y-3">
                        <div className={`flex items-center space-x-2 ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-50'} px-4 py-1.5 rounded-full border ${isDark ? 'border-cyan-800/50' : 'border-cyan-100'}`}>
                            <div className={`w-2 h-2 rounded-full bg-cyan-500 ${isRunning ? 'animate-pulse' : ''}`}></div>
                            <span className="text-cyan-500 text-sm font-semibold">
                                {isBreak ? 'Break Time' : 'Focus Mode'}
                            </span>
                        </div>
                        <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-center">{focusTitle}</h1>
                    </div>

                    {/* Analog Clock Timer */}
                    <div className="relative w-64 h-64 lg:w-80 lg:h-80 my-8 flex items-center justify-center">
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
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeDasharray="0.1 2.51"
                                    strokeWidth="0.5"
                                />
                            </g>
                        </svg>

                        {/* Glowing Center */}
                        <div className={`absolute w-40 h-40 lg:w-48 lg:h-48 rounded-full ${isBreak ? 'bg-green-500/20' : 'bg-cyan-500/20'} flex items-center justify-center`}
                            style={{ boxShadow: `0 0 40px ${isBreak ? 'rgba(34, 197, 94, 0.2)' : 'rgba(6, 182, 212, 0.2)'}` }}
                        >
                            <div className={`w-full h-full rounded-full bg-gradient-to-br ${isBreak ? 'from-green-400 to-green-600' : 'from-cyan-400 to-cyan-600'} opacity-90`}></div>
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

                {/* Notes Section */}
                <div className={`flex-1 lg:flex-[1.2] flex flex-col p-8 lg:p-12 ${bgClass}`}>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'} mb-6`}>Notes</h2>
                    <div className="flex-1 relative">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={`w-full h-full min-h-[300px] ${isDark ? 'bg-zinc-900/40 text-zinc-300 placeholder-zinc-600' : 'bg-white/60 text-zinc-600 placeholder-zinc-400'} backdrop-blur-sm border-none rounded-2xl p-6 focus:ring-2 focus:ring-cyan-500/20 text-lg leading-relaxed resize-none`}
                            placeholder="Write down your thoughts, your learning, or what you are confused about. Clarify your thoughts. Writing is thinking."
                        />
                    </div>
                    <div className={`mt-4 flex items-center space-x-4 px-2 ${mutedTextClass}`}>
                        <button className="p-2 hover:text-cyan-500 transition-colors">
                            <Bold className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:text-cyan-500 transition-colors">
                            <Italic className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:text-cyan-500 transition-colors">
                            <List className="w-5 h-5" />
                        </button>
                        <div className={`h-6 w-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>
                        <button className="p-2 hover:text-cyan-500 transition-colors">
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:text-cyan-500 transition-colors">
                            <Image className="w-5 h-5" />
                        </button>
                        <div className="ml-auto text-xs uppercase tracking-widest font-medium">
                            Auto-saved
                        </div>
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
