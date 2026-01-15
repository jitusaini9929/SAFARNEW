import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { Goal, User } from "@shared/api";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Rocket,
  PlusCircle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export default function Goals() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [goalType, setGoalType] = useState<"daily" | "weekly">("daily");
  const [loginStreak, setLoginStreak] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (!data || !data.user) {
          navigate("/login");
          return;
        }
        setUser(data.user);
        const goalsData = await dataService.getGoals();
        setGoals(goalsData || []);
        // Fetch login streak
        try {
          const streakData = await dataService.getStreaks();
          setLoginStreak(streakData.loginStreak || 0);
        } catch (e) { console.error('Failed to fetch streaks', e); }
      } catch (error) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.trim()) return;
    try {
      const goal = await dataService.addGoal(newGoal, goalType);
      setGoals(prev => [...prev, goal]);
      setNewGoal("");
      toast.success("Goal created!");
    } catch (error) {
      toast.error("Failed to add goal");
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;
      const newCompleted = !goal.completed;
      await dataService.updateGoal(goalId, newCompleted);
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, completed: newCompleted } : g));
      toast.success(newCompleted ? "Goal completed! 🎉" : "Goal reopened");
    } catch (error) {
      toast.error("Failed to update goal");
    }
  };

  const safeGoals = Array.isArray(goals) ? goals : [];
  const activeGoals = safeGoals.filter(g => !g.completed);
  const priorityGoal = activeGoals.length > 0 ? activeGoals[0] : null;
  const upNextGoals = activeGoals.slice(1);
  const completedGoals = safeGoals.filter(g => g.completed);
  const completionRate = safeGoals.length > 0 ? Math.round((completedGoals.length / safeGoals.length) * 100) : 0;

  // Generate simple 7-day chart data
  const chartData = (() => {
    const data = [];
    const now = new Date();

    // Helper to extract just the date part (YYYY-MM-DD) from any timestamp
    const extractDate = (timestamp: string) => {
      if (!timestamp) return null;
      // Handle both ISO strings and other formats
      const date = new Date(timestamp);
      // Convert to IST for comparison
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(date.getTime() + istOffset);
      return istDate.toISOString().split('T')[0];
    };

    // Get today's date in IST
    const getTodayIST = () => {
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(now.getTime() + istOffset).toISOString().split('T')[0];
    };

    const todayIST = getTodayIST();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });

      // Get this day's date in IST format
      const istOffset = 5.5 * 60 * 60 * 1000;
      const dateIST = new Date(date.getTime() + istOffset);
      const dateStr = dateIST.toISOString().split('T')[0];
      const isToday = dateStr === todayIST;

      // For today: show all goals created anytime but count completed ones
      // For past days: check if goal was created on that day
      let goalsOnDay, completedOnDay;

      if (isToday) {
        // Today: show current goals status
        goalsOnDay = safeGoals.length;
        completedOnDay = completedGoals.length;
      } else {
        // Past days: filter by creation date
        const goalsCreatedOnDay = safeGoals.filter((g: any) => {
          const createdAt = g.createdAt || g.created_at;
          const goalDate = extractDate(createdAt);
          return goalDate === dateStr;
        });
        goalsOnDay = goalsCreatedOnDay.length;
        completedOnDay = goalsCreatedOnDay.filter((g: any) => g.completed).length;
      }

      data.push({
        day: dayName,
        goals: completedOnDay,
        total: goalsOnDay
      });
    }
    return data;
  })();

  if (!user) return null;

  return (
    <MainLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 h-full overflow-y-auto bg-background p-6 lg:p-10 font-['Plus_Jakarta_Sans'] text-foreground relative transition-colors duration-300">

        <header className="flex justify-between items-end mb-10 relative z-10">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
              Mission Control
            </h1>
            <p className="text-primary mt-2 text-lg font-medium">Asynchronous flow activated.</p>
          </div>
          <div className="flex gap-6 items-center">
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground leading-none">{loginStreak}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Day Streak</div>
            </div>
            <div className="w-px h-10 bg-border"></div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary leading-none">{completionRate}%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Completion</div>
            </div>
          </div>
        </header>

        {/* Asymmetrical Layout Wrapper */}
        <div className="flex flex-col lg:flex-row gap-12 relative z-10">

          {/* Main Flow (Left - 65%) */}
          <div className="flex-1 flex flex-col gap-10">

            {/* 1. HERO: Priority Focus (Organic Shape) */}
            {priorityGoal ? (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary/20 rounded-[2rem] transform -rotate-1 scale-[1.02] opacity-50 blur-xl group-hover:opacity-70 transition-opacity duration-700"></div>
                <div className="relative glass-high rounded-[2rem] p-8 lg:p-10 flex flex-col md:flex-row gap-8 items-start shadow-2xl">
                  <div className="flex-1">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
                      <Rocket className="w-3 h-3" /> Priority Focus
                    </span>
                    <h2 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-4">
                      {priorityGoal.text}
                    </h2>
                    <div className="flex items-center gap-6 mt-6">
                      <button
                        onClick={() => handleToggleGoal(priorityGoal.id)}
                        className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 transform hover:-translate-y-1"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Complete
                      </button>
                      <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden max-w-[200px]">
                        <div className="h-full bg-primary w-[10%] animate-pulse"></div>
                      </div>
                      <span className="text-muted-foreground text-sm">In Progress</span>
                    </div>
                  </div>
                  {/* Abstract Decorative Element */}
                  <div className="hidden md:block w-32 h-32 opacity-20">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                      <path fill="hsl(var(--primary))" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-4.9C93.5,9.4,82.2,23.1,70.6,33.5C59,43.9,47.1,51,35.3,58.5C23.5,66,11.8,73.9,-0.7,75.1C-13.2,76.3,-26.4,70.8,-37.4,62.8C-48.4,54.8,-57.2,44.3,-65.9,32.3C-74.6,20.3,-83.2,6.8,-81.3,-5.7C-79.4,-18.2,-67,-29.7,-55.5,-40.4C-44,-51.1,-33.4,-61,-21.2,-69.5C-9,-78,4.8,-85.1,19.2,-84.9C33.6,-84.7,48.7,-77.2,56.9,-68.8L44.7,-76.4Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 border border-dashed border-border rounded-[2rem] text-center text-muted-foreground">
                <h2 className="text-2xl font-bold text-foreground mb-2">No Active Focus</h2>
                <p>Add a goal to activate mission control.</p>
              </div>
            )}

            {/* 2. INPUT BAR (Sleek, like a search bar) */}
            <form onSubmit={handleAddGoal} className="relative group z-20">
              <div className="absolute inset-0 bg-secondary/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="glass-high rounded-full p-2 flex items-center shadow-lg focus-within:border-secondary/50 focus-within:ring-1 focus-within:ring-secondary/50 transition-all">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ml-1">
                  <PlusCircle className="w-6 h-6 text-secondary group-focus-within:rotate-90 transition-transform duration-300" />
                </div>
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  type="text"
                  placeholder="What is your next objective?"
                  className="flex-1 bg-transparent border-none text-foreground placeholder-muted-foreground focus:ring-0 px-4 text-lg font-medium"
                />
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as any)}
                  className="bg-muted border-none rounded-full text-foreground text-sm px-4 py-2 mr-2 focus:ring-0 hidden sm:block"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full px-6 py-3 font-bold transition-all transform hover:scale-105">
                  Initiate
                </button>
              </div>
            </form>

            {/* 3. TIMELINE / FLOW (Up Next) */}
            <div className="mt-4 flex-1 min-h-0">
              <h3 className="text-lg font-bold text-muted-foreground mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground"></span> Incoming Objectives
              </h3>

              <div className="relative border-l-2 border-border ml-4 space-y-10 pl-8 pb-4 max-h-[400px] overflow-y-auto">
                {upNextGoals.length > 0 ? upNextGoals.map((goal) => (
                  <div key={goal.id} className="relative">
                    {/* Timeline Node */}
                    <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center group-hover:border-primary transition-colors">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                    </div>
                    {/* Content */}
                    <div className="group flex items-center justify-between p-4 -ml-4 rounded-2xl hover:bg-muted/50 transition-all cursor-pointer">
                      <div>
                        <h4 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{goal.text}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{new Date(goal.createdAt || goal.created_at).toLocaleDateString()} • {goal.type}</p>
                      </div>
                      <button
                        onClick={() => handleToggleGoal(goal.id)}
                        className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-muted-foreground italic">No incoming objectives. Flow clear.</div>
                )}
              </div>
            </div>

          </div>

          {/* Quick Stats / Visuals (Right - 35%) - Floating Style */}
          <div className="lg:w-[350px] flex flex-col gap-10 lg:pt-20">

            {/* Focus Distribution by Goal Type */}
            <div className="bg-transparent">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">Focus Distribution</h3>
              <div className="flex flex-wrap gap-4">
                {(() => {
                  const dailyGoals = safeGoals.filter(g => g.type === 'daily');
                  const weeklyGoals = safeGoals.filter(g => g.type === 'weekly');
                  const dailyCompleted = dailyGoals.filter(g => g.completed).length;
                  const weeklyCompleted = weeklyGoals.filter(g => g.completed).length;
                  const dailyPercent = dailyGoals.length > 0 ? Math.round((dailyCompleted / dailyGoals.length) * 100) : 0;
                  const weeklyPercent = weeklyGoals.length > 0 ? Math.round((weeklyCompleted / weeklyGoals.length) * 100) : 0;
                  return (
                    <>
                      <div className="flex-1 min-w-[140px] p-4 glass-high rounded-2xl hover:border-primary/30 transition-colors">
                        <span className="text-2xl font-bold text-foreground block mb-1">{dailyCompleted}/{dailyGoals.length}</span>
                        <span className="text-xs text-primary font-bold uppercase tracking-wider">Daily</span>
                        <div className="w-full bg-muted h-1 mt-3 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all" style={{ width: `${dailyPercent}%` }}></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[140px] p-4 glass-high rounded-2xl hover:border-secondary/30 transition-colors">
                        <span className="text-2xl font-bold text-foreground block mb-1">{weeklyCompleted}/{weeklyGoals.length}</span>
                        <span className="text-xs text-secondary font-bold uppercase tracking-wider">Weekly</span>
                        <div className="w-full bg-muted h-1 mt-3 rounded-full overflow-hidden">
                          <div className="bg-secondary h-full transition-all" style={{ width: `${weeklyPercent}%` }}></div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Weekly Progress Chart - Simple and Clear */}
            <div className="bg-transparent">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Weekly Progress
              </h3>
              <div className="glass-high rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-3">Goals completed each day</p>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="goalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-foreground">
                                <p className="font-bold">{data.day}</p>
                                <p className="text-sm">{data.goals}/{data.total} completed</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="goals"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#goalGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Stay consistent! Complete at least 1 goal daily 🎯
                </p>
              </div>
            </div>

            {/* Recently Completed (Floating List) */}
            <div className="bg-transparent">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 border-b border-border pb-2">Recent Victories</h3>
              <div className="space-y-4">
                {completedGoals.slice(0, 3).length > 0 ? completedGoals.slice(0, 3).map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="line-through text-sm">{goal.text}</span>
                  </div>
                )) : (
                  <span className="text-sm text-muted-foreground">No recent victories yet.</span>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
}
