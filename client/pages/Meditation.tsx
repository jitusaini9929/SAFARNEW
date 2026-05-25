import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BreathingVisualizer from "@/components/meditation/BreathingVisualizer";
import meditationBg from "@/assets/meditation-bg.webp";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import M3TopNavbar from "@/components/M3TopNavbar";
import "@/styles/mehfil-m3.css";
import { MdSwitchReact, MdIconButtonReact, MdFilledButtonReact, MdOutlinedButtonReact } from "@/components/mehfil/material/MdComponents";

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
    Square,
} from "lucide-react";
import { meditationTour } from "@/components/guided-tour/tourSteps";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { Button } from "@/components/ui/button";
import BottomSheet from '@/components/ui/bottom-sheet';
import FloatingActionButton from '@/components/ui/floating-action-button';
import GlobalSidebar from "@/components/GlobalSidebar";
import { cn } from "@/lib/utils";

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

interface BreathingModalCloseButtonProps {
    onClick: () => void;
    ariaLabel: string;
    className?: string;
}

const BreathingModalCloseButton: React.FC<BreathingModalCloseButtonProps> = ({
    onClick,
    ariaLabel,
    className = "",
}) => (
    <div className={cn("pointer-events-auto", className)}>
        <MdIconButtonReact
            type="button"
            aria-label={ariaLabel}
            onClick={onClick}
            style={{"--md-icon-button-container-shape": "16px", "--md-icon-button-icon-size": "24px", "--md-icon-button-container-width": "48px", "--md-icon-button-container-height": "48px", "background": "var(--mehfil-surface-low)", "border": "1px solid var(--mehfil-outline-variant)", "border-radius": "16px"} as React.CSSProperties}
        >
            <X className="h-5 w-5 text-muted-foreground" />
        </MdIconButtonReact>
    </div>
);

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
        title: "6-7-8 Breathing",
        duration: 6,
        description: "A slower inhale variation for deeper calm.",
        longDescription: "This extended breathing cycle is helpful when you want a gentler, deeper inhale before the long calming exhale.",
        type: "breathing",
        steps: [
            "Sit comfortably with your spine tall and shoulders relaxed.",
            "Inhale slowly through your nose for 6 seconds.",
            "Hold your breath for 7 seconds.",
            "Exhale gently through your mouth for 8 seconds.",
            "Repeat for several rounds while keeping your breath smooth."
        ],
        cycle: { inhale: 6, holdIn: 7, exhale: 8, holdOut: 0 }
    },
];



const ADMIN_EMAIL = "steve123@gmail.com";
const DEFAULT_MEDITATION_VIDEO_URL = "https://youtu.be/i65MjKQCWUE?si=XbBv4pq0N5vXHNkw";
const VISUAL_GUIDANCE_PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLriBGSFKTHVY1YKUDRrQiSjXE2-XE31u8";
const DEFAULT_VIDEO_THUMBNAIL = "/meditation-silhouette.webp";
const DEFAULT_DHYAN_AUDIO_URL = "/Dhyan_processed.mp3";

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
    const navigate = useNavigate();
    const { user, status } = useAuth();
    const { theme } = useTheme();
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
    const isLightTheme = theme === "light";
    const { primary: primaryVideoThumbnail, fallback: fallbackVideoThumbnail } = getYoutubeThumbnailPair(meditationVideoUrl);



    // Custom Dhyan Timer State
    const [sliderValue, setSliderValue] = useState(5); // Default 5 mins

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const breathTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            navigate("/login");
        }
    }, [navigate, status]);

    const ensureDhyanAudioLoaded = () => {
        if (!audioRef.current) return;
        if (!audioRef.current.src) {
            audioRef.current.src = DEFAULT_DHYAN_AUDIO_URL;
            audioRef.current.load();
        }
    };

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
                ensureDhyanAudioLoaded();
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
        if (selectedSession.id === "dhyan-custom") {
            ensureDhyanAudioLoaded();
        }
        setShowInstructions(false);
        setIsModalOpen(true);
        setIsActive(true);
    };

    const closeActiveSession = () => {
        setIsModalOpen(false);
        setIsActive(false);
        handleReset();
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
        <section className={`mehfil-m3-card p-5 space-y-4 ${extraClassName}`}>
            <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Latest Dhyan Video</h3>
            </div>

            <a
                href={meditationVideoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open latest Dhyan video"
                className="mt-3 block w-full overflow-hidden rounded-xl transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-purple-300"
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

            {isMeditationAdmin && (
                <div className="space-y-2">
                    <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wide text-slate-450 dark:text-slate-500">
                        Admin video link
                    </label>
                    <input
                        id={inputId}
                        type="url"
                        value={videoDraftUrl}
                        onChange={(event) => setVideoDraftUrl(event.target.value)}
                        placeholder="Paste YouTube video URL"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-250 focus:outline-none focus:ring-2 focus:ring-[#6D5DAE]/30"
                    />
                    <MdFilledButtonReact
                        disabled={isSavingVideo}
                        onClick={handleSaveMeditationVideo}
                        style={{"--md-filled-button-container-height": "36px", "width": "100%"} as React.CSSProperties}
                    >
                        {isSavingVideo ? "Saving..." : "Update Video"}
                    </MdFilledButtonReact>
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

    const totalSessionSeconds = (selectedSession.id === "dhyan-custom" ? sliderValue : selectedSession.duration) * 60;
    const safeRemainingSeconds = Math.max(0, timeLeft);
    const elapsedSeconds = Math.max(0, totalSessionSeconds - safeRemainingSeconds);

    const breathPaceLabel = (() => {
        if (selectedSession.type !== "breathing" || !selectedSession.cycle) {
            return "Self-paced";
        }
        const cycleSeconds = Math.max(
            1,
            selectedSession.cycle.inhale +
            selectedSession.cycle.holdIn +
            selectedSession.cycle.exhale +
            selectedSession.cycle.holdOut,
        );
        const breathsPerMinute = (60 / cycleSeconds).toFixed(1);
        return `${breathsPerMinute} br/min`;
    })();

    const progress = selectedSession.id === "dhyan-custom"
        ? ((sliderValue * 60 - safeRemainingSeconds) / (sliderValue * 60)) * 100
        : ((selectedSession.duration * 60 - safeRemainingSeconds) / (selectedSession.duration * 60)) * 100;

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
        <div className="min-h-[100dvh] mehfil-m3 bg-[#F3F1F8] dark:bg-background text-foreground font-['Inter',sans-serif] overflow-x-hidden transition-colors duration-300">
            <audio ref={audioRef} loop preload="none" />

            <GlobalSidebar isOpen={isGlobalSidebarOpen} onClose={() => setIsGlobalSidebarOpen(false)} homeRoute="/home" />

            <M3TopNavbar
                moduleName="MEDITATION"
                onSidebarToggle={() => setIsGlobalSidebarOpen(true)}
                extraActions={
                    <>
                        <button
                            onClick={() => setShowResources(true)}
                            className="hidden md:inline-flex items-center justify-center p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Resources"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => startTour(meditationTour)}
                            className="hidden md:inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:text-slate-800 hover:bg-card"
                        >
                            <HelpCircle className="w-4 h-4" />
                            Guided Tour
                        </button>
                    </>
                }
            />

            <main className="pt-24 pb-32 px-4 sm:px-8 lg:px-12 min-h-screen max-w-[1400px] mx-auto">
                <div className="flex flex-col lg:flex-row justify-center gap-8 lg:gap-16 pt-4">
                    {/* Left Column: Practices & Atmosphere */}
                    <section className="w-full lg:w-80 flex flex-col gap-8 pt-4">
                        {/* Daily Practice List */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Daily Practice</h2>
                            <div className="space-y-4">
                                {sessions.slice(0, 5).map((session) => {
                                    const isSelected = selectedSession.id === session.id;
                                    return (
                                        <div
                                            key={session.id}
                                            onClick={() => handleCardClick(session)}
                                            className={cn(
                                                "flex items-center p-3 rounded-2xl border transition-all cursor-pointer mehfil-m3-card shadow-sm",
                                                isSelected
                                                    ? "border-[#6D5DAE] dark:border-[#a594ff] ring-1 ring-[#6D5DAE] dark:ring-[#a594ff]"
                                                    : "border-transparent hover:border-[#6D5DAE]/40"
                                            )}
                                        >
                                            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mr-3 text-[#6D5DAE] dark:text-[#a594ff]">
                                                {session.id === "1" ? (
                                                    <Heart className="w-5 h-5 fill-current" />
                                                ) : session.id === "2" ? (
                                                    <Wind className="w-5 h-5" />
                                                ) : session.id === "3" ? (
                                                    <Square className="w-4.5 h-4.5" />
                                                ) : session.id === "4" ? (
                                                    <Moon className="w-5 h-5 fill-current" />
                                                ) : (
                                                    <Sparkles className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{session.title}</div>
                                                <div className="text-xs text-slate-400 dark:text-slate-500">{session.duration} min</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Atmosphere Settings */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Atmosphere</h2>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">White Noise</span>
                                <MdSwitchReact
                                    selected={!isMuted}
                                    onChange={() => setIsMuted(!isMuted)}
                                    aria-label="Toggle White Noise"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Center Column: Main Meditation View */}
                    <section className="flex-initial w-full max-w-4xl">
                        <div className="h-full mehfil-m3-card p-8 sm:p-10 flex flex-col items-center justify-between text-center min-h-[500px]" style={{ borderRadius: '24px' }}>
                            <div className="mt-4">
                                <h1 className="text-5xl sm:text-6xl font-extrabold mb-3 text-slate-900 dark:text-white tracking-tight">Dhyan</h1>
                                <p className="text-lg sm:text-xl font-medium text-slate-700 dark:text-slate-300">"Silence is the language of God."</p>
                            </div>

                            {/* Play/Progress Circle Container */}
                            <div className="relative flex items-center justify-center my-6">
                                <div className="w-48 h-48 rounded-full bg-[#F3F0FA] dark:bg-[#201d2c] flex items-center justify-center shadow-inner relative overflow-hidden">
                                    <img src={meditationBg} alt="Meditation focus" className="absolute inset-0 w-full h-full object-cover" />
                                    <button
                                        onClick={() => setIsActive(!isActive)}
                                        className="relative z-10 w-20 h-20 bg-[#E8E2F6]/95 dark:bg-[#2c283f]/95 hover:bg-[#D1C9E7] dark:hover:bg-[#342f4c] text-slate-800 dark:text-slate-200 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                                    >
                                        {isActive ? (
                                            <Pause className="w-8 h-8 fill-current" />
                                        ) : (
                                            <Play className="w-8 h-8 fill-current ml-1" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="w-full max-w-sm">
                                <div className="text-[64px] sm:text-[80px] font-bold mb-6 tabular-nums text-slate-900 dark:text-white tracking-tight leading-none">
                                    {formatTime(safeRemainingSeconds)}
                                </div>
                                
                                {selectedSession.id === "dhyan-custom" ? (
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                                            <span>Session Length</span>
                                            <span>{sliderValue} min</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="60"
                                            step="1"
                                            value={sliderValue}
                                            onChange={handleSliderChange}
                                            className="w-full appearance-none cursor-pointer bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-[#D1C9E7] dark:[&::-webkit-slider-runnable-track]:bg-slate-800 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#9B89D9] [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:shadow-md"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                                            <span>Session Length</span>
                                            <span>{selectedSession.duration} min</span>
                                        </div>
                                        <div className="h-1 bg-[#D1C9E7] dark:bg-slate-800 rounded-full" />
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-center gap-10">
                                    <div className="flex flex-col items-center gap-1">
                                        <MdIconButtonReact onClick={handleReset} title="Reset">
                                            <RotateCcw className="w-5 h-5" />
                                        </MdIconButtonReact>
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Reset</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <MdIconButtonReact onClick={() => setIsMuted(!isMuted)} title="Sound">
                                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                        </MdIconButtonReact>
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Sound</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <MdIconButtonReact onClick={() => setShowInstructions(true)} title="Help">
                                            <HelpCircle className="w-5 h-5" />
                                        </MdIconButtonReact>
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Help</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>


                </div>
            </main>

            {/* Desktop Mini Player */}
            <footer className="hidden lg:flex fixed bottom-0 left-0 right-0 z-40 h-24 px-8 items-center justify-between rounded-t-[24px] border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1924] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] mehfil-m3-card" data-purpose="audio-player">
                {/* Track Info */}
                <div className="flex items-center w-1/4">
                    <div className="w-14 h-14 rounded-lg overflow-hidden mr-4 shadow-sm border border-slate-100 dark:border-slate-800">
                        <img alt="Track Cover" className="w-full h-full object-cover" src={meditationBg} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Transcendental States</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Safar Soundscapes</p>
                    </div>
                </div>

                {/* Controls & Progress */}
                <div className="flex flex-col items-center flex-1 max-w-2xl px-10">
                    <div className="flex items-center gap-6 mb-2">
                        <button onClick={handleReset} className="text-slate-400 hover:text-[#6D5DAE] transition-colors" title="Reset">
                            <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className="w-10 h-10 bg-[#E9E4F5] dark:bg-[#2c283f] text-[#6D5DAE] dark:text-[#a594ff] rounded-full flex items-center justify-center hover:bg-[#e2daf3] dark:hover:bg-[#342f4c] transition-colors"
                        >
                            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <button onClick={() => setShowInstructions(true)} className="text-slate-400 hover:text-[#6D5DAE] transition-colors" title="Help">
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="w-full flex items-center gap-3">
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{formatTime(elapsedSeconds)}</span>
                        <div className="flex-1 h-[2px] bg-[#E2DDF0] dark:bg-slate-800 rounded-full relative">
                            <div className="absolute left-0 top-0 h-full bg-[#9B89D9]" style={{ width: `${progress}%` }}></div>
                            <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#9B89D9] rounded-full shadow-sm" style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}></div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">{formatTime(totalSessionSeconds)}</span>
                    </div>
                </div>

                {/* Volume & Misc */}
                <div className="flex items-center justify-end w-1/4 gap-4">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-[#6D5DAE] transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <div className="w-24 h-1 bg-[#E2DDF0] dark:bg-slate-800 rounded-full relative cursor-pointer" onClick={() => setIsMuted(!isMuted)}>
                        <div className="absolute left-0 top-0 h-full bg-[#6D5DAE] dark:bg-[#8269e8] rounded-full" style={{ width: isMuted ? "0%" : "66%" }}></div>
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#6D5DAE] dark:bg-[#8269e8] rounded-full border-2 border-white dark:border-slate-900 shadow-sm" style={{ left: isMuted ? "0%" : "66%", transform: `translate(-50%, -50%)` }}></div>
                    </div>
                </div>
            </footer>

            {/* Fullscreen Active Session */}
            {isModalOpen && (
                <div
                    className={cn(
                        "fixed inset-0 z-50 animate-in fade-in duration-300 flex flex-col h-[100dvh] w-screen overflow-hidden",
                        isLightTheme
                            ? "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#f4ede1_100%)] text-slate-900"
                            : "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#0b1012_0%,_#09090b_100%)] text-white"
                    )}
                >
                    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-end p-4 md:p-5">
                        <BreathingModalCloseButton
                            onClick={closeActiveSession}
                            ariaLabel="Close active session"
                            className={cn(
                                "pointer-events-auto h-14 w-14 rounded-2xl border shadow-lg focus-visible:ring-primary/60",
                                isLightTheme
                                    ? "border-slate-300/80 bg-white/90 text-slate-600 hover:border-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-xl focus-visible:ring-offset-[#fbf6ee]"
                                    : "border-white/10 bg-black/25 text-slate-300 hover:border-red-400/30 hover:bg-red-500/15 hover:text-red-300 hover:shadow-red-500/10 focus-visible:ring-offset-[#09090b]"
                            )}
                        />
                    </div>

                    <div className="flex-1 flex flex-col items-center h-full w-full relative pt-14 pb-8 px-4">
                        <div className="text-center mb-8 w-full max-w-4xl mx-auto">
                            <h2 className={cn("text-3xl lg:text-4xl font-serif tracking-tight", isLightTheme ? "text-slate-900" : "text-white")}>{selectedSession.title}</h2>
                            <p className={cn("text-sm md:text-base max-w-xl mx-auto mt-2", isLightTheme ? "text-slate-600" : "text-[#adaaab]")}>{selectedSession.description}</p>
                        </div>

                        <div className="flex-1 w-full flex flex-col items-center justify-between">
                            <div className="flex items-center justify-center flex-1 w-full">
                                <div className="scale-95 md:scale-125 lg:scale-150 origin-center">
                                    <BreathingVisualizer
                                        sessionId={selectedSession.id}
                                        breathPhase={breathPhase}
                                        isActive={isActive}
                                        cycle={selectedSession.cycle}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-5 w-full max-w-md pb-6">
                                <span className={`inline-block px-7 py-2.5 rounded-full text-lg font-black tracking-[0.15em] ${breathPhase === 'inhale' ? 'bg-primary/20 text-primary' : breathPhase === 'exhale' ? 'bg-secondary/20 text-secondary' : 'bg-amber-500/20 text-amber-600 dark:text-amber-200'}`}>
                                    {breathPhase === 'inhale' ? 'INHALE' : breathPhase === 'exhale' ? 'EXHALE' : 'HOLD'}
                                </span>
                                <div className="text-5xl md:text-7xl font-light text-foreground font-mono tracking-widest tabular-nums">{formatTime(safeRemainingSeconds)}</div>
                                <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-[#94aaff] to-[#00d4ec]" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex items-center justify-center gap-8 mt-2">
                                    <button onClick={handleReset} className="p-4 rounded-full bg-card border border-border shadow-sm hover:scale-105 transition-transform"><RotateCcw className="w-5 h-5 text-muted-foreground" /></button>
                                    <button onClick={() => setIsActive(!isActive)} className={`p-7 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${isActive ? "bg-amber-500" : "bg-primary"} text-white dark:text-black`}>
                                        {isActive ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
                                    </button>
                                    <button onClick={() => setIsMuted(!isMuted)} className="p-4 rounded-full bg-card border border-border shadow-sm hover:scale-105 transition-transform">{isMuted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Instruction Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg rounded-lg shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-border overflow-hidden">
                        <BreathingModalCloseButton
                            onClick={() => setShowInstructions(false)}
                            ariaLabel="Close instructions"
                            className="absolute top-3 right-3 z-30"
                        />

                        <div className="text-center mb-8 relative z-0">
                            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-sm">
                                <Wind className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-serif text-foreground mb-3">{selectedSession.title}</h2>
                            <p className="text-muted-foreground italic font-medium leading-relaxed">{selectedSession.longDescription}</p>
                        </div>

                        <div data-tour="session-info" className="relative z-0 bg-muted/50 rounded-3xl p-6 mb-8 text-left border border-border">
                            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">The Ritual</h3>
                            <div className="space-y-4">
                                {selectedSession.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 text-foreground/80 text-sm leading-relaxed items-start">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black mt-0.5">{idx + 1}</span>
                                        <span className="font-medium">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={startSession} className="w-full py-4 rounded-lg bg-gradient-to-r from-[#94aaff] to-[#9c8fff] text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Begin Journey
                        </button>
                    </div>
                </div>
            )}

            {/* Resources Modal */}
            {showResources && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl md:max-w-3xl rounded-lg border border-border bg-card p-4 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 font-sans">
                        <BreathingModalCloseButton
                            onClick={() => setShowResources(false)}
                            ariaLabel="Close resources"
                            className="absolute top-3 right-3 z-30"
                        />

                        <div className="relative z-0 mb-6 pr-12">
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Dhyan Resources</h2>
                            <p className="text-sm text-muted-foreground">Guided experiences and editorial content to deepen your practice.</p>
                        </div>

                        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                            <section className="rounded-lg border border-border bg-muted/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Latest Dhyan Video</p>
                                        <p className="text-xs text-[#9aa7b6] mt-1">Open the latest guidance on YouTube.</p>
                                    </div>
                                    <a
                                        href={meditationVideoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#1c2735] border border-[#32455f] px-3 py-2 text-xs font-semibold text-[#d4e6ff] hover:bg-[#223247] transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open Video
                                    </a>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            <BottomSheet isOpen={showSessionList} onClose={() => setShowSessionList(false)} title="Breathing Techniques">
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => {
                                handleCardClick(session);
                                setShowSessionList(false);
                            }}
                            className={`w-full text-left rounded-xl border p-3 ${selectedSession.id === session.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                        >
                            <p className="font-semibold text-sm">{session.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{session.description}</p>
                        </button>
                    ))}
                </div>
            </BottomSheet>

            <BottomSheet isOpen={showExercises} onClose={() => setShowExercises(false)} title={`${selectedSession.title} Steps`}>
                <div className="space-y-3">
                    {selectedSession.steps.length ? selectedSession.steps.map((step, idx) => (
                        <div key={`${selectedSession.id}-step-${idx}`} className="rounded-xl border border-border bg-card p-3 text-sm">
                            <span className="text-xs font-bold text-muted-foreground mr-2">{idx + 1}.</span>
                            {step}
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground">This session runs silently. Follow your breath and stay present.</p>
                    )}
                </div>
            </BottomSheet>

            <FloatingActionButton
                onClick={() => setShowSessionList(true)}
                icon={<List className="w-6 h-6" />}
                label="Open techniques"
                position="bottom-left"
                className="lg:hidden"
            />
            <FloatingActionButton
                onClick={() => setShowResources(true)}
                icon={<Image className="w-6 h-6" />}
                label="Open resources"
                position="bottom-right"
                className="lg:hidden"
            />

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-2 py-2 bg-background/95 backdrop-blur-2xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                <button onClick={() => setShowSessionList(true)} className="flex flex-col items-center gap-1 flex-1 py-2 text-primary">
                    <Wind className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-widest font-medium">Breath</span>
                </button>
                <button onClick={() => navigate("/study")} className="flex flex-col items-center gap-1 flex-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Dumbbell className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-widest font-medium">Focus</span>
                </button>
                <button onClick={() => setIsActive(!isActive)} className="flex flex-col items-center gap-1 flex-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Clock className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-widest font-medium">Timer</span>
                </button>
                <button onClick={() => setShowResources(true)} className="flex flex-col items-center gap-1 flex-1 py-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="w-5 h-5" />
                    <span className="text-[9px] uppercase tracking-widest font-medium">Resources</span>
                </button>
            </nav>

        </div>
    );
}
