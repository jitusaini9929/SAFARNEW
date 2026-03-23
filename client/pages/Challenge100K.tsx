import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock, Sparkles, Trophy } from 'lucide-react';
import { authService } from '@/utils/authService';

const CHALLENGE_STORAGE_KEY = 'challenge100k.guestProgress';

const challengeDays = [
  { day: 1, title: 'Wake-up discipline', task: 'Start your day 45 minutes earlier than usual.' },
  { day: 2, title: 'Deep work block', task: 'Complete one uninterrupted 2-hour study sprint.' },
  { day: 3, title: 'No distraction window', task: 'Study with phone notifications fully off for 3 hours total.' },
  { day: 4, title: 'Body + mind reset', task: '20 minutes movement + 10 minutes breathing.' },
  { day: 5, title: 'Execution day', task: 'Complete your top 3 priority tasks before evening.' },
  { day: 6, title: 'Revision engine', task: 'Do one full revision cycle of a weak topic.' },
  { day: 7, title: 'Momentum day', task: 'Repeat your best routine and journal your next 21 days.' },
];

const Challenge100K = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [completedDays, setCompletedDays] = useState<number[]>([]);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const me = await authService.getCurrentUser();
        setIsLoggedIn(Boolean(me?.user));
      } catch {
        setIsLoggedIn(false);
      }

      try {
        const raw = window.localStorage.getItem(CHALLENGE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCompletedDays(parsed.filter((x) => Number.isInteger(x) && x >= 1 && x <= 7));
        }
      } catch {
        setCompletedDays([]);
      }
    };

    hydrate();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(completedDays));
  }, [completedDays]);

  const completedCount = completedDays.length;
  const progressPercent = useMemo(() => Math.round((completedCount / 7) * 100), [completedCount]);

  const toggleDay = (day: number) => {
    setCompletedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const challengeDone = completedCount === 7;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#f9fafb] via-[#eff6ff] to-[#fff7ed] dark:from-[#0f1115] dark:via-[#131929] dark:to-[#1a1322] text-slate-900 dark:text-slate-100">
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to homepage
        </Link>

        <section className="mt-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#161824]/90 backdrop-blur-md shadow-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                100K Discipline Challenge
              </p>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold font-ranade">7 Days of Discipline</h1>
              <p className="mt-2 text-slate-700 dark:text-slate-300 max-w-2xl">
                This challenge turns celebration into transformation. Complete one powerful task each day and build an unbreakable study identity.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-300/60 dark:border-cyan-300/20 px-4 py-3 bg-cyan-50 dark:bg-cyan-400/10">
              <p className="text-xs uppercase tracking-wide text-cyan-800 dark:text-cyan-300">Progress</p>
              <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-200">{progressPercent}%</p>
            </div>
          </div>

          <div className="mt-5 h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{completedCount} / 7 days completed</p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3">
          {challengeDays.map((item) => {
            const isDone = completedDays.includes(item.day);
            return (
              <article
                key={item.day}
                className={`rounded-2xl border p-4 md:p-5 transition-all ${
                  isDone
                    ? 'border-emerald-300/80 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10'
                    : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#161824]/90'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Day {item.day}</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</h2>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{item.task}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDay(item.day)}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isDone
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                        : 'bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isDone ? 'Completed' : 'Mark complete'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161824]/90 p-6 md:p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-500" />
            Rewards
          </h3>
          
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reward 1 */}
            <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-400/20 bg-amber-50/50 dark:bg-amber-400/5 transition-all hover:scale-[1.02]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 shadow-sm">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">100K Discipline Badge</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    An exclusive digital badge visible on your public profile to showcase your grit.
                  </p>
                </div>
              </div>
            </div>

            {/* Reward 2 */}
            <div className="p-5 rounded-2xl border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50/50 dark:bg-cyan-400/5 transition-all hover:scale-[1.02]">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 shadow-sm">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Completion Certificate</h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-bold">
                    Unlock on Day 7
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 leading-relaxed">
                    A personalized e-certificate acknowledging your successful completion of the marathon.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {challengeDone && (
            <div className="mt-5 rounded-2xl border border-emerald-300/70 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 p-4">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">You completed all 7 days. Massive respect.</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-200 mt-1">Login to sync your badge permanently to your profile.</p>
            </div>
          )}

          {!isLoggedIn && (
            <div className="mt-6 rounded-2xl border border-amber-300/70 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 p-4 md:p-5">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 inline-flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Guest mode is active
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                Your progress is currently saved only on this browser. Login to unlock permanent progress, badges, and leaderboard position.
              </p>
              <Link
                to="/?signin=true"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-amber-500 transition-colors"
              >
                Login to claim rewards
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Challenge100K;
