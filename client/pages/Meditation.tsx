import { useState, useEffect, useRef } from "react";
import BreathingVisualizer from "@/components/meditation/BreathingVisualizer";
import meditationBg from "@/assets/meditation-bg.jpg";
import { authService } from "@/utils/authService";
import ThemeToggle from "@/components/ui/theme-toggle";

import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    HelpCircle,
    Clock,
    Wind,
    Heart,
    Sparkles,
    Moon,
    Sun,
    Volume2,
    VolumeX,
    Home,
    Music,
    Image,
    List,
    Dumbbell,
    ExternalLink,
    Menu,
    X,
} from "lucide-react";
import { meditationTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { Button } from "@/components/ui/button";
import BottomSheet from '@/components/ui/bottom-sheet';
import FloatingActionButton from '@/components/ui/floating-action-button';
import CourseBanner from '@/components/meditation/CourseBanner';
import GlobalSidebar from "@/components/GlobalSidebar";

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
];



const ADMIN_EMAIL = "steve123@gmail.com";
const DEFAULT_MEDITATION_VIDEO_URL = "https://www.youtube.com/watch?v=yhTEuOdTq1M";
const DEFAULT_VIDEO_THUMBNAIL = "/meditation-silhouette.png";

const getYoutubeVideoId = (url: string) => {
    const match = String(url || "").match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
};

const getYoutubeThumbnailPair = (url: string) => {
    const id = getYoutubeVideoId(url);
    if (!id) {
        return { primary: DEFAULT_VIDEO_THUMBNAIL, fallback: DEFAULT_VIDEO_THUMBNAIL };
    }

    return {
        primary: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        fallback: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
};

const defaultDhyanSession: Session = {
    id: "dhyan-custom",
    title: "Dhyan",
    duration: 5,
    description: "A mindful space to breathe, relax, and restore inner calm through guided breathing techniques.",
    longDescription: "A custom meditation session to focus on your breath and find inner peace.",
    type: "silent",
    steps: [],
    cycle: undefined
};

export default function Meditation() {
    const [user, setUser] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<Session>(defaultDhyanSession);
    const [isActive, setIsActive] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(selectedSession.duration * 60);
    const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale" | "hold-empty">("inhale");
    const [isMuted, setIsMuted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showSessionList, setShowSessionList] = useState(false);
    const [showResources, setShowResources] = useState(false);
    const [showExercises, setShowExercises] = useState(false);
    const [isGlobalSidebarOpen, setIsGlobalSidebarOpen] = useState(false);
    const [meditationVideoUrl, setMeditationVideoUrl] = useState(DEFAULT_MEDITATION_VIDEO_URL);
    const [videoDraftUrl, setVideoDraftUrl] = useState(DEFAULT_MEDITATION_VIDEO_URL);
    const [videoSettingsError, setVideoSettingsError] = useState("");
    const [isSavingVideo, setIsSavingVideo] = useState(false);
    const [videoThumbnailSrc, setVideoThumbnailSrc] = useState(() => getYoutubeThumbnailPair(DEFAULT_MEDITATION_VIDEO_URL).primary);
    const isMeditationAdmin = String(user?.email || "").toLowerCase() === ADMIN_EMAIL;
    const { primary: primaryVideoThumbnail, fallback: fallbackVideoThumbnail } = getYoutubeThumbnailPair(meditationVideoUrl);



    // Custom Dhyan Timer State
    const [sliderValue, setSliderValue] = useState(5); // Default 5 mins

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);
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

    useEffect(() => {
        let isCancelled = false;

        const loadMeditationVideo = async () => {
            try {
                const response = await fetch("/api/mehfil/meditation-video", {
                    method: "GET",
                    credentials: "include",
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch meditation video.");
                }

                const data = await response.json().catch(() => null);
                const nextVideoUrl = typeof data?.videoUrl === "string" ? data.videoUrl.trim() : "";
                const safeVideoUrl = getYoutubeVideoId(nextVideoUrl) ? nextVideoUrl : DEFAULT_MEDITATION_VIDEO_URL;

                if (!isCancelled) {
                    setMeditationVideoUrl(safeVideoUrl);
                    setVideoDraftUrl(safeVideoUrl);
                    setVideoSettingsError("");
                }
            } catch {
                if (!isCancelled) {
                    setMeditationVideoUrl(DEFAULT_MEDITATION_VIDEO_URL);
                    setVideoDraftUrl(DEFAULT_MEDITATION_VIDEO_URL);
                }
            }
        };

        loadMeditationVideo();
        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        setVideoThumbnailSrc(primaryVideoThumbnail);
    }, [primaryVideoThumbnail]);

    const { startTour } = useGuidedTour();

    useEffect(() => {
        // When session changes, reset but don't close instructions if user clicked a card
        if (selectedSession.id === "dhyan-custom") {
            setTimeLeft(sliderValue * 60);
        } else {
            setTimeLeft(selectedSession.duration * 60);
        }
        setIsActive(false);
        setBreathPhase("inhale");

        // Reset Audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [selectedSession, sliderValue]);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((t) => t - 1);
            }, 1000);

            // Play Audio if Dhyan Custom
            if (selectedSession.id === "dhyan-custom" && audioRef.current && audioRef.current.paused) {
                audioRef.current.play().catch(e => console.error("Audio play error:", e));
            }

        } else if (timeLeft === 0) {
            setIsActive(false);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        } else {
            // Paused
            if (audioRef.current) audioRef.current.pause();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, timeLeft, selectedSession.id]);

    // Handle Mute Toggle
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
        }
    }, [isMuted]);

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

    const switchToCustomSession = () => {
        setSelectedSession({
            id: "dhyan-custom",
            title: "Dhyan Custom",
            duration: sliderValue,
            description: "Custom timer meditation",
            longDescription: "A custom duration session.",
            type: "silent",
            steps: [],
            cycle: undefined
        });
    };

    const handleReset = () => {
        setIsActive(false);
        setTimeLeft((selectedSession.id === "dhyan-custom" ? sliderValue : selectedSession.duration) * 60);
        setBreathPhase("inhale");
    };

    const handleCardClick = (session: Session) => {
        setSelectedSession(session);
        setShowInstructions(true);
        setIsActive(false); // Stop any running session
    };

    const startSession = () => {
        setShowInstructions(false);
        setIsModalOpen(true);
        setIsActive(true);
    };

    const handleSaveMeditationVideo = async () => {
        if (!isMeditationAdmin) return;

        const trimmedUrl = videoDraftUrl.trim();
        if (!getYoutubeVideoId(trimmedUrl)) {
            setVideoSettingsError("Please enter a valid YouTube video URL.");
            return;
        }

        setIsSavingVideo(true);
        setVideoSettingsError("");

        try {
            const response = await fetch("/api/mehfil/meditation-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ videoUrl: trimmedUrl }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || payload?.message || "Failed to update meditation video.");
            }

            const nextUrl = typeof payload?.videoUrl === "string" ? payload.videoUrl.trim() : trimmedUrl;
            if (!getYoutubeVideoId(nextUrl)) {
                throw new Error("Server returned an invalid YouTube URL.");
            }

            setMeditationVideoUrl(nextUrl);
            setVideoDraftUrl(nextUrl);
        } catch (error: any) {
            setVideoSettingsError(error?.message || "Unable to update meditation video right now.");
        } finally {
            setIsSavingVideo(false);
        }
    };

    const renderMeditationVideoCard = (inputId: string, extraClassName = "") => (
        <section className={`rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/85 dark:bg-[#11131C]/80 p-4 shadow-lg shadow-slate-300/20 dark:shadow-black/20 ${extraClassName}`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Latest Dhyan Video</h3>

            <a
                href={meditationVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 hover:opacity-95 transition-opacity"
            >
                <img
                    loading="lazy"
                    src={videoThumbnailSrc}
                    alt="Latest Dhyan YouTube video thumbnail"
                    className="w-full h-40 object-cover"
                    onError={() => {
                        if (videoThumbnailSrc !== fallbackVideoThumbnail) {
                            setVideoThumbnailSrc(fallbackVideoThumbnail);
                            return;
                        }
                        setVideoThumbnailSrc(DEFAULT_VIDEO_THUMBNAIL);
                    }}
                />
            </a>

            <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">Click to visit the video</p>

            {isMeditationAdmin && (
                <div className="mt-4 space-y-2">
                    <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Admin video link
                    </label>
                    <input
                        id={inputId}
                        type="url"
                        value={videoDraftUrl}
                        onChange={(event) => setVideoDraftUrl(event.target.value)}
                        placeholder="Paste YouTube video URL"
                        className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveMeditationVideo}
                        disabled={isSavingVideo}
                        className="w-full"
                    >
                        {isSavingVideo ? "Saving..." : "Update Video"}
                    </Button>
                    {videoSettingsError && (
                        <p className="text-xs text-red-500">{videoSettingsError}</p>
                    )}
                </div>
            )}
        </section>
    );

    const renderResourcesButton = () => (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResources(true)}
            className="gap-2"
        >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Resources</span>
        </Button>
    );

    const progress = selectedSession.id === "dhyan-custom"
        ? ((sliderValue * 60 - timeLeft) / (sliderValue * 60)) * 100
        : ((selectedSession.duration * 60 - timeLeft) / (selectedSession.duration * 60)) * 100;

    // Handle Slider Change
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        if (selectedSession.id !== "dhyan-custom") {
            switchToCustomSession();
        }
        setSliderValue(val);
        setTimeLeft(val * 60);
    };

    // Initialize Dhyan Custom Session
    useEffect(() => {
        // Initialize with default Dhyan session
        if (selectedSession.id === "dhyan-custom") {
            setTimeLeft(sliderValue * 60);
        }
    }, []);

    // Helper to ensure we render the slider only for the main Dhyan experience
    // The current UI shows "Dhyan" as the center piece. 
    // We will inject the slider into that center piece.

    return (
        <div className="min-h-[100dvh] lg:h-[100dvh] flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0a0a0f] dark:to-[#0f0f17] transition-colors duration-500 font-sans overflow-x-hidden lg:overflow-hidden">
            <audio ref={audioRef} src="/Dhyan_processed.mp3" loop />
            
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200/50 dark:border-white/5 relative z-20">
                <button
                    onClick={() => setIsGlobalSidebarOpen(true)}
                    className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                    <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-serif italic tracking-wide text-slate-900 dark:text-white">Meditation</span>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <div className="lg:hidden">
                        {renderResourcesButton()}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startTour(meditationTour)}
                        className="hidden lg:inline-flex gap-2"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* 3-COLUMN LAYOUT                                       */}
            {/* ═══════════════════════════════════════════════════════ */}
            <main className="flex-1 flex overflow-x-hidden overflow-y-visible lg:overflow-y-auto relative z-10">

                {/* Active Session Modal Overlay - Full Screen Adaptive */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-[#0a0a0f] animate-in fade-in duration-300 flex flex-col h-[100dvh] w-screen overflow-hidden">
                        {/* Close / Stop Button */}
                        <button
                            onClick={() => { setIsModalOpen(false); setIsActive(false); handleReset(); }}
                            className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-3 rounded-full bg-white dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Main Content Container with safe area padding */}
                        <div className="flex-1 flex flex-col items-center h-full w-full relative pt-12 pb-6 px-4 md:py-8">

                            {/* Background Ambience */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-3xl opacity-50" />
                                <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-blue-500/5 rounded-full blur-3xl opacity-50" />
                            </div>

                            {/* 1. Header Section - Always at top */}
                            <div className="flex-none text-center space-y-1 md:space-y-2 z-10 mb-4 md:mb-8 w-full max-w-4xl mx-auto px-6">
                                <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif italic text-slate-800 dark:text-white tracking-tight">{selectedSession.title}</h2>
                                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto line-clamp-2 md:line-clamp-none font-medium italic opacity-80">{selectedSession.description}</p>
                            </div>

                            <div className="flex-1 w-full flex relative z-10 min-h-0 transition-all duration-500 flex-col items-center justify-between">

                                {/* 2. Visualizer Section */}
                                <div className="flex items-center justify-center transition-all duration-500 flex-1 w-full order-1">
                                    {/* Wrapper for scaling */}
                                    <div className="transform transition-transform duration-500 scale-90 sm:scale-100 md:scale-125 lg:scale-150 origin-center">
                                        <BreathingVisualizer
                                            sessionId={selectedSession.id}
                                            breathPhase={breathPhase}
                                            isActive={isActive}
                                            cycle={selectedSession.cycle}
                                        />
                                    </div>
                                </div>

                                {/* 3. Controls Section */}
                                <div className="flex flex-col items-center gap-4 md:gap-6 w-full max-w-md transition-all duration-500 flex-none order-2 pb-4 md:pb-8">

                                    {/* Phase Label - Elevated Tonal Shift */}
                                    <div className="text-center w-full md:w-auto">
                                        <span className={`inline-block px-7 py-2.5 rounded-full text-lg md:text-xl font-black tracking-[0.15em] transition-all duration-500 shadow-xl backdrop-blur-md
                                            ${breathPhase === 'inhale' ? 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20' :
                                                breathPhase === 'exhale' ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20' :
                                                    'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20'}`}
                                        >
                                            {breathPhase === 'inhale' ? 'INHALE' : breathPhase === 'exhale' ? 'EXHALE' : 'HOLD'}
                                        </span>
                                    </div>

                                    <div className="text-5xl md:text-7xl font-light text-slate-800 dark:text-white font-mono tracking-widest tabular-nums w-full md:w-auto text-center md:text-left">
                                        {formatTime(timeLeft)}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    {/* Controls Buttons */}
                                    <div className="flex items-center justify-center gap-8 md:gap-10 mt-2 w-full md:w-auto">
                                        <button
                                            onClick={handleReset}
                                            className="p-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-95 border border-slate-100 dark:border-white/5"
                                        >
                                            <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                                        </button>
                                        <button
                                            onClick={() => setIsActive(!isActive)}
                                            className={`p-6 md:p-7 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 duration-500
                                                ${isActive
                                                    ? "bg-amber-500 text-white shadow-amber-500/40 hover:shadow-amber-500/60"
                                                    : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-500/40 hover:shadow-blue-500/60 ring-2 ring-white/20"
                                                }`}
                                        >
                                            {isActive ? <Pause className="w-8 h-8 md:w-9 md:h-9 fill-current" /> : <Play className="w-8 h-8 md:w-9 md:h-9 fill-current ml-1" />}
                                        </button>
                                        <button
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="p-4 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-95 border border-slate-100 dark:border-white/5"
                                        >
                                            {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ LEFT SIDEBAR ═══════ */}
                <aside className="hidden lg:flex flex-col w-[406px] min-w-[406px] border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0d0d14]/60 backdrop-blur-sm p-5 gap-5">
                    {/* Course Banner with In-App Payment */}
                    <CourseBanner
                        user={user ? { name: user.name, email: user.email } : null}
                        courseId="safar-30"
                    />

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {renderMeditationVideoCard("meditation-video-url-desktop", "flex-1 mb-0 backdrop-blur-xl bg-white/30 dark:bg-white/5 border-none shadow-sm")}
                    </div>
                </aside>

                {/* ═══ CENTER CONTENT ═══════ */}
                <section className="flex-1 flex flex-col items-center justify-start lg:justify-center relative overflow-visible lg:overflow-hidden px-4 md:px-6 py-4 lg:py-0">
                    {/* Background Image — very subtle */}
                    <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none select-none">
                        <img loading="lazy" src={meditationBg} alt="" className="w-full h-full object-cover scale-110 blur-sm" />
                    </div>

                    {/* Floating Gradient Orbs */}
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-300/5 dark:bg-sky-500/3 rounded-full blur-3xl pointer-events-none" />

                    {/* Center Content */}
                    <div className="relative z-10 flex flex-col items-center gap-5 md:gap-7 max-w-md md:max-w-2xl w-full pb-24 lg:pb-0">
                        <div className="lg:hidden w-full">
                            {renderMeditationVideoCard("meditation-video-url-mobile", "mb-4 backdrop-blur-xl bg-white/30 dark:bg-white/5 border-none")}
                        </div>

                        {/* Meditation Image */}
                        <div className="relative md:mt-2">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-400/20 to-transparent rounded-[3rem] blur-3xl scale-150 opacity-50" />
                            <img loading="lazy"
                                src={meditationBg}
                                alt="Meditation"
                                className="relative w-56 h-32 md:w-[28rem] md:h-56 object-cover object-top rounded-3xl md:rounded-[2.5rem] shadow-2xl shadow-blue-500/10 dark:shadow-blue-900/20 border border-white/10 animate-[pulse_6s_ease-in-out_infinite]"
                                style={{ filter: 'contrast(1.05) brightness(1.02)' }}
                            />
                        </div>

                        {/* Session Section Description */}
                        <div className="text-center mt-2 md:mt-3">
                            <h2 className="text-4xl md:text-6xl font-serif italic font-medium text-slate-800 dark:text-white mb-3 tracking-tight">Dhyan</h2>
                            <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 max-w-sm md:max-w-xl leading-relaxed italic font-medium opacity-80">A mindful space to breathe, relax, and restore inner calm through guided breathing techniques.</p>
                        </div>

                        {/* Timer Display */}
                        <div data-tour="timer-display" className="text-center w-full">
                            <div className="text-6xl md:text-8xl font-light text-slate-800 dark:text-white font-mono tracking-wider tabular-nums">
                                {formatTime(timeLeft)}
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 text-sm md:text-base font-medium mt-2 tracking-wide uppercase opacity-60">
                                Press play to begin
                            </p>

                            {/* Slider Section - Only show for Dhyan Custom */}
                            {selectedSession.id === "dhyan-custom" && (
                                <div className="mt-8 w-full max-w-xs md:max-w-sm mx-auto p-4 rounded-3xl bg-slate-100/50 dark:bg-white/5 backdrop-blur-sm">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session Length</span>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                            {sliderValue} min
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        step="1"
                                        value={sliderValue}
                                        onChange={handleSliderChange}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <div className="flex justify-between mt-2 px-1 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                        <span>1 min</span>
                                        <span>60 min</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-64 md:w-80 h-1 md:h-1.5 bg-slate-200/80 dark:bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center justify-center gap-8 md:gap-14 mt-2">
                            <button
                                data-tour="reset-button"
                                onClick={handleReset}
                                className="p-4 md:p-5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-95 ring-1 ring-slate-200/50 dark:ring-white/5"
                            >
                                <RotateCcw className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <button
                                data-tour="play-button"
                                onClick={() => setIsActive(!isActive)}
                                className={`p-8 md:p-10 rounded-full shadow-[0_0_50px_-12px_rgba(37,99,235,0.5)] transition-all hover:scale-110 active:scale-95 duration-500
                                    ${isActive
                                        ? "bg-amber-500 text-white shadow-amber-500/40 hover:shadow-amber-500/60"
                                        : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:shadow-blue-500/60 ring-4 ring-white/10"
                                    }`}
                            >
                                {isActive
                                    ? <Pause className="w-10 h-10 md:w-12 md:h-12 fill-current" />
                                    : <Play className="w-10 h-10 md:w-12 md:h-12 fill-current ml-1" />
                                }
                            </button>
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-4 md:p-5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:scale-110 active:scale-95 ring-1 ring-slate-200/50 dark:ring-white/5"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>
                </section>

                {/* ═══ RIGHT SIDEBAR ═══════ */}
                <aside className="hidden lg:flex flex-col w-[406px] min-w-[406px] border-l border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0d0d14]/60 backdrop-blur-sm p-5 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-serif italic font-medium text-slate-800 dark:text-white">Breathing Techniques</h3>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Library</span>
                    </div>

                    <div data-tour="technique-list" className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                onClick={() => handleCardClick(session)}
                                className={`group relative p-4 rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden
                                    ${selectedSession.id === session.id
                                        ? 'bg-blue-50/70 dark:bg-blue-500/10 shadow-sm'
                                        : 'bg-white/40 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 active:bg-slate-100 dark:active:bg-white/20'
                                    }`}
                            >
                                {/* Active Indicator Overlay */}
                                {selectedSession.id === session.id && (
                                    <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/5 pointer-events-none" />
                                )}
                                
                                <div className="flex gap-4 items-start relative z-10">
                                    <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm
                                        ${selectedSession.id === session.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 group-hover:text-blue-500'
                                        }`}
                                    >
                                        <Wind className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-sm leading-tight mb-1 transition-colors
                                            ${selectedSession.id === session.id
                                                ? 'text-blue-700 dark:text-blue-300'
                                                : 'text-slate-900 dark:text-white'
                                            }`}
                                        >
                                            {session.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{session.type}</span>
                                            <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{session.duration} min</span>
                                        </div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed line-clamp-2 italic font-medium">{session.description}</p>
                                    </div>
                                    {selectedSession.id === session.id && (
                                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5 animate-pulse" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </main>

            {/* Instruction Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-2xl" />
                        
                        <button
                            onClick={() => setShowInstructions(false)}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors z-10"
                        >
                            <span className="sr-only">Close</span>
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-16 h-16 mx-auto bg-blue-600/10 dark:bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-sm">
                                <Wind className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-serif italic text-slate-900 dark:text-white mb-3">{selectedSession.title}</h2>
                            <p className="text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">
                                {selectedSession.longDescription}
                            </p>
                        </div>

                        <div data-tour="session-info" className="bg-slate-50 dark:bg-black/20 rounded-3xl p-6 mb-8 text-left border border-slate-100 dark:border-white/5 relative z-10">
                            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">The Ritual</h3>
                            <div className="space-y-4">
                                {selectedSession.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed items-start">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={startSession}
                            className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-lg shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10"
                        >
                            Begin Journey
                        </button>
                    </div>
                </div>
            )}

            {showResources && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl md:max-w-3xl rounded-[2.5rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#11131C] p-4 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowResources(false)}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white dark:hover:bg-white/10 text-slate-400 transition-colors z-10"
                        >
                            <span className="sr-only">Close</span>
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-8 pr-10">
                            <h2 className="text-2xl font-serif italic text-slate-900 dark:text-white mb-2">Dhyan Resources</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic font-medium opacity-80">
                                Guided experiences and editorial content to deepen your practice.
                            </p>
                        </div>

                        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            <CourseBanner
                                user={user ? { name: user.name, email: user.email } : null}
                                courseId="safar-30"
                            />
                            {renderMeditationVideoCard("meditation-video-url-modal", "bg-white/50 dark:bg-white/5 border-none shadow-none")}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile FABs for Sidebars */}

        {/* Tour Prompt */}
        <TourPrompt tour={meditationTour} featureName="Meditation" />
        </div>
    );
}
