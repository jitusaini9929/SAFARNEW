import { useEffect, useMemo, useState } from "react";
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
import { BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const intensityClass = (intensity: number) => {
    if (intensity >= 4) return "bg-emerald-600";
    if (intensity === 3) return "bg-emerald-500";
    if (intensity === 2) return "bg-emerald-400";
    if (intensity === 1) return "bg-emerald-200";
    return "bg-slate-200 dark:bg-slate-700";
};

export default function Analytics() {
    const [user, setUser] = useState<any>(null);
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [month, setMonth] = useState("");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [notGenerated, setNotGenerated] = useState(false);

    const monthLabel = useMemo(() => {
        const source = month || report?.month;
        if (!source) return "Previous Month";
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

    useEffect(() => {
        const init = async () => {
            try {
                const authData = await authService.getCurrentUser();
                if (!authData?.user) return;
                setUser(authData.user);
                await loadReport(undefined);
            } catch (error) {
                console.error("Failed to load analytics:", error);
            }
        };
        init();
    }, []);

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const data = await dataService.generateMonthlyReport(month || undefined);
            setReport(data);
            setNotGenerated(false);
            toast.success("Monthly report generated");
        } catch (error: any) {
            toast.error(error?.message || "Failed to generate report");
        } finally {
            setGenerating(false);
        }
    };

    const handleFetch = async () => {
        await loadReport(month || undefined);
    };

    if (!user) return null;

    return (
        <NishthaLayout userName={user?.name} userAvatar={user?.avatar}>
            <div className="flex-1 bg-background/95 p-6 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                <BarChart3 className="w-7 h-7 text-primary" />
                                Nishtha Scorecard
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="px-3 py-2 rounded-lg border bg-background"
                            />
                            <button
                                onClick={handleFetch}
                                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted"
                            >
                                Load
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                aria-label={generating ? "Generating report" : "Generate report"}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2 action-btn-nowrap"
                            >
                                <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                                <span className="action-label-mobile-hidden">Generate</span>
                            </button>
                        </div>
                    </div>

                    {loading && (
                        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
                            Loading report...
                        </div>
                    )}

                    {!loading && notGenerated && (
                        <div className="rounded-2xl border bg-card p-8 text-center">
                            <p className="text-muted-foreground mb-4">Monthly report not generated yet for this month.</p>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
                            >
                                Generate Now
                            </button>
                        </div>
                    )}

                    {!loading && report && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-2xl border bg-card p-5">
                                    <p className="text-xs uppercase text-muted-foreground">Consistency Score</p>
                                    <p className="text-3xl font-bold mt-2">{report.executiveSummary.consistencyScore}%</p>
                                    <p className="text-xs text-muted-foreground mt-2">{report.executiveSummary.consistencyMessage}</p>
                                </div>
                                <div className="rounded-2xl border bg-card p-5">
                                    <p className="text-xs uppercase text-muted-foreground">Completion Rate</p>
                                    <p className="text-3xl font-bold mt-2">{report.executiveSummary.completionRate}%</p>
                                    <p className="text-xs text-muted-foreground mt-2">{report.executiveSummary.completionMessage}</p>
                                </div>
                                <div className="rounded-2xl border bg-card p-5">
                                    <p className="text-xs uppercase text-muted-foreground">Focus Depth</p>
                                    <p className="text-3xl font-bold mt-2">{report.executiveSummary.focusDepth}m/day</p>
                                    <p className="text-xs text-muted-foreground mt-2">{report.executiveSummary.focusMessage}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-2xl border bg-card p-5">
                                    <h3 className="text-lg font-semibold mb-4">Skill Radar</h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={report.radar}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="subject" />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                                <Radar
                                                    dataKey="score"
                                                    stroke="hsl(var(--primary))"
                                                    fill="hsl(var(--primary))"
                                                    fillOpacity={0.35}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="rounded-2xl border bg-card p-5">
                                    <h3 className="text-lg font-semibold mb-4">Self-Discovery Insights</h3>
                                    <div className="space-y-4 text-sm">
                                        <div className="rounded-xl bg-muted/40 p-3">
                                            <p className="font-semibold mb-1">Your Power Hour</p>
                                            <p className="text-muted-foreground">{report.insights.powerHour.message}</p>
                                        </div>
                                        <div className="rounded-xl bg-muted/40 p-3">
                                            <p className="font-semibold mb-1">The Mood Connection</p>
                                            <p className="text-muted-foreground">{report.insights.moodConnection.message}</p>
                                        </div>
                                        <div className="rounded-xl bg-muted/40 p-3">
                                            <p className="font-semibold mb-1">The Sunday Scaries</p>
                                            <p className="text-muted-foreground">{report.insights.sundayScaries.message}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border bg-card p-5">
                                <h3 className="text-lg font-semibold mb-4">Activity Heatmap</h3>
                                <div className="grid grid-cols-7 sm:grid-cols-14 md:grid-cols-16 lg:grid-cols-20 gap-2">
                                    {report.heatmap.map((cell) => (
                                        <div key={cell.date} className="flex flex-col items-center gap-1">
                                            <div
                                                title={`${cell.date} • intensity ${cell.intensity}`}
                                                className={`w-4 h-4 rounded-sm ${intensityClass(cell.intensity)}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border bg-card p-5">
                                <h3 className="text-lg font-semibold mb-4">Badge Summary</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                    <div className="rounded-xl bg-muted/40 p-3">
                                        <p className="font-semibold">The Finisher</p>
                                        <p className="text-muted-foreground mt-1">{report.badgeSummary.theFinisher ? "Earned" : "Not earned yet"}</p>
                                    </div>
                                    <div className="rounded-xl bg-muted/40 p-3">
                                        <p className="font-semibold">Early Bird</p>
                                        <p className="text-muted-foreground mt-1">{report.badgeSummary.earlyBird ? "Earned" : "Not earned yet"}</p>
                                    </div>
                                    <div className="rounded-xl bg-muted/40 p-3">
                                        <p className="font-semibold">Night Owl</p>
                                        <p className="text-muted-foreground mt-1">{report.badgeSummary.nightOwl ? "Earned" : "Not earned yet"}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </NishthaLayout>
    );
}
