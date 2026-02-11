import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NishthaLayout from "@/components/NishthaLayout";
import { authService } from "@/utils/authService";
import { dataService } from "@/utils/dataService";
import { toast } from "sonner";
import { User } from "@shared/api";
import { TourPrompt } from "@/components/guided-tour";
import { journalTour } from "@/components/guided-tour/tourSteps";

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
  ChevronRight
} from "lucide-react";

export default function Journal() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  // Active formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isList, setIsList] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPromptAnswer, setShowPromptAnswer] = useState(false);
  const [promptAnswer, setPromptAnswer] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedMood, setSelectedMood] = useState("Calm");
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Mood options
  const moodOptions = [
    { label: "Calm", emoji: "😌" },
    { label: "Happy", emoji: "😊" },
    { label: "Grateful", emoji: "🙏" },
    { label: "Motivated", emoji: "💪" },
    { label: "Peaceful", emoji: "☮️" },
    { label: "Sad", emoji: "😢" },
    { label: "Anxious", emoji: "😰" },
    { label: "Angry", emoji: "😠" },
    { label: "Tired", emoji: "😴" },
    { label: "Confused", emoji: "😕" },
    { label: "Hopeful", emoji: "🌟" },
    { label: "Neutral", emoji: "😐" }
  ];

  // Daily inspiration questions - 7 reflective prompts the user can navigate through
  const dailyQuestions = [
    "What is one thing you are grateful for right now?",
    "What is the one thing in your life that you wouldn't change right now?",
    "What felt heavy today and what felt right?",
    "What part of you deserves more kindness right now?",
    "What is one thing you are proud of, even if it's tiny?",
    "What did you avoid today and why?",
    "What made today feel even slightly better than yesterday?"
  ];

  // Get current question based on selected index
  const getDailyQuestion = () => dailyQuestions[currentPromptIndex];

  // Navigate to next/previous prompt
  const nextPrompt = () => setCurrentPromptIndex((prev) => (prev + 1) % dailyQuestions.length);
  const prevPrompt = () => setCurrentPromptIndex((prev) => (prev - 1 + dailyQuestions.length) % dailyQuestions.length);

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

  const handleAddEntry = async () => {
    const content = editorRef.current?.innerHTML || "";
    const bodyText = editorRef.current?.textContent?.trim() || "";

    // Validate both title and body
    if (!title.trim()) {
      toast.error("Please add a title for your entry");
      return;
    }

    if (!bodyText || bodyText === '') {
      toast.error("Please write your thoughts in the body section");
      return;
    }

    setIsSubmitting(true);
    try {
      // Include mood in the entry
      const fullContent = `<h2>${title}</h2><p class="mood-tag">Feeling: ${selectedMood}</p>${content}`;
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
  // Extract title from content - look for h2/h3 tag first, then first line
  const getTitle = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;

    // First try to get h2 or h3 title (h3 is used for prompt answers)
    const titleFromHeader = div.querySelector('h2') || div.querySelector('h3');
    if (titleFromHeader && titleFromHeader.textContent) {
      const title = titleFromHeader.textContent.trim();
      return title.length > 50 ? title.substring(0, 50) + '...' : title;
    }

    // Fallback to first line
    const text = div.textContent || div.innerText || '';
    const firstLine = text.split('\n')[0].trim();
    if (firstLine.length > 50) return firstLine.substring(0, 50) + '...';
    return firstLine || 'Untitled Entry';
  };

  // Get body content (everything except the header title)
  const getBody = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove title tag to get just the body
    const titleTag = div.querySelector('h2') || div.querySelector('h3');
    if (titleTag) titleTag.remove();

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

  // Calculate progress percentage


  if (!user) return null;

  return (
    <NishthaLayout userName={user.name} userAvatar={user.avatar}>
      <div className="relative min-h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50 dark:bg-[#0a0a0f] font-sans text-slate-800 dark:text-slate-200 transition-colors duration-500">

        {/* Ambient Glow Effects */}
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />

        {/* Main Content Area */}
        <div className="relative z-10 flex flex-col lg:flex-row h-full overflow-auto">

          {/* Editor Section - Main Area */}
          <section className="flex-[2] min-w-0 p-4 md:p-6 lg:p-10 overflow-y-auto relative">
            {/* Writing glow effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(16,185,129,0.06),transparent_60%)] dark:bg-[radial-gradient(circle_at_50%_10%,rgba(16,185,129,0.08),transparent_60%)] pointer-events-none" />

            <div className="max-w-3xl mx-auto relative">

              {/* Header */}
              <header className="mb-6 md:mb-10">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight font-serif">
                  {dateString}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Reflection Mode
                </p>
              </header>

              {/* Editor Card */}
              <div data-tour="journal-editor" className="bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-slate-200/50 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-emerald-500/5">

                {/* Toolbar */}
                <div data-tour="journal-toolbar" className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    {/* Mood Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoodDropdown(!showMoodDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        <span>{moodOptions.find(m => m.label === selectedMood)?.emoji || "😌"}</span>
                        <span>Feeling {selectedMood}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showMoodDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showMoodDropdown && (
                        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 py-2 min-w-[180px] max-h-[250px] overflow-y-auto">
                          {moodOptions.map((mood) => (
                            <button
                              key={mood.label}
                              onClick={() => {
                                setSelectedMood(mood.label);
                                setShowMoodDropdown(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${selectedMood === mood.label ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                              <span>{mood.emoji}</span>
                              {mood.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-2" />
                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-400">
                      <button onClick={formatBold} className={`p-1.5 rounded-lg transition-all ${isBold ? 'bg-emerald-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                        <Bold className="w-5 h-5" />
                      </button>
                      <button onClick={formatItalic} className={`p-1.5 rounded-lg transition-all ${isItalic ? 'bg-emerald-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                        <Italic className="w-5 h-5" />
                      </button>
                      <button onClick={formatBulletList} className={`p-1.5 rounded-lg transition-all ${isList ? 'bg-emerald-500 text-white' : 'hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                        <List className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                </div>

                {/* Editor Area */}
                <div className="p-8 lg:p-12 min-h-[500px]">
                  {/* Title Input with Label */}
                  <div className="mb-8">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 mb-2 uppercase tracking-wider">Title (required)</label>
                    <input
                      className="w-full text-2xl md:text-3xl font-serif bg-transparent border-b-2 border-slate-200 dark:border-white/10 focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 pb-3 outline-none transition-colors"
                      placeholder="Give your entry a short title..."
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Body Editor with Label */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-500 mb-4 uppercase tracking-wider">Your Thoughts (required)</label>
                    <div
                      ref={editorRef}
                      contentEditable
                      className="w-full min-h-[300px] bg-transparent border-none focus:ring-0 text-lg leading-relaxed text-slate-900 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-700 resize-none outline-none"
                      data-placeholder="Start writing here..."
                      onSelect={checkFormattingState}
                      onKeyUp={checkFormattingState}
                    ></div>
                  </div>
                </div>

                {/* Gradient line */}
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-30" />

                {/* Save Button */}
                <div data-tour="save-entry" className="px-4 md:px-8 py-4 md:py-6 flex justify-end sticky bottom-0 bg-white dark:bg-[#1E1E1E] border-t border-slate-200/50 dark:border-white/5 md:border-t-0 md:static">
                  <button
                    onClick={handleAddEntry}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 md:px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isSubmitting ? "Saving..." : "Save Entry"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar - Daily Inspiration & History */}
          {/* Right Sidebar - Daily Inspiration & History */}
          <aside className="w-full lg:w-[400px] lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-[#151515]/90 backdrop-blur-sm p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 lg:flex lg:flex-col lg:gap-6 lg:space-y-0">

            {/* Daily Inspiration Card */}
            <div data-tour="daily-inspiration" className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 border border-slate-200/50 dark:border-white/5 relative overflow-hidden group shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-xl hover:shadow-violet-500/5 dark:hover:shadow-violet-500/10 transition-all duration-300">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/20 dark:bg-violet-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/30 transition-colors duration-500" />

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-medium text-xs tracking-wider uppercase">
                  <Sun className="w-4 h-4" />
                  Daily Inspiration
                </div>
                <span className="text-xs text-slate-500 font-mono bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                  {currentPromptIndex + 1} / {dailyQuestions.length}
                </span>
              </div>

              {/* Navigation and Question */}
              <div className="text-center py-4 relative z-10">
                <button
                  onClick={prevPrompt}
                  className="absolute left-0 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <blockquote className="font-serif text-xl italic text-slate-800 dark:text-slate-100 leading-snug px-8">
                  "{getDailyQuestion()}"
                </blockquote>
                <button
                  onClick={nextPrompt}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Indicator dots */}
              <div className="flex justify-center gap-1.5 mt-6 mb-6">
                {dailyQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPromptIndex(idx)}
                    className={`h-1 rounded-full transition-all ${idx === currentPromptIndex
                      ? 'bg-violet-500 w-6'
                      : 'bg-slate-300 dark:bg-slate-700 w-1.5 hover:bg-slate-400 dark:hover:bg-slate-600'
                      }`}
                  />
                ))}
              </div>

              {!showPromptAnswer ? (
                <button
                  onClick={() => setShowPromptAnswer(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                >
                  <span>Answer this prompt</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={promptAnswer}
                    onChange={(e) => setPromptAnswer(e.target.value)}
                    placeholder="Write your thoughts here..."
                    className="w-full h-24 p-3 text-sm bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-slate-700 dark:text-slate-300"
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
                      className="flex-1 bg-violet-500 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
                    >
                      Save Answer
                    </button>
                    <button
                      onClick={() => {
                        setShowPromptAnswer(false);
                        setPromptAnswer("");
                      }}
                      className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* This Week Progress Card */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 border border-slate-200/50 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">This Week</h3>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-500/20">
                  {getWeeklyCount()}/7 entries
                </span>
              </div>



              {/* Day indicators */}
              <div className="grid grid-cols-7 gap-1 mt-4 max-w-xs mx-auto">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                  const now = new Date();
                  const todayStr = now.toLocaleDateString('en-CA');
                  const dayOfWeek = now.getDay();
                  const sunday = new Date(now);
                  sunday.setDate(now.getDate() - dayOfWeek);
                  const targetDay = new Date(sunday);
                  targetDay.setDate(sunday.getDate() + i);
                  const targetDayStr = targetDay.toLocaleDateString('en-CA');
                  const hasEntry = journalEntries.some((e: any) => toISTDateStr(e.timestamp || e.createdAt || e.created_at) === targetDayStr);
                  const isToday = targetDayStr === todayStr;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 group cursor-pointer">
                      <div className={`w-1.5 h-6 rounded-full transition-all ${hasEntry ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-700'} ${isToday && !hasEntry ? 'ring-2 ring-emerald-500/50' : ''}`} />
                      <span className={`text-[10px] font-medium ${hasEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar Card */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-6 border border-slate-200/50 dark:border-white/5 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentMonthName}</h3>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                  <button className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center text-sm max-w-xs mx-auto">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                  <div key={idx} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{d}</div>
                ))}
                {Array.from({ length: firstDayOfMonth }, (_, i) => <div key={`empty-${i}`} className="p-1.5" />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const hasEntry = journalEntries.some((e: any) => toISTDateStr(e.timestamp || e.createdAt || e.created_at) === dateStr);
                  const now = new Date();
                  const isToday = dayNum === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
                  const isFuture = dayNum > now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
                  return (
                    <button
                      key={i}
                      className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-medium transition-all ${isToday
                        ? 'bg-emerald-500 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/30'
                        : hasEntry
                          ? 'relative text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                          : isFuture
                            ? 'text-slate-300 dark:text-slate-600'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      {dayNum}
                      {hasEntry && !isToday && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* History Section */}
            <div data-tour="journal-history" className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <History className="w-5 h-5 text-slate-400" />
                  History
                </h3>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors uppercase tracking-wider"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {journalEntries.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white dark:bg-[#1A1A1A] border border-slate-200/50 dark:border-white/5 text-center text-slate-400">
                    No entries yet
                  </div>
                ) : (
                  journalEntries.slice(0, 5).map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="bg-white dark:bg-[#1A1A1A] rounded-xl p-4 border border-slate-200/50 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                            {formatDate(entry.timestamp || entry.createdAt || entry.created_at)}
                          </p>
                          <p className="text-slate-700 dark:text-slate-300 font-serif text-sm truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {getTitle(entry.content)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col m-4">

            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-emerald-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-serif">All Journal Entries</h2>
                <span className="text-sm text-slate-500">({journalEntries.length} entries)</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#121212]">
              {journalEntries.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No journal entries yet</p>
                  <p className="text-sm">Start writing to see your entries here</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {journalEntries.map((entry: any, idx: number) => (
                    <div
                      key={entry.id || idx}
                      className="p-5 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all group shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1 font-serif">
                            {getTitle(entry.content)}
                          </h4>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
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
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all"
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
                          return <span className="text-sm text-slate-400 italic">No content</span>;
                        }

                        return (
                          <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
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
                                    className="text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-2 hover:underline"
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
                                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline ml-1"
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
            <div className="px-8 py-4 border-t border-slate-200 dark:border-white/5 flex justify-end bg-white dark:bg-[#1A1A1A]">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <TourPrompt tour={journalTour} featureName="Journal" />
    </NishthaLayout>
  );
}
