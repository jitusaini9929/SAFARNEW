import React, { useEffect, useState } from 'react';
import { focusService, FocusStats } from '@/utils/focusService';
import { BarChart3, Calendar, Trophy, Zap, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FocusAnalytics() {
    const [stats, setStats] = useState<FocusStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        focusService.getStats()
            .then(data => setStats(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading stats...</div>;
    }

    if (!stats) {
        return <div className="p-8 text-center text-red-500">Failed to load analytics.</div>;
    }

    const {
        totalFocusMinutes,
        totalSessions,
        completedSessions,
        weeklyData,
        focusStreak,
        dailyGoalProgress
    } = stats;

    const maxWeekly = Math.max(...weeklyData, 1);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Zap className="w-5 h-5 text-amber-500" />} label="Focus Time" value={`${Math.round(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m`} />
                <StatCard icon={<Trophy className="w-5 h-5 text-yellow-500" />} label="Sessions" value={completedSessions.toString()} subtext={`of ${totalSessions} started`} />
                <StatCard icon={<Calendar className="w-5 h-5 text-blue-500" />} label="Streak" value={`${focusStreak} Days`} />
                <StatCard icon={<Target className="w-5 h-5 text-emerald-500" />} label="Daily Goal" value={`${dailyGoalProgress}%`} />
            </div>

            <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5" />
                        Weekly Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-48 flex items-end justify-between gap-2 md:gap-4 px-2">
                        {weeklyData.map((mins, i) => {
                            const dayLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
                            const heightPct = (mins / maxWeekly) * 100;
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div className="w-full relative h-full flex items-end">
                                        <div
                                            className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-500/80"
                                            style={{ height: `${heightPct}%` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transition-opacity">
                                                {mins} mins
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium">{dayLabel}</div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext?: string }) {
    return (
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60 transition-all hover:scale-102 hover:shadow-lg">
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">{icon}</div>
                <div className="text-sm text-muted-foreground font-medium">{label}</div>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
            </CardContent>
        </Card>
    );
}
