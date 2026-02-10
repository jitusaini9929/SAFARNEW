import { useState, useEffect, useRef } from "react";
import BreathingVisualizer from "@/components/meditation/BreathingVisualizer";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { meditationTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import { Button } from "@/components/ui/button";

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
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0a0a0f] dark:to-[#0f0f17] transition-colors duration-500 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4">
                <button
                    onClick={() => navigate("/landing")}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    <Home className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">Meditation</span>
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

            <main className="max-w-5xl mx-auto px-8 py-10">

                {/* Active Session Area */}
                <div className="flex flex-col items-center mb-16">
                    {/* Visual & Timer */}
                    <div className="relative group mb-16">
                        {/* Dynamic Breathing Visualizer */}
                        <div className={`relative rounded-3xl p-6 transition-all duration-500 ${isActive
                            ? "bg-white/50 dark:bg-white/5 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                            : "bg-white/30 dark:bg-white/[0.02] shadow-lg ring-1 ring-slate-200/50 dark:ring-white/5"
                            }`}>
                            <BreathingVisualizer
                                sessionId={selectedSession.id}
                                breathPhase={breathPhase}
                                isActive={isActive}
                                cycle={selectedSession.cycle}
                            />
                        </div>

                        {/* Breathing phase indicator below visualizer */}
                        {isActive && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 text-center">
                                <span
                                    className={`text-lg font-bold uppercase tracking-widest transition-all duration-500 ${breathPhase === "inhale"
                                        ? "text-emerald-500"
                                        : breathPhase === "exhale"
                                            ? "text-blue-500"
                                            : "text-amber-500"
                                        }`}
                                >
                                    {breathPhase.replace("-", " ")}
                                </span>
                            </div>
                        )}
                    </div>

                    <div data-tour="timer-display" className="text-center space-y-2">
                        <div className="text-6xl md:text-7xl font-light text-slate-800 dark:text-white font-mono tracking-wider tabular-nums">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                            {isActive ? selectedSession.title : "Ready to start?"}
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-6">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-12 mt-10 mb-8">
                        <button
                            data-tour="reset-button"
                            onClick={handleReset}
                            className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-105"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </button>

                        <button
                            data-tour="play-button"
                            onClick={() => setIsActive(!isActive)}
                            className={`p-8 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 ${isActive
                                ? "bg-rose-500 text-white shadow-rose-500/40"
                                : "bg-emerald-500 text-white shadow-emerald-500/40"
                                }`}
                        >
                            {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                        </button>

                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-105"
                        >
                            {isMuted ? (
                                <VolumeX className="w-6 h-6" />
                            ) : (
                                <Volume2 className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Breathing Techniques</h3>
                <div data-tour="session-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => handleCardClick(session)}
                            className="group relative h-48 rounded-2xl bg-white dark:bg-[#15151A] border border-slate-200 dark:border-white/5 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500/30"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="p-6 h-full flex flex-col relative z-10 transition-all duration-300 group-hover:opacity-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                                    <Wind className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{session.title}</h4>
                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium capitalize">{session.type} • {session.duration} min</span>
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-emerald-900/90 dark:bg-emerald-950/90 p-6 flex flex-col justify-center text-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 backdrop-blur-sm">
                                <h4 className="font-bold text-white mb-2">{session.title}</h4>
                                <p className="text-emerald-100 text-sm leading-relaxed">
                                    {session.description}
                                </p>
                                <span className="mt-4 text-xs font-bold text-emerald-400 uppercase tracking-widest">Click for Steps</span>
                            </div>
                        </div>
                    ))}
                </div>
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

            {/* Tour Prompt */}
            <TourPrompt tour={meditationTour} featureName="Meditation" />
        </div>
    );
}
