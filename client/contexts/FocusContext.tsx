import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { authService } from "@/utils/authService";
import { focusOverlayService, FocusOverlayStats } from "@/utils/focusOverlayService";
import { useLocation } from "react-router-dom";

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
    toggleTimer: () => void;
    resetTimer: () => void;

    // Stats / Tracking State
    stats: FocusOverlayStats | null;
    totalActiveMs: number;

    // UI State
    isPiPActive: boolean;
    togglePiP: () => void;
    videoRef: React.RefObject<HTMLVideoElement>;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export function FocusProvider({ children }: { children: React.ReactNode }) {
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
    const animationFrameRef = useRef<number>();

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

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isRunning && remainingSeconds > 0) {
            lastTickRef.current = Date.now();
            interval = setInterval(() => {
                const now = Date.now();
                const deltaMs = now - lastTickRef.current;
                lastTickRef.current = now;

                // Update Countdown
                setRemainingSeconds(prev => Math.max(0, prev - 1));

                // Update Tracking
                if (userId) {
                    setTotalActiveMs(prev => prev + deltaMs);
                }
            }, 1000);
        } else if (remainingSeconds === 0 && isRunning) {
            setIsRunning(false);

            // Log Session
            if (modeRef.current === "Timer") {
                const durationMins = Math.floor(totalSecondsRef.current / 60);
                // Dynamic import to avoid circular dependencies if any
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

        if (document.pictureInPictureElement) {
            animationFrameRef.current = requestAnimationFrame(drawToCanvas);
        }
    }, []);

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
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            } else {
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
                await videoRef.current.play();
                await videoRef.current.requestPictureInPicture();
                setIsPiPActive(true);

                drawToCanvas();
            }
        } catch (err) {
            console.error("PiP Error:", err);
        }
    }, [drawToCanvas]);

    // Cleanup PiP
    useEffect(() => {
        const onLeavePiP = () => {
            setIsPiPActive(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
        const videoEl = videoRef.current;
        videoEl?.addEventListener("leavepictureinpicture", onLeavePiP);
        return () => videoEl?.removeEventListener("leavepictureinpicture", onLeavePiP);
    }, []);

    // Controls
    const toggleTimer = useCallback(() => setIsRunning(prev => !prev), []);

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
        toggleTimer,
        resetTimer,
        stats,
        totalActiveMs,
        isPiPActive,
        togglePiP,
        videoRef
    };

    return (
        <FocusContext.Provider value={value}>
            {children}
            {/* Hidden Video Element for PiP */}
            <video ref={videoRef} className="hidden" muted playsInline />
        </FocusContext.Provider>
    );
}

export const useFocus = () => {
    const context = useContext(FocusContext);
    if (!context) throw new Error("useFocus must be used within FocusProvider");
    return context;
};
