import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { TourPrompt } from "@/components/guided-tour";
import { streaksTour } from "@/components/guided-tour/tourSteps";
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
  const [moodsData, setMoodsData] = useState<any[]>([]);
  const [journalData, setJournalData] = useState<any[]>([]);
  const [loginData, setLoginData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

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
          setGoalsData(goals);

          // Fetch moods for activity calendar
          const moods = await dataService.getMoods();
          setMoodsData(moods || []);

          // Fetch journal entries for activity calendar
          const journal = await dataService.getJournalEntries();
          setJournalData(journal || []);

          // Fetch login history
          const logins = await authService.getLoginHistory();
          setLoginData(logins || []);

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
  const generateCalendar = (targetDate = currentDate) => {
    const days = [];
    const today = new Date(); // Actual today for future checks
    const currentMonth = targetDate.getMonth();
    const currentYear = targetDate.getFullYear();

    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Simple date string in YYYY-MM-DD format (local time)
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Extract date from any timestamp string (handles various formats)
    const extractDateFromTimestamp = (timestamp: string): string | null => {
      if (!timestamp) return null;
      try {
        // Just extract the date portion directly from the string if possible
        const match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
        // Fallback: parse as date and get local date string
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) return null;
        return getLocalDateString(d);
      } catch {
        return null;
      }
    };

    const todayStr = getLocalDateString(today);

    // Add empty slots for days before the first day of month (to align with weekday)
    const firstDayWeekday = firstDay.getDay(); // 0 = Sunday
    const startPadding = firstDayWeekday; // Sunday = 0, no adjustment needed for Sunday-start
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, level: -1, dateStr: '', isToday: false }); // Empty slot
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dateStr = getLocalDateString(d);
      const isToday = dateStr === todayStr;
      const isFuture = d > today;

      // Check activity on this day
      let level = 0;

      if (isFuture) {
        level = -1; // Future day - no data yet
      } else {
        // Check ANY activity on this day (goals, journal, moods, logins)
        let hasActivity = false;

        // Check goals created on this day
        const goalsOnDay = goalsData.filter((g: any) => {
          const createdAt = g.createdAt || g.created_at;
          return extractDateFromTimestamp(createdAt) === dateStr;
        });

        // Check journal entries on this day
        const journalOnDay = journalData.filter((j: any) => {
          const timestamp = j.timestamp || j.createdAt || j.created_at;
          return extractDateFromTimestamp(timestamp) === dateStr;
        });

        // Check mood check-ins on this day
        const moodsOnDay = moodsData.filter((m: any) => {
          const timestamp = m.timestamp || m.createdAt || m.created_at;
          return extractDateFromTimestamp(timestamp) === dateStr;
        });

        // Check login history on this day
        const loginOnDay = loginData.filter((l: any) => {
          return extractDateFromTimestamp(l.timestamp) === dateStr;
        });

        // If ANY activity exists, mark as active
        hasActivity = goalsOnDay.length > 0 || journalOnDay.length > 0 || moodsOnDay.length > 0 || loginOnDay.length > 0;
        level = hasActivity ? 1 : 0;
      }

      days.push({ date: d, level, dateStr, isToday });
    }
    return days;
  };

  const calendarDays = generateCalendar();
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentMonthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 bg-background font-['Inter'] text-foreground p-6 md:p-8 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-['Outfit'] font-bold text-foreground flex items-center gap-2">
              <span className="text-xl sm:text-2xl lg:text-3xl">🔥</span> Keep the fire burning!
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              Consistency is key to building sustainable habits. Monitor your progress below.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Check-In Streak Card (Teal) */}
            <div data-tour="streak-cards" className="group relative overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between h-48 bg-primary/20 shadow-xl border border-primary/30 hover:-translate-y-1 transition-transform duration-200">
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

            {/* Activity Calendar - Redesigned Style */}
            <div data-tour="activity-calendar" id="calendar-view" className="md:col-span-2 rounded-[1.5rem] bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-white p-5 shadow-xl dark:shadow-2xl border border-slate-200 dark:border-gray-800 font-sans transition-colors duration-300">

              {/* Header Navigation - Compact */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentDate(new Date())}
                  aria-label="Go to today"
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors text-xs font-medium px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 action-btn-nowrap"
                >
                  <ArrowRight className="w-3 h-3 rotate-180" />
                  <span className="action-label-mobile-hidden">Today</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setCurrentDate(newDate);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent min-w-[100px] text-center">
                    {currentDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setCurrentDate(newDate);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                  {currentDate.getFullYear()}
                </span>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-3 text-center mb-3">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i} className="text-xs font-bold text-slate-400 dark:text-gray-500">{d}</span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-3">
                {generateCalendar().map((day, idx) => {
                  const isActive = day.level > 0;
                  const isEmpty = day.date === null;

                  if (isEmpty) return <div key={idx} className="w-9 h-9" />;

                  return (
                    <div key={idx} className="flex items-center justify-center">
                      {isActive ? (
                        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full border-2 border-slate-200 dark:border-gray-700 flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-200 dark:text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>



            </div>

            {/* Goal Consistency Graph - Full Width */}
            <div data-tour="consistency-chart" className="md:col-span-3 glass-high rounded-[1.5rem] p-6 md:p-8 shadow-sm">
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

          </div>
        </div>
      </div>
      <TourPrompt tour={streaksTour} featureName="Streaks" />
    </NishthaLayout>
  );
}
