import { useEffect, useState } from "react";
import NishthaLayout from "@/components/NishthaLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { Goal } from "@shared/api";
import { TourPrompt } from "@/components/guided-tour";
import { goalsTour } from "@/components/guided-tour/tourSteps";
import {
    Plus,
    Search,
    CheckCircle2,
    Clock,
    Check,
    TrendingUp,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Calendar,
    RotateCcw,
    Archive,
    Pencil,
    Save,
    X,
    Repeat,
    Trophy,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";

type GoalWithMeta = Goal & {
    completed_at?: string | null;
    scheduled_date?: string | null;
    scheduledDate?: string | null;
};

const toLocalDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const parseGoalDate = (raw: string | null | undefined) => {
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-").map(Number);
        return new Date(year, month - 1, day);
    }

    const parsed = new Date(raw);
    if (!Number.isFinite(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const formatScheduledDate = (dateStr: string | null | undefined) => {
    const date = parseGoalDate(dateStr);
    if (!date) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

    return date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
};

const getDatePickerConstraints = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setHours(0, 0, 0, 0);
    maxDate.setDate(maxDate.getDate() + 7);

    return {
        min: toLocalDateInputValue(today),
        max: toLocalDateInputValue(maxDate),
    };
};

const getGoalTitle = (goal: Goal) => {
    const title = (goal as any).title || goal.text;
    return String(title || "").trim();
};

const getGoalDescription = (goal: Goal) => {
    const description = (goal as any).description;
    if (!description) return "";
    return String(description).trim();
};

export default function Goals() {
    const [user, setUser] = useState<any>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [rolloverPrompts, setRolloverPrompts] = useState<Goal[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [newGoalTitle, setNewGoalTitle] = useState("");
    const [newGoalDescription, setNewGoalDescription] = useState("");
    const [goalType, setGoalType] = useState("daily");
    const [scheduledDate, setScheduledDate] = useState("");
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [editingDescription, setEditingDescription] = useState("");
    const [victoriesPage, setVictoriesPage] = useState(0);
    const victoriesPerPage = 5;
    const dateConstraints = getDatePickerConstraints();

    // Repeat Plan state
    const [showRepeatPlan, setShowRepeatPlan] = useState(false);
    const [repeatPeriod, setRepeatPeriod] = useState<"daily" | "weekly">("daily");
    const [previousGoals, setPreviousGoals] = useState<Goal[]>([]);
    const [selectedRepeatIds, setSelectedRepeatIds] = useState<Set<string>>(new Set());
    const [loadingRepeat, setLoadingRepeat] = useState(false);
    const [repeating, setRepeating] = useState(false);

    const refreshGoalsData = async () => {
        const [allGoals, prompts] = await Promise.all([
            dataService.getGoals(),
            dataService.getGoalRolloverPrompts(),
        ]);
        setGoals(allGoals);
        setRolloverPrompts(prompts);
    };

    useEffect(() => {
        const init = async () => {
            try {
                const userData = await authService.getCurrentUser();
                if (userData?.user) {
                    setUser(userData.user);
                    await refreshGoalsData();
                }
            } catch (error) {
                console.error("Failed to load goals", error);
            }
        };
        init();
    }, []);

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoalTitle.trim()) return;
        try {
            await dataService.addGoal(
                newGoalTitle.trim(),
                goalType,
                scheduledDate || undefined,
                newGoalDescription.trim() || undefined
            );
            await refreshGoalsData();
            setNewGoalTitle("");
            setNewGoalDescription("");
            setScheduledDate("");
            setIsAdding(false);
            toast.success("Goal created!");
        } catch (error: any) {
            toast.error(error?.message || "Failed to add goal");
        }
    };

    const handleStartEditGoal = (goal: Goal) => {
        setEditingGoalId(goal.id);
        setEditingTitle(getGoalTitle(goal));
        setEditingDescription(getGoalDescription(goal));
    };

    const handleCancelEditGoal = () => {
        setEditingGoalId(null);
        setEditingTitle("");
        setEditingDescription("");
    };

    const handleSaveGoalDetails = async (goalId: string) => {
        if (!editingTitle.trim()) {
            toast.error("Goal title is required");
            return;
        }

        try {
            await dataService.updateGoalDetails(
                goalId,
                editingTitle.trim(),
                editingDescription.trim() || undefined
            );
            await refreshGoalsData();
            handleCancelEditGoal();
            toast.success("Goal updated");
        } catch (error: any) {
            toast.error(error?.message || "Failed to update goal");
        }
    };

    const handleToggleGoal = async (goal: Goal) => {
        try {
            const newStatus = !goal.completed;
            await dataService.updateGoal(goal.id, newStatus);
            await refreshGoalsData();
            if (newStatus) toast.success("Goal completed!");
        } catch (error: any) {
            toast.error(error?.message || "Failed to update goal");
        }
    };

    const handleRolloverAction = async (goalId: string, action: "retry" | "archive") => {
        try {
            await dataService.respondToGoalRollover(goalId, action);
            await refreshGoalsData();
            toast.success(action === "retry" ? "Goal continued for tomorrow!" : "Goal archived");
        } catch (error: any) {
            toast.error(error?.message || "Failed to process goal");
        }
    };

    const handleDeleteGoal = async (goalId: string) => {
        try {
            await dataService.deleteGoal(goalId);
            await refreshGoalsData();
            toast.success("Goal deleted");
        } catch (error: any) {
            toast.error(error?.message || "Failed to delete goal");
        }
    };

    // --- Repeat Plan handlers ---
    const handleOpenRepeatPlan = async (period: "daily" | "weekly" = "daily") => {
        setRepeatPeriod(period);
        setShowRepeatPlan(true);
        setLoadingRepeat(true);
        try {
            const prev = await dataService.getPreviousGoals(period);
            setPreviousGoals(prev);
            setSelectedRepeatIds(new Set(prev.map(g => g.id)));
        } catch (error: any) {
            toast.error(error?.message || "Failed to load previous goals");
        } finally {
            setLoadingRepeat(false);
        }
    };

    const handleToggleRepeatSelection = (goalId: string) => {
        setSelectedRepeatIds(prev => {
            const next = new Set(prev);
            if (next.has(goalId)) next.delete(goalId);
            else next.add(goalId);
            return next;
        });
    };

    const handleConfirmRepeat = async () => {
        if (selectedRepeatIds.size === 0) {
            toast.error("Please select at least one goal to repeat");
            return;
        }
        setRepeating(true);
        try {
            const result = await dataService.repeatPlan(Array.from(selectedRepeatIds));
            await refreshGoalsData();
            toast.success(result.message || "Plan repeated for today!");
            setShowRepeatPlan(false);
            setPreviousGoals([]);
            setSelectedRepeatIds(new Set());
        } catch (error: any) {
            toast.error(error?.message || "Failed to repeat plan");
        } finally {
            setRepeating(false);
        }
    };

    // Check if user has any historical goals (for enabling repeat plan)
    const hasHistoricalGoals = goals.length > 0;

    // Derived Logic
    const rolloverPromptIds = new Set(rolloverPrompts.map((goal) => goal.id));
    const filteredGoals = goals.filter((goal) => {
        if (rolloverPromptIds.has(goal.id)) return false;
        const q = searchQuery.toLowerCase();
        return getGoalTitle(goal).toLowerCase().includes(q) || getGoalDescription(goal).toLowerCase().includes(q);
    });
    const filteredRolloverPrompts = rolloverPrompts.filter((goal) =>
        getGoalTitle(goal).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const dailyGoals = goals.filter(g => g.type === "daily");
    const weeklyGoals = goals.filter(g => g.type === "weekly");
    const completedDaily = dailyGoals.filter(g => g.completed).length;
    const completedWeekly = weeklyGoals.filter(g => g.completed).length;

    // Chart Data - use completed_at for completed goals
    const chartData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const count = goals.filter(g => {
            if (!g.completed) return false;
            // Use completed_at if available, otherwise fall back to createdAt
            const completedDate = new Date((g as GoalWithMeta).completed_at || g.completedAt || g.createdAt || Date.now());
            return completedDate.toDateString() === d.toDateString();
        }).length;
        return { day: dayName, goals: count };
    });

    // Recent Victories - sort by completed_at descending (most recently completed first)
    const allCompletedGoals = goals
        .filter(g => g.completed)
        .sort((a, b) => {
            const aDate = new Date((a as GoalWithMeta).completed_at || a.completedAt || a.createdAt || 0);
            const bDate = new Date((b as GoalWithMeta).completed_at || b.completedAt || b.createdAt || 0);
            return bDate.getTime() - aDate.getTime(); // Descending
        });

    const totalVictoriesPages = Math.ceil(allCompletedGoals.length / victoriesPerPage);
    const recentVictories = allCompletedGoals.slice(
        victoriesPage * victoriesPerPage,
        (victoriesPage + 1) * victoriesPerPage
    );

    return (
        <NishthaLayout userName={user?.name} userAvatar={user?.avatar}>
            <div className="flex-1 bg-background/95 font-['Plus_Jakarta_Sans']">

                {/* Background - matching Achievements page */}
                <div
                    className="fixed inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 15% 50%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 85% 30%, rgba(46, 125, 115, 0.04) 0%, transparent 45%)
                        `,
                        backgroundAttachment: 'fixed'
                    }}
                ></div>

                <div className="relative z-10 p-6 md:p-8">

                    {/* Search Header */}
                    <div className="mb-8">
                        <div className="relative w-full md:max-w-3xl group mx-auto md:mx-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#2E7D73] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search or filter goals..."
                                className="w-full pl-12 pr-6 py-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 focus:ring-4 focus:ring-[#2E7D73]/10 focus:border-[#2E7D73] transition-all outline-none font-medium placeholder-gray-400 shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Main Content - Goals Grid */}
                        <div className="lg:col-span-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                {/* Add New Goal Card */}
                                <div
                                    data-tour="add-goal"
                                    className={`
                                    bg-white dark:bg-[#111827] border-2 border-[#2E7D73]/30 hover:border-[#2E7D73] rounded-2xl p-6 
                                    flex flex-col justify-center items-center cursor-pointer transition-all duration-300 group min-h-[180px]
                                    ${isAdding ? 'ring-2 ring-[#2E7D73]/20' : ''}
                                `}
                                    onClick={() => !isAdding && setIsAdding(true)}
                                >
                                    {isAdding ? (
                                        <form onSubmit={handleAddGoal} className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Goal title"
                                                className="w-full bg-transparent text-lg font-medium placeholder:text-muted-foreground/50 border-none focus:ring-0 p-0 text-center dark:text-white"
                                                value={newGoalTitle}
                                                onChange={(e) => setNewGoalTitle(e.target.value)}
                                                onBlur={() => !newGoalTitle && !newGoalDescription && setIsAdding(false)}
                                                onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
                                            />
                                            <textarea
                                                placeholder="Goal description (optional)"
                                                className="w-full resize-none bg-muted/60 text-sm placeholder:text-muted-foreground/60 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-[#2E7D73]/20 dark:bg-gray-800 dark:text-white"
                                                value={newGoalDescription}
                                                onChange={(e) => setNewGoalDescription(e.target.value)}
                                                rows={2}
                                                onClick={(e) => e.stopPropagation()}
                                            />

                                            {/* Schedule for future date */}
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                                                    Schedule for (optional)
                                                </label>
                                                <input
                                                    type="date"
                                                    min={dateConstraints.min}
                                                    max={dateConstraints.max}
                                                    value={scheduledDate}
                                                    onChange={(e) => setScheduledDate(e.target.value)}
                                                    className="w-full text-xs bg-muted px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 outline-none cursor-pointer dark:bg-gray-700 dark:text-white text-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>

                                            <div className="flex justify-center gap-2">
                                                <select
                                                    value={goalType}
                                                    onChange={(e) => setGoalType(e.target.value)}
                                                    className="text-xs bg-muted px-2 py-1 rounded-md border-none outline-none cursor-pointer dark:bg-gray-700 dark:text-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                </select>
                                                <button
                                                    type="submit"
                                                    className="bg-[#2E7D73] text-white px-4 py-1 rounded-md text-xs font-bold hover:bg-[#25665e] transition-colors"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Create
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-full bg-transparent flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <Plus className="w-12 h-12 text-[#2E7D73]" strokeWidth={2.5} />
                                            </div>
                                            <span className="font-bold text-[#2E7D73] text-lg">Add New Goal</span>
                                        </>
                                    )}
                                </div>

                                {filteredGoals.map((goal) => {
                                    const lifecycleStatus = (goal as any).lifecycle_status || (goal as any).lifecycleStatus || "active";
                                    const isArchived = lifecycleStatus === "abandoned" || lifecycleStatus === "rolled_over";
                                    const isMissed = lifecycleStatus === "missed";
                                    const scheduledDateValue = (goal as any).scheduled_date || (goal as any).scheduledDate;
                                    const isScheduled = Boolean(scheduledDateValue) && !goal.completed;
                                    const completeDisabled = isArchived || isMissed;
                                    const goalTitle = getGoalTitle(goal);
                                    const goalDescription = getGoalDescription(goal);
                                    const isEditing = editingGoalId === goal.id;

                                    return (
                                        <div key={goal.id} data-tour="goal-cards" className="relative group bg-white dark:bg-[#111827] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col justify-between min-h-[160px]">

                                            <div className="flex justify-between items-start mb-3 gap-3">
                                                <div className="min-w-0 flex-1">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                value={editingTitle}
                                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                                className="w-full bg-muted/60 text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#2E7D73]/30 dark:bg-gray-800 dark:text-white"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <textarea
                                                                value={editingDescription}
                                                                onChange={(e) => setEditingDescription(e.target.value)}
                                                                className="w-full resize-none bg-muted/60 text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#2E7D73]/30 dark:bg-gray-800 dark:text-white"
                                                                rows={2}
                                                                placeholder="Goal description (optional)"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h3 className={`font-bold text-lg leading-tight line-clamp-2 ${goal.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                                {goalTitle}
                                                            </h3>
                                                            {goalDescription && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                                    {goalDescription}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleSaveGoalDetails(goal.id); }}
                                                                className="rounded-md w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all"
                                                                title="Save goal"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCancelEditGoal(); }}
                                                                className="rounded-md w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500/10 transition-all"
                                                                title="Cancel edit"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStartEditGoal(goal); }}
                                                            className="rounded-md w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#2E7D73] hover:bg-[#2E7D73]/10 transition-all"
                                                            title="Edit goal title"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleGoal(goal); }}
                                                        disabled={completeDisabled}
                                                        title={isArchived ? "Goal archived" : isMissed ? "Goal missed. Use Continue Tomorrow." : "Mark complete"}
                                                        className={`rounded-md border-2 w-6 h-6 flex items-center justify-center transition-all ${goal.completed
                                                            ? 'bg-green-500 border-green-500 text-white'
                                                            : completeDisabled
                                                                ? 'border-red-300 dark:border-red-600 text-transparent cursor-not-allowed opacity-60'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-green-500 text-transparent'
                                                            }`}
                                                    >
                                                        <Check className="w-3.5 h-3.5" strokeWidth={4} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                                                        className="rounded-md w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                        title="Delete goal"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gap-1.5 ${goal.completed
                                                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                                                    : isArchived
                                                        ? 'bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300'
                                                        : isMissed
                                                            ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                    }`}>
                                                    {goal.completed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    {goal.completed
                                                        ? "Completed"
                                                        : lifecycleStatus === "rolled_over"
                                                            ? "Rolled Over"
                                                            : lifecycleStatus === "abandoned"
                                                                ? "Abandoned"
                                                                : lifecycleStatus === "missed"
                                                                    ? "Missed"
                                                                    : "Active"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                {isScheduled ? (
                                                    <>
                                                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                            <Calendar className="w-3 h-3" />
                                                            Scheduled
                                                        </span>
                                                        <span className="font-semibold text-[#2E7D73]">
                                                            {formatScheduledDate(scheduledDateValue)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                                            <Clock className="w-3 h-3" />
                                                            Type
                                                        </span>
                                                        <span className="font-semibold text-[#2E7D73]">
                                                            {goal.type === 'weekly' ? 'Weekly' : 'Daily'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Rollover Prompts - Missed Goals */}
                                {filteredRolloverPrompts.map((goal) => (
                                    <div key={`rollover-${goal.id}`} className="relative group bg-white dark:bg-[#111827] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 rounded-2xl p-6 border-2 border-red-200 dark:border-red-800 flex flex-col justify-between min-h-[160px]">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-lg leading-tight line-clamp-2 text-gray-900 dark:text-white">
                                                {getGoalTitle(goal)}
                                            </h3>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                                                className="rounded-md w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                title="Delete goal"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="mb-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
                                                <Clock className="w-3 h-3" />
                                                Missed
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleRolloverAction(goal.id, "retry")}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#2E7D73] text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-[#25665e] transition-colors"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Continue Tomorrow
                                            </button>
                                            <button
                                                onClick={() => handleRolloverAction(goal.id, "archive")}
                                                className="flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                            >
                                                <Archive className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Focus Distribution Cards */}
                            <div data-tour="focus-distribution">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Focus Distribution</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white block mb-1">
                                            {completedDaily}<span className="text-gray-400 text-lg">/{dailyGoals.length}</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-[#2E7D73] uppercase tracking-wider block mb-3">Daily</span>
                                        <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="bg-[#2E7D73] h-full rounded-full" style={{ width: `${dailyGoals.length ? (completedDaily / dailyGoals.length) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white block mb-1">
                                            {completedWeekly}<span className="text-gray-400 text-lg">/{weeklyGoals.length}</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-[#9C1C4C] uppercase tracking-wider block mb-3">Weekly</span>
                                        <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="bg-[#9C1C4C] h-full rounded-full" style={{ width: `${weeklyGoals.length ? (completedWeekly / weeklyGoals.length) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Weekly Progress Chart */}
                            <div data-tour="weekly-progress">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" /> Weekly Progress
                                </h4>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <p className="text-xs text-gray-400 mb-6">Goals completed each day</p>
                                    <div className="h-40 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#2E7D73" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#2E7D73" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="day"
                                                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    interval={0}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    allowDecimals={false}
                                                    width={25}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', fontSize: '12px' }}
                                                    itemStyle={{ color: '#374151' }}
                                                    cursor={{ stroke: '#2E7D73', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="goals"
                                                    stroke="#2E7D73"
                                                    strokeWidth={2}
                                                    fill="url(#chartGradient)"
                                                    activeDot={{ r: 4, fill: '#2E7D73', stroke: '#fff', strokeWidth: 2 }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center mt-4">Stay consistent! Complete at least 1 goal daily.</p>
                                </div>
                            </div>

                            {/* Repeat Plan Card */}
                            {hasHistoricalGoals && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                        <Repeat className="w-3 h-3" /> Repeat Plan
                                    </h4>
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                        {!showRepeatPlan ? (
                                            <div className="p-5 space-y-3">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Repeat your previous goals for today</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleOpenRepeatPlan("daily")}
                                                        className="flex items-center justify-center gap-1.5 bg-[#2E7D73]/10 text-[#2E7D73] px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#2E7D73]/20 transition-colors"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        Yesterday
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenRepeatPlan("weekly")}
                                                        className="flex items-center justify-center gap-1.5 bg-[#9C1C4C]/10 text-[#9C1C4C] px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-[#9C1C4C]/20 transition-colors"
                                                    >
                                                        <Calendar className="w-3 h-3" />
                                                        Last Week
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                                        {repeatPeriod === "daily" ? "Yesterday's Goals" : "Last Week's Goals"}
                                                    </span>
                                                    <button
                                                        onClick={() => { setShowRepeatPlan(false); setPreviousGoals([]); setSelectedRepeatIds(new Set()); }}
                                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {loadingRepeat ? (
                                                    <div className="text-center py-6 text-sm text-gray-400 animate-pulse">Loading...</div>
                                                ) : previousGoals.length === 0 ? (
                                                    <div className="text-center py-6 text-sm text-gray-400">
                                                        No goals found for {repeatPeriod === "daily" ? "yesterday" : "last week"}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                                            {previousGoals.map(g => (
                                                                <label
                                                                    key={g.id}
                                                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${selectedRepeatIds.has(g.id)
                                                                            ? 'bg-[#2E7D73]/5 border-[#2E7D73]/30'
                                                                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedRepeatIds.has(g.id)}
                                                                        onChange={() => handleToggleRepeatSelection(g.id)}
                                                                        className="rounded border-gray-300 text-[#2E7D73] focus:ring-[#2E7D73] w-4 h-4 shrink-0"
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1 block">{getGoalTitle(g)}</span>
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${g.completed ? 'text-emerald-600' : 'text-amber-600'
                                                                            }`}>
                                                                            {g.completed ? 'Completed' : 'Incomplete'} · {g.type === 'weekly' ? 'Weekly' : 'Daily'}
                                                                        </span>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                {selectedRepeatIds.size}/{previousGoals.length} selected
                                                            </span>
                                                            <button
                                                                onClick={handleConfirmRepeat}
                                                                disabled={repeating || selectedRepeatIds.size === 0}
                                                                className="flex items-center gap-1.5 bg-[#2E7D73] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#25665e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Repeat className="w-3 h-3" />
                                                                {repeating ? 'Repeating...' : 'Repeat for Today'}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recent Victories */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Trophy className="w-3 h-3 text-amber-500" /> Recent Victories
                                </h4>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                    {allCompletedGoals.length > 0 ? (
                                        <>
                                            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                                {recentVictories.map((g, i) => {
                                                    const completedDate = new Date((g as GoalWithMeta).completed_at || g.completedAt || g.createdAt || Date.now());
                                                    const dateStr = completedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                                                    return (
                                                        <div
                                                            key={g.id || i}
                                                            className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 group hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-colors"
                                                        >
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                                                                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-[#2E7D73] transition-colors line-clamp-1 block">
                                                                    {getGoalTitle(g)}
                                                                </span>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{dateStr}</span>
                                                                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${g.type === 'weekly'
                                                                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                                                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                                        }`}>
                                                                        {g.type === 'weekly' ? 'Weekly' : 'Daily'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Sparkles className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {totalVictoriesPages > 1 && (
                                                <div className="flex items-center justify-center gap-3 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                                                    <button
                                                        onClick={() => setVictoriesPage(p => Math.max(0, p - 1))}
                                                        disabled={victoriesPage === 0}
                                                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                    <span className="text-xs text-gray-400 font-medium">{victoriesPage + 1} / {totalVictoriesPages}</span>
                                                    <button
                                                        onClick={() => setVictoriesPage(p => Math.min(totalVictoriesPages - 1, p + 1))}
                                                        disabled={victoriesPage >= totalVictoriesPages - 1}
                                                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="p-6 text-center">
                                            <Trophy className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400 italic">No completed goals yet</p>
                                            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Complete a goal to see it here!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            <TourPrompt tour={goalsTour} featureName="Goals" />
        </NishthaLayout>
    );
}


