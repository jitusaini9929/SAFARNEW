import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import {
    Heart,
    RotateCw,
    Zap,
    Quote,
    Activity,
    ArrowRight,
    Bell,
    Menu,
    ExternalLink,
    Play,
    History,
    Target,
    CheckCircle2,
    Circle
} from "lucide-react";
import youtubeImg from "@/assets/youtube-thumbnail.png";
import courseImg from "@/assets/course-thumbnail.png";
import WelcomeDialog from "@/components/WelcomeDialog";

const getMoodEmoji = (mood: string): string => {
    const moodEmojis: Record<string, string> = {
        peaceful: "😌",
        happy: "😊",
        energized: "⚡",
        anxious: "😰",
        stressed: "😤",
        sad: "😢",
        numb: "😶",
    };
    return moodEmojis[mood.toLowerCase()] || "😊";
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [streaks, setStreaks] = useState({ checkInStreak: 0, loginStreak: 0, goalCompletionStreak: 0 });
    const [todayMood, setTodayMood] = useState<{ mood: string; intensity: number } | null>(null);
    const [goals, setGoals] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 });
    const [weeklyMoods, setWeeklyMoods] = useState<{ day: string; intensity: number; mood: string }[]>([]);
    const [allGoals, setAllGoals] = useState<any[]>([]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const data = await authService.getCurrentUser();
                if (!data || !data.user) {
                    navigate("/login");
                    return;
                }
                setUser(data.user);
                // Fetch streaks
                try {
                    const streakData = await dataService.getStreaks();
                    setStreaks(streakData);
                } catch (e) { console.error('Failed to fetch streaks', e); }
                // Fetch all moods for the week
                try {
                    const moods = await dataService.getMoods();
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    const todaysMood = moods.find((m: any) => m.timestamp?.startsWith(todayStr));
                    if (todaysMood) setTodayMood({ mood: todaysMood.mood, intensity: todaysMood.intensity });

                    // Calculate weekly moods (Mon to Sun of current week)
                    const dayOfWeek = today.getDay();
                    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const weekData = [];

                    for (let i = 0; i < 7; i++) {
                        const targetDate = new Date(today);
                        targetDate.setDate(today.getDate() - daysFromMonday + i);
                        const dateStr = targetDate.toISOString().split('T')[0];

                        // Find mood for this day
                        const dayMood = moods.find((m: any) => {
                            if (!m.timestamp) return false;
                            const moodDate = m.timestamp.split('T')[0].replace(' ', 'T').split('T')[0];
                            return moodDate === dateStr;
                        });

                        weekData.push({
                            day: dayNames[i],
                            intensity: dayMood ? dayMood.intensity : 0,
                            mood: dayMood ? dayMood.mood : ''
                        });
                    }
                    setWeeklyMoods(weekData);
                } catch (e) { console.error('Failed to fetch moods', e); }
                // Fetch goals
                try {
                    const goalsData = await dataService.getGoals();
                    setAllGoals(goalsData || []);

                    // Filter for TODAY's goals only (IST)
                    const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
                    const todayISTStr = nowIST.toISOString().split('T')[0];

                    const todaysGoals = goalsData.filter((g: any) => {
                        const createdAt = g.created_at || g.createdAt;
                        if (!createdAt) return false;
                        // Parse date - handle both UTC and IST formats
                        const goalDate = createdAt.split('T')[0].split(' ')[0];
                        return goalDate === todayISTStr;
                    });

                    const total = todaysGoals.length;
                    const completed = todaysGoals.filter((g: any) => g.completed).length;
                    setGoals({ total, completed });
                } catch (e) { console.error('Failed to fetch goals', e); }
            } catch (error) {
                navigate("/login");
            }
        };
        checkAuth();
    }, [navigate]);

    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        const shouldShow = sessionStorage.getItem("showWelcome");
        if (shouldShow === "true") {
            setShowWelcome(true);
        }
    }, []);

    const handleCloseWelcome = () => {
        setShowWelcome(false);
        sessionStorage.removeItem("showWelcome");
    };

    if (!user) return null;

    // Daily Quotes Logic
    const getDailyQuote = () => {
        const quotes = [
            "Believe you can and you're halfway there.",
            "Your limitation—it's only your imagination.",
            "Push yourself, because no one else is going to do it for you.",
            "Great things never come from comfort zones.",
            "Dream it. Wish it. Do it.",
            "Success doesn’t just find you. You have to go out and get it.",
            "The harder you work for something, the greater you'll feel when you achieve it."
        ];
        const dayIndex = new Date().getDay();
        return quotes[dayIndex];
    };

    return (
        <MainLayout userName={user.name} userAvatar={user.avatar}>
            <div className="flex-1 h-full overflow-y-auto bg-background/95 font-['Plus_Jakarta_Sans'] transition-colors duration-300">
                {/* Background Gradient */}
                <div
                    className="fixed inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `
              radial-gradient(circle at 15% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
              radial-gradient(circle at 85% 30%, hsl(var(--primary) / 0.1) 0%, transparent 45%),
              radial-gradient(circle at 50% 80%, hsl(var(--secondary) / 0.1) 0%, transparent 40%)
            `,
                        backgroundAttachment: 'fixed'
                    }}
                ></div>

                {/* Content Wrapper */}
                <div className="relative z-10 p-4 md:p-6 lg:p-8">
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1">Welcome Back, {user.name}</h1>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                                "{getDailyQuote()}"
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <Bell className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-5 h-5 sm:w-6 sm:h-6" />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full border border-background"></span>
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">

                        {/* Today's Mood */}
                        <div className="lg:col-span-7 glass-high rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                    <Heart className="text-orange-500 w-5 h-5" />
                                    <h3 className="font-semibold text-lg text-foreground">Today's Mood</h3>
                                </div>
                                <p className="text-muted-foreground text-sm mb-8">How are you feeling right now?</p>
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    {todayMood ? (
                                        <>
                                            <p className="text-4xl mb-2">{getMoodEmoji(todayMood.mood)}</p>
                                            <p className="text-foreground font-semibold text-lg capitalize mb-1">{todayMood.mood}</p>
                                            <p className="text-muted-foreground text-sm">Intensity: {todayMood.intensity}/5</p>
                                            <button
                                                onClick={() => navigate('/check-in')}
                                                className="mt-4 text-primary text-sm hover:underline flex items-center gap-1"
                                            >
                                                Update Check-In <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-muted-foreground italic mb-6 text-lg font-light">No check-in yet today</p>
                                            <button
                                                onClick={() => navigate('/check-in')}
                                                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-8 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-orange-500/25 flex items-center gap-2"
                                            >
                                                Check In Now
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Current Streaks */}
                        <div className="lg:col-span-5 glass-high rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <RotateCw className="text-primary w-5 h-5" />
                                <h3 className="font-semibold text-lg text-foreground">
                                    Current Streaks <span className="text-orange-500 text-sm align-top">🔥</span>
                                </h3>
                            </div>
                            <div className="space-y-4 relative z-10">
                                {[
                                    { label: "Check-In Streak", value: String(streaks.checkInStreak) },
                                    { label: "Login Streak", value: String(streaks.loginStreak) },
                                    { label: "Goal Completion", value: String(streaks.goalCompletionStreak) }
                                ].map((streak, i) => (
                                    <div key={i} className="bg-muted/50 border border-border rounded-xl p-4 flex justify-between items-center hover:bg-muted transition-colors">
                                        <span className="text-foreground font-medium text-sm">{streak.label}</span>
                                        <span className="text-primary font-bold font-mono">{streak.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Today's Goals */}
                        <div className="lg:col-span-5 glass-high rounded-2xl p-6 flex flex-col relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-2">
                                    <Zap className="text-blue-500 w-5 h-5" />
                                    <div>
                                        <h3 className="font-semibold text-lg text-foreground">Today's Goals</h3>
                                        <p className="text-xs text-blue-500">{goals.total > 0 ? `${goals.total} goals today` : 'No goals set for today'}</p>
                                    </div>
                                </div>
                                {goals.total > 0 && (
                                    <span className="bg-blue-500/20 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">
                                        {Math.round((goals.completed / goals.total) * 100)}%
                                    </span>
                                )}
                            </div>

                            {goals.total > 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center my-6">
                                    <div className="text-4xl font-bold text-foreground mb-2">
                                        {goals.completed}<span className="text-muted-foreground text-2xl">/{goals.total}</span>
                                    </div>
                                    <p className="text-xs tracking-widest text-muted-foreground uppercase">Goals Completed</p>
                                    <div className="w-full h-1 bg-muted rounded-full mt-6 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-500"
                                            style={{ width: `${(goals.completed / goals.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center my-6 text-center">
                                    <div className="text-4xl mb-4">🎯</div>
                                    <p className="text-muted-foreground text-sm mb-2">Start your day with intention</p>
                                    <p className="text-xs text-muted-foreground/70">Set goals to track your progress</p>
                                </div>
                            )}

                            <button
                                onClick={() => navigate('/goals')}
                                className="w-full mt-auto bg-muted hover:bg-muted/80 text-blue-600 border border-blue-500/20 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 group"
                            >
                                {goals.total > 0 ? 'View Goals' : 'Set Goals'}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Daily Inspiration */}
                        <div className="lg:col-span-7 glass-high rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-secondary/10 pointer-events-none"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4 text-purple-500">
                                    <Quote className="w-5 h-5" />
                                    <h3 className="font-semibold">Daily Inspiration</h3>
                                </div>
                                <blockquote className="text-2xl font-serif text-foreground/90 leading-relaxed italic text-center px-4">
                                    "Every effort counts. Be proud of yourself."
                                </blockquote>
                            </div>
                        </div>

                        {/* Weekly Mood Trend */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="text-primary w-5 h-5" />
                                <h3 className="font-semibold text-lg text-foreground">Weekly Mood Trend</h3>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">Your emotional well-being over the week</p>
                            <div className="w-full">
                                {(() => {
                                    // Calculate SVG points based on weeklyMoods data
                                    const xPositions = [50, 210, 370, 530, 690, 850, 980];
                                    const chartHeight = 240;
                                    const minY = 50; // Top of chart (intensity 10)
                                    const maxY = 270; // Bottom of chart (intensity 0)

                                    // Generate Y positions for each day
                                    const points = weeklyMoods.map((m, i) => ({
                                        x: xPositions[i],
                                        y: m.intensity > 0 ? maxY - ((m.intensity / 5) * chartHeight) : maxY,
                                        intensity: m.intensity,
                                        mood: m.mood,
                                        day: m.day
                                    }));

                                    // Generate path for curve
                                    const validPoints = points.filter(p => p.intensity > 0);
                                    let linePath = '';
                                    let areaPath = '';

                                    if (validPoints.length > 0) {
                                        // Create smooth bezier curve path
                                        const tension = 0.3; // Controls curve smoothness

                                        linePath = points.reduce((path, point, i, arr) => {
                                            if (i === 0) return `M ${point.x},${point.y}`;

                                            const prev = arr[i - 1];
                                            const prevPrev = arr[i - 2] || prev;
                                            const next = arr[i + 1] || point;

                                            // Calculate control points for smooth curves
                                            const cp1x = prev.x + (point.x - prevPrev.x) * tension;
                                            const cp1y = prev.y + (point.y - prevPrev.y) * tension;
                                            const cp2x = point.x - (next.x - prev.x) * tension;
                                            const cp2y = point.y - (next.y - prev.y) * tension;

                                            return `${path} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
                                        }, '');

                                        // Create area path with same curve
                                        areaPath = linePath + ` L ${points[points.length - 1].x},${maxY} L ${points[0].x},${maxY} Z`;
                                    }

                                    // Get today's index (0 = Mon, 6 = Sun)
                                    const todayDayOfWeek = new Date().getDay();
                                    const todayIndex = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;

                                    return (
                                        <svg className="w-full h-auto max-h-[400px]" viewBox="0 0 1000 320">
                                            <defs>
                                                <linearGradient id="moodGradientFill" x1="0" x2="0" y1="0" y2="1">
                                                    <stop offset="0%" stopColor="hsl(168, 76%, 50%)" stopOpacity="0.3"></stop>
                                                    <stop offset="100%" stopColor="hsl(168, 76%, 50%)" stopOpacity="0.0"></stop>
                                                </linearGradient>
                                            </defs>
                                            {/* Grid lines */}
                                            <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="50" y2="50"></line>
                                            <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="110" y2="110"></line>
                                            <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="170" y2="170"></line>
                                            <line stroke="hsl(var(--border))" strokeDasharray="4" x1="40" x2="1000" y1="230" y2="230"></line>
                                            {/* Y-axis labels */}
                                            <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="55">5</text>
                                            <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="115">4</text>
                                            <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="175">3</text>
                                            <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="235">2</text>
                                            <text fill="hsl(var(--muted-foreground))" fontSize="10" textAnchor="end" x="30" y="275">1</text>
                                            {/* X-axis labels */}
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                                <text
                                                    key={day}
                                                    fill={i === todayIndex ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                                                    fontSize={i === todayIndex ? "12" : "10"}
                                                    fontWeight={i === todayIndex ? "bold" : "normal"}
                                                    textAnchor="middle"
                                                    x={xPositions[i]}
                                                    y="305"
                                                >{day}</text>
                                            ))}
                                            {/* Area fill */}
                                            {areaPath && (
                                                <path d={areaPath} fill="url(#moodGradientFill)"></path>
                                            )}
                                            {/* Line */}
                                            {linePath && (
                                                <path
                                                    d={linePath}
                                                    fill="none"
                                                    filter="drop-shadow(0 0 4px hsl(168, 76%, 50%, 0.5))"
                                                    stroke="hsl(168, 76%, 50%)"
                                                    strokeWidth="3"
                                                    strokeLinejoin="round"
                                                ></path>
                                            )}
                                            {/* Points with tooltips */}
                                            {points.map((p, i) => (
                                                <g key={i}>
                                                    <circle
                                                        cx={p.x}
                                                        cy={p.y}
                                                        fill={p.intensity > 0 ? "hsl(var(--card))" : "hsl(var(--muted))"}
                                                        r={i === todayIndex ? 8 : 5}
                                                        stroke={p.intensity > 0 ? "hsl(168, 76%, 50%)" : "hsl(var(--border))"}
                                                        strokeWidth={i === todayIndex ? 3 : 2}
                                                    ></circle>
                                                    {/* Show mood emoji for valid entries */}
                                                    {p.intensity > 0 && (
                                                        <text
                                                            x={p.x}
                                                            y={p.y - 15}
                                                            textAnchor="middle"
                                                            fontSize="14"
                                                        >{getMoodEmoji(p.mood)}</text>
                                                    )}
                                                </g>
                                            ))}
                                            {/* No data message */}
                                            {weeklyMoods.every(m => m.intensity === 0) && (
                                                <text
                                                    fill="hsl(var(--muted-foreground))"
                                                    fontSize="14"
                                                    textAnchor="middle"
                                                    x="500"
                                                    y="160"
                                                >No mood check-ins this week. Start tracking your emotions!</text>
                                            )}
                                        </svg>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Goal History Section */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <History className="text-primary w-5 h-5" />
                                    <h3 className="font-semibold text-lg text-foreground">Goal History</h3>
                                </div>
                                <button
                                    onClick={() => navigate('/goals')}
                                    className="text-xs font-bold text-primary uppercase tracking-wider hover:underline flex items-center gap-1"
                                >
                                    View All <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">Your recent goals and their completion status</p>

                            {allGoals.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No goals set yet. Start by creating your first goal!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2">
                                    {allGoals.slice(0, 12).map((goal: any, idx: number) => {
                                        const createdAt = goal.created_at || goal.createdAt || '';
                                        const dateStr = createdAt ? new Date(createdAt.replace(' ', 'T') + (createdAt.includes('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
                                        return (
                                            <div
                                                key={goal.id || idx}
                                                className={`p-4 rounded-xl border transition-all ${goal.completed
                                                    ? 'bg-primary/5 border-primary/30'
                                                    : 'bg-muted/30 border-border'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    {goal.completed ? (
                                                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium truncate ${goal.completed ? 'text-foreground' : 'text-muted-foreground'
                                                            }`}>
                                                            {goal.text || goal.title || 'Untitled Goal'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${goal.type === 'weekly'
                                                                ? 'bg-purple-500/20 text-purple-500'
                                                                : 'bg-blue-500/20 text-blue-500'
                                                                }`}>
                                                                {goal.type || 'daily'}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* External Sources Section */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center gap-2 mb-6">
                                <ExternalLink className="text-primary w-5 h-5" />
                                <h3 className="font-semibold text-lg text-foreground">External Sources</h3>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">Helpful resources for your well-being journey</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* YouTube Channel */}
                                <div className="bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
                                    <a
                                        href="https://youtube.com/@safarparmar?si=Mvs6U5JaSGojIzSM"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <div className="relative aspect-video bg-gradient-to-br from-red-900/20 to-red-600/20 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={youtubeImg}
                                                alt="Safar Parmar YouTube Channel"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                                <Play className="w-16 h-16 text-white/90 group-hover:text-white group-hover:scale-110 transition-all drop-shadow-lg" />
                                            </div>
                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-white font-semibold text-sm drop-shadow-lg">Safar Parmar</p>
                                                <p className="text-white/90 text-xs drop-shadow-lg">YouTube Channel</p>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-foreground text-sm">Visit channel for wellness and motivation content</p>
                                            <div className="flex items-center gap-2 mt-2 text-primary text-xs">
                                                <span>Watch on YouTube</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </a>
                                </div>

                                {/* Course Link */}
                                <div className="bg-muted/50 border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
                                    <a
                                        href="https://parmaracademy.in/courses/75"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <div className="relative aspect-video bg-gradient-to-br from-pink-900/20 to-pink-600/20 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={courseImg}
                                                alt="Parmar Academy Course"
                                                className="w-full h-full object-contain bg-white p-4 group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-white font-semibold text-sm drop-shadow-lg">Parmar Academy</p>
                                                <p className="text-white/90 text-xs drop-shadow-lg">Professional Course</p>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-foreground text-sm">Explore comprehensive learning resources</p>
                                            <div className="flex items-center gap-2 mt-2 text-primary text-xs">
                                                <span>View Course</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {showWelcome && <WelcomeDialog onClose={handleCloseWelcome} userName={user.name} />}
        </MainLayout>
    );
}
