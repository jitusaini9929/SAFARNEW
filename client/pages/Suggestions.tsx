import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import {
  Sparkles, AlertTriangle, Heart, Target, Brain, Moon,
  ChevronRight, Wind, Clock, Trophy, Flame, ArrowRight,
  Quote, Zap, PhoneCall, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const difficultyColors: Record<string, string> = {
  'Easy': 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20',
  'Medium': 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',
  'Hard': 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/20',
};

const moodEmojis: Record<string, string> = {
  low: '😔',
  neutral: '😊',
  high: '🔥',
};

const CRISIS_HELPLINE = {
  number: '988',
  label: 'Suicide & Crisis Lifeline',
  description: 'If you\'re in crisis, please reach out. You\'re not alone.',
};

export default function Suggestions() {
  const navigate = useNavigate();
  const [data, setData] = useState<SuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSOS, setShowSOS] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${API_URL}/suggestions/personalized`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setShowSOS(json.showSOS);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
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
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-600 dark:text-slate-400">Could not load suggestions. Please try again.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-20 px-4 md:px-6 max-w-5xl mx-auto">

        {/* ═══════ Hero Section ═══════ */}
        <div className="relative pt-10 pb-8">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-cyan-300/45 dark:bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute top-10 right-1/4 w-60 h-60 bg-rose-300/40 dark:bg-fuchsia-600/10 rounded-full blur-[100px]" />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{moodEmojis[data.mood.category]}</span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              {data.greeting}
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mt-1">
            {data.mood.category === 'low'
              ? "It's okay to not be okay. Here are some things that might help."
              : data.mood.category === 'high'
                ? "You're radiating good energy! Let's channel it productively."
                : "Here's what we recommend based on how you're feeling."}
          </p>

          {/* Quick Stats Row */}
          <div className="flex items-center gap-4 mt-6 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 whitespace-nowrap">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-600 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{data.stats.activeGoals}</strong> active goals</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 whitespace-nowrap">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-600 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{data.stats.completedToday}</strong> completed today</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 whitespace-nowrap">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-600 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">{data.stats.weeklyFocusHours}h</strong> focused this week</span>
            </div>
          </div>
        </div>

        {/* ═══════ SOS Quick Relief ═══════ */}
        {showSOS && (
          <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
            <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/60 dark:to-rose-900/40 border border-rose-200 dark:border-rose-500/20 p-5 shadow-sm dark:backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
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
                  <div key={i} className="p-3 rounded-xl bg-white border border-rose-100 hover:bg-rose-50 transition-all cursor-pointer group dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10">
                    <span className="text-2xl">{ex.icon}</span>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">{ex.title}</h4>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{ex.description}</p>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20">{ex.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ Mood-Based Recommendations ═══════ */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-pink-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">For You Right Now</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.moodSuggestions.map((suggestion, i) => (
              <div
                key={i}
                onClick={() => navigate(suggestion.link)}
                className="group cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 dark:bg-white/[0.03] dark:border-white/10 dark:hover:bg-white/[0.07] dark:hover:border-white/20"
              >
                <span className="text-3xl">{suggestion.icon}</span>
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
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-500/15 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-500/15 rounded-xl">
                <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 dark:text-amber-200">Daily Challenge</h3>
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
              className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-500/15 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all shadow-sm"
              onClick={() => navigate('/nishtha/focus')}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-500/15 rounded-xl">
                  <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-bold text-indigo-900 dark:text-indigo-200">Focus Boost</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{data.focusBoost.message}</p>
              {data.focusBoost.weeklyHours > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
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
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-50 to-slate-50 dark:from-violet-950/40 dark:to-slate-950/40 border border-violet-200 dark:border-violet-500/15 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-100 dark:bg-violet-500/15 rounded-xl">
                  <Moon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-bold text-violet-900 dark:text-violet-200">Sleep Wind-Down</h3>
                  <p className="text-xs text-violet-700/80 dark:text-violet-300/60">Follow these steps for better sleep tonight.</p>
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
          <div className="p-8 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:bg-white/[0.02] border border-teal-200 dark:border-white/5 text-center relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-teal-300/40 dark:bg-teal-500/5 rounded-full blur-[80px]" />
            </div>
            <Quote className="w-6 h-6 text-teal-600/70 dark:text-teal-500/40 mx-auto mb-4" />
            <p className="text-lg md:text-xl text-slate-800 dark:text-slate-200 font-medium italic leading-relaxed max-w-2xl mx-auto">
              "{data.mindfulMoment.quote}"
            </p>
            <p className="text-sm text-teal-700 dark:text-teal-400/60 mt-4 font-medium">— {data.mindfulMoment.author}</p>
          </div>
        </section>

        {/* ═══════ Crisis Helpline Footer ═══════ */}
        <div className="mt-12 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center shadow-sm">
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

