import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { authService } from "@/utils/authService";
import { focusOverlayService, FocusOverlayStats } from "@/utils/focusOverlayService";
import { useLocation, useNavigate } from "react-router-dom";

// Types
type FocusMode = "Timer" | "short" | "long";

interface TimerState {
    minutes: number;
    seconds: number;
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
    mode: FocusMode;
}

interface FocusContextType {
    // Timer State
    timerState: TimerState;
    setTimerDuration: (minutes: number) => void;
    setBreakDuration: (minutes: number) => void;
    setMode: (mode: FocusMode) => void;
    startTimer: () => void;
    pauseTimer: () => void;
    toggleTimer: () => void;
    resetTimer: () => void;

    // Stats / Tracking State
    stats: FocusOverlayStats | null;
    totalActiveMs: number;

    // UI State
    isPiPActive: boolean;
    togglePiP: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;

    // Global Music State
    isMusicPlaying: boolean;
    isMusicMuted: boolean;
    musicVolume: number;
    setMusicSource: (url: string) => void;
    toggleMusic: () => void;
    setMusicPlaying: (playing: boolean) => void;
    toggleMusicMuted: () => void;
    setMusicVolume: (volume: number) => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);
const DEFAULT_MUSIC_URL = "https://del1.vultrobjects.com/qms-images/Safar/music_1.mp3";

export function FocusProvider({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [userId, setUserId] = useState<string | null>(null);

    // Timer State
    const [mode, setMode] = useState<FocusMode>("Timer");
    const [timerDuration, setTimerDuration] = useState(25);
    const [breakDuration, setBreakDuration] = useState(5);
    const [totalSeconds, setTotalSeconds] = useState(25 * 60);
    const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);

    // Tracking State
    const [stats, setStats] = useState<FocusOverlayStats | null>(null);
    const [totalActiveMs, setTotalActiveMs] = useState(0);

    // Refs for logic to access fresh state in closures/loops
    const remainingSecondsRef = useRef(remainingSeconds);
    const totalSecondsRef = useRef(totalSeconds);
    const isRunningRef = useRef(isRunning);
    const modeRef = useRef(mode);
    const lastTickRef = useRef<number>(Date.now());

    // PiP
    const [isPiPActive, setIsPiPActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pipIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const suppressPiPVideoEventsRef = useRef(false);
    const isPiPActiveRef = useRef(false);
    const studyRoute = "/study";

    // Notification sound ref — plays when any timer mode completes
    const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        const audio = new Audio("https://del1.vultrobjects.com/qms-images/Safar/notification.mp3");
        audio.preload = "auto";
        audio.volume = 0.7;
        notificationAudioRef.current = audio;
        return () => { audio.pause(); audio.src = ""; };
    }, []);

    // Global Music
    const [musicSource, setMusicSourceState] = useState<string>(() => {
        try {
            return localStorage.getItem("focus_music_source") || DEFAULT_MUSIC_URL;
        } catch {
            return DEFAULT_MUSIC_URL;
        }
    });
    const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(() => {
        try {
            // Use sessionStorage so music only persists within the same browsing session
            // (i.e. across page navigations) but does NOT autoplay on fresh page loads
            return sessionStorage.getItem("focus_music_playing") === "1";
        } catch {
            return false;
        }
    });
    const [isMusicMuted, setIsMusicMuted] = useState<boolean>(() => {
        try {
            return localStorage.getItem("focus_music_muted") === "1";
        } catch {
            return false;
        }
    });
    const [musicVolume, setMusicVolumeState] = useState<number>(() => {
        try {
            const saved = Number(localStorage.getItem("focus_music_volume"));
            if (!Number.isFinite(saved)) return 0.5;
            return Math.max(0, Math.min(1, saved));
        } catch {
            return 0.5;
        }
    });
    const audioRef = useRef<HTMLAudioElement>(null);
    const musicShouldPlayRef = useRef(isMusicPlaying);
    const suppressMusicPauseRef = useRef(false);

    // Check Auth
    useEffect(() => {
        authService.getCurrentUser().then(u => {
            setUserId(u?.user?.id || null);
        });
    }, []);

    // Sync refs
    useEffect(() => {
        remainingSecondsRef.current = remainingSeconds;
        totalSecondsRef.current = totalSeconds;
        isRunningRef.current = isRunning;
        modeRef.current = mode;
    }, [remainingSeconds, totalSeconds, isRunning, mode]);

    useEffect(() => {
        isPiPActiveRef.current = isPiPActive;
    }, [isPiPActive]);

    useEffect(() => {
        musicShouldPlayRef.current = isMusicPlaying;
    }, [isMusicPlaying]);

    useEffect(() => {
        try {
            localStorage.setItem("focus_music_source", musicSource);
        } catch {
            // Ignore storage failures.
        }
    }, [musicSource]);

    useEffect(() => {
        try {
            sessionStorage.setItem("focus_music_playing", isMusicPlaying ? "1" : "0");
        } catch {
            // Ignore storage failures.
        }
    }, [isMusicPlaying]);

    useEffect(() => {
        try {
            localStorage.setItem("focus_music_muted", isMusicMuted ? "1" : "0");
        } catch {
            // Ignore storage failures.
        }
    }, [isMusicMuted]);

    useEffect(() => {
        try {
            localStorage.setItem("focus_music_volume", String(musicVolume));
        } catch {
            // Ignore storage failures.
        }
    }, [musicVolume]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRunning && remainingSeconds > 0) {
            lastTickRef.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const deltaMs = now - lastTickRef.current;
                const elapsedSeconds = Math.floor(deltaMs / 1000);

                if (elapsedSeconds <= 0) return;

                // Keep sub-second remainder so delayed/throttled ticks catch up correctly.
                lastTickRef.current = now - (deltaMs % 1000);

                // Update Countdown
                setRemainingSeconds(prev => Math.max(0, prev - elapsedSeconds));

                // Update Tracking
                if (userId) {
                    setTotalActiveMs(prev => prev + deltaMs);
                }
            }, 1000);
        } else if (remainingSeconds === 0 && isRunning) {
            setIsRunning(false);

            // 🔔 Play notification sound for ALL modes (pomodoro, short break, long break)
            try {
                const na = notificationAudioRef.current;
                if (na) {
                    na.currentTime = 0;
                    na.play().catch(() => { /* autoplay may be blocked */ });
                }
            } catch { /* ignore */ }

            // Log Session (only for focus/pomodoro sessions)
            if (modeRef.current === "Timer") {
                const durationMins = Math.floor(totalSecondsRef.current / 60);
                import("@/utils/focusService").then(({ focusService }) => {
                    focusService.logSession({
                        durationMinutes: durationMins,
                        breakMinutes: 0,
                        completed: true
                    }).then(() => console.log("Session logged via Context"));
                });
            }
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning, remainingSeconds, userId]);

    // PiP Draw Loop
    const drawToCanvas = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Use Refs for fresh state inside loop
        const rSeconds = remainingSecondsRef.current;
        const tSeconds = totalSecondsRef.current;
        const running = isRunningRef.current;
        const currentMode = modeRef.current;

        // Background
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, 500, 500);

        // Time
        const mins = Math.floor(rSeconds / 60);
        const secs = rSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 100px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(timeStr, 250, 250);

        // Progress Bar
        const progress = tSeconds > 0 ? (tSeconds - rSeconds) / tSeconds : 0;
        ctx.fillStyle = "#10b981";
        ctx.fillRect(0, 480, 500 * progress, 20);

        // Status
        const modeLabel = currentMode === "Timer" ? "Ekagra Mode" : "Break Mode";
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(modeLabel, 250, 340);

        ctx.font = "22px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(running ? "Running" : "Paused", 250, 375);
    }, []);

    const syncPiPVideoPlayback = useCallback((running: boolean) => {
        if (!isPiPActiveRef.current) return;
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (running && videoEl.paused) {
            suppressPiPVideoEventsRef.current = true;
            videoEl.play().catch(() => { });
            window.setTimeout(() => {
                suppressPiPVideoEventsRef.current = false;
            }, 0);
            return;
        }

        if (!running && !videoEl.paused) {
            suppressPiPVideoEventsRef.current = true;
            videoEl.pause();
            window.setTimeout(() => {
                suppressPiPVideoEventsRef.current = false;
            }, 0);
        }
    }, []);

    const setMusicSource = useCallback((url: string) => {
        const normalized = String(url || "").trim();
        if (!normalized) return;
        setMusicSourceState(normalized);
    }, []);

    const setMusicVolume = useCallback((volume: number) => {
        const normalized = Number.isFinite(volume) ? volume : 0.5;
        const clamped = Math.max(0, Math.min(1, normalized));
        setMusicVolumeState(clamped);
    }, []);

    const setMusicPlaying = useCallback((playing: boolean) => {
        const audioEl = audioRef.current;
        setIsMusicPlaying(playing);
        if (!audioEl) return;

        if (playing) {
            audioEl.play().catch(() => { });
            return;
        }

        suppressMusicPauseRef.current = true;
        audioEl.pause();
        window.setTimeout(() => {
            suppressMusicPauseRef.current = false;
        }, 0);
    }, []);

    const toggleMusic = useCallback(() => {
        setMusicPlaying(!musicShouldPlayRef.current);
    }, [setMusicPlaying]);

    const toggleMusicMuted = useCallback(() => {
        setIsMusicMuted((prev) => !prev);
    }, []);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        if (audioEl.src !== musicSource) {
            audioEl.src = musicSource;
        }
        audioEl.loop = true;
        audioEl.volume = musicVolume;
        audioEl.muted = isMusicMuted;

        if (isMusicPlaying && audioEl.paused) {
            audioEl.play().catch(() => { });
        }
        if (!isMusicPlaying && !audioEl.paused) {
            suppressMusicPauseRef.current = true;
            audioEl.pause();
            window.setTimeout(() => {
                suppressMusicPauseRef.current = false;
            }, 0);
        }
    }, [isMusicMuted, isMusicPlaying, musicSource, musicVolume]);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const handlePause = () => {
            if (suppressMusicPauseRef.current) return;
            if (!musicShouldPlayRef.current) return;

            window.setTimeout(() => {
                const currentAudio = audioRef.current;
                if (!currentAudio) return;
                if (!musicShouldPlayRef.current) return;
                if (!currentAudio.paused) return;
                currentAudio.play().catch(() => { });
            }, 150);
        };

        audioEl.addEventListener("pause", handlePause);
        return () => {
            audioEl.removeEventListener("pause", handlePause);
        };
    }, []);

    useEffect(() => {
        if (!isMusicPlaying) return;
        const id = window.setInterval(() => {
            const audioEl = audioRef.current;
            if (!audioEl) return;
            if (audioEl.paused) {
                audioEl.play().catch(() => { });
            }
        }, 1500);

        return () => {
            window.clearInterval(id);
        };
    }, [isMusicPlaying]);

    const startTimer = useCallback(() => {
        if (remainingSecondsRef.current <= 0) return;
        isRunningRef.current = true;
        setIsRunning(true);
        setMusicPlaying(true);
        syncPiPVideoPlayback(true);
    }, [setMusicPlaying, syncPiPVideoPlayback]);

    const pauseTimer = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        syncPiPVideoPlayback(false);
    }, [syncPiPVideoPlayback]);

    // PiP Toggle
    const togglePiP = useCallback(async () => {
        if (!videoRef.current) return;
        if (!("pictureInPictureEnabled" in document) || !document.pictureInPictureEnabled) {
            console.error("PiP not supported in this browser");
            return;
        }

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiPActive(false);
                if (pipIntervalRef.current) {
                    clearInterval(pipIntervalRef.current);
                    pipIntervalRef.current = undefined;
                }
            } else {
                if (location.pathname !== studyRoute) {
                    navigate(studyRoute);
                }
                // Initialize Canvas
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement("canvas");
                    canvasRef.current.width = 500;
                    canvasRef.current.height = 500;
                }

                // Initial draw background to ensure stream has content
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#1e293b";
                    ctx.fillRect(0, 0, 500, 500);
                }

                const stream = canvasRef.current.captureStream(30);
                videoRef.current.srcObject = stream;
                // Keep PiP minimal: do not expose Media Session handlers/metadata.
                if ("mediaSession" in navigator) {
                    try {
                        navigator.mediaSession.metadata = null;
                        navigator.mediaSession.setActionHandler("play", null);
                        navigator.mediaSession.setActionHandler("pause", null);
                        navigator.mediaSession.setActionHandler("seekbackward", null);
                        navigator.mediaSession.setActionHandler("seekforward", null);
                        navigator.mediaSession.setActionHandler("previoustrack", null);
                        navigator.mediaSession.setActionHandler("nexttrack", null);
                    } catch {
                        // Ignore unsupported media session cleanup.
                    }
                }
                videoRef.current.disableRemotePlayback = true;
                videoRef.current.controls = false;
                videoRef.current.defaultMuted = true;
                videoRef.current.muted = true;
                suppressPiPVideoEventsRef.current = true;
                await videoRef.current.play();
                window.setTimeout(() => {
                    suppressPiPVideoEventsRef.current = false;
                }, 0);
                await videoRef.current.requestPictureInPicture();
                setIsPiPActive(true);

                // Start Interval Loop (500ms)
                drawToCanvas(); // Draw once immediately
                pipIntervalRef.current = setInterval(() => {
                    drawToCanvas();
                    // Keep the stream alive only while timer is running.
                    if (isRunningRef.current && videoRef.current?.paused) {
                        suppressPiPVideoEventsRef.current = true;
                        videoRef.current.play().catch(() => { });
                        window.setTimeout(() => {
                            suppressPiPVideoEventsRef.current = false;
                        }, 0);
                    }
                }, 500);
            }
        } catch (err) {
            console.error("PiP Error:", err);
        }
    }, [drawToCanvas, location.pathname, navigate]);

    // Cleanup PiP
    useEffect(() => {
        const onLeavePiP = () => {
            setIsPiPActive(false);
            if (pipIntervalRef.current) {
                clearInterval(pipIntervalRef.current);
                pipIntervalRef.current = undefined;
            }
        };
        const videoEl = videoRef.current;
        videoEl?.addEventListener("leavepictureinpicture", onLeavePiP);
        return () => {
            videoEl?.removeEventListener("leavepictureinpicture", onLeavePiP);
            if (pipIntervalRef.current) {
                clearInterval(pipIntervalRef.current);
            }
        };
    }, []);

    // Map native PiP video play/pause controls to timer start/pause.
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const onPlay = () => {
            if (suppressPiPVideoEventsRef.current) return;
            if (!isPiPActiveRef.current) return;
            startTimer();
        };

        const onPause = () => {
            if (suppressPiPVideoEventsRef.current) return;
            if (!isPiPActiveRef.current) return;
            pauseTimer();
        };

        videoEl.addEventListener("play", onPlay);
        videoEl.addEventListener("pause", onPause);

        return () => {
            videoEl.removeEventListener("play", onPlay);
            videoEl.removeEventListener("pause", onPause);
        };
    }, [pauseTimer, startTimer]);

    // Controls
    const toggleTimer = useCallback(() => {
        if (isRunningRef.current) pauseTimer();
        else startTimer();
    }, [pauseTimer, startTimer]);

    const resetTimer = useCallback(() => {
        setIsRunning(false);
        setRemainingSeconds(totalSeconds);
    }, [totalSeconds]);

    const handleSetMode = useCallback((newMode: FocusMode) => {
        setMode(newMode);
        let duration = 25;
        if (newMode === "Timer") duration = timerDuration;
        if (newMode === "short") duration = breakDuration;
        if (newMode === "long") duration = 15;

        setTotalSeconds(duration * 60);
        setRemainingSeconds(duration * 60);
        setIsRunning(false);
    }, [timerDuration, breakDuration]);

    const handleSetTimerDuration = useCallback((mins: number) => {
        setTimerDuration(mins);
        if (mode === "Timer") {
            setTotalSeconds(mins * 60);
            setRemainingSeconds(mins * 60);
            setIsRunning(false);
        }
    }, [mode]);

    const handleSetBreakDuration = useCallback((mins: number) => {
        setBreakDuration(mins);
        if (mode === "short") {
            setTotalSeconds(mins * 60);
            setRemainingSeconds(mins * 60);
            setIsRunning(false);
        }
    }, [mode]);

    const value: FocusContextType = {
        timerState: {
            minutes: Math.floor(remainingSeconds / 60),
            seconds: remainingSeconds % 60,
            totalSeconds,
            remainingSeconds,
            isRunning,
            mode
        },
        setTimerDuration: handleSetTimerDuration,
        setBreakDuration: handleSetBreakDuration,
        setMode: handleSetMode,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        stats,
        totalActiveMs,
        isPiPActive,
        togglePiP,
        videoRef,
        isMusicPlaying,
        isMusicMuted,
        musicVolume,
        setMusicSource,
        toggleMusic,
        setMusicPlaying,
        toggleMusicMuted,
        setMusicVolume
    };

    return (
        <FocusContext.Provider value={value}>
            {children}
            {/* Hidden Video Element for PiP */}
            <video
                ref={videoRef}
                className="hidden"
                muted
                playsInline
                disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback"
                translate="no"
            />
            <audio
                ref={audioRef}
                className="hidden"
                preload="auto"
                loop
                src={musicSource}
            />
        </FocusContext.Provider>
    );
}

export const useFocus = () => {
    const context = useContext(FocusContext);
    if (!context) throw new Error("useFocus must be used within FocusProvider");
    return context;
};
