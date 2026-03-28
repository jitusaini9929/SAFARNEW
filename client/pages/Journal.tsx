import { useEffect, useState, useRef, useMemo } from "react";
import NishthaLayout from "@/components/NishthaLayout";
import { useAuth } from "@/contexts/AuthContext";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { User } from "@shared/api";
import { TourPrompt } from "@/components/guided-tour";
import { journalTour } from "@/components/guided-tour/tourSteps";
import { useTranslation } from "react-i18next";
import { 
  getISTDateKey, 
  formatISTDate, 
  formatDateLabel 
} from "@/utils/dateUtils";

import {
  Smile,
  Bold,
  Italic,
  List,
  Check,
  Sun,
  ArrowRight,
  History,
  CheckCircle,
  X,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Quote,
  Sparkles
} from "lucide-react";

// ─── TYPES & CONSTANTS ───────────────────────────────────────
const PROMPT_KEYS = [
  "p1",
  "p2",
  "p3",
  "p4",
  "p5",
  "p6",
  "p7",
];

const MOOD_OPTIONS = [
  { value: "calm", emoji: "😌" },
  { value: "happy", emoji: "😊" },
  { value: "grateful", emoji: "🙏" },
  { value: "motivated", emoji: "💪" },
  { value: "peaceful", emoji: "☮️" },
  { value: "sad", emoji: "😢" },
  { value: "anxious", emoji: "😰" },
  { value: "angry", emoji: "😠" },
  { value: "tired", emoji: "😴" },
  { value: "confused", emoji: "😕" },
  { value: "hopeful", emoji: "🌟" },
  { value: "neutral", emoji: "😐" }
];

// ─── HELPERS ─────────────────────────────────────────────────
const getEntryTitle = (html: string, fallback: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  const h = div.querySelector('h2') || div.querySelector('h3');
  if (h?.textContent) return h.textContent.trim().slice(0, 50) + (h.textContent.length > 50 ? '...' : '');
  const text = div.textContent || '';
  return text.split('\n')[0].trim().slice(0, 50) || fallback;
};

const getEntryBody = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelector('h2')?.remove();
  div.querySelector('h3')?.remove();
  div.querySelector('.mood-tag')?.remove();
  return (div.textContent || '').trim();
};

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function Journal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isList, setIsList] = useState(false);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPromptAnswer, setShowPromptAnswer] = useState(false);
  const [promptAnswer, setPromptAnswer] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedMood, setSelectedMood] = useState("calm");
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const dailyPrompts = useMemo(() => PROMPT_KEYS.map((key) => t(`journal.prompts.${key}`)), [t]);

  const todayKey = getISTDateKey(new Date());
  const dateDisplay = formatISTDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    if (!user?.id) return;
    fetchEntries();
  }, [user?.id]);

  const fetchEntries = async () => {
    try {
      const entries = await dataService.getJournalEntries();
      setJournalEntries(entries || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Modernized editor commands
  const exec = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    checkFormatting();
  };

  const checkFormatting = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsList(document.queryCommandState('insertUnorderedList'));
  };

  const handleAddEntry = async () => {
    const content = editorRef.current?.innerHTML || "";
    const bodyText = editorRef.current?.textContent?.trim() || "";

    if (!title.trim()) return toast.error(t('journal.title_error'));
    if (!bodyText) return toast.error(t('journal.body_error'));

    setIsSubmitting(true);
    try {
      const moodLabel = t(`journal.moods.${selectedMood}`);
      const fullContent = `<h2>${title}</h2><p class="mood-tag">${t('journal.feeling')}: ${moodLabel}</p>${content}`;
      await dataService.addJournalEntry(fullContent);
      setTitle("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      toast.success(t('journal.save_success'));
      fetchEntries();
    } catch (error) {
      toast.error(t('journal.save_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const weeklyCount = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (start.getDay() || 7) + 1); // Monday
    const startStr = getISTDateKey(start);
    return journalEntries.filter(e => getISTDateKey(new Date(e.timestamp || e.createdAt)) >= startStr).length;
  }, [journalEntries]);

  if (!user) return null;

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500/20">
        
        {/* Glow Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row max-w-[1600px] mx-auto">
          
          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-12 space-y-10">
            <header className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">{dateDisplay}</h1>
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest pl-1">
                <Sparkles size={14} />
                {t('journal.reflection_mode')}
              </div>
            </header>

            {/* Editor Card */}
            <div data-tour="journal-editor" className="bg-card border rounded-[32px] shadow-2xl shadow-emerald-500/5 overflow-hidden group transition-all hover:shadow-emerald-500/10 animate-in fade-in zoom-in-95 duration-500">
              
              {/* Toolbar */}
              <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between gap-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowMoodDropdown(!showMoodDropdown)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background border hover:border-emerald-500/50 transition-all text-sm font-bold shadow-sm"
                    >
                      <span className="text-lg">{MOOD_OPTIONS.find(m => m.value === selectedMood)?.emoji}</span>
                      <span className="hidden md:inline">{t(`journal.moods.${selectedMood}`)}</span>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${showMoodDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showMoodDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-card border rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {MOOD_OPTIONS.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => { setSelectedMood(m.value); setShowMoodDropdown(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-muted transition-colors"
                          >
                            <span className="text-base">{m.emoji}</span>
                            <span className={selectedMood === m.value ? "font-bold text-emerald-500" : "font-medium"}>{t(`journal.moods.${m.value}`)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-6 w-px bg-border mx-1" />

                  <div className="flex items-center gap-1">
                    {[
                      { icon: Bold, cmd: 'bold', active: isBold },
                      { icon: Italic, cmd: 'italic', active: isItalic },
                      { icon: List, cmd: 'insertUnorderedList', active: isList }
                    ].map((btn) => (
                      <button
                        key={btn.cmd}
                        onClick={() => exec(btn.cmd)}
                        className={`p-2.5 rounded-xl transition-all ${btn.active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'hover:bg-muted'}`}
                      >
                        <btn.icon size={18} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor Area */}
              <div className="p-8 lg:p-16 space-y-8 min-h-[500px]">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">{t('journal.title_label')}</label>
                  <input
                    className="w-full text-3xl md:text-4xl font-black bg-transparent border-none focus:ring-0 placeholder:text-muted-foreground/30 outline-none"
                    placeholder={t('journal.title_placeholder')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1">{t('journal.body_label')}</label>
                   <div
                    ref={editorRef}
                    contentEditable
                    className="w-full min-h-[350px] bg-transparent border-none focus:ring-0 text-xl leading-relaxed outline-none prose prose-slate dark:prose-invert max-w-none"
                    onSelect={checkFormatting}
                    onKeyUp={checkFormatting}
                    data-placeholder={t('journal.body_placeholder')}
                  />
                </div>
              </div>

              <div className="p-6 border-t bg-muted/10 backdrop-blur-md flex justify-end">
                <button
                  onClick={handleAddEntry}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle size={20} strokeWidth={3} />
                  {isSubmitting ? t('journal.saving') : t('journal.save_entry')}
                </button>
              </div>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="w-full lg:w-[450px] p-6 lg:p-12 lg:border-l space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            
            {/* Daily Inspiration */}
            <div data-tour="daily-inspiration" className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[32px] p-8 text-white shadow-2xl shadow-violet-500/20 relative overflow-hidden group">
              <Quote className="absolute -top-4 -left-4 w-32 h-32 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                    <Sun size={14} /> {t('journal.daily_inspiration')}
                  </div>
                  <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full">{currentPromptIndex + 1} / 7</span>
                </div>

                <div className="py-2">
                  <p className="text-2xl font-bold leading-tight italic">"{dailyPrompts[currentPromptIndex]}"</p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentPromptIndex(p => (p - 1 + 7) % 7)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"><ChevronLeft size={18} /></button>
                    <button onClick={() => setCurrentPromptIndex(p => (p + 1) % 7)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"><ChevronRight size={18} /></button>
                  </div>
                  <button 
                    onClick={() => setShowPromptAnswer(true)}
                    className="flex-1 bg-white text-violet-600 font-bold py-3 rounded-xl hover:bg-violet-50 transition-all active:scale-95 text-sm"
                  >
                    {t('journal.answer_prompt')}
                  </button>
                </div>
              </div>

              {showPromptAnswer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="w-full max-w-lg bg-card border rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold flex items-center gap-3 text-violet-500"><Quote size={24} /> {t('journal.reflection')}</h3>
                      <p className="font-bold leading-relaxed">{dailyPrompts[currentPromptIndex]}</p>
                      <textarea 
                        className="w-full h-40 bg-muted/50 border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none font-medium"
                        placeholder={t('journal.write_your_heart_out')}
                        value={promptAnswer}
                        onChange={e => setPromptAnswer(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-4">
                        <button onClick={() => setShowPromptAnswer(false)} className="flex-1 py-4 rounded-2xl font-bold hover:bg-muted transition-all">{t('journal.cancel')}</button>
                        <button 
                          onClick={async () => {
                            if (!promptAnswer.trim()) return;
                            await dataService.addJournalEntry(`<h3>${dailyPrompts[currentPromptIndex]}</h3><p>${promptAnswer}</p>`);
                            toast.success(t('journal.saved_to_journal'));
                            setPromptAnswer(""); setShowPromptAnswer(false); fetchEntries();
                          }}
                          className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 hover:bg-violet-500 transition-all active:scale-95"
                        >
                          {t('journal.save_reflection')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Section */}
            <div className="bg-card border rounded-[32px] p-8 space-y-6 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{t('journal.this_week')}</h3>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase">{t('journal.weekly_done', { count: weeklyCount })}</div>
              </div>
              
              <div className="flex justify-between items-end gap-1 px-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                  const now = new Date();
                  const start = new Date(); start.setDate(now.getDate() - now.getDay());
                  const target = new Date(start); target.setDate(start.getDate() + i);
                  const key = getISTDateKey(target);
                  const hasEntry = journalEntries.some(e => getISTDateKey(new Date(e.timestamp || e.createdAt)) === key);
                  const isToday = key === todayKey;
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 group cursor-default">
                      <div className={`w-3 rounded-full transition-all duration-500 ${hasEntry ? 'bg-emerald-500 h-12 shadow-lg shadow-emerald-500/20' : 'bg-muted h-6'} ${isToday && !hasEntry ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-card' : ''}`} />
                      <span className={`text-[10px] font-bold ${hasEntry ? 'text-emerald-500' : 'text-muted-foreground'}`}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History Feed */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="flex items-center gap-2 font-bold"><History size={18} className="text-muted-foreground" /> {t('journal.history')}</h3>
                <button onClick={() => setShowHistoryModal(true)} className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-colors">{t('journal.view_all')}</button>
              </div>

              <div className="space-y-3">
                {journalEntries.slice(0, 4).map((e) => (
                  <div key={e.id} className="p-4 bg-muted/30 border border-transparent hover:border-emerald-500/30 hover:bg-muted/50 rounded-2xl transition-all group cursor-pointer">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">{formatDateLabel(e.timestamp || e.createdAt)}</p>
                        <h4 className="text-sm font-bold truncate leading-snug">{getEntryTitle(e.content, t('journal.untitled_entry'))}</h4>
                      </div>
                      <ArrowRight size={14} className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-5xl h-[85vh] bg-card border rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <header className="p-8 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20"><History className="text-white" /></div>
                  <div>
                    <h2 className="text-2xl font-black">{t('journal.all_entries')}</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('journal.stories_collected', { count: journalEntries.length })}</p>
                  </div>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-3 rounded-full hover:bg-muted transition-colors"><X /></button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-muted/5">
                {journalEntries.map((e) => {
                  const body = getEntryBody(e.content);
                  const isLong = body.length > 150;
                  const isExpanded = expandedEntries.has(e.id);
                  
                  return (
                    <div key={e.id} className="p-6 bg-card border rounded-3xl shadow-sm hover:shadow-xl transition-all flex flex-col group h-fit">
                      <div className="flex justify-between mb-4">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">{formatDateLabel(e.timestamp || e.createdAt)}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={async () => {
                              if (!confirm(t('journal.delete_confirm'))) return;
                              await dataService.deleteJournalEntry(e.id);
                              toast.success(t('journal.entry_deleted')); fetchEntries();
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-black mb-3 leading-tight">{getEntryTitle(e.content, t('journal.untitled_entry'))}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isExpanded || !isLong ? body : `${body.slice(0, 150)}...`}
                      </p>
                      {isLong && (
                        <button 
                          onClick={() => {
                            const n = new Set(expandedEntries);
                            isExpanded ? n.delete(e.id) : n.add(e.id);
                            setExpandedEntries(n);
                          }}
                          className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:underline inline-flex items-center gap-1"
                        >
                          {isExpanded ? t('journal.collapse') : t('journal.read_full_story')} <ChevronRight size={10} className={isExpanded ? '-rotate-90' : ''} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <footer className="p-6 border-t bg-card flex justify-center">
                  <button onClick={() => setShowHistoryModal(false)} className="px-12 py-3 bg-muted font-bold rounded-2xl hover:bg-muted/80 transition-all">{t('journal.close_archive')}</button>
              </footer>
           </div>
        </div>
      )}

          <TourPrompt tour={journalTour} featureName={t('journal.feature_name')} />
    </NishthaLayout>
  );
}
