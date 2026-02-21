import React from "react";
import { Play, Pause, RotateCcw, Target, PictureInPicture2, Timer, Coffee, Sofa } from "lucide-react";

interface TimerCardProps {
    minutes: number;
    seconds: number;
    isRunning: boolean;
    mode: "Timer" | "short" | "long";
    currentTheme: { accent: string };
    currentTask?: { text: string };
    completedTask?: { text: string };
    nextTask?: { text: string };
    onProceed?: () => void;
    onToggle: () => void;
    onReset: () => void;
    onTogglePiP: () => void;
    onSetMode?: (mode: "Timer" | "short" | "long") => void;
    isPiPActive: boolean;
    onAddTask: (taskText: string) => void;
    onEditTask?: (newText: string) => void;
    onDeleteTask?: () => void;
    onCompleteTask?: () => void;
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
    completedTask,
    nextTask,
    onProceed,
    onToggle,
    onReset,
    onTogglePiP,
    onSetMode,
    isPiPActive,
    onAddTask,
    onEditTask,
    onDeleteTask,
    onCompleteTask,
}) => {
    const [newTaskText, setNewTaskText] = React.useState("");
    const [isEditing, setIsEditing] = React.useState(false);
    const [editText, setEditText] = React.useState(currentTask?.text || "");

    React.useEffect(() => {
        if (currentTask) {
            setEditText(currentTask.text);
        }
    }, [currentTask]);

    const handleAddTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            onAddTask(newTaskText);
            setNewTaskText("");
        }
    };

    const formatTime = (mins: number, secs: number) => {
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div
            className="w-full max-w-2xl rounded-3xl p-8 md:p-12 landscape:p-4 text-center shadow-2xl relative overflow-hidden transition-all duration-300 border-4 bg-white/20 dark:bg-slate-900/50 backdrop-blur-md"
            style={{ borderColor: currentTheme.accent }}
        >
            {/* Mode Tabs */}
            {onSetMode && (
                <div className="flex items-center justify-center mb-8 md:mb-10 landscape:mb-4">
                    <div className="bg-white/30 dark:bg-slate-800/50 p-1.5 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/20 dark:border-white/10">
                        {MODE_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => onSetMode(tab.key)}
                                disabled={isRunning}
                                aria-label={tab.label}
                                className={`flex items-center gap-1.5 px-4 py-2 landscape:px-3 landscape:py-1 rounded-full text-sm font-semibold transition-all duration-200 action-btn-nowrap ${mode === tab.key
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
            <div data-tour="timer-display" className="text-6xl md:text-8xl lg:text-9xl landscape:text-5xl landscape:lg:text-7xl leading-none font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground tracking-tight mb-8 md:mb-12 landscape:mb-4 drop-shadow-xl font-['Poppins']">
                {formatTime(minutes, seconds)}
            </div>

            {/* Task Display */}
            {completedTask ? (
                <div className="mb-6 md:mb-8 landscape:mb-4 px-4 py-3 rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border-2 border-white/20 max-w-md mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold">Task Completed</div>
                            <div className="text-sm md:text-base font-medium text-foreground">
                                Task {completedTask.text} is completed
                            </div>
                            {nextTask && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Up next: {nextTask.text}
                                </div>
                            )}
                        </div>
                        {nextTask && onProceed && (
                            <button
                                onClick={onProceed}
                                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md transition-all"
                                style={{ backgroundColor: currentTheme.accent }}
                            >
                                Proceed
                            </button>
                        )}
                    </div>
                </div>
            ) : currentTask ? (
                <div className="mb-6 md:mb-8 landscape:mb-4 px-4 py-3 rounded-xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm border-2 border-white/20 max-w-md mx-auto group">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-semibold text-left">Current Task</div>

                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                autoFocus
                                className="flex-1 bg-white/50 dark:bg-slate-800/80 border border-white/40 dark:border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                style={{ '--tw-ring-color': currentTheme.accent } as React.CSSProperties}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        onEditTask?.(editText);
                                        setIsEditing(false);
                                    } else if (e.key === 'Escape') {
                                        setIsEditing(false);
                                        setEditText(currentTask.text);
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    onEditTask?.(editText);
                                    setIsEditing(false);
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
                                style={{ backgroundColor: currentTheme.accent }}
                            >
                                Save
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm md:text-base font-medium text-foreground text-left">
                                <Target className="shrink-0 w-4 h-4" style={{ color: currentTheme.accent }} />
                                <span className="line-clamp-2">{currentTask.text}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                    onClick={() => onCompleteTask?.()}
                                    className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                                    title="Mark as done"
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </button>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 transition-colors"
                                    title="Edit task"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to delete the active task?")) {
                                            onDeleteTask?.();
                                        }
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                                    title="Delete task"
                                >
                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mb-6 md:mb-8 landscape:mb-4 max-w-md mx-auto relative z-20">
                    <form onSubmit={handleAddTaskSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            placeholder="What are you working on?"
                            className="flex-1 bg-white/30 dark:bg-slate-800/50 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 placeholder:text-foreground/50 text-foreground transition-all"
                            style={{ '--tw-ring-color': currentTheme.accent } as React.CSSProperties}
                        />
                        <button
                            type="submit"
                            disabled={!newTaskText.trim()}
                            className="shrink-0 px-4 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1 shadow-md"
                            style={{ backgroundColor: currentTheme.accent }}
                        >
                            <span className="hidden sm:inline">Add Task</span>
                            <span className="sm:hidden">+</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4 landscape:gap-3">
                <button
                    onClick={onReset}
                    className="w-12 h-12 landscape:w-10 landscape:h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:opacity-80 transition-all"
                    style={{ '--hover-color': currentTheme.accent } as React.CSSProperties}
                >
                    <RotateCcw className="w-5 h-5 landscape:w-4 landscape:h-4" />
                </button>

                <button
                    data-tour="start-button"
                    onClick={onToggle}
                    aria-label={isRunning ? "Pause timer" : "Start timer"}
                    className="group relative px-8 py-4 md:px-16 md:py-5 landscape:px-6 landscape:py-3 text-white text-lg md:text-xl landscape:text-base font-bold rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden action-btn-nowrap"
                    style={{
                        backgroundColor: currentTheme.accent,
                        boxShadow: `0 0 30px ${currentTheme.accent}50`
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
                                <span className="action-label-mobile-hidden">Start</span>
                            </>
                        )}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
            </div>

        </div>
    );
};
