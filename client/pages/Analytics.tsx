import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { MonthlyReport } from "@shared/api";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
} from "recharts";
import { 
    BarChart3, 
    RefreshCw, 
    Calendar, 
    ArrowRight, 
    Zap, 
    Target, 
    Brain,
    Sparkles,
    ChevronRight,
    Search,
    Heart,
    Medal
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const intensityClass = (intensity: number) => {
    if (intensity >= 4) return "bg-emerald-600 scale-110 shadow-lg shadow-emerald-500/20";
    if (intensity === 3) return "bg-emerald-500 scale-105";
    if (intensity === 2) return "bg-emerald-400";
    if (intensity === 1) return "bg-emerald-200 opacity-60";
    return "bg-muted/50";
};

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
    'T005': '/Achievments/Titles/Title (5).png',
    'T006': '/Achievments/Titles/Title (3).png',
    'T007': '/Achievments/Titles/Title (7).png',
    'T008': '/Achievments/Titles/Title (6).png',
    'T001': '/Achievments/Titles/Title (8).png',
    'T002': '/Achievments/Titles/Title (2).png',
    'T003': '/Achievments/Titles/Title (1).png',
    'T004': '/Achievments/Titles/Title (4).png',
    'ET001': '/Achievments/Titles/Special_Title (3).png',
    'ET002': '/Achievments/Titles/Special_Title (2).png',
    'ET003': '/Achievments/Titles/Special_Title (1).png',
    'ET004': '/Achievments/Titles/Special_Title (4).png',
    'ET005': '/Achievments/Titles/Special_Title (5).png',
    'T009': '/Achievments/svgviewer-output.svg',
};

export default function Analytics() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const { t } = useTranslation();
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [achievements, setAchievements] = useState<any[]>([]);
    const [month, setMonth] = useState("");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [notGenerated, setNotGenerated] = useState(false);

    const monthLabel = useMemo(() => {
        const source = month || report?.month;
        if (!source) return "Overview";
        const [year, monthNum] = source.split("-");
        const date = new Date(Number(year), Number(monthNum) - 1, 1);
        return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }, [month, report?.month]);

    const loadReport = async (targetMonth?: string) => {
        try {
            setLoading(true);
            setNotGenerated(false);
            const data = await dataService.getMonthlyReport(targetMonth);
            setReport(data);
        } catch (error: any) {
            const message = String(error?.message || "");
            if (message.toLowerCase().includes("not generated")) {
                setNotGenerated(true);
                setReport(null);
            } else {
                toast.error(message || "Failed to load monthly report");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchAchievements = async () => {
        try {
            const data = await dataService.getAllAchievements();
            setAchievements(data.achievements || []);
        } catch (e) {
            console.error('Failed to fetch achievements', e);
        }
    };

    useEffect(() => {
        const init = async () => {
            const authData = await authService.getCurrentUser();
            if (!authData?.user) return;
            setUser(authData.user);
            loadReport();
            fetchAchievements();
        };
        init();
    }, []);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const data = await dataService.generateMonthlyReport(month || undefined);
            setReport(data);
            setNotGenerated(false);
            toast.success("Intelligence report optimized!");
        } catch (error: any) {
            toast.error(error?.message || "Generation failed");
        } finally {
            setGenerating(false);
        }
    };

    if (!user) return null;

    const earnedAchievements = achievements.filter(a => a.earned).slice(0, 3);

    return (
        <NishthaLayout userName={user?.name} userAvatar={user?.avatar}>
            <div className="flex-1 bg-background p-6 md:p-10 animate-in fade-in duration-700 font-sans">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-2">
                             <div className="flex items-center gap-3 text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] pl-1">
                                <Sparkles size={14} /> Cognitive Insights
                             </div>
                             <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
                               <div className="p-3 bg-primary rounded-[20px] shadow-xl shadow-primary/20"><BarChart3 className="text-white w-7 h-7" /></div>
                                {t('analytics.title')}
                             </h1>
                             <p className="text-muted-foreground font-bold text-lg md:text-xl pl-1">{monthLabel}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2.5 rounded-[28px] border-2 border-primary/10 backdrop-blur-md">
                            <div className="relative group">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="pl-11 pr-6 py-3.5 bg-background border-2 border-transparent focus:border-primary/50 focus:ring-4 focus:ring-primary/5 rounded-[20px] outline-none transition-all font-bold text-sm"
                                />
                            </div>
                            <button
                                onClick={() => loadReport(month || undefined)}
                                className="px-6 py-3.5 bg-background border-2 hover:border-primary/50 rounded-[20px] font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Search size={18} /> {t('analytics.load')}
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="px-8 py-3.5 bg-primary text-primary-foreground rounded-[20px] font-bold text-sm flex items-center gap-3 shadow-xl shadow-primary/20 hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
                            >
                                <RefreshCw className={`w-5 h-5 ${generating ? "animate-spin" : ""}`} />
                                {generating ? "Generating..." : t('analytics.generate')}
                            </button>
                        </div>
                    </header>

                    {loading ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                            <RefreshCw className="w-12 h-12 text-primary animate-spin opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Intelligence...</p>
                        </div>
                    ) : notGenerated ? (
                        <div className="bg-card border-2 border-dashed rounded-[40px] p-20 text-center space-y-6">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto text-4xl">🌑</div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black">No Report for {monthLabel}</h3>
                                <p className="text-muted-foreground font-medium">Ready to see your progress? Generate your monthly blueprint now.</p>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="bg-primary text-primary-foreground px-12 py-4 rounded-2xl font-black shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                {t('analytics.generate_now')}
                            </button>
                        </div>
                    ) : report && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                            {/* Executive Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { label: t('analytics.consistency_score'), val: `${report.executiveSummary.consistencyScore}%`, msg: report.executiveSummary.consistencyMessage, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
                                    { label: t('analytics.completion_rate'), val: `${report.executiveSummary.completionRate}%`, msg: report.executiveSummary.completionMessage, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                                    { label: t('analytics.focus_depth'), val: `${report.executiveSummary.focusDepth}m/day`, msg: report.executiveSummary.focusMessage, icon: Brain, color: "text-blue-500", bg: "bg-blue-500/10" }
                                ].map((stat, i) => (
                                    <div key={i} className="p-8 bg-card border-2 rounded-[32px] shadow-sm relative overflow-hidden group">
                                        <stat.icon size={64} className={`absolute -right-6 -bottom-6 ${stat.color} opacity-5 group-hover:scale-110 transition-transform duration-500`} />
                                        <div className="relative z-10 space-y-4">
                                            <div className={`p-3 w-fit rounded-2xl ${stat.bg} ${stat.color}`}><stat.icon size={20} /></div>
                                            <div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                                <p className="text-4xl font-black tracking-tight">{stat.val}</p>
                                            </div>
                                            <p className="text-xs font-medium text-muted-foreground leading-relaxed italic border-l-2 pl-3">{stat.msg}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Radar Chart */}
                                <div className="lg:col-span-12 xl:col-span-7 bg-card border-2 rounded-[40px] p-8 lg:p-12 shadow-sm overflow-hidden flex flex-col">
                                    <div className="flex items-center justify-between mb-10">
                                        <h3 className="text-xl font-black flex items-center gap-3">
                                          <div className="w-1.5 h-6 bg-primary rounded-full" /> {t('analytics.skill_radar')}
                                        </h3>
                                        <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Multidimensional Performance</span>
                                    </div>
                                    <div className="flex-1 min-h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={report.radar}>
                                                <PolarGrid stroke="hsl(var(--muted))" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                                                <Radar
                                                    dataKey="score"
                                                    stroke="hsl(var(--primary))"
                                                    strokeWidth={3}
                                                    fill="hsl(var(--primary))"
                                                    fillOpacity={0.2}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Heatmap & Insights */}
                                <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                                    <div className="bg-card border-2 rounded-[40px] p-8 shadow-sm">
                                        <h3 className="font-black mb-6 flex items-center justify-between">
                                          {t('analytics.heatmap')} <span className="text-[9px] text-muted-foreground uppercase tracking-widest">30 Day Density</span>
                                        </h3>
                                        <div className="flex flex-wrap gap-2.5">
                                            {report.heatmap.map((cell) => (
                                                <div
                                                    key={cell.date}
                                                    title={`${cell.date} • intensity ${cell.intensity}`}
                                                    className={`w-5 h-5 rounded-md transition-all duration-300 hover:ring-2 ring-primary/30 cursor-help ${intensityClass(cell.intensity)}`}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between mt-6 pt-4 border-t text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span>Less Active</span>
                                            <div className="flex gap-1.5">
                                              <div className="w-3 h-3 rounded-xs bg-muted/50" />
                                              <div className="w-3 h-3 rounded-xs bg-emerald-200" />
                                              <div className="w-3 h-3 rounded-xs bg-emerald-400" />
                                              <div className="w-3 h-3 rounded-xs bg-emerald-600" />
                                            </div>
                                            <span>Power Mode</span>
                                        </div>
                                    </div>

                                    <div className="bg-card border-2 rounded-[40px] p-8 shadow-sm space-y-6">
                                        <h3 className="font-black flex items-center justify-between">
                                          {t('analytics.insights')} <div className="p-2 bg-muted rounded-xl"><Sparkles size={14} className="text-amber-500" /></div>
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: t('analytics.power_hour'), msg: report.insights.powerHour.message, icon: Zap, color: "text-amber-500" },
                                                { label: t('analytics.mood_connection'), msg: report.insights.moodConnection.message, icon: Heart, color: "text-rose-500" },
                                                { label: t('analytics.sunday_scaries'), msg: report.insights.sundayScaries.message, icon: Brain, color: "text-blue-500" }
                                            ].map((insight, idx) => (
                                                <div key={idx} className="group p-5 bg-muted/20 border-2 border-transparent hover:border-primary/10 rounded-2xl transition-all">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <insight.icon size={16} className={insight.color} />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">{insight.label}</p>
                                                    </div>
                                                    <p className="text-xs font-medium text-muted-foreground tracking-tight leading-relaxed">{insight.msg}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Achievements Section */}
                            <div className="bg-gradient-to-br from-primary/5 to-teal-500/5 border-2 border-primary/10 rounded-[40px] p-10 shadow-sm overflow-hidden relative group">
                                <Sparkles className="absolute -top-10 -right-10 w-40 h-40 text-primary opacity-5 group-hover:rotate-12 transition-transform duration-1000" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                      <h3 className="text-xl font-black flex items-center gap-3">
                                          Achievements
                                      </h3>
                                      <button onClick={() => navigate('/achievements')} className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:gap-2 transition-all flex items-center gap-1">Collect Rewards <ChevronRight size={12}/></button>
                                    </div>
                                    {earnedAchievements.length === 0 ? (
                                        <div className="py-10 text-center space-y-3">
                                            <div className="text-4xl opacity-20">🏆</div>
                                            <p className="text-sm font-bold text-muted-foreground">Unlock your first mythological achievement soon!</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            {earnedAchievements.map((badge, i) => (
                                                <div key={i} className="p-6 rounded-[28px] border-2 bg-card border-primary/20 shadow-lg transition-all flex items-center gap-4 hover:scale-[1.02]">
                                                    <div className="w-12 h-12 flex-shrink-0 relative">
                                                        {achievementImages[badge.id] ? (
                                                            <img src={achievementImages[badge.id]} alt={badge.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center text-xl">🏆</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black tracking-tight line-clamp-1">{badge.name}</p>
                                                        <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 leading-none">Collected</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NishthaLayout>
    );
}
