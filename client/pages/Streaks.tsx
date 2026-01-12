import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Flame,
  Heart,
  Target,
  Calendar,
  ArrowRight,
  Dumbbell,
  TrendingUp,
} from "lucide-react";

export default function Streaks() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [streakData, setStreakData] = useState<any>(null);
  const [consistencyData, setConsistencyData] = useState<any[]>([]);
  const [goalsData, setGoalsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authService.getCurrentUser();
        if (!response || !response.user) {
          navigate("/login");
          return;
        }
        setUser(response.user);
        setStreakData(response.streaks || {});

        // Fetch goals for consistency chart
        try {
          const goals = await dataService.getGoals();
          setGoalsData(goals); // Store for calendar use
          // Generate last 7 days CONSISTENCY data (% of goals completed each day)
          const last7Days = [];

          // Helper to get IST date string (YYYY-MM-DD)
          const getISTDateString = (date: Date) => {
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(date.getTime() + istOffset);
            return istDate.toISOString().split('T')[0];
          };

          // Helper to extract date from any timestamp
          const extractDate = (timestamp: string) => {
            if (!timestamp) return null;
            const date = new Date(timestamp);
            const istOffset = 5.5 * 60 * 60 * 1000;
            return new Date(date.getTime() + istOffset).toISOString().split('T')[0];
          };

          const now = new Date();
          const todayIST = getISTDateString(now);

          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = getISTDateString(date);
            const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
            const isToday = dateStr === todayIST;

            let totalOnDay, completedOnDay, score;

            if (isToday) {
              // TODAY: Show current overall completion %
              totalOnDay = goals.length;
              completedOnDay = goals.filter((g: any) => g.completed).length;
              score = totalOnDay > 0 ? Math.round((completedOnDay / totalOnDay) * 100) : 0;
            } else {
              // PAST DAYS: Goals created on that day
              const goalsCreatedOnDay = goals.filter((g: any) => {
                const createdAt = g.createdAt || g.created_at;
                return extractDate(createdAt) === dateStr;
              });
              totalOnDay = goalsCreatedOnDay.length;
              completedOnDay = goalsCreatedOnDay.filter((g: any) => g.completed).length;
              score = totalOnDay > 0 ? Math.round((completedOnDay / totalOnDay) * 100) : 0;
            }

            last7Days.push({
              day: dayName,
              date: dateStr,
              created: totalOnDay,
              completed: completedOnDay,
              score: score // This is the CONSISTENCY % (0-100)
            });
          }
          setConsistencyData(last7Days);
        } catch (e) {
          console.error('Failed to fetch goals for chart', e);
          // Generate demo data showing the pattern user described
          const demoData = [
            { day: 'Mon', score: 60, created: 10, completed: 6 },
            { day: 'Tue', score: 80, created: 5, completed: 4 },
            { day: 'Wed', score: 0, created: 5, completed: 0 },
            { day: 'Thu', score: 100, created: 2, completed: 2 },
            { day: 'Fri', score: 75, created: 4, completed: 3 },
            { day: 'Sat', score: 50, created: 6, completed: 3 },
            { day: 'Sun', score: 0, created: 0, completed: 0 },
          ];
          setConsistencyData(demoData);
        }
      } catch (error) {
        navigate("/login");
      }
    };
    fetchData();
  }, [navigate]);

  if (!user) return null;

  // Generate CURRENT MONTH calendar data based on goal activity
  const generateCalendar = () => {
    const days = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Helper to get IST date string
    const getISTDateString = (date: Date) => {
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(date.getTime() + istOffset).toISOString().split('T')[0];
    };

    const todayIST = getISTDateString(today);

    // Add empty slots for days before the first day of month (to align with weekday)
    const firstDayWeekday = firstDay.getDay(); // 0 = Sunday
    const startPadding = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // Adjust for Monday start
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, level: -1, dateStr: '' }); // Empty slot
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = getISTDateString(d);
      const isToday = dateStr === todayIST;
      const isFuture = d > today;

      // Check activity on this day
      let level = 0;

      if (isFuture) {
        level = -1; // Future day - no data yet
      } else if (isToday && goalsData.length > 0) {
        // Today: based on current completion
        const completed = goalsData.filter((g: any) => g.completed).length;
        const pct = (completed / goalsData.length) * 100;
        level = pct === 100 ? 2 : pct > 0 ? 1 : 0;
      } else {
        // Past days: check goals created that day
        const goalsOnDay = goalsData.filter((g: any) => {
          const createdAt = g.createdAt || g.created_at;
          if (!createdAt) return false;
          return createdAt.split('T')[0] === dateStr;
        });

        if (goalsOnDay.length > 0) {
          const completedOnDay = goalsOnDay.filter((g: any) => g.completed).length;
          const pct = (completedOnDay / goalsOnDay.length) * 100;
          level = pct === 100 ? 2 : pct > 0 ? 1 : 0;
        }
      }

      days.push({ date: d, level, dateStr, isToday });
    }
    return days;
  };

  const calendarDays = generateCalendar();
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <MainLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 h-full overflow-y-auto bg-background font-['Inter'] text-foreground p-6 md:p-8 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-['Outfit'] font-bold text-foreground flex items-center gap-2">
              <span className="text-3xl">🔥</span> Keep the fire burning!
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Consistency is key to building sustainable habits. Monitor your progress below.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Check-In Streak Card (Teal) */}
            <div className="group relative overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between h-48 bg-primary/20 shadow-xl border border-primary/30 hover:-translate-y-1 transition-transform duration-200">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Heart className="w-24 h-24 text-primary transform rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 bg-primary/30 rounded-lg backdrop-blur-sm">
                    <Heart className="w-4 h-4 text-primary" />
                  </span>
                  <h3 className="text-primary font-medium text-sm">Check-In Streak</h3>
                </div>
                <div className="mt-4">
                  <span className="font-['Outfit'] font-bold text-5xl text-foreground">{streakData?.checkInStreak || 0}</span>
                  <span className="text-primary text-lg ml-1">days</span>
                </div>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="flex items-center gap-2 text-primary text-sm font-medium cursor-pointer" onClick={() => navigate('/check-in')}>
                  Start your streak today!
                  <ArrowRight className="w-4 h-4 animate-bounce-x" />
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-primary w-[5%] rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Login Streak Card (Maroon) */}
            <div className="group relative overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between h-48 bg-secondary/20 shadow-xl border border-secondary/30 hover:-translate-y-1 transition-transform duration-200">
              <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Flame className="w-32 h-32 text-secondary" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 bg-secondary/30 rounded-lg backdrop-blur-sm">
                    <Flame className="w-4 h-4 text-secondary" />
                  </span>
                  <h3 className="text-secondary font-medium text-sm">Login Streak</h3>
                </div>
                <div className="mt-4">
                  <span className="font-['Outfit'] font-bold text-5xl text-foreground">{streakData?.loginStreak || 0}</span>
                  <span className="text-secondary text-lg ml-1">days</span>
                </div>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="flex items-center gap-2 text-secondary text-xs py-1 px-2 bg-secondary/10 rounded-lg w-fit backdrop-blur-md">
                  <span className="text-lg">✨</span> Amazing! Keep it up!
                </div>
              </div>
            </div>

            {/* Activity Calendar - Current Month */}
            <div className="md:col-span-2 rounded-[1.5rem] glass-high p-6 md:p-8 shadow-sm hover:-translate-y-1 transition-transform duration-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-['Outfit'] font-semibold text-lg text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    {currentMonthName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Your activity this month</p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-primary to-secondary"></div>
                    <span className="text-foreground">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-muted"></div>
                    <span className="text-muted-foreground">Inactive</span>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                  {weekDays.map(d => <span key={d} className="text-xs font-medium text-muted-foreground">{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => (
                    <div
                      key={idx}
                      title={day.date ? day.date.toDateString() : ''}
                      className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all
                        ${day.level === -1
                          ? "bg-transparent"
                          : day.level > 0
                            ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg"
                            : "bg-muted text-muted-foreground"
                        }
                        ${day.isToday ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-background" : ""}
                      `}
                    >
                      {day.date ? day.date.getDate() : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Goal Consistency Graph - Full Width */}
            <div className="md:col-span-3 glass-high rounded-[1.5rem] p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-['Outfit'] font-semibold text-lg text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Goal Consistency Trend
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Your goal completion over the last 7 days</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={consistencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-bold text-foreground">{data.day}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.completed}/{data.created} goals completed
                              </p>
                              <p className="text-lg font-bold text-primary">{data.score}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--secondary))' }}
                      fill="url(#colorScore)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Keep Going Strong Card */}
            <div className="relative glass-high rounded-[1.5rem] overflow-hidden p-6 flex flex-col justify-center items-center text-center shadow-lg hover:-translate-y-1 transition-transform duration-200">
              <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="relative z-10 p-2 bg-muted rounded-full mb-4 ring-1 ring-border">
                <Dumbbell className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="relative z-10 font-['Outfit'] font-bold text-foreground text-xl mb-2">
                Keep Going Strong!
              </h3>
              <p className="relative z-10 text-muted-foreground text-sm leading-relaxed mb-6">
                Your streak shows commitment. Every day you show up is a victory.
              </p>
              <button className="relative z-10 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors w-full shadow-lg">
                View Full History
              </button>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}
