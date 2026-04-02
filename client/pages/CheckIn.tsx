import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useGuidedTour } from "@/contexts/GuidedTourContext";
import { useAuth } from "@/contexts/AuthContext";
import { checkInTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle,
  CheckCircle,
  Edit3,
  ArrowRight,
  Zap,
  Heart,
  History as LucideHistory,
  Clock,
  ChevronRight
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { 
  getISTDateKey, 
  formatISTDate, 
  formatDateLabel 
} from "@/utils/dateUtils";

type MoodType = "peaceful" | "happy" | "okay" | "motivated" | "anxious" | "low" | "frustrated" | "overwhelmed" | "numb";

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  subLabel: string;
  gradient: string;
  color: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: "peaceful", emoji: "😌", label: "Peaceful", subLabel: "Calm & Content", gradient: "from-teal-500/20 to-emerald-500/20", color: "text-emerald-500" },
  { type: "happy", emoji: "😃", label: "Happy", subLabel: "Great & Positive", gradient: "from-yellow-500/20 to-orange-500/20", color: "text-amber-500" },
  { type: "okay", emoji: "😐", label: "Okay", subLabel: "Neutral & Balanced", gradient: "from-slate-500/20 to-gray-500/20", color: "text-slate-500" },
  { type: "motivated", emoji: "🌱", label: "Motivated", subLabel: "Inspired & Driven", gradient: "from-green-500/20 to-lime-500/20", color: "text-lime-500" },
  { type: "anxious", emoji: "😟", label: "Anxious", subLabel: "Worried", gradient: "from-rose-500/20 to-orange-500/20", color: "text-orange-500" },
  { type: "low", emoji: "😔", label: "Low", subLabel: "Down or Discouraged", gradient: "from-blue-500/20 to-indigo-500/20", color: "text-blue-500" },
  { type: "frustrated", emoji: "😠", label: "Frustrated", subLabel: "Irritated", gradient: "from-red-500/20 to-orange-600/20", color: "text-red-500" },
  { type: "overwhelmed", emoji: "😵", label: "Overwhelmed", subLabel: "Stressed", gradient: "from-purple-500/20 to-pink-500/20", color: "text-purple-500" },
  { type: "numb", emoji: "😶", label: "Numb", subLabel: "Disconnected", gradient: "from-gray-500/20 to-slate-600/20", color: "text-zinc-500" },
];

const QUICK_TAGS = ["work", "family", "sleep", "health", "relationship", "finance", "study"];

export default function CheckIn() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { startTour } = useGuidedTour();
  const { user, status } = useAuth();

  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (!user) {
      navigate("/login");
      return;
    }
    fetchMoods();
  }, [navigate, status, user]);

  const fetchMoods = async () => {
    try {
      const moods = await dataService.getMoods();
      setMoodHistory(moods || []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (!selectedMood) return toast.error(t('checkin.select_mood_error'));
    setIsSubmitting(true);
    try {
      const finalNote = note + (selectedTags.length > 0 ? `\n\nTags: ${selectedTags.join(", ")}` : "");
      const newMood = await dataService.addMood(selectedMood, intensity, finalNote);
      toast.success(t('checkin.save_success'));
      setMoodHistory(prev => [newMood, ...prev]);
      setSelectedMood(null); setIntensity(3); setNote(""); setSelectedTags([]);
    } catch (error) {
      toast.error(t('checkin.save_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 min-h-screen bg-background p-4 sm:p-6 md:p-10 animate-in fade-in duration-700 font-sans">
        
        {/* Glow Backgrounds */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto space-y-10 relative z-10">
          
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 md:gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">{t('checkin.title')}</h1>
              <p className="text-muted-foreground font-medium pl-1">{t('checkin.subtitle')}</p>
            </div>
            <button
              onClick={() => startTour(checkInTour)}
              className="px-6 py-3 bg-muted/50 hover:bg-muted border rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm"
            >
              <HelpCircle size={18} /> {t('checkin.start_tour')}
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Mood Grid */}
            <div className="lg:col-span-8 bg-card border-2 rounded-[28px] md:rounded-[40px] p-5 sm:p-8 lg:p-10 shadow-sm space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" /> {t('checkin.current_state')}
                </h3>
                <span className="text-[10px] font-black uppercase bg-muted px-4 py-1.5 rounded-full text-muted-foreground tracking-widest">{t('checkin.select_one')}</span>
              </div>

              <div data-tour="mood-selection" className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m.type}
                    onClick={() => setSelectedMood(m.type)}
                    className={`relative p-6 rounded-[28px] border-2 transition-all duration-300 group flex flex-col items-center gap-3
                      ${selectedMood === m.type 
                        ? `bg-gradient-to-br ${m.gradient} border-primary/30 shadow-2xl shadow-primary/10 scale-[1.02]` 
                        : 'bg-muted/20 border-transparent hover:bg-muted/40 hover:border-muted'}`}
                  >
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-md">{m.emoji}</span>
                    <div className="text-center">
                      <p className={`font-black tracking-tight ${selectedMood === m.type ? 'text-foreground' : 'text-muted-foreground'}`}>{t(`moods.${m.type}`)}</p>
                      <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">{m.subLabel}</p>
                    </div>
                    {selectedMood === m.type && <div className="absolute top-4 right-4 text-primary animate-in zoom-in-50 duration-300"><CheckCircle size={20} fill="currentColor" className="text-white" stroke="hsl(var(--primary))" /></div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity & Energy */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card border-2 rounded-[40px] p-10 shadow-sm text-center space-y-8 relative overflow-hidden group min-h-[400px] flex flex-col">
                <div className={`absolute inset-0 bg-gradient-to-b opacity-10 transition-colors duration-700
                  ${intensity > 3 ? 'from-rose-500/20' : intensity > 2 ? 'from-amber-500/20' : 'from-primary/20'} to-transparent`} />
                
                <div className="relative z-10 space-y-2">
                  <h3 className="font-black flex items-center justify-center gap-2 text-muted-foreground uppercase text-[10px] tracking-[0.2em]"><Zap size={14} className="text-amber-500" /> {t('checkin.intensity')}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-7xl font-black tracking-tighter ${intensity > 3 ? 'text-rose-500' : intensity > 2 ? 'text-amber-500' : 'text-primary'}`}>{intensity}</span>
                    <span className="text-xl font-bold text-muted-foreground/40">/5</span>
                  </div>
                </div>

                <div data-tour="intensity-slider" className="flex-1 flex justify-center py-6 relative z-10">
                   <div className="h-48 group-hover:scale-y-110 transition-transform duration-500">
                    <Slider
                      defaultValue={[3]}
                      value={[intensity]}
                      onValueChange={(vals) => setIntensity(vals[0])}
                      max={5} min={1} step={1}
                      orientation="vertical"
                      className="h-full"
                    />
                   </div>
                </div>

                <div className="relative z-10 flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground px-4">
                  <span>{t('checkin.mild')}</span>
                  <span>{t('checkin.extreme')}</span>
                </div>
              </div>
            </div>

            {/* Note Area */}
            <div className="lg:col-span-12 bg-card border-2 rounded-[28px] md:rounded-[40px] p-5 sm:p-8 md:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 animate-in slide-in-from-bottom-8 duration-700 delay-100">
              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Edit3 size={18} className="text-primary" /> {t('checkin.why_feel')}
                  </h3>
                  <p className="text-sm font-medium text-muted-foreground">
                    {selectedMood ? t('checkin.why_feel_selected', { mood: t(`moods.${selectedMood}`).toLowerCase() }) : t('checkin.why_feel_hint')}
                  </p>
                </div>
                <textarea
                  className="w-full h-48 bg-muted/40 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-[28px] p-8 text-lg font-medium outline-none transition-all resize-none shadow-inner"
                  placeholder={selectedMood ? t('checkin.why_feel_selected_placeholder', { mood: t(`moods.${selectedMood}`).toLowerCase() }) : t('checkin.why_feel_hint_placeholder')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="lg:col-span-4 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"><Heart size={14} /> {t('checkin.context_tags')}</h4>
                   <div data-tour="quick-tags" className="flex flex-wrap gap-2.5">
                    {QUICK_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border-2
                          ${selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 animate-in zoom-in-95'
                            : 'bg-muted/50 border-transparent hover:bg-muted text-muted-foreground'}`}
                      >
                        {t(`tags.${tag}`)}
                      </button>
                    ))}
                   </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!selectedMood || isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-emerald-500/20 active:scale-[0.98] group"
                >
                  {isSubmitting ? t('checkin.saving') : t('checkin.complete')}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="lg:col-span-12 bg-card border-2 rounded-[28px] md:rounded-[40px] p-5 sm:p-8 md:p-10 shadow-sm animate-in slide-in-from-bottom-8 duration-700 delay-200">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl"><LucideHistory size={20} className="text-primary" /></div>
                    {t('checkin.mood_history')}
                  </h3>
                  <div className="px-5 py-2 bg-muted/50 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground">{moodHistory.length} Check-ins</div>
               </div>

               {moodHistory.length === 0 ? (
                 <div className="py-20 text-center space-y-4">
                    <Clock size={48} className="mx-auto text-muted-foreground/30 animate-pulse" />
                    <div className="space-y-1">
                      <p className="font-black text-xl">{t('checkin.no_history')}</p>
                      <p className="text-muted-foreground font-medium">{t('checkin.history_hint')}</p>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {moodHistory.slice(0, 9).map((m: any, idx: number) => (
                      <div key={m.id || idx} className="p-6 bg-muted/20 border-2 border-transparent hover:border-primary/10 rounded-3xl transition-all group flex gap-5 items-start">
                         <div className="text-4xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{MOOD_OPTIONS.find(o => o.type === m.mood)?.emoji || '😐'}</div>
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                               <p className="font-black capitalize">{m.mood}</p>
                               <span className="text-[10px] font-black text-primary px-2.5 py-1 bg-primary/10 rounded-lg">{m.intensity}/5</span>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{formatDateLabel(m.timestamp || m.createdAt)}</p>
                            {m.notes && <p className="text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed italic border-l-2 pl-3">{m.notes}</p>}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      <TourPrompt tour={checkInTour} featureName="Check-In" />
    </NishthaLayout>
  );
}
