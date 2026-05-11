import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { PremiumEmoji, type PremiumEmojiName } from '@/components/PremiumEmoji';
import {
  Sparkles, AlertTriangle, Heart, Target, Moon,
  ChevronRight, Clock, Trophy, Flame, ArrowRight,
  Quote, Zap, PhoneCall, RefreshCw, Send, ThumbsUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/utils/apiFetch';

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface MoodSuggestion {
  title: string;
  description: string;
  action: string;
  link: string;
  icon: string;
}

interface DailyChallenge {
  title: string;
  description: string;
  difficulty: string;
}

interface MindfulMoment {
  quote: string;
  author: string;
}

interface SOSExercise {
  title: string;
  description: string;
  duration: string;
  icon: string;
}

interface SleepStep {
  step: number;
  title: string;
  description: string;
  time: string;
}

interface SuggestionsData {
  greeting: string;
  period: string;
  mood: {
    intensity: number;
    label: string;
    category: 'low' | 'neutral' | 'high';
  };
  stats: {
    activeGoals: number;
    completedToday: number;
    weeklyFocusHours: number;
    weeklyFocusSessions: number;
  };
  moodSuggestions: MoodSuggestion[];
  dailyChallenge: DailyChallenge;
  mindfulMoment: MindfulMoment;
  sosExercises: SOSExercise[];
  focusBoost: {
    show: boolean;
    message: string;
    weeklyHours: number;
    weeklySessions: number;
  };
  sleepWindDown?: SleepStep[];
  showSOS: boolean;
}

interface SuggestionBoxSubmission {
  id: string;
  content: string;
  userName: string;
  voteCount: number;
  hasVoted: boolean;
  createdAt: string | null;
}

const difficultyColors: Record<string, string> = {
  'Easy': 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20',
  'Medium': 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',
  'Hard': 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20',
};

const moodEmojis: Record<string, PremiumEmojiName> = {
  low: 'frown',
  neutral: 'smile',
  high: 'flame',
};

const CRISIS_HELPLINE = {
  number: '988',
  label: 'Suicide & Crisis Lifeline',
  description: 'If you\'re in crisis, please reach out. You\'re not alone.',
};

export default function Suggestions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<SuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSOS, setShowSOS] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSubmissions, setSuggestionSubmissions] = useState<SuggestionBoxSubmission[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
    fetchSuggestionBox();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await apiFetch(`${API_URL}/suggestions/personalized`, { method: 'GET' });

      if (!res.ok) {
        if (res.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error(`Failed to fetch suggestions (${res.status})`);
      }

      const json = await res.json();
      setData(json);
      setShowSOS(json.showSOS);
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestionBox = async () => {
    try {
      setSuggestionLoading(true);
      const res = await apiFetch(`${API_URL}/suggestion-box`, { method: 'GET' });
      if (!res.ok) throw new Error(`Failed to fetch suggestion box (${res.status})`);
      const json = await res.json();
      setSuggestionSubmissions(Array.isArray(json?.submissions) ? json.submissions : []);
    } catch (err) {
      console.error('Failed to fetch suggestion box', err);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    const content = suggestionText.trim();
    if (content.length < 3 || suggestionSubmitting) return;

    try {
      setSuggestionSubmitting(true);
      setSuggestionError(null);
      const res = await apiFetch(`${API_URL}/suggestion-box`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.message || `Failed to submit suggestion (${res.status})`);
      }

      const json = await res.json();
      if (json?.submission) {
        setSuggestionSubmissions((prev) => [json.submission, ...prev].sort((a, b) => {
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }));
      }
      setSuggestionText("");
    } catch (err: any) {
      console.error('Failed to submit suggestion', err);
      setSuggestionError(err?.message || 'Could not submit suggestion.');
    } finally {
      setSuggestionSubmitting(false);
    }
  };

  const handleVoteSuggestion = async (submissionId: string) => {
    setSuggestionSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === submissionId
          ? {
            ...submission,
            hasVoted: !submission.hasVoted,
            voteCount: Math.max(0, submission.voteCount + (submission.hasVoted ? -1 : 1)),
          }
          : submission,
      ).sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }),
    );

    try {
      const res = await apiFetch(`${API_URL}/suggestion-box/${encodeURIComponent(submissionId)}/vote`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`Failed to vote (${res.status})`);
      const json = await res.json();
      setSuggestionSubmissions((prev) =>
        prev.map((submission) =>
          submission.id === submissionId
            ? { ...submission, hasVoted: Boolean(json?.hasVoted), voteCount: Number(json?.voteCount || 0) }
            : submission,
        ).sort((a, b) => {
          if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }),
      );
    } catch (err) {
      console.error('Failed to vote suggestion', err);
      void fetchSuggestionBox();
    }
  };

  if (loading) {
    return (
      <MainLayout showHome={false}>
        <div className="min-h-[100dvh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-slate-600 dark:text-slate-400">Personalizing your experience...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout showHome={false}>
        <div className="min-h-[100dvh] flex items-center justify-center">
          <p className="text-slate-600 dark:text-slate-400">Could not load suggestions. Please try again.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showHome={false}>
      <div className="min-h-[100dvh] pb-20 px-4 md:px-6 max-w-6xl mx-auto">

        {/* ═══════ Hero Section ═══════ */}
        <section className="pt-8 pb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/45 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Personalized suggestions
                </div>
                <div className="flex items-center gap-3">
                  <PremiumEmoji name={moodEmojis[data.mood.category]} alt="" className="h-9 w-9" />
                  <h1 className="text-2xl font-bold text-slate-950 dark:text-white md:text-4xl">
                    {data.greeting}
                  </h1>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {data.mood.category === 'low'
                    ? "It's okay to not be okay. Here are a few steady, practical next steps."
                    : data.mood.category === 'high'
                      ? "You're in a strong rhythm. Use that energy on something that compounds."
                      : "A balanced set of recommendations based on how you're feeling right now."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 md:min-w-[360px]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <Target className="mb-2 h-4 w-4 text-emerald-500" />
                  <div className="text-lg font-bold text-slate-950 dark:text-white">{data.stats.activeGoals}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Active goals</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <Trophy className="mb-2 h-4 w-4 text-amber-500" />
                  <div className="text-lg font-bold text-slate-950 dark:text-white">{data.stats.completedToday}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Done today</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <Clock className="mb-2 h-4 w-4 text-indigo-500" />
                  <div className="text-lg font-bold text-slate-950 dark:text-white">{data.stats.weeklyFocusHours}h</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">This week</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ SOS Quick Relief ═══════ */}
        {showSOS && (
          <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-500/20 dark:bg-rose-950/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-rose-500/15 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-rose-900 dark:text-rose-200">SOS Quick Relief</h3>
                    <p className="text-xs text-rose-700/80 dark:text-rose-300/70">Feeling overwhelmed? Try one of these right now.</p>
                  </div>
                </div>
                <button onClick={() => setShowSOS(false)} className="text-xs text-rose-700/70 dark:text-rose-300/60 hover:text-rose-900 dark:hover:text-rose-200 transition-colors">
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.sosExercises.map((ex, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white border border-rose-100 hover:border-rose-200 transition-all cursor-pointer group dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10">
                    <PremiumEmoji emoji={ex.icon} fallback={ex.icon} alt="" className="h-7 w-7" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">{ex.title}</h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{ex.description}</p>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20">{ex.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestion Box */}
        <section className="mb-8">
          <div className="rounded-2xl bg-white/90 border border-slate-200 shadow-sm dark:bg-white/[0.03] dark:border-white/10 p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Suggestion Box</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Share website suggestions or complaints. No attachments, text only.
                </p>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                As {user?.name || 'User'}
              </span>
            </div>

            <textarea
              value={suggestionText}
              onChange={(event) => {
                setSuggestionText(event.target.value);
                if (suggestionError) setSuggestionError(null);
              }}
              maxLength={2000}
              rows={4}
              placeholder="Write your suggestion or complaint..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {suggestionText.length}/2000
                {suggestionError ? <span className="ml-3 text-rose-600 dark:text-rose-400">{suggestionError}</span> : null}
              </div>
              <button
                type="button"
                onClick={handleSubmitSuggestion}
                disabled={suggestionText.trim().length < 3 || suggestionSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Send className="h-3.5 w-3.5" />
                {suggestionSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Suggestions</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Most voted first</span>
              </div>

              {suggestionLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading suggestions...</p>
              ) : suggestionSubmissions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No suggestions yet.</p>
              ) : (
                <div className="space-y-3">
                  {suggestionSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {submission.userName || 'User'}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                            {submission.content}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVoteSuggestion(submission.id)}
                          className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            submission.hasVoted
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:text-indigo-300'
                          }`}
                          title={submission.hasVoted ? 'Remove vote' : 'Vote'}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          {submission.voteCount}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">For You Right Now</h2>
            </div>
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">Based on your current mood</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.moodSuggestions.map((suggestion, i) => (
              <div
                key={i}
                onClick={() => navigate(suggestion.link)}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-500/30"
              >
                <PremiumEmoji emoji={suggestion.icon} fallback={suggestion.icon} alt="" className="h-8 w-8" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3">{suggestion.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{suggestion.description}</p>
                <div className="flex items-center gap-1 mt-4 text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                  <span>{suggestion.action}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ Two Column: Daily Challenge + Focus Boost ═══════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Daily Challenge */}
          <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
                <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Daily Challenge</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${difficultyColors[data.dailyChallenge.difficulty]}`}>
                  {data.dailyChallenge.difficulty}
                </span>
              </div>
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{data.dailyChallenge.title}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{data.dailyChallenge.description}</p>
          </div>

          {/* Focus Boost */}
          {data.focusBoost.show && (
            <div
              className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm"
              onClick={() => navigate('/nishtha/focus')}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/15 rounded-xl">
                  <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">Focus Boost</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{data.focusBoost.message}</p>
              {data.focusBoost.weeklyHours > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (data.focusBoost.weeklyHours / 20) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-500">{data.focusBoost.weeklyHours}/20h goal</span>
                </div>
              )}
              <div className="flex items-center gap-1 mt-3 text-xs text-indigo-600 dark:text-indigo-400">
                <span>Start a session</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Sleep Wind-Down ═══════ */}
        {data.sleepWindDown && (
          <section className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-100 dark:bg-violet-500/15 rounded-xl">
                  <Moon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Sleep Wind-Down</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Follow these steps for better sleep tonight.</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.sleepWindDown.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-100 border border-violet-200 dark:bg-violet-500/15 dark:border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</h4>
                        <span className="text-[10px] text-violet-700/70 dark:text-violet-400/60">{step.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════ Mindful Moment ═══════ */}
        <section className="mb-8">
          <div className="p-7 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center shadow-sm">
            <Quote className="w-6 h-6 text-teal-600/70 dark:text-teal-400/70 mx-auto mb-4" />
            <p className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium italic leading-relaxed max-w-2xl mx-auto">
              "{data.mindfulMoment.quote}"
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium">- {data.mindfulMoment.author}</p>
          </div>
        </section>

        {/* ═══════ Crisis Helpline Footer ═══════ */}
        <div className="mt-12 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <PhoneCall className="w-4 h-4 text-slate-600 dark:text-slate-500" />
            <span className="text-xs text-slate-600 dark:text-slate-500 font-medium">24/7 Support</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-500">{CRISIS_HELPLINE.description}</p>
          <a
            href={`tel:${CRISIS_HELPLINE.number}`}
            className="inline-block mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            {CRISIS_HELPLINE.label}: {CRISIS_HELPLINE.number}
          </a>
        </div>
      </div>
    </MainLayout>
  );
}

