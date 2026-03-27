import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
    const navigate = useNavigate();
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
        <div className="min-h-[100dvh] bg-[#0e0e0f] text-white font-['Manrope',sans-serif] overflow-x-hidden">
            <audio ref={audioRef} src="/Dhyan_processed.mp3" loop />

            <GlobalSidebar isOpen={isGlobalSidebarOpen} onClose={() => setIsGlobalSidebarOpen(false)} homeRoute="/home" />

            {/* Desktop Navigation Rail */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-24 z-40 flex-col items-center py-8 bg-[#131314] border-r border-[#1f2022]">
                <button onClick={() => navigate("/home")} className="mb-12 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#94aaff] to-[#9c8fff] font-serif">D</button>
                <nav className="flex flex-col gap-3">
                    <button onClick={() => navigate("/home")} className="flex flex-col items-center p-3 text-[#adaaab] hover:text-[#94aaff] hover:bg-[#1a191b] rounded-2xl transition-colors">
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Home</span>
                    </button>
                    <button className="flex flex-col items-center p-3 bg-[#94aaff]/10 text-[#94aaff] rounded-2xl">
                        <Wind className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Meditate</span>
                    </button>
                    <button onClick={() => navigate("/study")} className="flex flex-col items-center p-3 text-[#adaaab] hover:text-[#94aaff] hover:bg-[#1a191b] rounded-2xl transition-colors">
                        <Clock className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Focus</span>
                    </button>
                    <button onClick={() => navigate("/mehfil")} className="flex flex-col items-center p-3 text-[#adaaab] hover:text-[#94aaff] hover:bg-[#1a191b] rounded-2xl transition-colors">
                        <Music className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Music</span>
                    </button>
                    <button onClick={() => navigate("/profile")} className="flex flex-col items-center p-3 text-[#adaaab] hover:text-[#94aaff] hover:bg-[#1a191b] rounded-2xl transition-colors">
                        <Heart className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Profile</span>
                    </button>
                </nav>
            </aside>

            {/* Top App Bar */}
            <header className="fixed top-0 right-0 left-0 lg:left-24 z-50 h-20 px-5 md:px-10 flex items-center justify-between bg-[#0e0e0f]/70 backdrop-blur-xl border-b border-[#1f2022]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsGlobalSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-[#adaaab] hover:bg-[#1a191b]">
                        <Menu className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-[#94aaff] font-serif">Dhyan</h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#adaaab]">Ethereal Sanctuary</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 md:gap-5">
                    <button onClick={() => setShowResources(true)} className="hidden md:inline-flex text-[#adaaab] hover:text-white transition-colors">
                        <ExternalLink className="w-5 h-5" />
                    </button>
                    <button onClick={() => startTour(meditationTour)} className="hidden md:inline-flex text-[#adaaab] hover:text-white transition-colors">
                        <HelpCircle className="w-5 h-5" />
                    </button>
                    <ThemeToggle />
                    <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full overflow-hidden border border-[#303133]">
                        <img src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuB5npty6FP7gsC2CXzNJGKrH5SVc4SAtVS17uc2x1SMxgl0g8_yXJ4DMEdh6jd-w6_sKyxVuKlKCjySSbksyfvsVf9MIO2bjXrQcCYGXxN6YoXvO2E5NlKdU_OpeIbAMb_MFdl3P8AOv-YKGFB2-Ecu1WDVk6EuxYoWrBITQMg3PjZEH1CWrdJHanEP6JynR7l3NYxUq9Lp4mDLGRzKXVOJunPsnLE2pzzRJC3904zD34jCL-PPCrxRH-M12_EvYLrHmPwMj5v9oIw"} alt="User profile avatar" className="w-full h-full object-cover" />
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-28 lg:pb-32 px-4 md:px-8 lg:ml-24 min-h-screen">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-10">
                    {/* Left Column */}
                    <section className="xl:col-span-3 space-y-6">
                        <div className="rounded-[2rem] bg-[#161618] border border-[#262627] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#adaaab] font-bold">Daily Practice</h3>
                                <span className="text-[10px] text-[#81ecff] uppercase tracking-widest">Live</span>
                            </div>
                            <div className="space-y-3">
                                {sessions.slice(0, 5).map((session) => (
                                    <button
                                        key={session.id}
                                        onClick={() => handleCardClick(session)}
                                        className={`w-full text-left rounded-2xl p-4 border transition-all ${selectedSession.id === session.id ? "bg-[#94aaff]/10 border-[#94aaff]/40" : "bg-[#1a191b] border-transparent hover:border-[#3b3c3d]"}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Wind className={`w-4 h-4 ${selectedSession.id === session.id ? "text-[#81ecff]" : "text-[#adaaab]"}`} />
                                            <span className="text-[10px] uppercase tracking-wider text-[#adaaab]">{session.duration} min</span>
                                        </div>
                                        <p className="font-semibold text-sm text-white">{session.title}</p>
                                        <p className="text-xs text-[#adaaab] mt-1 line-clamp-2">{session.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[2rem] bg-[#161618] border border-[#262627] p-5 space-y-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#adaaab] font-bold">Atmosphere</p>
                            <button onClick={() => setIsMuted(!isMuted)} className="w-full flex items-center justify-between rounded-xl bg-[#1f1f20] px-4 py-3 hover:bg-[#242526] transition-colors">
                                <div className="flex items-center gap-3 text-sm">
                                    {isMuted ? <VolumeX className="w-4 h-4 text-[#94aaff]" /> : <Volume2 className="w-4 h-4 text-[#94aaff]" />}
                                    <span>{isMuted ? "Sound Muted" : "White Noise"}</span>
                                </div>
                                <span className="text-[#adaaab] text-xs uppercase tracking-widest">{isMuted ? "Off" : "On"}</span>
                            </button>
                            <button onClick={() => setShowResources(true)} className="w-full flex items-center justify-between rounded-xl bg-[#1f1f20] px-4 py-3 hover:bg-[#242526] transition-colors">
                                <div className="flex items-center gap-3 text-sm">
                                    <Image className="w-4 h-4 text-[#94aaff]" />
                                    <span>Visual Guidance</span>
                                </div>
                                <ExternalLink className="w-4 h-4 text-[#adaaab]" />
                            </button>
                        </div>
                    </section>

                    {/* Center Column */}
                    <section className="xl:col-span-6 flex flex-col items-center text-center">
                        <div className="mt-4 space-y-2">
                            <p className="text-[#94aaff] font-bold text-xs uppercase tracking-[0.4em]">Current Journey</p>
                            <h2 className="text-5xl md:text-7xl font-serif font-black tracking-tight">Dhyan</h2>
                            <p className="text-[#adaaab] italic text-sm md:text-lg">"Silence is the language of God."</p>
                        </div>

                        <div className="relative mt-8 w-[280px] h-[280px] md:w-[420px] md:h-[420px] flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-[#94aaff]/10 blur-[80px]" />
                            <div className="absolute inset-4 rounded-full border border-[#3b3c3d] overflow-hidden">
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

                        <div data-tour="timer-display" className="mt-8 space-y-3 w-full max-w-lg">
                            <div className="text-6xl md:text-8xl font-light font-mono tracking-wider tabular-nums">{formatTime(timeLeft)}</div>
                            <p className="text-[#adaaab] text-[11px] uppercase tracking-[0.2em]">{breathPhase === "inhale" ? "Inhale" : breathPhase === "exhale" ? "Exhale" : "Hold"}</p>

                            {selectedSession.id === "dhyan-custom" && (
                                <div className="rounded-2xl border border-[#2c2d2e] bg-[#161618] p-4 mx-auto max-w-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] uppercase tracking-widest text-[#adaaab]">Session Length</span>
                                        <span className="text-xs font-bold text-[#81ecff]">{sliderValue} min</span>
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

                            <div className="h-1.5 bg-[#262627] rounded-full overflow-hidden max-w-sm mx-auto">
                                <div className="h-full bg-gradient-to-r from-[#94aaff] to-[#00d4ec]" style={{ width: `${progress}%` }} />
                            </div>

                            <div className="flex items-center justify-center gap-6 pt-2">
                                <button data-tour="reset-button" onClick={handleReset} className="p-4 rounded-full bg-[#1a191b] hover:bg-[#242425] transition-colors border border-[#2f2f31]">
                                    <RotateCcw className="w-5 h-5 text-[#adaaab]" />
                                </button>
                                <button onClick={() => setIsMuted(!isMuted)} className="p-4 rounded-full bg-[#1a191b] hover:bg-[#242425] transition-colors border border-[#2f2f31]">
                                    {isMuted ? <VolumeX className="w-5 h-5 text-[#adaaab]" /> : <Volume2 className="w-5 h-5 text-[#adaaab]" />}
                                </button>
                                <button onClick={() => setShowInstructions(true)} className="p-4 rounded-full bg-[#1a191b] hover:bg-[#242425] transition-colors border border-[#2f2f31]">
                                    <HelpCircle className="w-5 h-5 text-[#adaaab]" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-10 grid grid-cols-3 gap-8 text-center">
                            <div>
                                <p className="text-[#adaaab] text-[10px] uppercase tracking-widest">Duration</p>
                                <p className="text-2xl font-serif">{formatTime(timeLeft)}</p>
                            </div>
                            <div>
                                <p className="text-[#adaaab] text-[10px] uppercase tracking-widest">Session</p>
                                <p className="text-2xl font-serif">{selectedSession.duration}m</p>
                            </div>
                            <div>
                                <p className="text-[#adaaab] text-[10px] uppercase tracking-widest">Intensity</p>
                                <p className="text-2xl font-serif">Deep</p>
                            </div>
                        </div>
                    </section>

                    {/* Right Column */}
                    <section className="xl:col-span-3 space-y-6">
                        <div className="rounded-[2rem] bg-[#161618] border border-[#262627] p-4">
                            {renderMeditationVideoCard("meditation-video-url-desktop", "bg-transparent border-0 shadow-none p-0")}
                            <button
                                onClick={() => setShowExercises(true)}
                                className="mt-4 w-full py-3 rounded-full bg-[#1f2022] text-xs font-bold uppercase tracking-widest hover:bg-[#292a2d] transition-colors"
                            >
                                Expand Session
                            </button>
                        </div>

                        <div className="rounded-[2rem] bg-[#161618] border border-[#262627] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold">Pulse Rate</p>
                                <Sparkles className="w-4 h-4 text-[#81ecff]" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-serif">62</span>
                                <span className="text-[10px] uppercase text-[#adaaab] tracking-widest">BPM</span>
                            </div>
                        </div>

                        <div className="rounded-[2rem] bg-[#161618] border border-[#262627] p-5 flex items-center justify-between">
                            <div>
                                <p className="font-semibold">Zen Streak</p>
                                <p className="text-xs text-[#adaaab]">14 Days</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-[#94aaff]/10 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[#94aaff]" />
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Desktop Mini Player */}
            <footer className="hidden lg:flex fixed bottom-0 left-24 right-0 z-40 h-20 px-10 items-center justify-between bg-[#060607]/80 backdrop-blur-xl border-t border-[#222325]">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#2c2d2f]">
                        <img src={meditationBg} alt="Track cover" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Transcendental States</p>
                        <p className="text-[10px] uppercase tracking-widest text-[#adaaab]">Safar Soundscapes</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={handleReset} className="text-[#adaaab] hover:text-white"><RotateCcw className="w-5 h-5" /></button>
                    <button onClick={() => setIsActive(!isActive)} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center">
                        {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <button onClick={() => setIsMuted(!isMuted)} className="text-[#adaaab] hover:text-white">{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
                </div>
                <div className="flex items-center gap-3 w-64">
                    <span className="text-[10px] font-bold text-[#adaaab]">{formatTime(Math.max(0, (selectedSession.id === "dhyan-custom" ? sliderValue : selectedSession.duration) * 60 - timeLeft))}</span>
                    <div className="flex-1 h-1 bg-[#262627] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#94aaff] to-[#9c8fff]" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-[#adaaab]">{formatTime((selectedSession.id === "dhyan-custom" ? sliderValue : selectedSession.duration) * 60)}</span>
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
                                <span className={`inline-block px-7 py-2.5 rounded-full text-lg font-black tracking-[0.15em] ${breathPhase === 'inhale' ? 'bg-indigo-500/20 text-indigo-200' : breathPhase === 'exhale' ? 'bg-blue-500/20 text-blue-200' : 'bg-amber-500/20 text-amber-200'}`}>
                                    {breathPhase === 'inhale' ? 'INHALE' : breathPhase === 'exhale' ? 'EXHALE' : 'HOLD'}
                                </span>
                                <div className="text-5xl md:text-7xl font-light text-white font-mono tracking-widest tabular-nums">{formatTime(timeLeft)}</div>
                                <div className="w-full max-w-xs h-1.5 bg-[#262627] rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-[#94aaff] to-[#00d4ec]" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="flex items-center justify-center gap-8 mt-2">
                                    <button onClick={handleReset} className="p-4 rounded-full bg-[#1a191b] border border-[#2f2f31]"><RotateCcw className="w-5 h-5 text-[#adaaab]" /></button>
                                    <button onClick={() => setIsActive(!isActive)} className={`p-7 rounded-full ${isActive ? "bg-amber-500" : "bg-gradient-to-br from-[#94aaff] to-[#9c8fff]"} text-black`}>
                                        {isActive ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
                                    </button>
                                    <button onClick={() => setIsMuted(!isMuted)} className="p-4 rounded-full bg-[#1a191b] border border-[#2f2f31]">{isMuted ? <VolumeX className="w-5 h-5 text-[#adaaab]" /> : <Volume2 className="w-5 h-5 text-[#adaaab]" />}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Session Instruction Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151517] w-full max-w-lg rounded-[2.2rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-[#2b2c2d] overflow-hidden">
                        <button onClick={() => setShowInstructions(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-[#adaaab] transition-colors z-10">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8 relative z-10">
                            <div className="w-16 h-16 mx-auto bg-[#94aaff]/20 rounded-3xl flex items-center justify-center text-[#94aaff] mb-6 shadow-sm">
                                <Wind className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-serif text-white mb-3">{selectedSession.title}</h2>
                            <p className="text-[#adaaab] italic font-medium leading-relaxed">{selectedSession.longDescription}</p>
                        </div>

                        <div data-tour="session-info" className="bg-[#1c1d20] rounded-3xl p-6 mb-8 text-left border border-[#2e2f31]">
                            <h3 className="text-[10px] font-bold text-[#adaaab] uppercase tracking-[0.2em] mb-4">The Ritual</h3>
                            <div className="space-y-4">
                                {selectedSession.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 text-[#d2d3d4] text-sm leading-relaxed items-start">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#94aaff] text-black flex items-center justify-center text-[10px] font-black mt-0.5">{idx + 1}</span>
                                        <span className="font-medium">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={startSession} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#94aaff] to-[#9c8fff] text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Begin Journey
                        </button>
                    </div>
                </div>
            )}

            {/* Resources Modal */}
            {showResources && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl md:max-w-3xl rounded-[2.2rem] border border-[#2b2c2d] bg-[#151517] p-4 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowResources(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-[#adaaab] transition-colors z-10">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-8 pr-10">
                            <h2 className="text-2xl font-serif text-white mb-2">Dhyan Resources</h2>
                            <p className="text-sm text-[#adaaab] italic font-medium opacity-80">Guided experiences and editorial content to deepen your practice.</p>
                        </div>

                        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            <CourseBanner user={user ? { name: user.name, email: user.email } : null} courseId="safar-30" />
                            {renderMeditationVideoCard("meditation-video-url-modal", "bg-transparent border-none shadow-none")}
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
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-4 py-3 bg-[#131314]/90 backdrop-blur-2xl border-t border-[#2a2b2d]">
                <button onClick={() => setShowSessionList(true)} className="flex flex-col items-center text-[#00e3fd]">
                    <Wind className="w-5 h-5" />
                    <span className="text-[10px] mt-1 uppercase tracking-widest">Breath</span>
                </button>
                <button onClick={() => navigate("/study")} className="flex flex-col items-center text-[#adaaab]">
                    <Dumbbell className="w-5 h-5" />
                    <span className="text-[10px] mt-1 uppercase tracking-widest">Focus</span>
                </button>
                <button onClick={() => setIsActive(!isActive)} className="flex flex-col items-center text-[#adaaab]">
                    <Clock className="w-5 h-5" />
                    <span className="text-[10px] mt-1 uppercase tracking-widest">Timer</span>
                </button>
                <button onClick={() => setShowResources(true)} className="flex flex-col items-center text-[#adaaab]">
                    <ExternalLink className="w-5 h-5" />
                    <span className="text-[10px] mt-1 uppercase tracking-widest">Journal</span>
                </button>
            </nav>

            <TourPrompt tour={meditationTour} featureName="Meditation" />
        </div>
    );
}
