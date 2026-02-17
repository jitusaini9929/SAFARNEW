import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { authService } from '@/utils/authService';
import { Award, Target, Clock, Heart, Users, CheckCircle2, Lock, Check, Sparkles, RefreshCw, Medal } from 'lucide-react';
import { toast } from 'sonner';
import CelebrationModal from '@/components/CelebrationModal';

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
    'G001': '/Achievments/Badges/Badge (1).png', // First Steps
    'G002': '/Achievments/Badges/Badge (2).png', // Goal Crusher
    'G003': '/Achievments/Badges/Badge (3).png', // Unstoppable
    'G004': '/Achievments/Badges/Badge (4).png', // The Centurion

    // Focus - Power and mastery themed
    'F001': '/Achievments/Badges/Special_Badge (2).png', // Deep Diver
    'F002': '/Achievments/Badges/Special_Badge (5).png', // Focus Master
    'F003': '/Achievments/Badges/Special_Badge (4).png', // Zone Warrior
    'F004': '/Achievments/Badges/Badge (6).png', // Monk Mode
    'F005': '/Achievments/Badges/Badge (7).png', // Legendary Focus

    // Streak - Consistency themed
    'S001': '/Achievments/Badges/Badge (8).png', // Streak Starter
    'S002': '/Achievments/Badges/Special_Badge (1).png', // Iron Will

    // Emotional / Flow
    'ET006': '/Achievments/Badges/Special_Badge (3).png', // Flow State

    // Titles - Goal Completion (image text matches code name)
    'T005': '/Achievments/Titles/Title (5).png', // Heavy Heart High Effort
    'T006': '/Achievments/Titles/Title (3).png', // Mindset of a Warrior
    'T007': '/Achievments/Titles/Title (7).png', // Exhaustion to Excellence
    'T008': '/Achievments/Titles/Title (6).png', // High Energy Ace

    // Titles - Login Streaks (image text matches code name)
    'T001': '/Achievments/Titles/Title (8).png', // Top Tier Energy
    'T002': '/Achievments/Titles/Title (2).png', // Restless Yet Relentless
    'T003': '/Achievments/Titles/Title (1).png', // Strong Comeback
    'T004': '/Achievments/Titles/Title (4).png', // Tired But Triumphant

    // Weekly Emotional Titles (image text matches PNG content)
    'ET001': '/Achievments/Titles/Special_Title (2).png', // Did It Anyway
    'ET002': '/Achievments/Titles/Special_Title (1).png', // Quiet Consistency
    'ET003': '/Achievments/Titles/Special_Title (5).png', // Pushed Through Overwhelm
    'ET004': '/Achievments/Titles/Special_Title (3).png', // Showed Up Tired
    'ET005': '/Achievments/Titles/Special_Title (4).png', // Survived Bad Week

    // Zen Master - User Provided SVG
    'T009': '/Achievments/svgviewer-output.svg',
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
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationAchievement, setCelebrationAchievement] = useState<Achievement | null>(null);
    const [celebrationQueue, setCelebrationQueue] = useState<Achievement[]>([]);
    const celebrationShownRef = useRef(false);
    // Detail modal state (clicking any earned achievement)
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailAchievement, setDetailAchievement] = useState<Achievement | null>(null);

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

                // Check for earned achievements to celebrate
                if (!celebrationShownRef.current) {
                    const earned = (allData.achievements || []).filter((a: Achievement) => a.earned);
                    // Check localStorage for previously seen achievements
                    const seenKey = 'achievements_seen';
                    const seenRaw = localStorage.getItem(seenKey);
                    const seenIds: string[] = seenRaw ? JSON.parse(seenRaw) : [];
                    const newlyEarned = earned.filter((a: Achievement) => !seenIds.includes(a.id));

                    if (newlyEarned.length > 0) {
                        // Mark all as seen now
                        const allSeenIds = [...seenIds, ...newlyEarned.map((a: Achievement) => a.id)];
                        localStorage.setItem(seenKey, JSON.stringify(allSeenIds));
                        // Queue celebration for each new achievement
                        setCelebrationQueue(newlyEarned);
                        setCelebrationAchievement(newlyEarned[0]);
                        setShowCelebration(true);
                        celebrationShownRef.current = true;
                    } else {
                        celebrationShownRef.current = true;
                    }
                }
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

    const handleCelebrationClose = () => {
        const remaining = celebrationQueue.slice(1);
        if (remaining.length > 0) {
            setCelebrationQueue(remaining);
            setCelebrationAchievement(remaining[0]);
            // Keep showCelebration true for next
        } else {
            setShowCelebration(false);
            setCelebrationAchievement(null);
            setCelebrationQueue([]);
        }
    };

    const handleAchievementClick = (achievement: Achievement) => {
        if (achievement.earned) {
            setDetailAchievement(achievement);
            setShowDetailModal(true);
        }
    };

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
                                        onClick={() => handleAchievementClick(achievement)}
                                        className={`relative group flex flex-col items-center justify-center p-4 transition-all duration-500 rounded-2xl
                                            ${achievement.earned ? 'cursor-pointer' : ''}
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
                                            /* Neo Brutalist Fallback for items without images */
                                            <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                                                <div className={`w-28 h-28 md:w-32 md:h-32 rotate-3 bg-yellow-400 border-[6px] border-black shadow-[8px_8px_0px_#000000] flex items-center justify-center relative overflow-hidden
                                                    ${achievement.type === 'title' ? 'bg-cyan-400' : 'bg-yellow-400'}`}>
                                                    {/* Cartoonish decorative stripes */}
                                                    <div className="absolute top-0 left-0 w-full h-2 bg-black/10 -rotate-45 translate-y-4"></div>
                                                    <div className="absolute bottom-0 right-0 w-full h-2 bg-black/10 -rotate-45 -translate-y-4"></div>

                                                    <span className="text-4xl md:text-5xl font-black text-black select-none italic tracking-tighter">
                                                        {achievement.name.charAt(0)}
                                                    </span>
                                                </div>
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
                                                onClick={(e) => { e.stopPropagation(); handleSelect(achievement.id); }}
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

            {/* Celebration Modal - pops up for newly earned achievements */}
            <CelebrationModal
                isOpen={showCelebration}
                onClose={handleCelebrationClose}
                achievement={celebrationAchievement}
                achievementImage={celebrationAchievement ? achievementImages[celebrationAchievement.id] : undefined}
            />

            {/* Detail Modal - when clicking any earned achievement */}
            {showDetailModal && detailAchievement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>

                        <div className="text-center mb-6">
                            {achievementImages[detailAchievement.id] && (
                                <div className="w-32 h-32 mx-auto mb-4 relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                                    <img
                                        src={achievementImages[detailAchievement.id]}
                                        alt={detailAchievement.name}
                                        className="relative w-full h-full object-contain drop-shadow-[0_0_20px_rgba(20,184,166,0.6)]"
                                    />
                                </div>
                            )}

                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-xs font-semibold uppercase tracking-wider mb-3">
                                {detailAchievement.type === 'badge' ? (
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

                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {detailAchievement.name}
                            </h2>

                            <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-4 mt-4 text-left">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                    Why You Earned This
                                </h3>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {detailAchievement.requirement || detailAchievement.description || 'Awarded for exceptional achievement'}
                                </p>
                            </div>

                            {detailAchievement.tier && (
                                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                    {'★'.repeat(detailAchievement.tier)} Tier {detailAchievement.tier}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowDetailModal(false)}
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
