import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BreathingVisualizer from "@/components/meditation/BreathingVisualizer";
import meditationBg from "@/assets/meditation-bg.webp";
import safarLogo from "@/assets/safar-logo.png.webp";
import { useAuth } from "@/contexts/AuthContext";
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
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { Button } from "@/components/ui/button";
import BottomSheet from '@/components/ui/bottom-sheet';
import FloatingActionButton from '@/components/ui/floating-action-button';
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
const DEFAULT_MEDITATION_VIDEO_URL = "https://youtu.be/Ts6H9bbVt1Y";
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
        <section className={`rounded-lg border border-border bg-card shadow-lg shadow-black/5 overflow-hidden ${extraClassName}`}>
            <div className="px-4 pt-4">
                <h3 className="text-sm font-semibold text-foreground">Latest Dhyan Video</h3>
            </div>

            <a
                href={meditationVideoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open latest Dhyan video"
                className="mt-3 block w-full overflow-hidden rounded-xl transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
                <img
                    loading="lazy"
                    src={videoThumbnailSrc}
                    alt="Latest Dhyan YouTube video thumbnail"
                    className="w-full h-48 object-cover"
                    onError={() => {
                        if (videoThumbnailSrc !== fallbackVideoThumbnail) {
                            setVideoThumbnailSrc(fallbackVideoThumbnail);
                            return;
                        }
                        setVideoThumbnailSrc(DEFAULT_VIDEO_THUMBNAIL);
                    }}
                />
            </a>

            <p className="px-4 py-3 text-xs text-muted-foreground">Latest Dhyan video preview</p>

            {isMeditationAdmin && (
                <div className="px-4 pb-4 space-y-2">
                    <label htmlFor={inputId} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Admin video link
                    </label>
                    <input
                        id={inputId}
                        type="url"
                        value={videoDraftUrl}
                        onChange={(event) => setVideoDraftUrl(event.target.value)}
                        placeholder="Paste YouTube video URL"
                        className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        <div className="min-h-[100dvh] bg-background text-foreground font-['Manrope',sans-serif] overflow-x-hidden transition-colors duration-300">
            <audio ref={audioRef} loop preload="none" />

            <GlobalSidebar isOpen={isGlobalSidebarOpen} onClose={() => setIsGlobalSidebarOpen(false)} homeRoute="/home" />

            {/* Top App Bar */}
            <header className="fixed top-0 right-0 left-0 z-50 h-16 md:h-20 px-4 md:px-10 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsGlobalSidebarOpen(true)} className="p-2 rounded-xl text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm">
                            <img src={safarLogo} alt="SAFAR" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-lg font-serif font-bold text-foreground tracking-tight hidden sm:block">SAFAR</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 md:gap-5">
                    <button onClick={() => setShowResources(true)} className="hidden md:inline-flex text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => startTour(meditationTour)}
                        className="hidden md:inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition-colors hover:text-foreground hover:bg-card"
                    >
                        <HelpCircle className="w-4 h-4" />
                        Guided Tour
                    </button>
                    <ThemeToggle />
                    <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full overflow-hidden border border-[#303133]">
                        <img src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuB5npty6FP7gsC2CXzNJGKrH5SVc4SAtVS17uc2x1SMxgl0g8_yXJ4DMEdh6jd-w6_sKyxVuKlKCjySSbksyfvsVf9MIO2bjXrQcCYGXxN6YoXvO2E5NlKdU_OpeIbAMb_MFdl3P8AOv-YKGFB2-Ecu1WDVk6EuxYoWrBITQMg3PjZEH1CWrdJHanEP6JynR7l3NYxUq9Lp4mDLGRzKXVOJunPsnLE2pzzRJC3904zD34jCL-PPCrxRH-M12_EvYLrHmPwMj5v9oIw"} alt="User profile avatar" className="w-full h-full object-cover" />
                    </button>
                </div>
            </header>

            <main className="pt-20 md:pt-24 pb-28 lg:pb-32 px-3 sm:px-6 md:px-8 min-h-screen">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-10">
                    {/* Left Column */}
                    <section className="xl:col-span-3 space-y-4">
                        <div className="rounded-lg bg-card border border-border p-4 md:p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Daily Practice</h3>
                                <span className="text-[10px] text-primary uppercase tracking-widest">Live</span>
                            </div>
                            <div data-tour="session-cards" className="space-y-3">
                                {sessions.slice(0, 5).map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => handleCardClick(session)}
                                        className={`w-full text-left rounded-lg p-4 border transition-all ${selectedSession.id === session.id ? "bg-primary/10 border-primary/40" : "bg-muted/30 border-transparent hover:border-border"}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Wind className={`w-4 h-4 ${selectedSession.id === session.id ? "text-primary" : "text-muted-foreground"}`} />
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{session.duration} min</span>
                                        </div>
                                        <p className="font-semibold text-sm text-foreground">{session.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{session.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg bg-card border border-border p-4 md:p-5 space-y-3 shadow-sm">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Atmosphere</p>
                            <button onClick={() => setIsMuted(!isMuted)} className="w-full flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3 hover:bg-muted/70 transition-colors">
                                <div className="flex items-center gap-3 text-sm">
                                    {isMuted ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4 text-primary" />}
                                    <span>{isMuted ? "Sound Muted" : "White Noise"}</span>
                                </div>
                                <span className="text-muted-foreground text-xs uppercase tracking-widest">{isMuted ? "Off" : "On"}</span>
                            </button>
                            <button
                                onClick={() => window.open(VISUAL_GUIDANCE_PLAYLIST_URL, "_blank", "noopener,noreferrer")}
                                className="w-full flex items-center justify-between rounded-xl bg-muted px-4 py-3 hover:bg-muted/80 transition-colors"
                            >
                                <div className="flex items-center gap-3 text-sm">
                                    <Image className="w-4 h-4 text-primary" />
                                    <span>Visual Guidance</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                    </section>

                    {/* Center Column */}
                    <section className="xl:col-span-6 flex flex-col items-center text-center">
                        <div className="mt-2 md:mt-4 space-y-2">
                            <p className="text-primary font-bold text-xs uppercase tracking-[0.4em]">Current Journey</p>
                            <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif font-black tracking-tight">Dhyan</h2>
                            <p className="text-muted-foreground italic text-sm md:text-lg">"Silence is the language of God."</p>
                        </div>

                        <div className="relative mt-6 md:mt-8 w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[380px] md:h-[380px] flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-primary/5 blur-[80px]" />
                            <div className="absolute inset-4 rounded-full border border-border overflow-hidden">
                                <img src={meditationBg} alt="Meditation focus" className="w-full h-full object-cover opacity-60" />
                            </div>

                            <button
                                data-tour="play-button"
                                onClick={() => setIsActive(!isActive)}
                                className="absolute z-20 w-24 h-24 rounded-full bg-gradient-to-br from-[#94aaff] to-[#9c8fff] flex items-center justify-center shadow-[0_0_40px_rgba(148,170,255,0.45)] hover:scale-105 active:scale-95 transition-transform"
                            >
                                {isActive ? <Pause className="w-10 h-10 text-black" /> : <Play className="w-10 h-10 text-black ml-1" />}
                            </button>
                        </div>

                        <div data-tour="timer-display" className="mt-6 md:mt-8 space-y-3 w-full max-w-lg">
                            <div className="text-5xl sm:text-6xl md:text-8xl font-light font-mono tracking-wider tabular-nums">{formatTime(safeRemainingSeconds)}</div>
                            <p className="text-muted-foreground text-[11px] uppercase tracking-[0.2em]">{breathPhase === "inhale" ? "Inhale" : breathPhase === "exhale" ? "Exhale" : "Hold"}</p>

                            {selectedSession.id === "dhyan-custom" && (
                                <div className="rounded-lg border border-border bg-muted/50 p-4 mx-auto max-w-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Session Length</span>
                                        <span className="text-xs font-bold text-primary">{sliderValue} min</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        step="1"
                                        value={sliderValue}
                                        onChange={handleSliderChange}
                                        className="w-full accent-[#94aaff]"
                                    />
                                </div>
                            )}

                            <div className="h-1.5 bg-muted rounded-full overflow-hidden max-w-sm mx-auto">
                                <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${progress}%` }} />
                            </div>

                            <div className="flex items-center justify-center gap-4 md:gap-6 pt-2">
                                <button data-tour="reset-button" onClick={handleReset} className="p-3 md:p-4 rounded-full bg-card hover:bg-muted transition-colors border border-border shadow-sm">
                                    <RotateCcw className="w-5 h-5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setIsMuted(!isMuted)} className="p-3 md:p-4 rounded-full bg-card hover:bg-muted transition-colors border border-border shadow-sm">
                                    {isMuted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-muted-foreground" />}
                                </button>
                                <button onClick={() => setShowInstructions(true)} className="p-3 md:p-4 rounded-full bg-card hover:bg-muted transition-colors border border-border shadow-sm">
                                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 md:mt-10 grid grid-cols-3 gap-4 md:gap-8 text-center">
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Elapsed</p>
                                <p className="text-xl md:text-2xl font-serif">{formatTime(elapsedSeconds)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Planned</p>
                                <p className="text-xl md:text-2xl font-serif">{Math.round(totalSessionSeconds / 60)}m</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Breath Pace</p>
                                <p className="text-xl md:text-2xl font-serif">{breathPaceLabel}</p>
                            </div>
                        </div>
                    </section>

                    {/* Right Column */}
                    <section className="xl:col-span-3 space-y-4">
                        <div className="rounded-lg bg-card border border-border p-4 shadow-sm">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-3">Resources</p>
                            <button
                                onClick={() => setShowResources(true)}
                                className="w-full py-3 rounded-xl bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/15 transition-colors border border-primary/20"
                            >
                                Open Resources
                            </button>
                        </div>
                    </section>
                </div>
            </main>

            {/* Desktop Mini Player */}
            <footer className="hidden lg:flex fixed bottom-0 left-0 right-0 z-40 h-20 px-10 items-center justify-between bg-background/90 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-border">
                        <img src={meditationBg} alt="Track cover" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Transcendental States</p>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Safar Soundscapes</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors"><RotateCcw className="w-5 h-5" /></button>
                    <button onClick={() => setIsActive(!isActive)} className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-md">
                        {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground hover:text-foreground transition-colors">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
                </div>
                <div className="flex items-center gap-3 w-64">
                    <span className="text-[10px] font-bold text-muted-foreground">{formatTime(elapsedSeconds)}</span>
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{formatTime(totalSessionSeconds)}</span>
                </div>
            </footer>

            {/* Fullscreen Active Session */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-[#0e0e0f] animate-in fade-in duration-300 flex flex-col h-[100dvh] w-screen overflow-hidden">
                    <button
                        onClick={() => { setIsModalOpen(false); setIsActive(false); handleReset(); }}
                        className="absolute top-4 right-4 z-50 p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-[#adaaab] hover:text-red-400 transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex-1 flex flex-col items-center h-full w-full relative pt-14 pb-8 px-4">
                        <div className="text-center mb-8 w-full max-w-4xl mx-auto">
                            <h2 className="text-3xl lg:text-4xl font-serif text-white tracking-tight">{selectedSession.title}</h2>
                            <p className="text-sm md:text-base text-[#adaaab] max-w-xl mx-auto mt-2">{selectedSession.description}</p>
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
                        <button onClick={() => setShowInstructions(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors z-10">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-sm">
                                <Wind className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-serif text-foreground mb-3">{selectedSession.title}</h2>
                            <p className="text-muted-foreground italic font-medium leading-relaxed">{selectedSession.longDescription}</p>
                        </div>

                        <div data-tour="session-info" className="bg-muted/50 rounded-3xl p-6 mb-8 text-left border border-border">
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
                        <button onClick={() => setShowResources(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-[#adaaab] transition-colors z-10">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6 pr-10">
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
