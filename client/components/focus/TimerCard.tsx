import React from "react";
import { Play, Pause, RotateCcw, Target, PictureInPicture2, Timer, Coffee, Sofa } from "lucide-react";

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
    onSetMode?: (mode: "Timer" | "short" | "long") => void;
    isPiPActive: boolean;
}

const MODE_TABS: { key: "Timer" | "short" | "long"; label: string; icon: React.ReactNode }[] = [
    { key: "Timer", label: "Pomodoro", icon: <Timer className="w-3.5 h-3.5" /> },
    { key: "short", label: "Short break", icon: <Coffee className="w-3.5 h-3.5" /> },
    { key: "long", label: "Long break", icon: <Sofa className="w-3.5 h-3.5" /> },
];

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
    onSetMode,
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
            {/* Mode Tabs */}
            {onSetMode && (
                <div className="flex items-center justify-center mb-8 md:mb-10">
                    <div className="bg-white/30 dark:bg-slate-800/50 p-1.5 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/20 dark:border-white/10">
                        {MODE_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => onSetMode(tab.key)}
                                disabled={isRunning}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${mode === tab.key
                                    ? "text-white shadow-md"
                                    : "text-white/60 hover:text-white/90 hover:bg-white/10"
                                    } ${isRunning && mode !== tab.key ? "opacity-40 cursor-not-allowed" : ""}`}
                                style={mode === tab.key ? { backgroundColor: currentTheme.accent } : undefined}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

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
