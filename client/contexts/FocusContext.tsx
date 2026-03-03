import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { authService } from "@/utils/authService";
import { FocusOverlayStats } from "@/utils/focusOverlayService";
import { clearPiPNudgeSessionDismissal, dismissPiPNudgeSession, shouldShowPiPNudge } from "@/utils/pipNudge";

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
    setLongBreakDuration: (minutes: number) => void;
    longBreakDuration: number;
    setMode: (mode: FocusMode) => void;
    startTimer: () => void;
    pauseTimer: () => void;
    toggleTimer: () => void;
    resetTimer: () => void;
    hasPendingResume: boolean;
    resumeStoredSession: () => void;
    discardStoredSession: () => void;

    // Goal linking
    associatedGoalId: string | null;
    associatedGoalTitle: string | null;
    setAssociatedGoal: (goalId: string | null, goalTitle?: string | null) => void;

    // Stats / Tracking State
    stats: FocusOverlayStats | null;
    totalActiveMs: number;

    // UI State
    isPiPActive: boolean;
    togglePiP: () => void;
    showPiPNudge: boolean;
    dismissPiPNudge: () => void;
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
const PIP_CANVAS_WIDTH = 720;
const PIP_CANVAS_HEIGHT = 405;
const FOCUS_SESSION_SNAPSHOT_KEY = "focus_timer_session_snapshot_v1";

type FocusSessionSnapshot = {
    mode: FocusMode;
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
    savedAt: number;
};

export function FocusProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    // Timer State
    const [mode, setMode] = useState<FocusMode>("Timer");
    const [timerDuration, setTimerDuration] = useState(25);
    const [breakDuration, setBreakDuration] = useState(5);
    const [longBreakDuration, setLongBreakDuration] = useState(15);
    const [totalSeconds, setTotalSeconds] = useState(25 * 60);
    const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);

    // Goal linking
    const [associatedGoalId, setAssociatedGoalId] = useState<string | null>(null);
    const [associatedGoalTitle, setAssociatedGoalTitle] = useState<string | null>(null);
    const associatedGoalIdRef = useRef<string | null>(null);

    const setAssociatedGoal = useCallback((goalId: string | null, goalTitle?: string | null) => {
        setAssociatedGoalId(goalId);
        setAssociatedGoalTitle(goalTitle ?? null);
        associatedGoalIdRef.current = goalId;
    }, []);

    useEffect(() => {
        associatedGoalIdRef.current = associatedGoalId;
    }, [associatedGoalId]);

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
    const pipIntervalRef = useRef<number | undefined>(undefined);
    const pipRvfcHandleRef = useRef<number | undefined>(undefined);
    const pipHeartbeatRef = useRef<number | undefined>(undefined);
    const suppressPiPVideoEventsRef = useRef(false);
    const isPiPActiveRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const togglePiPRef = useRef<() => Promise<void>>(() => Promise.resolve());
    const pipReadyPromiseRef = useRef<Promise<void> | null>(null);
    const [showPiPNudge, setShowPiPNudge] = useState(false);
    const prevPiPActiveRef = useRef(false);
    const [pendingResumeSnapshot, setPendingResumeSnapshot] = useState<FocusSessionSnapshot | null>(null);

    // Notification sound ref — plays when any timer mode completes
    const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        const audio = new Audio("/Notification.mp3");
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

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(FOCUS_SESSION_SNAPSHOT_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as FocusSessionSnapshot;
            if (!parsed || typeof parsed !== "object") return;

            const baseRemaining = Math.max(0, Number(parsed.remainingSeconds || 0));
            const total = Math.max(1, Number(parsed.totalSeconds || 1500));
            const wasRunning = Boolean(parsed.isRunning);
            const savedAt = Number(parsed.savedAt || Date.now());
            const elapsedSeconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
            const recoveredRemaining = wasRunning ? Math.max(0, baseRemaining - elapsedSeconds) : baseRemaining;

            if (recoveredRemaining <= 0) {
                sessionStorage.removeItem(FOCUS_SESSION_SNAPSHOT_KEY);
                return;
            }

            setPendingResumeSnapshot({
                mode: parsed.mode === "short" || parsed.mode === "long" ? parsed.mode : "Timer",
                totalSeconds: total,
                remainingSeconds: recoveredRemaining,
                isRunning: wasRunning,
                savedAt: Date.now(),
            });
        } catch {
            // Ignore invalid snapshots
        }
    }, []);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        if (pendingResumeSnapshot) return;

        const hasProgress = remainingSeconds > 0 && remainingSeconds < totalSeconds;
        const shouldPersist = isRunning || hasProgress;

        const timer = window.setTimeout(() => {
            try {
                if (!shouldPersist) {
                    sessionStorage.removeItem(FOCUS_SESSION_SNAPSHOT_KEY);
                    return;
                }

                const snapshot: FocusSessionSnapshot = {
                    mode,
                    totalSeconds,
                    remainingSeconds,
                    isRunning,
                    savedAt: Date.now(),
                };
                sessionStorage.setItem(FOCUS_SESSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
            } catch {
                // Ignore storage failures
            }
        }, 350);

        return () => window.clearTimeout(timer);
    }, [mode, totalSeconds, remainingSeconds, isRunning, pendingResumeSnapshot]);

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
        const video = videoRef.current;
        if (!video) return;
        // Avoid React unknown-prop warning by setting the non-standard property imperatively.
        (video as any).autoPictureInPicture = true;
    }, []);

    useEffect(() => {
        const wasPiPActive = prevPiPActiveRef.current;
        if (wasPiPActive && !isPiPActive && isRunning) {
            clearPiPNudgeSessionDismissal();
        }
        prevPiPActiveRef.current = isPiPActive;
    }, [isPiPActive, isRunning]);

    useEffect(() => {
        if (isRunning && !isPiPActive && shouldShowPiPNudge()) {
            const timer = window.setTimeout(() => setShowPiPNudge(true), 1500);
            return () => window.clearTimeout(timer);
        }

        setShowPiPNudge(false);
    }, [isRunning, isPiPActive]);

    const dismissPiPNudge = useCallback(() => {
        setShowPiPNudge(false);
        dismissPiPNudgeSession();
    }, []);

    const resumeStoredSession = useCallback(() => {
        const snapshot = pendingResumeSnapshot;
        if (!snapshot) return;

        setMode(snapshot.mode);
        setTotalSeconds(snapshot.totalSeconds);
        setRemainingSeconds(snapshot.remainingSeconds);

        const modeMinutes = Math.max(1, Math.floor(snapshot.totalSeconds / 60));
        if (snapshot.mode === "Timer") setTimerDuration(modeMinutes);
        if (snapshot.mode === "short") setBreakDuration(modeMinutes);
        if (snapshot.mode === "long") setLongBreakDuration(modeMinutes);

        if (snapshot.isRunning && snapshot.remainingSeconds > 0) {
            isRunningRef.current = true;
            setIsRunning(true);
            setIsMusicPlaying(true);
        } else {
            isRunningRef.current = false;
            setIsRunning(false);
        }

        setPendingResumeSnapshot(null);
    }, [pendingResumeSnapshot]);

    const discardStoredSession = useCallback(() => {
        setPendingResumeSnapshot(null);
        try {
            sessionStorage.removeItem(FOCUS_SESSION_SNAPSHOT_KEY);
        } catch {
            // Ignore storage failures
        }
    }, []);

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

    // Update Media Session Playback State
    useEffect(() => {
        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = isRunning ? "playing" : "paused";
        }
    }, [isRunning]);

    // Memoize the tick handler so we can use it in both interval and visibilitychange
    const handleTick = useCallback(() => {
        if (!isRunningRef.current || remainingSecondsRef.current <= 0) return;

        const now = Date.now();
        const deltaMs = now - lastTickRef.current;
        const elapsedSeconds = Math.floor(deltaMs / 1000);

        if (elapsedSeconds <= 0) return;

        // Keep sub-second remainder so delayed/throttled ticks catch up correctly.
        lastTickRef.current = now - (deltaMs % 1000);

        // Update Countdown
        setRemainingSeconds(prev => Math.max(0, prev - elapsedSeconds));

        // Update Tracking
        if (userIdRef.current) {
            setTotalActiveMs(prev => prev + deltaMs);
        }
    }, []);

    // Timer Interval Worker
    useEffect(() => {
        if (!isRunning) return;

        lastTickRef.current = Date.now();

        // Create a Web Worker from a Blob URL
        const workerCode = `
            let intervalId = null;
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    intervalId = setInterval(() => {
                        self.postMessage('tick');
                    }, 1000);
                } else if (e.data === 'stop' && intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        worker.onmessage = (e) => {
            if (e.data === 'tick') {
                handleTick();
            }
        };

        worker.postMessage('start');

        return () => {
            worker.postMessage('stop');
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };
    }, [isRunning, handleTick]);

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

    // Timer Completion Detection
    useEffect(() => {
        if (remainingSeconds === 0 && isRunning) {
            setIsRunning(false);

            // 🔔 Play notification sound for ALL modes (pomodoro, short break, long break)
            try {
                // Pause music first if playing
                if (musicShouldPlayRef.current) {
                    setMusicPlaying(false);
                }

                // Play notification after a small delay to ensure music has faded/stopped
                setTimeout(() => {
                    const na = notificationAudioRef.current;
                    if (na) {
                        na.currentTime = 0;
                        na.play().catch(() => { /* autoplay may be blocked */ });
                    }
                }, 1000); // 1 second delay
            } catch { /* ignore */ }

            // Log Session (only for focus/pomodoro sessions)
            if (modeRef.current === "Timer") {
                const durationMins = Math.floor(totalSecondsRef.current / 60);
                const goalId = associatedGoalIdRef.current;
                import("@/utils/focusService").then(({ focusService }) => {
                    focusService.logSession({
                        durationMinutes: durationMins, // Full duration reached
                        breakMinutes: 0,
                        completed: true,
                        associatedGoalId: goalId || undefined,
                    }).then(() => console.log("Session logged via Context", goalId ? `(goal: ${goalId})` : ''));
                });
            }
        }
    }, [remainingSeconds, isRunning, setMusicPlaying]);

    // Visibility Change explicitly for catching up on Mobile
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isRunningRef.current) {
                // Instantly catch up timer when tab is visible again
                handleTick();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [handleTick]);

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
        ctx.fillRect(0, 0, PIP_CANVAS_WIDTH, PIP_CANVAS_HEIGHT);

        // Time
        const mins = Math.floor(rSeconds / 60);
        const secs = rSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 96px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(timeStr, PIP_CANVAS_WIDTH / 2, PIP_CANVAS_HEIGHT / 2 - 22);

        // Progress Bar
        const progress = tSeconds > 0 ? (tSeconds - rSeconds) / tSeconds : 0;
        ctx.fillStyle = "#10b981";
        ctx.fillRect(0, PIP_CANVAS_HEIGHT - 14, PIP_CANVAS_WIDTH * progress, 14);

        // Status
        const modeLabel = currentMode === "Timer" ? "Ekagra Mode" : "Break Mode";
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(modeLabel, PIP_CANVAS_WIDTH / 2, PIP_CANVAS_HEIGHT / 2 + 50);

        ctx.font = "22px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(running ? "Running" : "Paused", PIP_CANVAS_WIDTH / 2, PIP_CANVAS_HEIGHT / 2 + 82);
    }, []);

    // Ensure the video element has a canvas stream attached so auto-PiP works
    const ensurePiPReady = useCallback((): Promise<void> => {
        const video = videoRef.current;
        if (!video) return Promise.resolve();

        if (video.srcObject && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            return Promise.resolve();
        }

        if (pipReadyPromiseRef.current) return pipReadyPromiseRef.current;

        pipReadyPromiseRef.current = new Promise((resolve) => {
            // Create canvas
            if (!canvasRef.current) {
                canvasRef.current = document.createElement("canvas");
                canvasRef.current.width = PIP_CANVAS_WIDTH;
                canvasRef.current.height = PIP_CANVAS_HEIGHT;
            }
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(0, 0, PIP_CANVAS_WIDTH, PIP_CANVAS_HEIGHT);
            }

            const stream = canvasRef.current.captureStream(30);

            // Add silent audio track to enable media controls
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass && !audioContextRef.current) {
                    const audioCtx = new AudioContextClass();
                    audioContextRef.current = audioCtx;
                    const dest = audioCtx.createMediaStreamDestination();
                    const oscillator = audioCtx.createOscillator();
                    oscillator.type = "sine";
                    oscillator.frequency.setValueAtTime(0, audioCtx.currentTime);
                    oscillator.connect(dest);
                    const audioTrack = dest.stream.getAudioTracks()[0];
                    stream.addTrack(audioTrack);
                    oscillator.start();
                }
            } catch (e) {
                console.error("Failed to add silent audio track:", e);
            }

            video.srcObject = stream;
            video.disableRemotePlayback = true;
            video.controls = false;
            video.defaultMuted = false;
            video.muted = false;

            const finalize = () => {
                pipReadyPromiseRef.current = null;
                resolve();
            };

            if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
                finalize();
            } else {
                video.addEventListener("loadedmetadata", finalize, { once: true });
            }

            suppressPiPVideoEventsRef.current = true;
            video.play().catch(() => { });
            window.setTimeout(() => {
                suppressPiPVideoEventsRef.current = false;
            }, 0);

            // Draw once so there's content
            drawToCanvas();
        });

        return pipReadyPromiseRef.current;
    }, [drawToCanvas]);

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
        // Pre-initialize stream and request PiP in the same gesture path.
        ensurePiPReady();
        if (!isPiPActiveRef.current && document.pictureInPictureEnabled) {
            togglePiPRef.current().catch(() => { /* fallback handlers can retry */ });
        }
    }, [setMusicPlaying, syncPiPVideoPlayback, ensurePiPReady]);

    const pauseTimer = useCallback(() => {
        isRunningRef.current = false;
        setIsRunning(false);
        setMusicPlaying(false);
        syncPiPVideoPlayback(false);
    }, [setMusicPlaying, syncPiPVideoPlayback]);

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
                // Stop rVFC loop
                if (pipRvfcHandleRef.current !== undefined && videoRef.current && 'cancelVideoFrameCallback' in videoRef.current) {
                    (videoRef.current as any).cancelVideoFrameCallback(pipRvfcHandleRef.current);
                    pipRvfcHandleRef.current = undefined;
                }
                // Stop fallback interval
                if (pipIntervalRef.current) {
                    clearInterval(pipIntervalRef.current);
                    pipIntervalRef.current = undefined;
                }
                // Cleanup AudioContext
                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(() => { });
                    audioContextRef.current = null;
                }
            } else {
                // Ensure canvas + stream are ready (might already be from startTimer)
                await ensurePiPReady();

                // Now request PiP
                if (videoRef.current && !document.pictureInPictureElement) {
                    // Set up Media Session Controls in PiP
                    if ("mediaSession" in navigator) {
                        try {
                            navigator.mediaSession.metadata = new MediaMetadata({
                                title: "Focus Timer",
                                artist: "Safar",
                                album: "Focus Session",
                                artwork: [
                                    { src: "https://del1.vultrobjects.com/qms-images/Safar/logo.png", sizes: "96x96", type: "image/png" },
                                    { src: "https://del1.vultrobjects.com/qms-images/Safar/logo.png", sizes: "128x128", type: "image/png" },
                                ]
                            });

                            navigator.mediaSession.setActionHandler("play", () => {
                                startTimer();
                            });
                            navigator.mediaSession.setActionHandler("pause", () => {
                                pauseTimer();
                            });
                            navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, () => {
                                if (!isPiPActiveRef.current && videoRef.current) {
                                    togglePiP().catch(e => console.log("Auto-PiP via mediaSession blocked:", e));
                                }
                            });

                            navigator.mediaSession.setActionHandler("seekbackward", null);
                            navigator.mediaSession.setActionHandler("seekforward", null);
                            navigator.mediaSession.setActionHandler("previoustrack", null);
                            navigator.mediaSession.setActionHandler("nexttrack", null);
                        } catch (e) {
                            console.error("Media Session API error:", e);
                        }
                    }

                    await videoRef.current.requestPictureInPicture();
                    setIsPiPActive(true);

                    // Draw once immediately so the PiP window isn't blank.
                    drawToCanvas();

                    // Use requestVideoFrameCallback (rVFC) when available — it fires on every
                    // video frame even when the browser tab is minimized or the user has
                    // switched to another app, as long as the PiP window is active.
                    // Falls back to setInterval on browsers that don't support rVFC yet.
                    const startPiPDrawLoop = () => {
                        const videoEl = videoRef.current;
                        if (!videoEl || !isPiPActiveRef.current) return;

                        if ('requestVideoFrameCallback' in videoEl) {
                            // rVFC loop — background-safe
                            const loop = () => {
                                drawToCanvas();
                                // Keep stream alive while timer is running
                                if (isRunningRef.current && videoEl.paused) {
                                    suppressPiPVideoEventsRef.current = true;
                                    videoEl.play().catch(() => { });
                                    window.setTimeout(() => { suppressPiPVideoEventsRef.current = false; }, 0);
                                }
                                if (isPiPActiveRef.current) {
                                    pipRvfcHandleRef.current = (videoEl as any).requestVideoFrameCallback(loop);
                                }
                            };
                            pipRvfcHandleRef.current = (videoEl as any).requestVideoFrameCallback(loop);
                        } else {
                            // Fallback: plain interval (may be throttled in background tab)
                            const fallbackEl = videoEl as HTMLVideoElement;
                            pipIntervalRef.current = window.setInterval(() => {
                                drawToCanvas();
                                if (isRunningRef.current && fallbackEl.paused) {
                                    suppressPiPVideoEventsRef.current = true;
                                    fallbackEl.play().catch(() => { });
                                    window.setTimeout(() => { suppressPiPVideoEventsRef.current = false; }, 0);
                                }
                            }, 500);
                        }
                    };
                    startPiPDrawLoop();

                    // Guaranteed 1-second heartbeat — keeps the canvas in sync even when
                    // rVFC stops firing (e.g. video paused, browser throttling).
                    pipHeartbeatRef.current = window.setInterval(() => {
                        if (isPiPActiveRef.current) {
                            drawToCanvas();
                        } else {
                            window.clearInterval(pipHeartbeatRef.current);
                            pipHeartbeatRef.current = undefined;
                        }
                    }, 1000);
                } // Closes `if (videoRef.current && !document.pictureInPictureElement)`
            } // Closes `else`
        } catch (err: any) {
            if (err?.name !== "NotAllowedError") {
                console.error("PiP Error:", err);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
        }
    }, [drawToCanvas, startTimer, pauseTimer, ensurePiPReady]);

    // Keep ref in sync so startTimer can call togglePiP without circular deps
    useEffect(() => {
        togglePiPRef.current = togglePiP;
    }, [togglePiP]);

    // Register enterpictureinpicture media session handler whenever the timer
    // is running. This allows Chrome (120+) to automatically trigger PiP when
    // the user switches apps on mobile — even before they've manually opened PiP.
    // The browser calls our handler with user-activation context, so
    // requestPictureInPicture() is allowed.
    useEffect(() => {
        if (!isRunning || !("mediaSession" in navigator)) return;

        const handler = () => {
            if (!isPiPActiveRef.current && videoRef.current && document.pictureInPictureEnabled) {
                togglePiP().catch(e => console.log("Auto-PiP via mediaSession blocked:", e));
            }
        };

        try {
            navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, handler);
        } catch {
            // Browser doesn't support this action — fall through to visibilitychange below
        }

        return () => {
            try {
                navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, null);
            } catch { /* ignore */ }
        };
    }, [isRunning, togglePiP]);

    // Fallback auto-PiP via visibilitychange — works on desktop browsers where
    // requestPictureInPicture() is allowed from non-gesture contexts.
    // On mobile this will typically fail silently (NotAllowedError) which is fine;
    // the mediaSession handler above covers that case.
    useEffect(() => {
        const handleVisibilityChange = () => {
            // Mobile browsers block PiP from this event; mediaSession/nudge handles mobile.
            if (navigator.maxTouchPoints > 1) return;
            if (document.hidden && isRunning && !isPiPActiveRef.current && document.pictureInPictureEnabled) {
                togglePiP().catch(() => { /* best effort on desktop */ });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [isRunning, togglePiP]);

    // Cleanup PiP
    useEffect(() => {
        const stopPiPLoop = () => {
            const videoEl = videoRef.current;
            // Cancel rVFC loop
            if (pipRvfcHandleRef.current !== undefined && videoEl && 'cancelVideoFrameCallback' in videoEl) {
                (videoEl as any).cancelVideoFrameCallback(pipRvfcHandleRef.current);
                pipRvfcHandleRef.current = undefined;
            }
            // Cancel fallback interval
            if (pipIntervalRef.current !== undefined) {
                clearInterval(pipIntervalRef.current);
                pipIntervalRef.current = undefined;
            }
        };

        const onLeavePiP = () => {
            setIsPiPActive(false);
            stopPiPLoop();
        };

        const videoEl = videoRef.current;
        videoEl?.addEventListener("leavepictureinpicture", onLeavePiP);
        return () => {
            videoEl?.removeEventListener("leavepictureinpicture", onLeavePiP);
            stopPiPLoop();
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
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
        // Log partial session before resetting if some time elapsed
        if (mode === "Timer" && isRunning) {
            const elapsedSeconds = totalSeconds - remainingSeconds;
            const elapsedMinutes = Math.floor(elapsedSeconds / 60);
            if (elapsedMinutes > 0) {
                const goalId = associatedGoalIdRef.current;
                import("@/utils/focusService").then(({ focusService }) => {
                    focusService.logSession({
                        durationMinutes: elapsedMinutes,
                        breakMinutes: 0,
                        completed: false, // Interrupted/partial session
                        associatedGoalId: goalId || undefined,
                    }).then(() => console.log("Partial Session logged via reset", goalId ? `(goal: ${goalId})` : ''));
                });
            }
        }

        isRunningRef.current = false;
        setIsRunning(false);
        setMusicPlaying(false);
        setRemainingSeconds(totalSeconds);
    }, [totalSeconds, remainingSeconds, isRunning, mode, setMusicPlaying]);

    const handleSetMode = useCallback((newMode: FocusMode) => {
        setMode(newMode);
        let duration = 25;
        if (newMode === "Timer") duration = timerDuration;
        if (newMode === "short") duration = breakDuration;
        if (newMode === "long") duration = longBreakDuration;

        setTotalSeconds(duration * 60);
        setRemainingSeconds(duration * 60);
        setIsRunning(false);
        setMusicPlaying(false);
    }, [timerDuration, breakDuration, longBreakDuration, setMusicPlaying]);

    const handleSetTimerDuration = useCallback((mins: number) => {
        setTimerDuration(mins);
        if (mode === "Timer") {
            setTotalSeconds(mins * 60);
            setRemainingSeconds(mins * 60);
            setIsRunning(false);
            setMusicPlaying(false);
        }
    }, [mode, setMusicPlaying]);

    const handleSetBreakDuration = useCallback((mins: number) => {
        setBreakDuration(mins);
        if (mode === "short") {
            setTotalSeconds(mins * 60);
            setRemainingSeconds(mins * 60);
            setIsRunning(false);
            setMusicPlaying(false);
        }
    }, [mode, setMusicPlaying]);

    const handleSetLongBreakDuration = useCallback((mins: number) => {
        setLongBreakDuration(mins);
        if (mode === "long") {
            setTotalSeconds(mins * 60);
            setRemainingSeconds(mins * 60);
            setIsRunning(false);
            setMusicPlaying(false);
        }
    }, [mode, setMusicPlaying]);

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
        setLongBreakDuration: handleSetLongBreakDuration,
        longBreakDuration: longBreakDuration,
        setMode: handleSetMode,
        startTimer,
        pauseTimer,
        toggleTimer,
        resetTimer,
        hasPendingResume: Boolean(pendingResumeSnapshot),
        resumeStoredSession,
        discardStoredSession,
        associatedGoalId,
        associatedGoalTitle,
        setAssociatedGoal,
        stats,
        totalActiveMs,
        isPiPActive,
        togglePiP,
        showPiPNudge,
        dismissPiPNudge,
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
                // Keep element in DOM for PiP eligibility without visible UI.
                className="fixed -left-[9999px] -top-[9999px] w-[160px] h-[90px] opacity-0 pointer-events-none"
                playsInline
                disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback"
                translate="no"
                // Removed explicit muted prop here; will be managed in code
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

