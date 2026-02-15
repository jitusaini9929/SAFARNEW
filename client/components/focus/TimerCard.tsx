import React from "react";
import { Play, Pause, RotateCcw, Target, PictureInPicture2 } from "lucide-react";

interface TimerCardProps {
    minutes: number;
    seconds: number;
    isRunning: boolean;
    mode: "Timer" | "short" | "long";
    currentTheme: { accent: string };
    currentTask?: { text: string };
    onToggle: () => void;
    onReset: () => void;
    onTogglePiP: () => void;
    isPiPActive: boolean;
}

export const TimerCard: React.FC<TimerCardProps> = ({
    minutes,
    seconds,
    isRunning,
    mode,
    currentTheme,
    currentTask,
    onToggle,
    onReset,
    onTogglePiP,
    isPiPActive,
}) => {
    const formatTime = (mins: number, secs: number) => {
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div
            className="w-full max-w-2xl rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden transition-all duration-300 border-4 bg-white/20 dark:bg-slate-900/50 backdrop-blur-md"
            style={{ borderColor: currentTheme.accent }}
        >
            {/* Timer Display */}
            <div data-tour="timer-display" className="text-6xl md:text-8xl lg:text-9xl leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground tracking-tight mb-8 md:mb-12 drop-shadow-xl font-['Poppins']">
                {formatTime(minutes, seconds)}
            </div>

            {/* Current Task Display */}
            {currentTask && (
                <div className="mb-6 md:mb-8 px-4 py-3 rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border-2 border-white/20 max-w-md mx-auto">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Current Task</div>
                    <div className="text-sm md:text-base font-medium text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" style={{ color: currentTheme.accent }} />
                        {currentTask.text}
                    </div>
                </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={onReset}
                    className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:opacity-80 transition-all"
                    style={{ '--hover-color': currentTheme.accent } as React.CSSProperties}
                >
                    <RotateCcw className="w-5 h-5" />
                </button>

                <button
                    data-tour="start-button"
                    onClick={onToggle}
                    className="group relative px-8 py-4 md:px-16 md:py-5 text-white text-lg md:text-xl font-bold rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden"
                    style={{
                        backgroundColor: currentTheme.accent,
                        boxShadow: `0 0 30px ${currentTheme.accent}50`
                    }}
                >
                    <span className="relative z-10 uppercase tracking-widest flex items-center gap-3">
                        {isRunning ? (
                            <>
                                <Pause className="w-6 h-6" /> Pause
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6" /> Start
                            </>
                        )}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>

            <div className="mt-6 flex justify-center">
                <button
                    onClick={onTogglePiP}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${isPiPActive ? "bg-emerald-500 text-white" : "bg-white/70 text-slate-900 hover:bg-white"
                        }`}
                    title={isPiPActive ? "Disable Picture-in-Picture timer" : "Enable Picture-in-Picture timer"}
                >
                    <PictureInPicture2 className="w-4 h-4" />
                    {isPiPActive ? "PiP Active" : "Open PiP Timer"}
                </button>
            </div>
        </div>
    );
};
