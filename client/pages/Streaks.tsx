import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { TourPrompt } from "@/components/guided-tour";
import { streaksTour } from "@/components/guided-tour/tourSteps";
import {
  Flame,
  Heart,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckCircle2,
  Check
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  getISTDateKey, 
  formatISTDate, 
  dateKeyToUtcDate
} from "@/utils/dateUtils";

export default function Streaks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<any>(null);
  const [goalsData, setGoalsData] = useState<any[]>([]);
  const [moodsData, setMoodsData] = useState<any[]>([]);
  const [journalData, setJournalData] = useState<any[]>([]);
  const [loginData, setLoginData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const todayKey = getISTDateKey(new Date());

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const [streaks, goals, moods, journal, logins] = await Promise.all([
          dataService.getStreaks().catch(() => ({})),
          dataService.getGoals().catch(() => []),
          dataService.getMoods().catch(() => []),
          dataService.getJournalEntries().catch(() => []),
          authService.getLoginHistory().catch(() => [])
        ]);

        setStreakData(streaks);
        setGoalsData(goals);
        setMoodsData(moods);
        setJournalData(journal);
        setLoginData(logins);
      } catch (error) {
        console.error("Failed to load streak data:", error);
      }
    };
    fetchData();
  }, [user?.id, todayKey]);

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startWeekday = startOfMonth.getDay();
    const totalDays = endOfMonth.getDate();
    
    const days = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
      const key = getISTDateKey(date);
      const hasActivity = [goalsData, moodsData, journalData, loginData].some(arr => 
        arr.some((item: any) => getISTDateKey(new Date(item.timestamp || item.createdAt || item.created_at)) === key)
      );
      days.push({ day: d, key, hasActivity, isToday: key === todayKey, isFuture: key > todayKey });
    }
    // Fill remaining to complete 6 weeks (42 cells) to match the check-in matrix design
    while (days.length < 42) days.push(null);
    return days;
  }, [currentDate, goalsData, moodsData, journalData, loginData, todayKey]);

  if (!user) return null;

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 bg-background p-6 md:p-10 animate-in fade-in duration-700 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <header className="space-y-1">
            <h1 className="text-4xl font-black flex items-center gap-3 tracking-tight">
              <div className="p-2.5 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                <Flame className="text-white w-6 h-6 animate-pulse" />
              </div>
              {t('streaks.title')}
            </h1>
            <p className="text-muted-foreground font-medium pl-1">{t('streaks.subtitle')}</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Streak Cards */}
            <div data-tour="streak-cards" className="p-8 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[32px] relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xl shadow-emerald-500/5">
              <Heart className="absolute -top-6 -right-6 w-32 h-32 text-emerald-500 opacity-10 group-hover:scale-110 transition-transform duration-500 rotate-12" />
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 w-fit px-3 py-1 rounded-full border border-emerald-500/20">
                   <Zap size={14} /> {t('streaks.checkin_streak')}
                 </div>
                 <div>
                   <span className="text-6xl font-black tracking-tighter">{streakData?.checkInStreak || 0}</span>
                   <span className="text-xl font-bold text-muted-foreground ml-2">{t('streaks.days')}</span>
                 </div>
                 <button onClick={() => navigate('/nishtha/check-in')} className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all text-sm">
                   {t('streaks.start_today')} <ArrowRight size={16} />
                 </button>
              </div>
            </div>

            <div className="p-8 bg-orange-500/10 border-2 border-orange-500/20 rounded-[32px] relative overflow-hidden group hover:border-orange-500/40 transition-all shadow-xl shadow-orange-500/5">
              <Flame className="absolute -bottom-6 -right-6 w-32 h-32 text-orange-500 opacity-10 group-hover:scale-110 transition-transform duration-500 -rotate-12" />
              <div className="relative z-10 space-y-6">
                 <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest bg-orange-500/10 w-fit px-3 py-1 rounded-full border border-orange-500/20">
                   <Zap size={14} /> {t('streaks.login_streak')}
                 </div>
                 <div>
                   <span className="text-6xl font-black tracking-tighter">{streakData?.loginStreak || 0}</span>
                   <span className="text-xl font-bold text-muted-foreground ml-2">{t('streaks.days')}</span>
                 </div>
                 <p className="text-orange-600/80 font-bold text-sm bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/10 w-fit">✨ {t('streaks.amazing')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Redesigned Full Width Calendar */}
            <div data-tour="activity-calendar" className="bg-card border-2 rounded-[40px] p-10 shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between mb-12 relative z-10">
                <button 
                  onClick={() => setCurrentDate(new Date())} 
                  className="p-1 px-4 hover:bg-muted border rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <ChevronLeft size={16} className="-ml-1" /> Today
                </button>
                
                <div className="flex items-center gap-8">
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() - 1);
                    setCurrentDate(d);
                  }} className="p-2 hover:bg-muted rounded-xl transition-all shadow-sm"><ChevronLeft size={20}/></button>
                  <h3 className="text-2xl font-black text-emerald-500 tracking-tight uppercase">{formatISTDate(currentDate, { month: 'short', year: 'numeric' })}</h3>
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setMonth(d.getMonth() + 1);
                    setCurrentDate(d);
                  }} className="p-2 hover:bg-muted rounded-xl transition-all shadow-sm"><ChevronRight size={20}/></button>
                </div>

                <div className="bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-xl text-xs font-black tracking-widest border border-emerald-500/20">{currentDate.getFullYear()}</div>
              </div>

              <div className="grid grid-cols-7 gap-y-4 max-w-5xl mx-auto">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`weekday-${i}`} className="text-[12px] font-black text-muted-foreground uppercase tracking-widest text-center mb-6">{d}</div>
                ))}
                {calendarDays.map((d, i) => (
                  <div key={i} className="flex justify-center p-0.5">
                    {(!d || (d && d.isFuture)) ? (
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted/30 flex items-center justify-center opacity-40">
                         <div className="w-6 h-6 rounded-full border-2 border-muted/50" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center transition-all duration-500 relative cursor-pointer
                        ${d.hasActivity 
                          ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/10' 
                          : 'bg-muted/20 border-2 border-muted/30 text-muted-foreground/30 hover:border-muted'}`}>
                        <span className={`text-xs font-black ${d.hasActivity ? 'order-1' : ''}`}>{d.day}</span>
                        {d.hasActivity && (
                          <div className="absolute -bottom-1 -right-1 bg-white text-emerald-500 rounded-full p-0.5 shadow-md border border-emerald-500/50">
                            <Check size={10} strokeWidth={5} />
                          </div>
                        )}
                        {!d.hasActivity && <div className="w-1 h-1 rounded-full bg-current mt-0.5 opacity-40" />}
                        {d.isToday && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary border-2 border-card rounded-full" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <TourPrompt tour={streaksTour} featureName="Streaks" />
    </NishthaLayout>
  );
}
