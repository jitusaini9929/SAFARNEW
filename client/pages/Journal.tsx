import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { User } from "@shared/api";

import {
  Smile,
  Bold,
  Italic,
  List,
  Image as ImageIcon,
  Check,
  Sun,
  ArrowRight,
  History,
  CheckCircle,
  X,
  Trash2
} from "lucide-react";

export default function Journal() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  // Active formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isList, setIsList] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPromptAnswer, setShowPromptAnswer] = useState(false);
  const [promptAnswer, setPromptAnswer] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Daily inspiration questions - rotate by day of week
  const dailyQuestions = [
    "What is one thing you are grateful for right now?",
    "What is the one thing in your life that you wouldn't change right now?",
    "What felt heavy today and what felt right?",
    "What part of you deserves more kindness right now?",
    "What is one thing you are proud of, even if it's tiny?",
    "What did you avoid today and why?",
    "What made today feel even slightly better than yesterday?"
  ];

  // Get today's question based on day of week (0=Sunday, 1=Monday, etc.)
  const getDailyQuestion = () => {
    const dayOfWeek = new Date().getDay();
    // Map: Sun=6, Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5
    const questionIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return dailyQuestions[questionIndex];
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Current month info for calendar
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentMonthName = today.toLocaleDateString('en-IN', { month: 'long' });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Helper to convert database UTC timestamp to IST date string
  const toISTDateStr = (timestamp: string) => {
    if (!timestamp) return '';
    const utcTimestamp = timestamp.replace(' ', 'T') + (timestamp.includes('Z') ? '' : 'Z');
    const date = new Date(utcTimestamp);
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate.toISOString().split('T')[0];
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

        // Fetch journal entries
        try {
          const entries = await dataService.getJournalEntries();
          setJournalEntries(entries || []);
        } catch (e) {
          console.error('Failed to fetch journal entries', e);
        }
      } catch (error) {
        navigate("/login");
      }
    };
    loadData();
  }, [navigate]);

  const checkFormattingState = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsList(document.queryCommandState('insertUnorderedList'));
  };

  const formatBold = () => {
    document.execCommand('bold', false);
    setIsBold(!isBold);
    editorRef.current?.focus();
  };

  const formatItalic = () => {
    document.execCommand('italic', false);
    setIsItalic(!isItalic);
    editorRef.current?.focus();
  };

  const formatBulletList = () => {
    document.execCommand('insertUnorderedList', false);
    setIsList(!isList);
    editorRef.current?.focus();
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = `<img src="${base64}" alt="Journal image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;" />`;
      document.execCommand('insertHTML', false, img);
      editorRef.current?.focus();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddEntry = async () => {
    const content = editorRef.current?.innerHTML || "";
    if (!content.trim() || content === '<br>') {
      toast.error("Please write something first");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullContent = title ? `<h2>${title}</h2>${content}` : content;
      await dataService.addJournalEntry(fullContent);
      setTitle("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      toast.success("Journal entry saved!");

      // Refresh entries
      const entries = await dataService.getJournalEntries();
      setJournalEntries(entries || []);
    } catch (error) {
      toast.error("Failed to save entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Unknown date';
    const utcTimestamp = timestamp.replace(' ', 'T') + (timestamp.includes('Z') ? '' : 'Z');
    const date = new Date(utcTimestamp);
    const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return istDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getPreview = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  };

  // Extract title from content - look for h2 tag first, then first line
  const getTitle = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;

    // First try to get h2 title (this is how we save entries)
    const h2 = div.querySelector('h2');
    if (h2 && h2.textContent) {
      const title = h2.textContent.trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }

    // Fallback to first line
    const text = div.textContent || div.innerText || '';
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length > 50) return firstLine.substring(0, 50) + '...';
    return firstLine || 'Untitled Entry';
  };

  // Get body content (everything except the h2 title)
  const getBody = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove h2 tag to get just the body
    const h2 = div.querySelector('h2');
    if (h2) h2.remove();

    const text = div.textContent || div.innerText || '';
    return text.trim();
  };

  // Calculate weekly entries count
  const getWeeklyCount = () => {
    const now = new Date();
    const todayIST = now.toLocaleDateString('en-CA');
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    const weekStartStr = startOfWeek.toLocaleDateString('en-CA');
    return journalEntries.filter((e: any) => {
      const entryDateStr = toISTDateStr(e.timestamp || e.createdAt || e.created_at);
      return entryDateStr >= weekStartStr && entryDateStr <= todayIST;
    }).length;
  };

  if (!user) return null;

  return (
    <MainLayout userName={user.name} userAvatar={user.avatar}>
      <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-background font-['Poppins'] text-foreground transition-colors duration-300">

        {/* Hidden file input for image upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Main Content Area */}
        <div className="flex h-full overflow-hidden">

          {/* Editor Section - Main Area */}
          <div className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">

              {/* Header */}
              <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2 tracking-tight font-['Outfit']">
                  {dateString}
                </h1>
                <p className="text-lg text-primary/70 font-medium">Evening Reflection</p>
              </div>

              {/* Editor Card */}
              <div className="bg-card rounded-3xl shadow-xl shadow-primary/5 border border-border overflow-hidden">

                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                      <Smile className="w-4 h-4" />
                      Feeling Calm
                    </button>
                    <div className="h-4 w-px bg-border"></div>
                    <div className="flex items-center gap-1">
                      <button onClick={formatBold} className={`p-1.5 rounded-lg transition-all ${isBold ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                        <Bold className="w-5 h-5" />
                      </button>
                      <button onClick={formatItalic} className={`p-1.5 rounded-lg transition-all ${isItalic ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                        <Italic className="w-5 h-5" />
                      </button>
                      <button onClick={formatBulletList} className={`p-1.5 rounded-lg transition-all ${isList ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                        <List className="w-5 h-5" />
                      </button>
                      <button onClick={insertImage} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Auto-saved
                  </div>
                </div>

                {/* Editor Area */}
                <div className="p-8 min-h-[750px]">
                  <input
                    className="w-full text-2xl md:text-3xl font-bold bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40 mb-6 outline-none font-['Outfit']"
                    placeholder="Title your entry..."
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div
                    ref={editorRef}
                    contentEditable
                    className="w-full min-h-[350px] bg-transparent border-none focus:ring-0 text-lg leading-relaxed text-foreground/80 placeholder:text-muted-foreground/40 resize-none outline-none"
                    data-placeholder="Start writing your thoughts here..."
                    onSelect={checkFormattingState}
                    onKeyUp={checkFormattingState}
                  ></div>
                </div>

                {/* Save Button */}
                <div className="px-8 py-6 flex justify-end border-t border-border">
                  <button
                    onClick={handleAddEntry}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isSubmitting ? "Saving..." : "Save Entry"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="w-[700px] flex-shrink-0 p-6 border-l border-border bg-muted/20 overflow-y-auto hidden xl:block">

            {/* Daily Inspiration */}
            <div className="bg-card p-8 rounded-3xl shadow-sm border border-border relative overflow-hidden group mb-8">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center gap-3 mb-6 text-primary">
                <Sun className="w-6 h-6" />
                <span className="text-base font-bold uppercase tracking-wider">Daily Inspiration</span>
              </div>
              <p className="text-2xl font-serif italic text-foreground mb-6 leading-snug">
                "{getDailyQuestion()}"
              </p>

              {!showPromptAnswer ? (
                <button
                  onClick={() => setShowPromptAnswer(true)}
                  className="flex items-center gap-2 text-primary text-lg font-bold hover:gap-3 transition-all"
                >
                  Answer this prompt <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={promptAnswer}
                    onChange={(e) => setPromptAnswer(e.target.value)}
                    placeholder="Write your thoughts here..."
                    className="w-full h-24 p-3 text-sm bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (promptAnswer.trim()) {
                          try {
                            const questionContent = `<h3>${getDailyQuestion()}</h3><p>${promptAnswer}</p>`;
                            await dataService.addJournalEntry(questionContent);
                            toast.success("Prompt answer saved!");
                            setPromptAnswer("");
                            setShowPromptAnswer(false);
                            const entries = await dataService.getJournalEntries();
                            setJournalEntries(entries || []);
                          } catch (e) {
                            toast.error("Failed to save");
                          }
                        }
                      }}
                      className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                    >
                      Save Answer
                    </button>
                    <button
                      onClick={() => {
                        setShowPromptAnswer(false);
                        setPromptAnswer("");
                      }}
                      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* History / Journal Entries */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <History className="w-7 h-7 text-primary" />
                  <h3 className="font-bold text-foreground text-xl">History</h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-sm font-bold text-primary uppercase tracking-wider hover:underline"
                >View all</button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {journalEntries.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-card border border-border text-center text-muted-foreground text-lg">
                    No entries yet
                  </div>
                ) : (
                  journalEntries.slice(0, 10).map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all group"
                    >
                      <p className="text-sm font-bold text-primary mb-2">
                        {formatDate(entry.timestamp || entry.createdAt || entry.created_at)}
                      </p>
                      <p className="text-base text-foreground font-medium truncate">
                        {getTitle(entry.content)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* This Week */}
            <div className="bg-card p-8 rounded-3xl border border-border mb-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-bold text-foreground">This Week</h4>
                <span className="text-sm font-bold text-rose-500">{getWeeklyCount()}/7 entries</span>
              </div>
              <div className="flex justify-between items-end h-20 gap-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                  const now = new Date();
                  const todayStr = now.toLocaleDateString('en-CA');
                  const dayOfWeek = now.getDay();
                  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - daysFromMonday);
                  const targetDay = new Date(monday);
                  targetDay.setDate(monday.getDate() + i);
                  const targetDayStr = targetDay.toLocaleDateString('en-CA');
                  const hasEntry = journalEntries.some((e: any) => toISTDateStr(e.timestamp || e.createdAt || e.created_at) === targetDayStr);
                  const isToday = targetDayStr === todayStr;
                  return (
                    <div key={i} className={`w-full rounded-t-lg transition-all ${hasEntry ? 'bg-primary h-[90%]' : 'bg-muted h-[40%]'} ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}></div>
                  );
                })}
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-card p-8 rounded-3xl border border-border">
              <h4 className="text-lg font-bold text-foreground mb-6">{currentMonthName}</h4>
              <div className="grid grid-cols-7 gap-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                  <div key={idx} className={`text-sm font-bold p-2 ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{d}</div>
                ))}
                {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`empty-${i}`} className="p-2"></div>)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const hasEntry = journalEntries.some((e: any) => toISTDateStr(e.timestamp || e.createdAt || e.created_at) === dateStr);
                  const now = new Date();
                  const isToday = dayNum === now.getDate();
                  const isFuture = dayNum > now.getDate();
                  return (
                    <div key={i} className={`p-2 text-base ${isFuture ? 'text-muted-foreground/40' : 'text-foreground'} ${hasEntry ? 'font-bold' : ''}`}>
                      {isToday ? (
                        <span className="w-8 h-8 mx-auto bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                          {dayNum}
                        </span>
                      ) : dayNum}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col m-4">

            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground font-['Outfit']">All Journal Entries</h2>
                <span className="text-sm text-muted-foreground">({journalEntries.length} entries)</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {journalEntries.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No journal entries yet</p>
                  <p className="text-sm">Start writing to see your entries here</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {journalEntries.map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="p-5 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-base font-bold text-foreground mb-1">
                            {getTitle(entry.content)}
                          </h4>
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">
                            {formatDate(entry.timestamp || entry.createdAt || entry.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this entry?')) {
                              try {
                                await dataService.deleteJournalEntry(entry.id);
                                const entries = await dataService.getJournalEntries();
                                setJournalEntries(entries || []);
                                toast.success('Entry deleted');
                              } catch (err) {
                                toast.error('Failed to delete');
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {(() => {
                        const body = getBody(entry.content);
                        const entryId = entry.id || idx.toString();
                        const isExpanded = expandedEntries.has(entryId);
                        const isLong = body.length > 100;

                        if (!body) {
                          return <span className="text-sm text-muted-foreground italic">No content</span>;
                        }

                        return (
                          <div className="text-sm text-foreground/80 leading-relaxed">
                            {isExpanded || !isLong ? (
                              <>
                                <p>{body}</p>
                                {isLong && (
                                  <button
                                    onClick={() => {
                                      const newSet = new Set(expandedEntries);
                                      newSet.delete(entryId);
                                      setExpandedEntries(newSet);
                                    }}
                                    className="text-primary text-xs font-bold mt-2 hover:underline"
                                  >
                                    Show less
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <p>{body.substring(0, 100)}
                                  <button
                                    onClick={() => {
                                      const newSet = new Set(expandedEntries);
                                      newSet.add(entryId);
                                      setExpandedEntries(newSet);
                                    }}
                                    className="text-primary font-bold hover:underline ml-1"
                                  >
                                    ...</button>
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-border flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
