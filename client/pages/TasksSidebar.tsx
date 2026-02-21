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
const TasksSidebar: React.FC<TasksSidebarProps> = ({ isOpen, onClose, onTasksChange, tasks }) => {

    const toggleTask = (id: number) => {
        onTasksChange(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: number) => {
        onTasksChange(tasks.filter(t => t.id !== id));
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop - click to close */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[65]"
                onClick={onClose}
            />
            <div className="fixed inset-y-0 right-0 w-[min(22rem,100vw)] max-w-full bg-background/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-[70] p-4 sm:p-6 pr-[max(1rem,env(safe-area-inset-right))] flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold font-['Poppins']">Task History</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 pb-20 mt-4">
                    {Object.entries(
                        tasks.filter(t => t.completed).reduce((groups, task) => {
                            // Mocking the date as today for all existing tasks since we didn't store a createdAt timestamp originally
                            // We use the ID as a proxy for the timestamp since it uses Date.now()
                            const date = new Date(task.id);

                            // Formatting the date nicely relative to today
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);

                            let dateGroup = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

                            if (date.toDateString() === today.toDateString()) {
                                dateGroup = "Today";
                            } else if (date.toDateString() === yesterday.toDateString()) {
                                dateGroup = "Yesterday";
                            }

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
                                    <span className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                                        {task.text}
                                    </span>
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

                    {tasks.filter(t => t.completed).length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                            <CheckCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">No completed tasks in your history yet.</p>
                            <p className="text-xs opacity-70 mt-1">Start a focus session and complete some tasks!</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default TasksSidebar;
export type { Task };
