import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { dataService } from "@/utils/dataService";
import { runGoalRolloverPromptFlow } from "@/utils/goalRolloverPrompt";
import PerkTitle from "@/components/PerkTitle";
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
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
    Check,
    CheckCircle2,
    Circle,
    Award,
    Sparkles,
    Medal,
    Home,
    Users,
    BarChart3,
    Flame,
} from "lucide-react";
import youtubeImg from "@/assets/youtube-thumbnail.webp";
import courseImg from "@/assets/course-thumbnail.webp";
import GlobalSidebar from "@/components/GlobalSidebar";
import { useTranslation } from "react-i18next";


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
    'G001': '/Achievments/Badges/Badge (1).webp',
    'G002': '/Achievments/Badges/Badge (2).webp',
    'G003': '/Achievments/Badges/Badge (3).webp',
    'G004': '/Achievments/Badges/Badge (4).webp',
    'F001': '/Achievments/Badges/Special_Badge (2).webp',
    'F002': '/Achievments/Badges/Special_Badge (5).webp',
    'F003': '/Achievments/Badges/Special_Badge (4).webp',
    'F004': '/Achievments/Badges/Badge (6).webp',
    'F005': '/Achievments/Badges/Badge (7).webp',
    'S001': '/Achievments/Badges/Badge (8).webp',
    'S002': '/Achievments/Badges/Special_Badge (1).webp',
    'ET006': '/Achievments/Badges/Special_Badge (3).webp',

    // Titles - Goal Completion (image text matches code name)
    'T005': '/Achievments/Titles/Title (5).webp', // Heavy Heart High Effort
    'T006': '/Achievments/Titles/Title (3).webp', // Mindset of a Warrior
    'T007': '/Achievments/Titles/Title (7).webp', // Exhaustion to Excellence
    'T008': '/Achievments/Titles/Title (6).webp', // High Energy Ace

    // Titles - Login Streaks (image text matches code name)
    'T001': '/Achievments/Titles/Title (8).webp', // Top Tier Energy
    'T002': '/Achievments/Titles/Title (2).webp', // Restless Yet Relentless
    'T003': '/Achievments/Titles/Title (1).webp', // Strong Comeback
    'T004': '/Achievments/Titles/Title (4).webp', // Tired But Triumphant

    // Emotional Titles (image text matches code name)
    'ET001': '/Achievments/Titles/Special_Title (3).webp', // Showed Up Tired
    'ET002': '/Achievments/Titles/Special_Title (2).webp', // Did It Anyway
    'ET003': '/Achievments/Titles/Special_Title (1).webp', // Quiet Consistency
    'ET004': '/Achievments/Titles/Special_Title (4).webp', // Survived Bad Week
    'ET005': '/Achievments/Titles/Special_Title (5).webp', // Pushed Through Overwhelm

    // Zen Master - User Provided SVG
    'T009': '/Achievments/svgviewer-output.svg',
};

export default function Dashboard() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user: authUser, status } = useAuth();
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
    const [monthlySummary, setMonthlySummary] = useState<{ month: string; consistencyScore: number; completionRate: number; focusDepth: number } | null>(null);
    const [isGlobalSidebarOpen, setIsGlobalSidebarOpen] = useState(false);

    const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
    const todayISTStr = nowIST.toISOString().split('T')[0];
    const toISTDateKey = (value: string) => {
        const parsed = new Date(value.includes('Z') ? value : `${value}Z`);
        if (Number.isNaN(parsed.getTime())) return null;
        return new Date(parsed.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (status === "loading") {
                    return;
                }

                if (!authUser) {
                    navigate("/login");
                    return;
                }

                setUser(authUser);
                await runGoalRolloverPromptFlow(authUser.id);
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

                    const todaysGoals = goalsData.filter((g: any) => {
                        const createdAt = g.created_at || g.createdAt;
                        if (!createdAt || typeof createdAt !== 'string') return false;
                        return toISTDateKey(createdAt) === todayISTStr;
                    });

                    const total = todaysGoals.length;
                    const completed = todaysGoals.filter((g: any) => g.completed).length;
                    setGoals({ total, completed });
                } catch (e) { console.error('Failed to fetch goals', e); }
                try {
                    const report = await dataService.getMonthlyReport();
                    setMonthlySummary({
                        month: report.month,
                        consistencyScore: report.executiveSummary.consistencyScore,
                        completionRate: report.executiveSummary.completionRate,
                        focusDepth: report.executiveSummary.focusDepth,
                    });
                } catch (e) {
                    setMonthlySummary(null);
                }
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
    }, [authUser, navigate, status]);



    if (!user) return null;

    // Daily Quotes Logic
    const getDailyQuote = () => {
        const quotes = [
            t('dashboard.quotes.q1'),
            t('dashboard.quotes.q2'),
            t('dashboard.quotes.q3'),
            t('dashboard.quotes.q4'),
            t('dashboard.quotes.q5'),
            t('dashboard.quotes.q6'),
            t('dashboard.quotes.q7'),
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

                        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,360px)] gap-6 md:gap-8 items-stretch">
                            <div className="min-w-0 flex flex-col justify-between text-center md:text-left">
                                <div>
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-xs font-semibold uppercase tracking-wider text-green-500">{t('dashboard.online')}</span>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-3">
                                        {t('dashboard.welcome_back')}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">{user.name}</span>
                                    </h1>
                                </div>

                                <div className="mt-6 md:mt-8 max-w-2xl text-left">
                                    <div className="inline-flex items-center gap-2 mb-3 text-primary/90">
                                        <Quote className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-wider">Daily Inspiration</span>
                                    </div>
                                    <blockquote className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-base md:text-lg font-medium italic text-foreground/90 leading-relaxed">
                                        "{getDailyQuote()}"
                                    </blockquote>
                                </div>
                            </div>

                            {(activeTitleId && achievementImages[activeTitleId]) || activeTitle ? (
                                <div
                                    onClick={() => {
                                        if (activeTitleData) {
                                            setSelectedAchievement(activeTitleData);
                                            setShowAchievementModal(true);
                                        }
                                    }}
                                    className="glass-high-contrast rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer group/title"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 group-hover/title:opacity-100 transition-opacity"></div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4 relative z-10">{t('dashboard.current_title')}</p>
                                    {activeTitleId && achievementImages[activeTitleId] ? (
                                        <img
                                            src={achievementImages[activeTitleId]}
                                            alt={activeTitle || t('dashboard.achievement_title_alt')}
                                            className="w-48 h-auto object-contain mb-4 relative z-10 transition-transform duration-300 group-hover/title:scale-105"
                                        />
                                    ) : (
                                        <div className="w-48 h-24 flex items-center justify-center mb-4 relative z-10">
                                            <p className="text-lg font-semibold">{activeTitle}</p>
                                        </div>
                                    )}
                                    <div className="relative z-10">
                                        <p className="font-bold text-lg text-foreground">{activeTitle}</p>
                                        <p className="text-sm text-muted-foreground mt-1 opacity-0 group-hover/title:opacity-100 transition-opacity duration-300">{t('dashboard.tap_achievement_details')}</p>
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
                                <div className="flex items-center gap-2 mb-4">
                                    <Heart className="text-primary w-5 h-5" />
                                    <h3 className="text-lg font-semibold text-foreground">{t('dashboard.todays_mood')}</h3>
                                </div>
                                <p className="text-muted-foreground text-sm mb-6">{t('dashboard.how_feeling')}</p>

                                {todayMood ? (
                                     <div className="m-auto text-center flex flex-col items-center justify-center h-full">
                                         <span className="text-7xl mb-4">{getMoodEmoji(todayMood.mood)}</span>
                                         <p className="text-2xl font-semibold capitalize text-foreground">{todayMood.mood}</p>
                                        <p className="text-muted-foreground">{t('dashboard.mood_intensity')}: {todayMood.intensity}/5</p>
                                     </div>
                                 ) : (
                                     <div className="m-auto text-center flex flex-col items-center justify-center h-full">
                                         <p className="text-muted-foreground mb-4">{t('dashboard.no_checkin')}</p>
                                         <button
                                            onClick={() => navigate('/nishtha/check-in')}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 group"
                                        >
                                            {t('dashboard.checkin_now')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Current Streaks */}
                        <div className="lg:col-span-5 glass-high rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <RotateCw className="text-primary w-5 h-5" />
                                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.current_streaks')}</h3>
                                <Flame className="text-orange-500 w-5 h-5" />
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                                    <span className="font-medium text-foreground">{t('dashboard.checkin_streak')}</span>
                                    <span className="font-bold text-xl text-primary">{streaks.checkInStreak}</span>
                                </div>
                                <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                                    <span className="font-medium text-foreground">{t('dashboard.login_streak')}</span>
                                    <span className="font-bold text-xl text-primary">{streaks.loginStreak}</span>
                                </div>
                            </div>
                        </div>

                        {/* Achievements Card - Enhanced Glow */}
                        <div className="lg:col-span-4 rounded-2xl p-6 relative overflow-hidden min-h-[280px] bg-gradient-to-br from-white via-yellow-50/30 to-white dark:from-[#121a16] dark:via-[#1a1e1a] dark:to-[#0a0f0d] border-2 border-yellow-400/30 dark:border-yellow-500/20 shadow-xl dark:shadow-yellow-500/10">
                            {/* Glow effects */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/30 dark:bg-yellow-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-300/20 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-amber-400/5 pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-2">
                                    <Award className="text-yellow-500 w-5 h-5" />
                                    <h3 className="text-lg font-semibold text-foreground">{t('dashboard.achievements')}</h3>
                                </div>
                                <button onClick={() => navigate('/nishtha/achievements')} className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 hover:underline">{t('dashboard.view_all')}</button>
                            </div>

                            <div className="relative z-10 text-center">
                                {activeBadge ? (
                                    <div
                                        className="cursor-pointer group/badge"
                                        onClick={() => {
                                            setSelectedAchievement(activeBadge);
                                            setShowAchievementModal(true);
                                        }}
                                    >
                                        <img
                                            src={achievementImages[activeBadge.id] || '/path/to/default-badge.png'}
                                            alt={activeBadge.name}
                                            className="w-24 h-24 mx-auto mb-4 transition-transform duration-300 group-hover/badge:scale-110"
                                        />
                                        <p className="font-bold text-foreground">{activeBadge.name}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{t('dashboard.active_badge')}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                        <Award className="w-12 h-12 mb-4" />
                                        <p>{t('dashboard.no_badges_earned')}</p>
                                        <p className="text-xs mt-1">{t('dashboard.keep_going')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Today's Goals */}
                        <div className="lg:col-span-4 glass-high rounded-2xl p-6 flex flex-col relative">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Target className="text-primary w-5 h-5" />
                                        <h3 className="text-lg font-semibold text-foreground">{t('dashboard.todays_goals')}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('dashboard.goals_hint')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-primary">{goals.completed}/{goals.total}</p>
                                    <p className="text-xs font-medium text-muted-foreground">{t('dashboard.completed_label')}</p>
                                </div>
                            </div>

                            {goals.total > 0 ? (
                                <div className="space-y-3 mb-4 overflow-y-auto max-h-24 pr-2">
                                    {allGoals
                                        .filter(g => toISTDateKey(g.created_at || g.createdAt) === todayISTStr)
                                        .map(goal => (
                                            <div key={goal.id} className={`flex items-center gap-3 p-2 rounded-lg ${goal.completed ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${goal.completed ? 'bg-green-500' : 'border-2 border-muted-foreground'}`}>
                                                    {goal.completed && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={`flex-1 text-sm ${goal.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{goal.text}</span>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center my-auto">
                                    <p className="text-muted-foreground text-sm">{t('dashboard.no_goals_today')}</p>
                                    <p className="text-xs text-muted-foreground/70">{t('dashboard.ready_to_plan')}</p>
                                </div>
                            )}

                            <button
                                onClick={() => navigate('/nishtha/goals')}
                                aria-label={goals.total > 0 ? t('dashboard.view_goals') : t('dashboard.set_goals')}
                                className="w-full mt-auto bg-muted hover:bg-muted/80 text-blue-600 border border-blue-500/20 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 group action-btn-nowrap"
                            >
                                {goals.total > 0 ? t('dashboard.manage_goals') : t('dashboard.set_todays_goals')}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Monthly Analytics Snapshot */}
                        <div className="lg:col-span-4 glass-high rounded-2xl p-6 flex flex-col relative">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="text-primary w-5 h-5" />
                                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.monthly_snapshot')}</h3>
                                <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{monthlySummary?.month}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">{t('dashboard.monthly_snapshot_desc')}</p>

                            {monthlySummary ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">{t('dashboard.consistency')}</span>
                                        <span className="text-sm font-bold text-primary">{monthlySummary.consistencyScore.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">{t('dashboard.completion_rate')}</span>
                                        <span className="text-sm font-bold text-primary">{monthlySummary.completionRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">{t('dashboard.focus_depth')}</span>
                                        <span className="text-sm font-bold text-primary">{monthlySummary.focusDepth.toFixed(1)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center my-auto text-muted-foreground">
                                    <p>{t('dashboard.no_monthly_report')}</p>
                                </div>
                            )}

                            <button
                                onClick={() => navigate('/nishtha/analytics')}
                                aria-label={t('dashboard.open_analytics')}
                                className="w-full mt-auto bg-muted hover:bg-muted/80 text-primary border border-primary/20 py-3 rounded-xl text-sm font-medium transition-colors flex justify-center items-center gap-2 group action-btn-nowrap"
                            >
                                {t('dashboard.view_full_report')}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Weekly Mood Trend */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="text-primary w-5 h-5" />
                                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.weekly_mood')}</h3>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">{t('dashboard.weekly_mood_desc')}</p>
                            <div className="w-full">
                                <ResponsiveContainer width="100%" height={250}>
                                    <ComposedChart
                                        data={weeklyMoods}
                                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                        <XAxis
                                            dataKey="day"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                         />
                                         <YAxis
                                            domain={[0, 5]}
                                            allowDecimals={false}
                                            tickLine={false}
                                            axisLine={false}
                                            width={30}
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                         />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--background))',
                                                borderColor: 'hsl(var(--border))',
                                                borderRadius: '0.75rem',
                                                color: 'hsl(var(--foreground))'
                                            }}
                                            labelStyle={{ fontWeight: 'bold' }}
                                            formatter={(value: number, name: string) => {
                                                if (name === 'mood') return [value, t('dashboard.mood_label')];
                                                if (name === 'intensity') return [value, t('dashboard.mood_intensity')];
                                                return [value, name];
                                            }}
                                            itemSorter={(item) => (item.dataKey === 'mood' ? -1 : 1)}
                                            cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '1rem' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="intensity"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorIntensity)"
                                            name={t('dashboard.mood_intensity')}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="mood"
                                            stroke="hsl(var(--secondary))"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                            name={t('dashboard.mood_label')}
                                            // This is a trick to show mood text in tooltip. The line itself is not visible.
                                            strokeOpacity={0}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Goal History Section */}
                        <div className="lg:col-span-12 glass-high rounded-2xl p-6 relative">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">{t('dashboard.goal_history')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('dashboard.goal_history_desc_long')}</p>
                                </div>
                                <button
                                    onClick={() => navigate('/nishtha/history')}
                                    className="text-sm font-semibold text-primary hover:underline"
                                >
                                    {t('dashboard.view_full_history')}
                                </button>
                            </div>
                            <p className="text-muted-foreground text-sm mb-6">{t('dashboard.showing_last_completed')}</p>

                            {allGoals.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <p>{t('dashboard.no_completed_goals')}</p>
                                    <p className="text-xs mt-1">{t('dashboard.complete_goal_to_see')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {allGoals
                                        .filter(g => g.completed)
                                        .sort((a, b) => new Date(b.updated_at || b.updatedAt).getTime() - new Date(a.updated_at || a.updatedAt).getTime())
                                        .slice(0, 5)
                                        .map(goal => (
                                            <div key={goal.id} className="bg-muted/50 p-4 rounded-lg flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    <div>
                                                        <p className="text-foreground font-medium">{goal.text}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t('dashboard.completed_on')} {new Date(goal.updated_at || goal.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                                                    {t('dashboard.completed_label')}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>


                    </div>
                </div>
            </div>

            <GlobalSidebar isOpen={isGlobalSidebarOpen} onClose={() => setIsGlobalSidebarOpen(false)} />

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
                                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center p-2 shadow-inner">
                                    <img
                                        src={achievementImages[selectedAchievement.id]}
                                        alt={selectedAchievement.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

                            {/* Type & Tier */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold uppercase tracking-wider mb-3">
                                <span className={`${selectedAchievement.type === 'title' ? 'text-purple-500' : 'text-amber-500'}`}>
                                    {selectedAchievement.type === 'title' ? t('dashboard.title_label') : t('dashboard.badge_label')}
                                </span>
                                {selectedAchievement.tier && (
                                    <>
                                        <span className="text-slate-300 dark:text-white/20">|</span>
                                        <span>{t('dashboard.tier_label', { tier: selectedAchievement.tier })}</span>
                                    </>
                                )}
                            </div>

                            {/* Name */}
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {selectedAchievement.name}
                            </h2>

                            {/* Description */}
                            {selectedAchievement.description && (
                                <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 mt-4 text-left">
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {selectedAchievement.description}
                                    </p>
                                </div>
                            )}

                            {/* Rarity */}
                            {selectedAchievement.holderCount > 0 && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                                    {t('dashboard.held_by_prefix')} <span className="font-bold text-slate-500 dark:text-slate-400">{selectedAchievement.holderCount}</span> {selectedAchievement.holderCount === 1 ? t('dashboard.person') : t('dashboard.people')}.

                                </p>
                            )}

                            {selectedAchievement.tier && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {t('dashboard.achievement_tier_prefix')} <span className="font-bold text-slate-500 dark:text-slate-400">{t('dashboard.tier_label', { tier: selectedAchievement.tier })}</span> {t('dashboard.achievement_tier_suffix')}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => setShowAchievementModal(false)}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] transition-all"
                        >
                            {t('achievements.close')}
                        </button>
                    </div>
                </div>
            )}

        </MainLayout>
    );
}
