import React from "react";
import { X } from "lucide-react";
import { FocusAnalyticsPanel } from "@/components/analytics/FocusAnalyticsPanel";

interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    completedAt: string | null;
    importedFromGoal?: boolean;
}

interface TasksSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const TasksSidebar: React.FC<TasksSidebarProps> = ({
    isOpen,
    onClose,
}) => {
    return (
        <>
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[65]"
                        onClick={onClose}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Session History"
                        className="fixed left-1/2 top-1/2 z-[70] flex max-h-[86vh] w-[min(58rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-3xl border border-white/10 bg-background/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 sm:p-6"
                    >
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold font-['Poppins']">Session History</h2>
                                <p className="mt-1 text-xs text-muted-foreground">Saved Ekagra sessions from Analytics.</p>
                            </div>
                            <button onClick={onClose} className="shrink-0 p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <FocusAnalyticsPanel view="sessions" />
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default TasksSidebar;
export type { Task };
