import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { checkInTour } from "@/components/guided-tour/tourSteps";
import { TourPrompt } from "@/components/guided-tour";
import {
  ArrowRight,
  Zap,
  History as LucideHistory,
  Clock,
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
  gradient: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: "peaceful", emoji: "😌", gradient: "from-teal-500/20 to-emerald-500/20" },
  { type: "happy", emoji: "😃", gradient: "from-yellow-500/20 to-orange-500/20" },
  { type: "okay", emoji: "😐", gradient: "from-slate-500/20 to-gray-500/20" },
  { type: "motivated", emoji: "🌱", gradient: "from-green-500/20 to-lime-500/20" },
  { type: "anxious", emoji: "😟", gradient: "from-rose-500/20 to-orange-500/20" },
  { type: "low", emoji: "😔", gradient: "from-blue-500/20 to-indigo-500/20" },
  { type: "frustrated", emoji: "😠", gradient: "from-red-500/20 to-orange-600/20" },
  { type: "overwhelmed", emoji: "😵", gradient: "from-purple-500/20 to-pink-500/20" },
  { type: "numb", emoji: "😶", gradient: "from-gray-500/20 to-slate-600/20" },
];

const QUICK_TAGS = ["work", "family", "sleep", "health", "relationship", "finance", "study"];

function formatMoodNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.replace(/\bTags:\s*/gi, "Due to: ");
}

export default function CheckIn() {
  const { t } = useTranslation();
  const { user, status } = useAuth();

  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    fetchMoods();
  }, [status, user]);

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
      const finalNote = note + (selectedTags.length > 0 ? `\n\nDue to: ${selectedTags.join(", ")}` : "");
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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 animate-pulse"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/?signin=true" replace />;

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 min-h-screen bg-[#f8f7f9] dark:bg-background p-4 sm:p-6 md:px-10 md:py-10 font-sans">

        <div className="max-w-6xl mx-auto space-y-8">

          {/* Page Intro — centered like image */}
          <div className="text-center pt-2 pb-2 space-y-2">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {t('checkin.title')}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-base font-medium">
              {t('checkin.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

            {/* Mood Grid */}
            <div className="lg:col-span-8 bg-white dark:bg-card border border-gray-100 dark:border-border/70 rounded-3xl p-6 sm:p-8 shadow-sm space-y-7">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
                  {t('checkin.current_state')}
                </h2>
                <span className="text-[11px] font-bold uppercase text-gray-400 dark:text-slate-500 tracking-widest">{t('checkin.select_one')}</span>
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
                      <p className={`font-bold tracking-tight ${selectedMood === m.type ? 'text-foreground' : 'text-muted-foreground'}`}>{t(`moods.${m.type}`)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground/70 mt-0.5">{t(`mood_sub.${m.type}`)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity & Energy */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-card border border-gray-100 dark:border-border/70 rounded-3xl p-8 shadow-sm text-center space-y-6 relative overflow-hidden group flex flex-col">
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
            <div className="lg:col-span-12 bg-white dark:bg-card border border-gray-100 dark:border-border/70 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">{t('checkin.why_feel')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedMood ? t('checkin.why_feel_selected', { mood: t(`moods.${selectedMood}`).toLowerCase() }) : t('checkin.why_feel_hint')}
                  </p>
                </div>
                <textarea
                  className="w-full h-40 bg-muted/40 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-[28px] p-6 text-base font-medium outline-none transition-all resize-none shadow-inner"
                  placeholder={selectedMood ? t('checkin.why_feel_selected_placeholder', { mood: t(`moods.${selectedMood}`).toLowerCase() }) : t('checkin.why_feel_hint_placeholder')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="lg:col-span-4 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{t('checkin.due_to')}</h4>
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
                  className="w-full safar-btn-primary disabled:opacity-50 font-black py-6 rounded-[28px] flex items-center justify-center gap-3 active:scale-[0.98] group"
                >
                  {isSubmitting ? t('checkin.saving') : t('checkin.complete')}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="lg:col-span-12 bg-white dark:bg-card border border-gray-100 dark:border-border/70 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
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
                        {m.notes && <p className="text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed italic border-l-2 pl-3">{formatMoodNotes(m.notes)}</p>}
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
