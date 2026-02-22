import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';

interface Task {
    id: number;
    text: string;
    completed: boolean;
}

interface TasksSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    onTasksChange: (tasks: Task[]) => void;
}

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getDateGroupLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

const formatTaskCreatedLabel = (date: Date) =>
    date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const TasksSidebar: React.FC<TasksSidebarProps> = ({ isOpen, onClose, onTasksChange, tasks }) => {
    const [historyDateFilter, setHistoryDateFilter] = useState(() => getLocalDateKey(new Date()));

    const toggleTask = (id: number) => {
        onTasksChange(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: number) => {
        onTasksChange(tasks.filter(t => t.id !== id));
    };

    if (!isOpen) return null;

    const completedTasks = tasks.filter(t => t.completed);
    const historyDateKeys = Array.from(
        new Set(completedTasks.map(task => getLocalDateKey(new Date(task.id))))
    ).sort();
    const historyMinKey = historyDateKeys[0];
    const historyMaxKey = historyDateKeys[historyDateKeys.length - 1];
    const filteredTasks = historyDateFilter
        ? completedTasks.filter(task => getLocalDateKey(new Date(task.id)) === historyDateFilter)
        : completedTasks;

    return (
        <>
            {/* Backdrop - click to close */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[65]"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 w-[min(22rem,100vw)] max-w-full bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[70] p-4 sm:p-6 pr-[max(1rem,env(safe-area-inset-right))] flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold font-['Poppins']">Task History</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={historyDateFilter}
                            onChange={(e) => setHistoryDateFilter(e.target.value)}
                            min={historyMinKey}
                            max={historyMaxKey}
                            className="h-8 rounded-md border border-border/60 bg-background/70 px-2 text-xs text-foreground"
                        />
                        <button
                            type="button"
                            onClick={() => setHistoryDateFilter("")}
                            disabled={!historyDateFilter}
                            className="h-8 px-2.5 rounded-md text-xs font-semibold bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear
                        </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {historyDateFilter
                            ? `Showing ${filteredTasks.length} of ${completedTasks.length}`
                            : `${completedTasks.length} completed`}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 pb-20 mt-4">
                    {Object.entries(
                        filteredTasks.reduce((groups, task) => {
                            const date = new Date(task.id);
                            const dateGroup = getDateGroupLabel(date);

                            if (!groups[dateGroup]) {
                                groups[dateGroup] = [];
                            }
                            groups[dateGroup].push(task);
                            return groups;
                        }, {} as Record<string, typeof tasks>)
                    ).map(([dateGroup, groupTasks]) => (
                        <div key={dateGroup} className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-background/95 backdrop-blur-md py-1 z-10 border-b border-border/50">
                                {dateGroup}
                            </h3>
                            {groupTasks.map(task => (
                                <div key={task.id} className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all opacity-80 hover:opacity-100">
                                    <button onClick={() => toggleTask(task.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                                        {task.completed ? <CheckCircle className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                                            {task.text}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">
                                            {`Created ${formatTaskCreatedLabel(new Date(task.id))}`}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}

                    {completedTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">No completed tasks in your history yet.</p>
                            <p className="text-xs opacity-70 mt-1">Start a focus session and complete some tasks!</p>
                        </div>
                    )}
                    {completedTasks.length > 0 && filteredTasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">No completed tasks on this date.</p>
                            <p className="text-xs opacity-70 mt-1">Pick another date or clear the filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TasksSidebar;
export type { Task };
