import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import PerkTitle from "@/components/PerkTitle";
import {
    Heart,
    RotateCw,
    Zap,
    Quote,
    Activity,
    ArrowRight,
    Menu,
    ExternalLink,
    Play,
    History,
    Target,
    CheckCircle2,
    Circle,
    Award,
    Sparkles,
    Medal,
    Home,
    Users
} from "lucide-react";
import youtubeImg from "@/assets/youtube-thumbnail.png";
import courseImg from "@/assets/course-thumbnail.png";


const getMoodEmoji = (mood: string): string => {
    // Must match exactly with CheckIn.tsx moodOptions emojis
    const moodEmojis: Record<string, string> = {
        peaceful: "😌",     // Calm & Content
        happy: "😃",        // Great & Positive (NOT 😊)
        okay: "😐",         // Neutral & Balanced
        motivated: "🌱",    // Inspired & Driven (NOT 💪)
        anxious: "😟",      // Worried (NOT 😰)
        low: "😔",          // Down or Discouraged
        frustrated: "😠",   // Irritated
        overwhelmed: "😵",  // Stressed
        numb: "😶",         // Disconnected
    };
    return moodEmojis[mood.toLowerCase()] || "😐";
};

// Achievement badge images - mythological theme mapping
const achievementImages: Record<string, string> = {
    'G001': '/Achievments/Badges/Badge (1).png',
    'G002': '/Achievments/Badges/Badge (2).png',
    'G003': '/Achievments/Badges/Badge (3).png',
    'G004': '/Achievments/Badges/Badge (4).png',
    'F001': '/Achievments/Badges/Special_Badge (2).png',
    'F002': '/Achievments/Badges/Special_Badge (5).png',
    'F003': '/Achievments/Badges/Special_Badge (4).png',
    'F004': '/Achievments/Badges/Badge (6).png',
    'F005': '/Achievments/Badges/Badge (7).png',
    'S001': '/Achievments/Badges/Badge (8).png',
    'S002': '/Achievments/Badges/Special_Badge (1).png',
    'ET006': '/Achievments/Badges/Special_Badge (3).png',

    // Titles - Goal Completion (image text matches code name)
    'T005': '/Achievments/Titles/Title (5).png', // Heavy Heart High Effort
    'T006': '/Achievments/Titles/Title (3).png', // Mindset of a Warrior
    'T007': '/Achievments/Titles/Title (7).png', // Exhaustion to Excellence
    'T008': '/Achievments/Titles/Title (6).png', // High Energy Ace

    // Titles - Login Streaks (image text matches code name)
    'T001': '/Achievments/Titles/Title (4).png', // Tired But Triumphant
    'T002': '/Achievments/Titles/Title (2).png', // Restless Yet Relentless
    'T003': '/Achievments/Titles/Title (1).png', // Strong Comeback
    'T004': '/Achievments/Titles/Title (8).png', // Top Tier Energy

    // Emotional Titles (image text matches code name)
    'ET001': '/Achievments/Titles/Special_Title (3).png', // Showed Up Tired
    'ET002': '/Achievments/Titles/Special_Title (2).png', // Did It Anyway
    'ET003': '/Achievments/Titles/Special_Title (1).png', // Quiet Consistency
    'ET004': '/Achievments/Titles/Special_Title (4).png', // Survived Bad Week
    'ET005': '/Achievments/Titles/Special_Title (5).png', // Pushed Through Overwhelm
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [streaks, setStreaks] = useState({ checkInStreak: 0, loginStreak: 0, goalCompletionStreak: 0 });
    const [todayMood, setTodayMood] = useState<{ mood: string; intensity: number } | null>(null);
    const [goals, setGoals] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 });
    const [weeklyMoods, setWeeklyMoods] = useState<{ day: string; intensity: number; mood: string }[]>([]);
    const [allGoals, setAllGoals] = useState<any[]>([]);
    const [activeTitle, setActiveTitle] = useState<string | null>(null);
    const [activeTitleId, setActiveTitleId] = useState<string | null>(null);
    const [activeBadge, setActiveBadge] = useState<any | null>(null);
    const [activeTitleData, setActiveTitleData] = useState<any | null>(null);
    const [showAchievementModal, setShowAchievementModal] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);

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
                // Fetch active achievement title & badge
                try {
                    const [titleData, allAchievementsData] = await Promise.all([
                        dataService.getActiveTitle(),
                        dataService.getAllAchievements(),
                    ]);

                    // Set active title (name + ID for image lookup)
                    setActiveTitle(titleData.title || null);
                    setActiveTitleId(titleData.selectedId || null);

                    // Find active badge: if user selected a badge, use that; otherwise highest-tier earned badge
                    const allAchievements = allAchievementsData.achievements || [];
                    const earnedBadges = allAchievements
                        .filter((a) => a.type === 'badge' && a.earned)
                        .sort((a, b) => (b.tier || 0) - (a.tier || 0));

                    // Check if user's selected achievement is a badge
                    const selectedId = titleData.selectedId;
                    const selectedBadge = selectedId ? allAchievements.find(a => a.id === selectedId && a.type === 'badge' && a.earned) : null;

                    // Store full title data for modal
                    const selectedTitle = titleData.selectedId ? allAchievements.find(a => a.id === titleData.selectedId && a.type === 'title' && a.earned) : null;
                    setActiveTitleData(selectedTitle);

                    if (selectedBadge) {
                        setActiveBadge(selectedBadge);
                    } else if (earnedBadges.length > 0) {
                        setActiveBadge(earnedBadges[0]);
                    }
                } catch (e) { console.error('Failed to fetch achievements', e); }
            } catch (error) {
                navigate("/login");
            }
        };
        checkAuth();
    }, [navigate]);



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
        <MainLayout userName={user.name} userAvatar={user.avatar} hideSidebar={true}>
            <div className="flex-1 bg-background/95 font-['Plus_Jakarta_Sans'] transition-colors duration-300">
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
                    {/* Unified Identity Hero Card */}
                    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8 md:mb-10 group">
                        {/* Dynamic Hero Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/50 to-white/30 dark:from-[#1a1a20]/90 dark:via-[#15151a]/80 dark:to-[#0f0f12]/50 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-2xl transition-all duration-500"></div>

                        {/* Animated Mesh Gradients */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 animate-pulse duration-1000"></div>
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 md:gap-12">
                            {/* Left Side: Greeting & Quote */}
                            <div className="flex-1 text-center md:text-left space-y-4 w-full">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-md mb-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">Online</span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white tracking-tight">
                                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">{user.name.split(' ')[0]}</span>
                                    </h1>
                                </div>
                                <div className="max-w-xl mx-auto md:mx-0">
                                    <Quote className="w-5 h-5 text-indigo-400 mb-2 mx-auto md:mx-0 opacity-50" />
                                    <p className="text-lg text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed">
                                        "{getDailyQuote()}"
                                    </p>
                                </div>

                                <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-3">
                                    <button
                                        onClick={() => navigate('/landing')}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md"
                                    >
                                        <Home className="w-4 h-4" /> Home
                                    </button>
                                </div>
                            </div>

                            {/* Right Side: Identity Badge */}
                            {(activeTitleId && achievementImages[activeTitleId]) || activeTitle ? (
                                <div className="relative flex-shrink-0 group/badge w-full md:w-auto flex justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent rounded-full blur-2xl transform translate-y-4 group-hover/badge:translate-y-2 transition-transform duration-500"></div>

                                    <div
                                        onClick={() => {
                                            if (activeTitleData) {
                                                setSelectedAchievement(activeTitleData);
                                                setShowAchievementModal(true);
                                            }
                                        }}
                                        className="relative flex flex-col items-center p-6 rounded-2xl bg-black dark:bg-black/40 border border-slate-800 dark:border-white/5 backdrop-blur-md shadow-xl transition-transform hover:scale-[1.02] duration-300 cursor-pointer w-full md:w-auto"
                                    >
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200 dark:text-slate-500 mb-2">Current Title</div>

                                        {activeTitleId && achievementImages[activeTitleId] ? (
                                            <div className="relative w-32 h-32 md:w-36 md:h-36 mb-2 filter drop-shadow-lg">
                                                <img
                                                    src={achievementImages[activeTitleId]}
                                                    alt={activeTitle || 'Title'}
                                                    className="w-full h-full object-contain transform group-hover/badge:scale-110 transition-transform duration-500 ease-out"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-2">
                                                <Sparkles className="w-10 h-10 text-indigo-500" />
                                            </div>
                                        )}

                                        <div className="px-4 py-1.5 rounded-full border border-red-600 dark:border-amber-500/50 bg-transparent">
                                            <p className="text-xs md:text-sm font-bold text-red-600 dark:text-amber-200 whitespace-nowrap">
                                                {activeTitle || 'Explorer'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

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
                                                onClick={() => navigate('/nishtha/check-in')}
                                                className="mt-4 text-primary text-sm hover:underline flex items-center gap-1"
                                            >
                                                Update Check-In <ArrowRight className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-muted-foreground italic mb-6 text-lg font-light">No check-in yet today</p>
                                            <button
                                                onClick={() => navigate('/nishtha/check-in')}
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

                        {/* Achievements Card - Enhanced Glow */}
                        <div className="lg:col-span-4 rounded-2xl p-6 relative overflow-hidden min-h-[280px] bg-gradient-to-br from-white via-yellow-50/30 to-white dark:from-[#121a16] dark:via-[#1a1e1a] dark:to-[#0a0f0d] border-2 border-yellow-400/30 dark:border-yellow-500/20 shadow-xl dark:shadow-yellow-500/10">
                            {/* Multi-layer glow effects */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/30 dark:bg-yellow-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-300/20 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-amber-400/5 pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/30 to-amber-500/30 dark:from-yellow-500/25 dark:to-amber-600/25 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                        <Award className="text-yellow-600 dark:text-yellow-400 w-5 h-5" />
                                    </div>
                                    <h3 className="font-semibold text-xl text-foreground">Achievements</h3>
                                </div>
                                <button
                                    onClick={() => navigate('/achievements')}
                                    className="text-xs font-bold uppercase tracking-widest text-primary/80 hover:text-primary transition-colors"
                                >
                                    View All
                                </button>
                            </div>

                            <div className="relative z-10 text-center">
                                <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-muted-foreground mb-6">Current Badge</p>
                                {activeBadge ? (
                                    <div
                                        onClick={() => {
                                            setSelectedAchievement(activeBadge);
                                            setShowAchievementModal(true);
                                        }}
                                        className="relative inline-block group cursor-pointer"
                                    >
                                        {/* Glow effect behind the badge */}
                                        <div className="absolute inset-0 bg-teal-500/20 dark:bg-teal-500/10 blur-[40px] rounded-full animate-pulse" />

                                        {achievementImages[activeBadge.id] ? (
                                            <div className="relative w-40 h-40 flex items-center justify-center transition-transform duration-500 hover:scale-110">
                                                <img
                                                    src={achievementImages[activeBadge.id]}
                                                    alt={activeBadge.name}
                                                    className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(20,184,166,0.6)]"
                                                />
                                            </div>
                                        ) : (
                                            /* Fallback if no image mapped */
                                            <div className="relative w-32 h-32 rounded-full border-4 border-teal-500/30 flex items-center justify-center bg-teal-500/10">
                                                <Medal className="w-16 h-16 text-teal-500" />
                                            </div>
                                        )}

                                        {/* Badge Name */}
                                        <div className="mt-4">
                                            <span className="text-xl font-bold font-serif bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 dark:from-teal-300 dark:via-emerald-300 dark:to-teal-300 bg-clip-text text-transparent filter drop-shadow-sm">
                                                {activeBadge.name}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="relative inline-block mb-3">
                                            <div className="absolute inset-0 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-xl"></div>
                                            <Award className="relative w-10 h-10 text-teal-500/60 dark:text-teal-400/40 mx-auto" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">No badge yet</p>
                                        <p className="text-muted-foreground text-xs mt-1.5">Complete goals to earn!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Today's Goals */}
                        <div className="lg:col-span-4 glass-high rounded-2xl p-6 flex flex-col relative">
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
                                onClick={() => navigate('/nishtha/goals')}
                                className="w-full mt-auto bg-muted hover:bg-muted/80 text-blue-600 border border-blue-500/20 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 group"
                            >
                                {goals.total > 0 ? 'View Goals' : 'Set Goals'}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Daily Inspiration */}
                        <div className="lg:col-span-4 glass-high rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
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
                                    onClick={() => navigate('/nishtha/goals')}
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
                                                <div className="flex items-center gap-3">
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


                    </div>
                </div>
            </div>

            {/* Achievement Detail Modal */}
            {showAchievementModal && selectedAchievement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setShowAchievementModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>

                        <div className="text-center mb-6">
                            {/* Achievement Image */}
                            {achievementImages[selectedAchievement.id] && (
                                <div className="w-32 h-32 mx-auto mb-4 relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                                    <img
                                        src={achievementImages[selectedAchievement.id]}
                                        alt={selectedAchievement.name}
                                        className="relative w-full h-full object-contain drop-shadow-[0_0_20px_rgba(20,184,166,0.6)]"
                                    />
                                </div>
                            )}

                            {/* Achievement Type Badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold uppercase tracking-wider mb-3">
                                {selectedAchievement.type === 'badge' ? (
                                    <>
                                        <Medal className="w-3.5 h-3.5 text-teal-500" />
                                        <span className="text-teal-600 dark:text-teal-400">Badge</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-red-600 dark:text-red-400">Title</span>
                                    </>
                                )}
                            </div>

                            {/* Achievement Name */}
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {selectedAchievement.name}
                            </h2>

                            {/* Achievement Description/Requirement */}
                            <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 mt-4 text-left">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Why You Earned This
                                </h3>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {selectedAchievement.requirement || selectedAchievement.description || 'Awarded for exceptional achievement'}
                                </p>
                            </div>

                            {/* Additional Stats */}
                            {selectedAchievement.holderCount > 0 && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Users className="w-4 h-4" />
                                    <span>{selectedAchievement.holderCount} {selectedAchievement.holderCount === 1 ? 'person has' : 'people have'} earned this</span>
                                </div>
                            )}

                            {selectedAchievement.tier && (
                                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Tier {selectedAchievement.tier}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowAchievementModal(false)}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

        </MainLayout>
    );
}
