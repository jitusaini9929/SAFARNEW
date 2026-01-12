import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import {
  CheckCircle,
  Moon,
  Edit3,
  ArrowRight,
  Sparkles,
  Zap,
  Heart,
  History,
  Clock
} from "lucide-react";

type MoodType = "peaceful" | "happy" | "okay" | "motivated" | "anxious" | "low" | "frustrated" | "overwhelmed" | "numb";

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  subLabel: string;
  gradient: string;
}

const moodOptions: MoodOption[] = [
  { type: "peaceful", emoji: "😌", label: "Peaceful", subLabel: "Calm & Content", gradient: "from-teal-500/20 to-emerald-500/20" },
  { type: "happy", emoji: "😃", label: "Happy", subLabel: "Great & Positive", gradient: "from-yellow-500/20 to-orange-500/20" },
  { type: "okay", emoji: "😐", label: "Okay", subLabel: "Neutral & Balanced", gradient: "from-slate-500/20 to-gray-500/20" },
  { type: "motivated", emoji: "🌱", label: "Motivated", subLabel: "Inspired & Driven", gradient: "from-green-500/20 to-lime-500/20" },
  { type: "anxious", emoji: "😟", label: "Anxious", subLabel: "Worried", gradient: "from-rose-500/20 to-orange-500/20" },
  { type: "low", emoji: "😔", label: "Low", subLabel: "Down or Discouraged", gradient: "from-blue-500/20 to-indigo-500/20" },
  { type: "frustrated", emoji: "😠", label: "Frustrated", subLabel: "Irritated", gradient: "from-red-500/20 to-orange-600/20" },
  { type: "overwhelmed", emoji: "😵", label: "Overwhelmed", subLabel: "Stressed", gradient: "from-purple-500/20 to-pink-500/20" },
  { type: "numb", emoji: "😶", label: "Numb", subLabel: "Disconnected", gradient: "from-gray-500/20 to-slate-600/20" },
];

const quickTags = ["Work", "Family", "Sleep", "Health", "Relationship", "Finance", "Study"];

export default function CheckIn() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);

  // Helper to get emoji for mood
  const getMoodEmoji = (mood: string) => {
    const option = moodOptions.find(o => o.type === mood);
    return option?.emoji || '😐';
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await authService.getCurrentUser();
        if (!data || !data.user) {
          navigate("/login");
          return;
        }
        setUser(data.user);

        // Fetch mood history
        try {
          const moods = await dataService.getMoods();
          setMoodHistory(moods || []);
        } catch (e) {
          console.error('Failed to fetch moods', e);
        }
      } catch (error) {
        navigate("/login");
      }
    };
    loadData();
  }, [navigate]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast.error("Please select a mood");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalNote = note + (selectedTags.length > 0 ? `\n\nTags: ${selectedTags.join(", ")}` : "");
      await dataService.addMood(selectedMood, intensity, finalNote);
      toast.success("Check-in saved successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <MainLayout userName={user.name} userAvatar={user.avatar}>
      <div className="flex-1 overflow-y-auto w-full h-full bg-background font-['Plus_Jakarta_Sans'] p-4 md:p-8 lg:p-10 relative selection:bg-primary/30 selection:text-primary transition-colors duration-300">

        {/* Deep Space Ambient Glows */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-primary/10 rounded-full blur-[100px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/10 rounded-full blur-[120px] animate-pulse-slower"></div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Inner Reflection</h2>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-pulse" />
            </div>
            <p className="text-muted-foreground font-light text-sm sm:text-base">Pause. Breathe. Connect with yourself.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer backdrop-blur-sm">
              <Moon className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 pb-8">

          {/* Mood Selector Card (Col Span 2) */}
          <div className="glass-high lg:col-span-2 rounded-[2rem] p-8 relative overflow-hidden group/card shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

            <div className="mb-8 flex items-center justify-between relative z-10">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  Current State <span className="text-sm px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Select One</span>
                </h3>
              </div>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full"></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 relative z-10">
              {moodOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedMood(option.type)}
                  className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${selectedMood === option.type
                    ? `bg-gradient-to-br ${option.gradient} border-primary/30 shadow-[0_0_30px_rgba(0,0,0,0.3)] transform scale-[1.02]`
                    : "bg-muted/50 border-transparent hover:bg-muted hover:border-border"
                    }`}
                >
                  {selectedMood === option.type && (
                    <div className="absolute top-3 right-3 text-primary animate-in zoom-in duration-300">
                      <CheckCircle className="w-5 h-5 fill-current" />
                    </div>
                  )}
                  <span className="text-4xl mb-3 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-transform group-hover:scale-110 duration-300">{option.emoji}</span>
                  <span className={`font-semibold text-sm transition-colors ${selectedMood === option.type ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{option.label}</span>
                  <span className={`text-[10px] text-center mt-1 uppercase tracking-wider font-medium transition-colors hidden xl:block ${selectedMood === option.type ? "text-foreground/60" : "text-muted-foreground group-hover:text-muted-foreground/80"}`}>{option.subLabel}</span>

                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-tr ${option.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none`}></div>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Slider Card */}
          <div className="glass-high rounded-[2rem] p-8 relative flex flex-col items-center justify-between overflow-hidden min-h-[400px] group/card shadow-2xl">
            {/* Dynamic Background Blob based on Intensity */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[80px] transition-all duration-700 opacity-40`}
              style={{
                backgroundColor: intensity > 3 ? '#ef4444' : intensity > 2 ? '#eab308' : 'hsl(var(--primary))',
                transform: `translate(-50%, -50%) scale(${0.8 + (intensity * 0.2)})`
              }}
            ></div>

            <div className="text-center z-10 w-full">
              <h3 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Intensity
              </h3>
              <p className="text-xs text-muted-foreground mb-6 uppercase tracking-wider font-semibold">Scale of Feeling</p>
              <div className="flex items-end justify-center gap-1 mb-2">
                <span className={`text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b ${intensity > 3 ? 'from-red-400 to-red-600' : intensity > 2 ? 'from-yellow-400 to-yellow-600' : 'from-primary to-primary/60'
                  }`}>
                  {intensity}
                </span>
                <span className="text-2xl font-medium text-muted-foreground mb-2">/5</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center w-full z-10 py-6">
              <div className="h-48 relative flex items-center justify-center w-24">
                <div className="absolute inset-y-0 w-1 bg-muted rounded-full"></div>
                <Slider
                  defaultValue={[3]}
                  value={[intensity]}
                  onValueChange={(vals) => setIntensity(vals[0])}
                  max={5}
                  min={1}
                  step={1}
                  orientation="vertical"
                  className="h-full [&>.relative>.absolute]:bg-gradient-to-t [&>.relative>.absolute]:from-primary [&>.relative>.absolute]:to-primary/60 [&_span]:border-none [&_span]:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                />
              </div>
            </div>

            <div className="w-full flex justify-between text-[10px] uppercase font-bold text-muted-foreground z-10 px-4 tracking-widest">
              <span>Mild</span>
              <span>Extreme</span>
            </div>
          </div>

          {/* Daily Note & Tags (Full Width Bottom) */}
          <div className="glass-high lg:col-span-3 rounded-[2rem] p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden group/card shadow-2xl">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50"></div>

            <div className="flex-1 z-10">
              <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                Why do you feel this way? <Edit3 className="text-primary w-4 h-4" />
              </h3>
              <p className="text-sm text-muted-foreground mb-6 font-light">
                {selectedMood
                  ? `What's making you feel ${selectedMood}? Share your thoughts below.`
                  : 'Select a mood above, then share what led to this feeling.'}
              </p>
              <div className="relative">
                <textarea
                  className="w-full h-40 bg-muted/50 border border-border rounded-2xl p-6 text-foreground placeholder-muted-foreground focus:bg-muted focus:border-primary/30 focus:ring-1 focus:ring-primary/30 resize-none transition-all outline-none leading-relaxed"
                  placeholder={selectedMood
                    ? `What happened that made you feel ${selectedMood}? What triggered this emotion?`
                    : "Start by selecting a mood above..."}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                ></textarea>
                <div className="absolute bottom-4 right-4 text-xs text-muted-foreground pointer-events-none">
                  {note.length} chars
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between md:w-80 border-l border-border md:pl-8 pt-8 md:pt-0 z-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-4 h-4 text-secondary" />
                  <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">Context Tags</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickTags.map(tag => (
                    <span
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border ${selectedTags.includes(tag)
                        ? "bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.1)]"
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground"
                        }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!selectedMood || isSubmitting}
                className="mt-8 md:mt-0 w-full py-4 bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 disabled:opacity-50 disabled:cursor-not-allowed text-secondary-foreground rounded-xl font-bold tracking-wide shadow-lg hover:shadow-secondary/20 transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 group/btn"
              >
                <span>{isSubmitting ? "Saving Entry..." : "Complete Check-In"}</span>
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Mood History Section */}
        <div className="glass-high rounded-[2rem] p-8 mt-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Mood History</h3>
            </div>
            <span className="text-sm text-muted-foreground">{moodHistory.length} check-ins</span>
          </div>

          {moodHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No mood check-ins yet</p>
              <p className="text-sm">Your check-in history will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {moodHistory.slice(0, 12).map((m: any, idx: number) => {
                const date = m.timestamp ? new Date(m.timestamp.replace(' ', 'T') + (m.timestamp.includes('Z') ? '' : 'Z')) : new Date();
                const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={m.id || idx}
                    className="p-5 rounded-2xl bg-muted/30 border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{getMoodEmoji(m.mood)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-foreground capitalize">{m.mood}</span>
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{m.intensity}/5</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{dateStr}</p>
                        {m.notes && (
                          <p className="text-sm text-foreground/70 line-clamp-2">{m.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
