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
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        border: 'border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        icon: Sparkles,
        label: 'Title',
        earnedRing: 'ring-amber-500/50',
    },
};

const categoryIcons: Record<string, any> = {
    focus: Clock,
    goals: Target,
    emotional: Heart,
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
            const data = await res.json();
            setSelectedId(data.selectedId);
            toast.success(`Active display set to "${data.title}"`);
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
        <MainLayout userName={user?.name} userAvatar={user?.avatar}>
            <div className="flex-1 h-full overflow-y-auto bg-background/95 font-['Poppins']">
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
                        <div className="glass-high rounded-xl p-4 text-center border border-amber-500/20">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                <span className="text-2xl font-bold text-foreground">{titles.filter(a => a.earned).length}</span>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-semibold">Titles Earned</p>
                        </div>
                    </div>

                    {/* Evaluate My Week Button */}
                    <div className="glass-high rounded-xl p-6 mb-8 flex items-center justify-between border border-amber-500/20">
                        <div>
                            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                                <Heart className="w-4 h-4 text-amber-500" />
                                Evaluate My Week
                            </h3>
                            <p className="text-sm text-muted-foreground">Check if you've earned an emotional title based on your mood and effort this week.</p>
                        </div>
                        <button
                            onClick={handleEvaluateWeek}
                            disabled={evaluating}
                            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${evaluating ? 'animate-spin' : ''}`} />
                            {evaluating ? 'Evaluating...' : 'Evaluate'}
                        </button>
                    </div>

                    {/* Week Title Result */}
                    {weekTitle.title && (
                        <div className="glass-high rounded-xl p-6 mb-8 border-2 border-amber-500/40 bg-amber-500/5">
                            <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="w-6 h-6 text-amber-500" />
                                <h3 className="text-xl font-bold text-foreground">"{weekTitle.title}"</h3>
                            </div>
                            <p className="text-muted-foreground">{weekTitle.description}</p>
                        </div>
                    )}

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {(['all', 'badge', 'title'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === tab
                                    ? tab === 'badge' ? 'bg-teal-500 text-white' : tab === 'title' ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAchievements.map(achievement => {
                                const style = typeStyles[achievement.type] || typeStyles.badge;
                                const TypeIcon = style.icon;
                                const CategoryIcon = categoryIcons[achievement.category] || Award;
                                const isSelected = selectedId === achievement.id;

                                return (
                                    <div
                                        key={achievement.id}
                                        className={`glass-high rounded-xl p-5 relative overflow-hidden transition-all hover:scale-[1.02] border ${style.border} ${style.bg
                                            } ${achievement.earned && !isSelected ? `ring-2 ${style.earnedRing}` : ''
                                            } ${!achievement.earned ? 'opacity-60' : ''}`}
                                    >
                                        {/* Selected/Earned indicator */}
                                        {isSelected && achievement.earned && (
                                            <div className={`absolute top-3 right-3 flex items-center gap-1 ${style.bg} px-2 py-0.5 rounded-full border ${style.border}`}>
                                                <Check className={`w-3 h-3 ${style.text}`} />
                                                <span className={`text-xs font-medium ${style.text}`}>Active</span>
                                            </div>
                                        )}
                                        {achievement.earned && !isSelected && (
                                            <div className="absolute top-3 right-3">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            </div>
                                        )}
                                        {!achievement.earned && (
                                            <div className="absolute top-3 right-3">
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}

                                        {/* Type Badge with Icon */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <TypeIcon className={`w-4 h-4 ${style.text}`} />
                                            <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${style.bg} ${style.text} border ${style.border}`}>
                                                {style.label}
                                            </span>
                                        </div>

                                        {/* Achievement Name */}
                                        <h3 className="font-bold text-lg text-foreground mb-1">{achievement.name}</h3>

                                        {/* Requirement */}
                                        <p className="text-sm text-muted-foreground mb-3">{achievement.requirement || achievement.description}</p>

                                        {/* Progress Bar (only for unearned badges) */}
                                        {!achievement.earned && achievement.targetValue > 0 && (
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>Progress</span>
                                                    <span>{achievement.currentValue} / {achievement.targetValue}</span>
                                                </div>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${achievement.type === 'badge' ? 'bg-teal-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${achievement.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="w-3 h-3" />
                                                <span>{achievement.holderCount} {achievement.holderCount === 1 ? 'holder' : 'holders'}</span>
                                            </div>
                                            {achievement.earned && !isSelected && (
                                                <button
                                                    onClick={() => handleSelect(achievement.id)}
                                                    disabled={selecting}
                                                    className={`text-xs px-3 py-1 rounded-lg ${style.bg} ${style.text} hover:opacity-80 transition-opacity font-medium disabled:opacity-50 border ${style.border}`}
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                        </div>
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
