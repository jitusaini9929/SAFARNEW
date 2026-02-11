import { useState, useEffect, useRef } from "react";
import BreathingVisualizer from "@/components/meditation/BreathingVisualizer";
import { useNavigate } from "react-router-dom";
import meditationBg from "@/assets/meditation-bg.jpg";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/utils/authService";
import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    Clock,
    Wind,
    Heart,
    Sparkles,
    Moon,
    Sun,
    Volume2,
    VolumeX,
    Home,
    HelpCircle,
    Music,
    Image,
    List,
    Dumbbell,
} from "lucide-react";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { meditationTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import { Button } from "@/components/ui/button";
import BottomSheet from '@/components/ui/bottom-sheet';
import FloatingActionButton from '@/components/ui/floating-action-button';
import CourseBanner from '@/components/meditation/CourseBanner';

interface Session {
    id: string;
    title: string;
    duration: number; // in minutes
    description: string;
    longDescription: string;
    type: "breathing" | "guided" | "silent";
    steps: string[];
    cycle?: {
        inhale: number;
        holdIn: number;
        exhale: number;
        holdOut: number;
    };
}

const sessions: Session[] = [
    {
        id: "1",
        title: "Diaphragmatic Breathing",
        duration: 5,
        description: "Belly breathing for full oxygen exchange.",
        longDescription: "Also known as belly breathing, this technique engages the diaphragm to strengthen it and promote efficient respiration, reducing heart rate and stress.",
        type: "breathing",
        steps: [
            "Lie on your back with knees bent or sit comfortably.",
            "Place one hand on your upper chest and the other on your belly.",
            "Inhale slowly through your nose; feel your belly rise.",
            "Exhale slowly through your mouth; feel your belly lower.",
            "Keep the hand on your chest as still as possible."
        ],
        cycle: { inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 }
    },
    {
        id: "2",
        title: "Pursed Lip Breathing",
        duration: 5,
        description: "Slows breathing and keeps airways open.",
        longDescription: "A simple technique to slow down your breathing pace by applying effort against airflow resistance, helping to release trapped air in the lungs.",
        type: "breathing",
        steps: [
            "Relax your neck and shoulder muscles.",
            "Inhale slowly through your nose for 2 counts.",
            "Pucker your lips as if you're about to whistle.",
            "Exhale slowly and gently through your lips for 4 counts.",
            "Do not force the air out; repeat until calm."
        ],
        cycle: { inhale: 2, holdIn: 0, exhale: 4, holdOut: 0 }
    },
    {
        id: "3",
        title: "Box Breathing",
        duration: 5,
        description: "Rhythmic 4-4-4-4 breathing for stress reduction.",
        longDescription: "A powerful stress-relieving technique used by Navy SEALs that involves inhaling, holding, exhaling, and holding again in equal measure.",
        type: "breathing",
        steps: [
            "Sit upright and exhale completely.",
            "Inhale through your nose for 4 seconds.",
            "Hold your breath for 4 seconds.",
            "Exhale through your mouth for 4 seconds.",
            "Hold your empty breath for 4 seconds. Repeat."
        ],
        cycle: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 }
    },
    {
        id: "4",
        title: "4-7-8 Breathing",
        duration: 5,
        description: "Deep relaxation for anxiety and sleep.",
        longDescription: "A natural tranquilizer for the nervous system that helps reduce anxiety and aids sleep by extending the exhalation.",
        type: "breathing",
        steps: [
            "Exhale completely through your mouth with a 'whoosh'.",
            "Close your mouth and inhale through nose for 4 seconds.",
            "Hold your breath for 7 seconds.",
            "Exhale completely through mouth for 8 seconds.",
            "Repeat this cycle four times."
        ],
        cycle: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 }
    },
    {
        id: "5",
        title: "Alternate Nostril Breathing",
        duration: 5,
        description: "Balance left and right brain hemispheres.",
        longDescription: "An ancient yogic technique (Nadi Shodhana) that calms the mind, reduces anxiety, and balances the nervous system by alternating airflow through each nostril.",
        type: "breathing",
        steps: [
            "Sit comfortably with your spine straight.",
            "Close your right nostril with your thumb.",
            "Inhale slowly through your left nostril.",
            "Close your left nostril with your ring finger, release your thumb.",
            "Exhale slowly through your right nostril. Repeat alternating."
        ],
        cycle: { inhale: 4, holdIn: 0, exhale: 4, holdOut: 0 }
    },
];

const exercises = sessions; // Alias for mobile view compatibility

export default function Meditation() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<Session>(sessions[0]);
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(selectedSession.duration * 60);
    const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale" | "hold-empty">("inhale");
    const [isMuted, setIsMuted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showSessionList, setShowSessionList] = useState(false);
    const [showExercises, setShowExercises] = useState(false);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const breathTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authService.getCurrentUser();
                if (response?.user) {
                    setUser(response.user);
                }
            } catch (error) {
                console.error("Failed to fetch user", error);
            }
        };
        fetchUser();
    }, []);

    // Guided tour integration
    const { startTour } = useGuidedTour();

    useEffect(() => {
        // When session changes, reset but don't close instructions if user clicked a card
        setTimeLeft(selectedSession.duration * 60);
        setIsActive(false);
        setBreathPhase("inhale");
    }, [selectedSession]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((t) => t - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, timeLeft]);

    // Dynamic Breathing Animation Cycle
    useEffect(() => {
        if (isActive && selectedSession.type === "breathing" && selectedSession.cycle) {
            const { inhale, holdIn, exhale, holdOut } = selectedSession.cycle;

            const runCycle = () => {
                // Inhale Phase
                setBreathPhase("inhale");

                breathTimeoutRef.current = setTimeout(() => {
                    // Hold In Phase (if duration > 0)
                    if (holdIn > 0) {
                        setBreathPhase("hold");
                        breathTimeoutRef.current = setTimeout(() => {
                            // Exhale Phase
                            startExhale();
                        }, holdIn * 1000);
                    } else {
                        // Skip Hold In, straight to Exhale
                        startExhale();
                    }
                }, inhale * 1000);
            };

            const startExhale = () => {
                const { exhale, holdOut } = selectedSession.cycle!;
                setBreathPhase("exhale");

                breathTimeoutRef.current = setTimeout(() => {
                    // Hold Out Phase (if duration > 0)
                    if (holdOut > 0) {
                        setBreathPhase("hold-empty");
                        breathTimeoutRef.current = setTimeout(() => {
                            // Loop back to Inhale
                            runCycle();
                        }, holdOut * 1000);
                    } else {
                        // Loop back to Inhale
                        runCycle();
                    }
                }, exhale * 1000);
            };

            // Start the first cycle
            runCycle();
        }

        return () => {
            if (breathTimeoutRef.current) clearTimeout(breathTimeoutRef.current);
        };
    }, [isActive, selectedSession]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleReset = () => {
        setIsActive(false);
        setTimeLeft(selectedSession.duration * 60);
        setBreathPhase("inhale");
    };

    const handleCardClick = (session: Session) => {
        setSelectedSession(session);
        setShowInstructions(true);
        setIsActive(false); // Stop any running session
    };

    const startSession = () => {
        setShowInstructions(false);
        setIsActive(true);
    };

    const progress = ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100;

    return (
        <div className="h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0a0a0f] dark:to-[#0f0f17] transition-colors duration-500 font-sans overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200/50 dark:border-white/5">
                <button
                    onClick={() => navigate("/landing")}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    <Home className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Meditation</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startTour(meditationTour)}
                    className="gap-2"
                >
                    <HelpCircle className="w-4 h-4" />
                </Button>
            </header>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 3-COLUMN LAYOUT                                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <main className="flex-1 flex overflow-hidden">

                {/* Active Session Modal Overlay */}
                {isActive && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                        <div className={`relative bg-white dark:bg-[#12121a] rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/10 overflow-y-auto max-h-[90vh] ${selectedSession.id === '5' ? 'w-full max-w-xl' : 'w-full max-w-2xl p-8 md:p-10'}`}>
                            {/* Close / Stop Button */}
                            <button
                                onClick={() => { setIsActive(false); handleReset(); }}
                                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-all"
                            >
                                ✕
                            </button>

                            {selectedSession.id === '5' ? (
                                /* Session 5: Self-contained NostrilViz takes over */
                                <BreathingVisualizer
                                    sessionId={selectedSession.id}
                                    breathPhase={breathPhase}
                                    isActive={isActive}
                                    cycle={selectedSession.cycle}
                                />
                            ) : (
                                <div className="flex flex-col items-center w-full h-full justify-between min-h-[350px]">
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-1">{selectedSession.title}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-4 line-clamp-2">{selectedSession.description}</p>

                                    <div className="relative rounded-3xl p-4 md:p-6 bg-white/30 dark:bg-white/[0.02] shadow-lg ring-1 ring-slate-200/50 dark:ring-white/5 mb-4 flex-shrink-0">
                                        <BreathingVisualizer
                                            sessionId={selectedSession.id}
                                            breathPhase={breathPhase}
                                            isActive={isActive}
                                            cycle={selectedSession.cycle}
                                        />
                                    </div>

                                    {/* Phase Label */}
                                    <div className="text-center mb-4">
                                        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-500
                                            ${breathPhase === 'inhale' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                                breathPhase === 'exhale' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' :
                                                    'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}
                                        >
                                            {breathPhase === 'inhale' ? 'Inhale' : breathPhase === 'exhale' ? 'Exhale' : 'Hold'}
                                        </span>
                                    </div>

                                    {/* Timer */}
                                    <div className="text-4xl md:text-5xl font-light text-slate-800 dark:text-white font-mono tracking-wider tabular-nums mb-3">
                                        {formatTime(timeLeft)}
                                    </div>

                                    {/* Progress */}
                                    <div className="w-full max-w-xs h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-6 flex-shrink-0">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center justify-center gap-6 md:gap-8 pb-1">
                                        <button
                                            onClick={handleReset}
                                            className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-105"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setIsActive(!isActive)}
                                            className={`p-6 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95
                                                ${isActive
                                                    ? "bg-amber-500 text-white shadow-amber-500/40"
                                                    : "bg-emerald-500 text-white shadow-emerald-500/40"
                                                }`}
                                        >
                                            {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                                        </button>
                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-105"
                                        >
                                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ LEFT SIDEBAR ═══════ */}
                <aside className="hidden lg:flex flex-col w-[406px] min-w-[406px] border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0d0d14]/60 backdrop-blur-sm p-4 gap-4 overflow-y-auto">
                    {/* Course Banner with In-App Payment */}
                    <CourseBanner 
                        user={user ? { name: user.name, email: user.email } : null}
                        courseId="safar-30"
                    />

                    {/* Audio Library Placeholder */}
                    <div className="flex-1 rounded-2xl border-2 border-dashed border-slate-200/70 dark:border-white/10 p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[120px]">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <Music className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Audio Library</p>
                            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Coming Soon</p>
                        </div>
                    </div>
                </aside>

                {/* ═══════ CENTER CONTENT ═══════ */}
                <section className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-6">
                    {/* Background Image — very subtle */}
                    <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none select-none">
                        <img src={meditationBg} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Floating Gradient Orbs */}
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-300/5 dark:bg-sky-500/3 rounded-full blur-3xl pointer-events-none" />

                    {/* Center Content */}
                    <div className="relative z-10 flex flex-col items-center gap-5 max-w-md">
                        {/* Meditation Image */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-sky-300/30 to-transparent rounded-3xl blur-2xl scale-125" />
                            <img
                                src={meditationBg}
                                alt="Meditation"
                                className="relative w-56 h-32 md:w-72 md:h-40 object-cover object-top rounded-2xl shadow-lg shadow-sky-200/30 dark:shadow-sky-900/20"
                                style={{ filter: 'contrast(1.05) brightness(1.02)' }}
                            />
                        </div>

                        {/* Dhyan Section Description */}
                        <div className="text-center mt-2">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">Dhyan</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">A mindful space to breathe, relax, and restore inner calm through guided breathing techniques.</p>
                        </div>

                        {/* Timer Display */}
                        <div data-tour="timer-display" className="text-center">
                            <div className="text-6xl md:text-7xl font-light text-slate-800 dark:text-white font-mono tracking-wider tabular-nums">
                                {formatTime(timeLeft)}
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-2 tracking-wide">
                                Select a technique & press play
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-64 h-1.5 bg-slate-200/80 dark:bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center justify-center gap-8 mt-1">
                            <button
                                data-tour="reset-button"
                                onClick={handleReset}
                                className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-105 ring-1 ring-slate-200/50 dark:ring-white/5"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>

                            <button
                                data-tour="play-button"
                                onClick={() => setIsActive(true)}
                                className="p-7 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 bg-emerald-500 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60"
                            >
                                <Play className="w-9 h-9 fill-current ml-0.5" />
                            </button>

                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-105 ring-1 ring-slate-200/50 dark:ring-white/5"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </section>

                {/* ═══════ RIGHT SIDEBAR — Breathing Techniques ═══════ */}
                <aside className="hidden md:flex flex-col w-[300px] min-w-[300px] border-l border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0d0d14]/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Breathing Techniques</h3>

                    <div data-tour="session-cards" className="flex flex-col gap-3">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => handleCardClick(session)}
                                className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
                                    ${selectedSession.id === session.id
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 shadow-md shadow-emerald-500/10'
                                        : 'bg-white dark:bg-[#15151A] border-slate-200 dark:border-white/5 hover:border-emerald-500/30'
                                    }`}
                            >
                                <div className="p-4 flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors
                                        ${selectedSession.id === session.id
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        }`}
                                    >
                                        <Wind className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-sm leading-tight mb-0.5 transition-colors
                                            ${selectedSession.id === session.id
                                                ? 'text-emerald-700 dark:text-emerald-300'
                                                : 'text-slate-900 dark:text-white'
                                            }`}
                                        >
                                            {session.title}
                                        </h4>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize">{session.type} • {session.duration} min</span>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed line-clamp-2">{session.description}</p>
                                    </div>
                                    {selectedSession.id === session.id && (
                                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </main>

            {/* Instruction Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setShowInstructions(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>

                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                                <Wind className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedSession.title}</h2>
                            <p className="text-slate-600 dark:text-slate-300">
                                {selectedSession.longDescription}
                            </p>
                        </div>

                        <div data-tour="session-info" className="bg-slate-50 dark:bg-black/20 rounded-xl p-6 mb-8 text-left">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">How to perform</h3>
                            <ul className="space-y-3">
                                {selectedSession.steps.map((step, idx) => (
                                    <li key={idx} className="flex gap-3 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                                            {idx + 1}
                                        </span>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={startSession}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all"
                        >
                            Start Session
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile FABs for Sidebars */}
            <div className="lg:hidden">
                <FloatingActionButton
                    onClick={() => setShowSessionList(true)}
                    icon={<List className="w-5 h-5" />}
                    label="Sessions"
                    position="bottom-left"
                />
                <FloatingActionButton
                    onClick={() => setShowExercises(true)}
                    icon={<Dumbbell className="w-5 h-5" />}
                    label="Exercises"
                    position="bottom-right"
                />
            </div>

            {/* Mobile Bottom Sheets */}
            <BottomSheet
                isOpen={showSessionList}
                onClose={() => setShowSessionList(false)}
                title="Meditation Sessions"
            >
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => {
                                setSelectedSession(session);
                                setTimeLeft(session.duration * 60);
                                setShowSessionList(false);
                            }}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedSession.id === session.id
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl text-emerald-500"><Wind className="w-6 h-6" /></span>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{session.title}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{session.duration} min • {session.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </BottomSheet>

            <BottomSheet
                isOpen={showExercises}
                onClose={() => setShowExercises(false)}
                title="Breathing Exercises"
            >
                <div className="space-y-4">
                    {exercises.map((exercise) => (
                        <div
                            key={exercise.id}
                            className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl text-emerald-500"><Wind className="w-6 h-6" /></span>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{exercise.title}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{exercise.description}</p>
                                    <div className="text-xs text-slate-500 dark:text-slate-500">
                                        <span className="font-medium">Pattern:</span> Inhale {exercise.cycle?.inhale}s • Hold {exercise.cycle?.holdIn}s • Exhale {exercise.cycle?.exhale}s
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </BottomSheet>

            {/* Tour Prompt */}
            <TourPrompt tour={meditationTour} featureName="Meditation" />
        </div>
    );
}
