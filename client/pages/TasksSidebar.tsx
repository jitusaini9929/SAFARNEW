import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, Circle } from 'lucide-react';

interface Task {
    id: number;
    text: string;
    completed: boolean;
}

interface TasksSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onTasksChange?: (tasks: Task[]) => void;
    userId?: string;
}

// Load tasks from localStorage (scoped per user)
const loadTasks = (userId?: string): Task[] => {
    try {
        const key = userId ? `focus-tasks-${userId}` : 'focus-tasks';
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

// Save tasks to localStorage (scoped per user)
const saveTasks = (tasks: Task[], userId?: string) => {
    const key = userId ? `focus-tasks-${userId}` : 'focus-tasks';
    localStorage.setItem(key, JSON.stringify(tasks));
};

const TasksSidebar: React.FC<TasksSidebarProps> = ({ isOpen, onClose, onTasksChange, userId }) => {
    const [tasks, setTasks] = useState<Task[]>(() => loadTasks(userId));
    const [newTask, setNewTask] = useState("");

    // Reload tasks when userId changes
    useEffect(() => {
        setTasks(loadTasks(userId));
    }, [userId]);

    // Save to localStorage and notify parent whenever tasks change
    useEffect(() => {
        saveTasks(tasks, userId);
        onTasksChange?.(tasks);
    }, [tasks, onTasksChange]);

    const handleAddTask = () => {
        if (newTask.trim()) {
            setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
            setNewTask("");
        }
    };

    const toggleTask = (id: number) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const deleteTask = (id: number) => {
        setTasks(tasks.filter(t => t.id !== id));
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
                    <h2 className="text-xl font-bold font-['Poppins']">Tasks</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder="Add a new task..."
                        className="flex-1 bg-muted/50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary/50 focus:outline-none"
                    />
                    <button
                        onClick={handleAddTask}
                        disabled={!newTask.trim()}
                        className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 pb-20">
                    {tasks.map(task => (
                        <div key={task.id} className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all">
                            <button onClick={() => toggleTask(task.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                                {task.completed ? <CheckCircle className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5" />}
                            </button>
                            <span className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
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
            </div>
        </>
    );
};

export default TasksSidebar;
export type { Task };
