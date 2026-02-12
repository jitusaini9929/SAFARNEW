import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { authService } from '@/utils/authService';
import { Award, Target, Clock, Heart, Users, CheckCircle2, Lock, Check, Sparkles, RefreshCw, Medal } from 'lucide-react';
import { toast } from 'sonner';

interface Achievement {
    id: string;
    name: string;
    description: string | null;
    type: 'badge' | 'title';
    category: string;
    rarity: string | null;
    tier: number | null;
    requirement: string;
    holderCount: number;
    earned: boolean;
    progress: number;
    currentValue: number;
    targetValue: number;
}

// Distinct colors for badge vs title cards
const typeStyles = {
    badge: {
        bg: 'bg-teal-500/10 dark:bg-teal-500/15',
        border: 'border-teal-500/30',
        text: 'text-teal-600 dark:text-teal-400',
        icon: Medal,
        label: 'Badge',
        earnedRing: 'ring-teal-500/50',
    },
    title: {
        bg: 'bg-red-500/10 dark:bg-red-500/15',
        border: 'border-red-600',
        text: 'text-red-600 dark:text-red-400',
        icon: Sparkles,
        label: 'Title',
        earnedRing: 'ring-red-500/50',
    },
};

const categoryIcons: Record<string, any> = {
    focus: Clock,
    goals: Target,
    emotional: Heart,
    streak: RefreshCw,
};

// ... (skipping images map for brevity in replace block if possible, but simplest to target specific areas)



// Achievement badge images - mythological theme mapping
const achievementImages: Record<string, string> = {
    // Goals - Completion themed
    'G001': '/Achievments/Badges/Badge (1).png', // Alpha Finisher - Om
    'G002': '/Achievments/Badges/Badge (2).png', // Finish Line - Vortex
    'G003': '/Achievments/Badges/Badge (3).png', // Goal Slayer - Cornucopia
    'G004': '/Achievments/Badges/Badge (4).png', // The Closer - Tree of Life

    // Focus - Power and mastery themed
    'F001': '/Achievments/Badges/Special_Badge (2).png', // Focus Initiate
    'F002': '/Achievments/Badges/Special_Badge (5).png', // Focus Adept
    'F003': '/Achievments/Badges/Special_Badge (4).png', // Aura of Arjun
    'F004': '/Achievments/Badges/Badge (6).png', // The Finisher - Fire
    'F005': '/Achievments/Badges/Badge (7).png', // Dhurandhar - Trishul

    // Streak - Consistency themed
    'S001': '/Achievments/Badges/Badge (8).png', // Unstoppable Sigma - Compass
    'S002': '/Achievments/Badges/Special_Badge (1).png', // Jeet Express

    // Emotional / Flow
    'ET006': '/Achievments/Badges/Special_Badge (3).png', // Flow Seeker

    // Titles - Goal Completion
    'T005': '/Achievments/Titles/Title (5).png', // Goal Getter
    'T006': '/Achievments/Titles/Title (6).png', // Ambition Master
    'T007': '/Achievments/Titles/Title (7).png', // Dream Chaser
    'T008': '/Achievments/Titles/Title (8).png', // Legendary Achiever

    // Titles - Login Streaks
    'T001': '/Achievments/Titles/Title (1).png', // The Regular
    'T002': '/Achievments/Titles/Title (2).png', // Dedicated Soul
    'T003': '/Achievments/Titles/Title (3).png', // Consistency King
    'T004': '/Achievments/Titles/Title (4).png', // Unstoppable Force

    // Weekly Emotional Titles
    'ET001': '/Achievments/Titles/Special_Title (3).png', // Showed Up Tired
    'ET002': '/Achievments/Titles/Special_Title (2).png', // Did It Anyway
    'ET003': '/Achievments/Titles/Special_Title (1).png', // Quiet Consistency
    'ET004': '/Achievments/Titles/Special_Title (4).png', // Survived Bad Week
    'ET005': '/Achievments/Titles/Special_Title (5).png', // Pushed Through Overwhelm
};

export default function Achievements() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'badge' | 'title'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selecting, setSelecting] = useState(false);
    const [evaluating, setEvaluating] = useState(false);
    const [weekTitle, setWeekTitle] = useState<{ title: string | null, description: string | null }>({ title: null, description: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userData = await authService.getCurrentUser();
                if (!userData?.user) {
                    navigate('/login');
                    return;
                }
                setUser(userData.user);

                const [allData, titleData] = await Promise.all([
                    fetch('/api/achievements/all', { credentials: 'include' }).then(r => r.json()),
                    fetch('/api/achievements/active-title', { credentials: 'include' }).then(r => r.json()),
                ]);
                setAchievements(allData.achievements || []);
                setSelectedId(titleData.selectedId || null);
            } catch (error) {
                console.error('Failed to fetch achievements:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleSelect = async (achievementId: string) => {
        if (selecting) return;
        setSelecting(true);
        try {
            const res = await fetch('/api/achievements/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ achievementId }),
            });
            if (!res.ok) {
                const errData = await res.json();
                toast.error(errData.message || 'Failed to set active');
                return;
            }
            const data = await res.json();
            setSelectedId(data.selectedId);
            toast.success(`Active display set to "${data.title || data.selectedId}"`);
        } catch (error) {
            console.error('Failed to select:', error);
            toast.error('Failed to set active');
        } finally {
            setSelecting(false);
        }
    };

    const handleEvaluateWeek = async () => {
        if (evaluating) return;
        setEvaluating(true);
        try {
            const res = await fetch('/api/achievements/evaluate-week', {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            setWeekTitle(data);
            if (data.title) {
                toast.success(`🎉 You earned: "${data.title}"`);
                const allData = await fetch('/api/achievements/all', { credentials: 'include' }).then(r => r.json());
                setAchievements(allData.achievements || []);
            } else {
                toast.info("Keep going! No special title this week, but you're making progress.");
            }
        } catch (error) {
            console.error('Failed to evaluate week:', error);
            toast.error('Failed to evaluate week');
        } finally {
            setEvaluating(false);
        }
    };

    const filteredAchievements = filter === 'all' ? achievements : achievements.filter(a => a.type === filter);
    const badges = achievements.filter(a => a.type === 'badge');
    const titles = achievements.filter(a => a.type === 'title');

    if (!user) return null;

    return (
        <MainLayout userName={user?.name} userAvatar={user?.avatar} homeRoute="/dashboard">
            <div className="flex-1 bg-background/95 font-['Poppins']">
                {/* Background */}
                <div
                    className="fixed inset-0 pointer-events-none z-0"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 15% 50%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 85% 30%, rgba(255, 215, 0, 0.04) 0%, transparent 45%)
                        `,
                        backgroundAttachment: 'fixed'
                    }}
                ></div>

                <div className="relative z-10 p-4 md:p-6 lg:p-8">
                    {/* Header */}
                    <header className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="text-primary w-8 h-8" />
                            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Achievements & Titles</h1>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Earn badges by completing goals and focusing. Get emotional titles based on your weekly journey!
                        </p>
                    </header>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="glass-high rounded-xl p-4 text-center border border-teal-500/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Medal className="w-5 h-5 text-teal-500" />
                                <span className="text-2xl font-bold text-foreground">{badges.filter(a => a.earned).length}</span>
                                <span className="text-muted-foreground text-sm">/ {badges.length}</span>
                            </div>
                            <p className="text-xs text-teal-600 dark:text-teal-400 uppercase font-semibold">Badges Earned</p>
                        </div>
                        <div className="glass-high rounded-xl p-4 text-center border border-red-500/20 bg-black/5 dark:bg-black/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-red-500" />
                                <span className="text-2xl font-bold text-foreground">{titles.filter(a => a.earned).length}</span>
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-400 uppercase font-semibold">Titles Earned</p>
                        </div>
                    </div>



                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {(['all', 'badge', 'title'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab
                                    ? tab === 'badge' ? 'bg-teal-500 text-white' : tab === 'title' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {tab === 'all' ? 'All' : tab === 'badge' ? 'Badges' : 'Titles'}
                            </button>
                        ))}
                    </div>

                    {/* Achievements Grid */}
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading achievements...</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredAchievements.map(achievement => {
                                const style = typeStyles[achievement.type] || typeStyles.badge;
                                const TypeIcon = style.icon;
                                const CategoryIcon = categoryIcons[achievement.category] || Award;
                                const isSelected = selectedId === achievement.id;

                                // For titles, we might want a slightly different card style or just use the same
                                // The user wants them displayed in the list
                                return (
                                    <div
                                        key={achievement.id}
                                        className={`relative group flex flex-col items-center justify-center p-4 transition-all duration-500 rounded-2xl
                                            ${achievement.type === 'title' ? 'bg-black dark:bg-black/40 border border-slate-800 dark:border-white/5 shadow-xl' : ''}
                                            ${achievement.earned ? 'opacity-100' : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'}`}
                                    >
                                        {/* Badge Image - The main "Card" */}
                                        {achievementImages[achievement.id] ? (
                                            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                                                {/* Glow effect for earned badges */}
                                                {achievement.earned && (
                                                    <div className="absolute inset-0 bg-teal-500/20 dark:bg-teal-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                )}

                                                <img
                                                    src={achievementImages[achievement.id]}
                                                    alt={achievement.name}
                                                    className={`w-full h-full object-contain filter drop-shadow-2xl 
                                                        ${achievement.earned ? 'drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]' : 'drop-shadow-none'}
                                                        ${['F003', 'S002', 'ET006'].includes(achievement.id) ? 'scale-150' : ''}
                                                        ${['ET003'].includes(achievement.id) ? 'scale-[2.1]' : ''}
                                                        ${!['F003', 'S002', 'ET006', 'ET003'].includes(achievement.id) ? 'scale-100' : ''}`}
                                                />

                                                {/* Lock overlay for locked badges */}
                                                {!achievement.earned && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full backdrop-blur-[2px]">
                                                        <Lock className="w-8 h-8 text-white/70 drop-shadow-md" />
                                                    </div>
                                                )}

                                                {/* Active Indicator */}
                                                {isSelected && achievement.earned && (
                                                    <div className="absolute -top-2 -right-2 bg-teal-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-[#0B0F19] animate-bounce">
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Fallback for items without images (like Titles) */
                                            <div className={`w-full aspect-square flex items-center justify-center rounded-full mb-4 ${style.bg} border-4 ${style.border}`}>
                                                <TypeIcon className={`w-12 h-12 ${style.text}`} />
                                            </div>
                                        )}

                                        {/* Text Content - Always evident but subtle */}
                                        <div className="text-center z-10">
                                            <h3 className={`font-bold text-lg mb-1 ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {achievement.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px] mx-auto">
                                                {achievement.requirement || achievement.description}
                                            </p>
                                        </div>

                                        {/* Progress Bar (only for unearned) */}
                                        {!achievement.earned && achievement.targetValue > 0 && (
                                            <div className="w-full max-w-[150px] mt-3">
                                                <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${achievement.type === 'badge' ? 'bg-teal-500/50' : 'bg-amber-500/50'}`}
                                                        style={{ width: `${achievement.progress}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-[10px] text-center text-muted-foreground mt-1">
                                                    {achievement.currentValue} / {achievement.targetValue}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action Button (Set Active) */}
                                        {achievement.earned && !isSelected && (
                                            <button
                                                onClick={() => handleSelect(achievement.id)}
                                                disabled={selecting}
                                                className="mt-4 px-4 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/10 text-xs font-medium 
                                                    opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300
                                                    hover:bg-teal-500 hover:text-white"
                                            >
                                                {achievement.type === 'title' ? 'Equip Title' : 'Equip Badge'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {filteredAchievements.length === 0 && !loading && (
                        <div className="text-center py-12">
                            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">No achievements in this category yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
