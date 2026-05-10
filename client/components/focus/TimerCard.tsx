import React from "react";
import { Play, Pause, RotateCcw, PictureInPicture2, Timer, Coffee, Sofa } from "lucide-react";

interface TimerCardProps {
    minutes: number;
    seconds: number;
    isRunning: boolean;
    showResumeLabel?: boolean;
    /** When true, draws an extra gradient glow on the primary start/pause control (e.g. after a longer Pomodoro was chosen). */
    emphasizeStartButton?: boolean;
    mode: "Timer" | "short" | "long";
    currentTheme: { accent: string };
    onToggle: () => void;
    onReset: () => void;
    startLabel?: string;
    endLabel?: string;
    onTogglePiP: () => void;
    onSetMode?: (mode: "Timer" | "short" | "long") => void;
    isPiPActive: boolean;
}

const MODE_TABS: { key: "Timer" | "short" | "long"; label: string; icon: React.ReactNode }[] = [
    { key: "Timer", label: "Pomodoro", icon: <Timer className="w-3.5 h-3.5" /> },
    { key: "short", label: "Short break", icon: <Coffee className="w-3.5 h-3.5" /> },
    { key: "long", label: "Long break", icon: <Sofa className="w-3.5 h-3.5" /> },
];

const modeHint = (mode: "Timer" | "short" | "long") => {
    if (mode === "short") return "Short break session";
    if (mode === "long") return "Long break session";
    return "Free Focus";
};

export const TimerCard: React.FC<TimerCardProps> = ({
    minutes,
    seconds,
    isRunning,
    showResumeLabel = false,
    emphasizeStartButton = false,
    mode,
    currentTheme,
    onToggle,
    onReset,
    startLabel = "Start",
    endLabel = "End Session",
    onTogglePiP,
    onSetMode,
    isPiPActive,
}) => {
    const formatTime = (mins: number, secs: number) => `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    return (
        <div
            className="w-full max-w-2xl rounded-3xl p-8 md:p-12 landscape:p-4 text-center shadow-2xl relative overflow-hidden transition-all duration-300 border-4 bg-white/20 dark:bg-slate-900/50 backdrop-blur-md"
            style={{ borderColor: currentTheme.accent }}
        >
            {onSetMode && (
                <div className="flex items-center justify-center mb-8 md:mb-10 landscape:mb-4">
                    <div className="bg-white/50 dark:bg-slate-800/50 p-1.5 rounded-full flex items-center gap-1 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm">
                        {MODE_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => onSetMode(tab.key)}
                                disabled={isRunning}
                                aria-label={tab.label}
                                className={`flex items-center gap-1.5 px-4 rounded-full min-h-[44px] text-sm font-bold transition-all duration-300 ${mode === tab.key
                                    ? "text-white shadow-lg scale-105"
                                    : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white/90 hover:bg-slate-900/5 dark:hover:bg-white/10"
                                    } ${isRunning && mode !== tab.key ? "opacity-40 cursor-not-allowed" : ""}`}
                                style={mode === tab.key ? { backgroundColor: currentTheme.accent } : undefined}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline uppercase tracking-wider text-[11px]">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div data-tour="timer-display" className="text-6xl md:text-8xl lg:text-9xl landscape:text-5xl landscape:lg:text-7xl leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground tracking-tight mb-5 md:mb-8 landscape:mb-4 drop-shadow-xl font-['Poppins']">
                {formatTime(minutes, seconds)}
            </div>

            <p className="mb-8 text-xs uppercase tracking-[0.2em] text-foreground/70 font-bold">{modeHint(mode)}</p>

            <div className="flex items-center justify-center gap-4 landscape:gap-3">
                <button
                    onClick={onReset}
                    className="h-12 landscape:h-10 rounded-full bg-muted px-4 flex items-center justify-center gap-2 text-muted-foreground hover:opacity-80 transition-all"
                    style={{ '--hover-color': currentTheme.accent } as React.CSSProperties}
                >
                    <RotateCcw className="w-5 h-5 landscape:w-4 landscape:h-4" />
                    <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">{endLabel}</span>
                </button>

                <button
                    data-tour="start-button"
                    onClick={onToggle}
                    aria-label={isRunning ? "Pause timer" : showResumeLabel ? "Resume timer" : "Start timer"}
                    className={`group relative px-8 py-4 md:px-16 md:py-5 landscape:px-6 landscape:py-3 text-white text-lg md:text-xl landscape:text-base font-bold rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden action-btn-nowrap ${
                        emphasizeStartButton && !isRunning ? "animate-[pulse-glow_2.4s_ease-in-out_infinite]" : ""
                    }`}
                    style={{
                        backgroundColor: currentTheme.accent,
                        boxShadow: emphasizeStartButton && !isRunning
                            ? `0 0 28px ${currentTheme.accent}99, 0 0 56px ${currentTheme.accent}66, 0 0 80px ${currentTheme.accent}44`
                            : `0 0 30px ${currentTheme.accent}50`,
                    }}
                >
                    <span className="relative z-10 uppercase tracking-widest flex items-center gap-3">
                        {isRunning ? (
                            <>
                                <Pause className="w-6 h-6 landscape:w-5 landscape:h-5" />
                                <span className="action-label-mobile-hidden">Pause</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6 landscape:w-5 landscape:h-5" />
                                <span className="action-label-mobile-hidden">{showResumeLabel ? "Resume" : startLabel}</span>
                            </>
                        )}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>

                <button
                    onClick={onTogglePiP}
                    className={`w-12 h-12 landscape:w-10 landscape:h-10 rounded-full flex items-center justify-center transition-all ${isPiPActive ? "bg-white/30 text-white" : "bg-muted text-muted-foreground hover:opacity-80"}`}
                    title={isPiPActive ? "Exit PiP" : "Enter PiP"}
                >
                    <PictureInPicture2 className="w-5 h-5 landscape:w-4 landscape:h-4" />
                </button>
            </div>
            {emphasizeStartButton && !isRunning ? (
                <style>{`
                    @keyframes pulse-glow {
                        0%, 100% { filter: brightness(1); transform: scale(1); }
                        50% { filter: brightness(1.12); transform: scale(1.02); }
                    }
                `}</style>
            ) : null}
        </div>
    );
};
