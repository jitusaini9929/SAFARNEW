import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Download, Trophy, Youtube } from 'lucide-react';
import { triggerFireworks, triggerSideCannons } from '@/components/ui/confetti';

const STARTING_SUBSCRIBERS = 100000;
const LIVECOUNT_CHANNEL_ID = 'UCsbT4wZ_FUUpJGtVa4mooow';

type LiveCounterApiResponse = {
  success: boolean;
  subscriberCount?: number;
};

const timeline = [
  { label: '0', note: 'The first upload and first believer.' },
  { label: '1K', note: 'Momentum started with consistent value.' },
  { label: '10K', note: 'A serious student movement was visible.' },
  { label: '100K', note: 'Discipline became a shared identity.' },
];

const wallOfImpact = [
  {
    title: 'From distraction to rank focus',
    story: '"I was scrolling 6+ hours a day. SAFAR routines helped me build a 2-hour deep work habit in 3 weeks."',
    student: 'Student Story #1',
  },
  {
    title: 'Consistency after burnout',
    story: '"I thought motivation was dead. The daily structure gave me back control and confidence."',
    student: 'Student Story #2',
  },
  {
    title: 'Calm + productivity together',
    story: '"I stopped choosing between mental peace and performance. The wellness + productivity mix changed everything."',
    student: 'Student Story #3',
  },
];

const resourcePack = [
  'Productivity planner template (PDF)',
  'Study routine blueprint (weekly + monthly)',
  'Dopamine detox starter guide',
];

const Milestone100KShowcase = () => {
  const [subscriberCount, setSubscriberCount] = useState(STARTING_SUBSCRIBERS);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [trend, setTrend] = useState<'neutral' | 'up' | 'down'>('neutral');
  const [lastDelta, setLastDelta] = useState(0);
  const [countPulse, setCountPulse] = useState(false);
  const hasSyncedLiveCountRef = useRef(false);

  useEffect(() => {
    let moodResetTimeout: number | undefined;
    let pulseResetTimeout: number | undefined;
    let isMounted = true;

    const applyLiveUpdate = (nextCount: number) => {
      setSubscriberCount((previousCount) => {
        if (!hasSyncedLiveCountRef.current) {
          hasSyncedLiveCountRef.current = true;
          setTrend('neutral');
          setLastDelta(0);
          setCountPulse(false);
          return nextCount;
        }

        if (previousCount === nextCount) {
          return previousCount;
        }

        const delta = nextCount - previousCount;
        setLastDelta(Math.abs(delta));
        setTrend(delta > 0 ? 'up' : 'down');
        setCountPulse(true);

        if (moodResetTimeout) {
          window.clearTimeout(moodResetTimeout);
        }
        if (pulseResetTimeout) {
          window.clearTimeout(pulseResetTimeout);
        }

        pulseResetTimeout = window.setTimeout(() => {
          setCountPulse(false);
        }, 500);

        moodResetTimeout = window.setTimeout(() => {
          setTrend('neutral');
        }, 1300);

        return nextCount;
      });
    };

    const loadLiveCount = async () => {
      try {
        const response = await fetch(`/api/live/youtube-subs?channelId=${LIVECOUNT_CHANNEL_ID}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as LiveCounterApiResponse;
        if (!isMounted || !data?.success || typeof data.subscriberCount !== 'number') {
          return;
        }

        applyLiveUpdate(data.subscriberCount);
      } catch {
        // Keep previous value when live source is temporarily unavailable.
      }
    };

    void loadLiveCount();
    
    // Trigger celebration confetti on mount
    triggerFireworks();
    triggerSideCannons();

    const interval = window.setInterval(() => {
      void loadLiveCount();
    }, 4000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      if (moodResetTimeout) {
        window.clearTimeout(moodResetTimeout);
      }
      if (pulseResetTimeout) {
        window.clearTimeout(pulseResetTimeout);
      }
    };
  }, []);

  const formattedCount = useMemo(
    () => new Intl.NumberFormat('en-IN').format(subscriberCount),
    [subscriberCount],
  );

  const moodEmoji = trend === 'up' ? '\u{1F929}' : trend === 'down' ? '\u{1F972}' : '\u{1F642}';

  return (
    <section className="relative overflow-hidden bg-transparent dark:bg-transparent px-4 md:px-10 py-14 md:py-20">
      <div className="absolute -top-24 -right-20 w-72 h-72 bg-amber-300/30 dark:bg-amber-400/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-cyan-300/30 dark:bg-cyan-400/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto space-y-12">
        <div className="rounded-3xl border border-amber-300/70 dark:border-amber-300/20 bg-white/80 dark:bg-[#171b2d]/80 backdrop-blur-md p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200/70 dark:bg-amber-300/20 text-amber-900 dark:text-amber-200 text-xs font-bold tracking-wide uppercase">
                <Trophy className="w-3.5 h-3.5" />
                100K Milestone
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-ranade">
                100,000 Students Strong
              </h2>
              <p className="mt-2 text-slate-700 dark:text-slate-300 max-w-2xl">
                Building discipline, productivity and clarity together. This is not only celebration, it is the start of the next level.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/challenge-100k"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-700 text-white px-8 py-4 md:px-10 md:py-5 font-semibold whitespace-nowrap shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5"
              >
                Start Your Journey
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://youtube.com/@safarparmar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-300 dark:border-slate-700 px-8 py-4 md:px-10 md:py-5 font-semibold whitespace-nowrap text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Join the Community
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-6 md:gap-8">
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 text-white/80 text-sm">
              <span className="inline-flex items-center gap-2 font-medium"><Youtube className="w-4 h-4 text-red-400" /> 100K Celebration Video</span>
              <a href="https://youtu.be/vWWrcQA6JdU" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
                Watch on YouTube <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="aspect-video">
              {!videoLoaded && <div className="w-full h-full animate-pulse bg-slate-800" />}
              <iframe
                title="100K celebration video"
                src="https://www.youtube.com/embed/vWWrcQA6JdU"
                className={`w-full h-full ${videoLoaded ? 'block' : 'hidden'}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setVideoLoaded(true)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161824] p-5 md:p-6 shadow-xl">
            <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Live Momentum</p>
            <div className="mt-4 rounded-3xl bg-slate-50 dark:bg-slate-900/40 p-6 md:p-7 border border-slate-200 dark:border-white/5 shadow-inner">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className={`text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none transition-all duration-500 ${countPulse ? 'scale-105 text-cyan-600 dark:text-cyan-300' : 'scale-100'}`}
                  >
                    {formattedCount}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold">
                    {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-300 animate-bounce" />}
                    {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-300 animate-bounce" />}
                    <span className={trend === 'down' ? 'text-rose-700 dark:text-rose-300' : trend === 'up' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}>
                      {trend === 'up' ? `+${Math.abs(lastDelta)}` : trend === 'down' ? `-${Math.abs(lastDelta)}` : 'Live'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">subscribers</span>
                  </div>
                </div>

                <div
                  className={`text-4xl md:text-5xl leading-none transition-all duration-500 ${trend === 'up' ? 'scale-110' : trend === 'down' ? 'scale-95' : 'scale-100 opacity-85'}`}
                  aria-label="Live sentiment"
                >
                  {moodEmoji}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161824] p-6 md:p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">How SAFAR Changed Lives</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Placeholders are live now and can be swapped with real stories anytime.</p>
            <div className="mt-5 space-y-3">
              {wallOfImpact.map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50 dark:bg-slate-900/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.story}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300">{item.student}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161824] p-6 md:p-8 shadow-xl">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">100K Celebration Pack</h3>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Limited-time resource drop for students who want to reset and level up fast.</p>
            <div className="mt-4 inline-flex items-center rounded-full px-3 py-1 bg-rose-100 dark:bg-rose-400/15 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              Available for next 7 days
            </div>
            <ul className="mt-5 space-y-3">
              {resourcePack.map((item) => (
                <li key={item} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 font-semibold hover:opacity-95 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Download Pack
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#161824]/90 p-6 md:p-8 shadow-xl">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Thank You For Building This Journey</h3>
          <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-3xl">
            What started as a small idea is now a movement. Every milestone happened because students decided to show up daily.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {timeline.map((step) => (
              <div key={step.label} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 p-4">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{step.label}</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{step.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              to="/challenge-100k"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-700 text-white px-6 py-3 font-semibold"
            >
              Join 100K Discipline Challenge
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://youtube.com/@safarparmar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 px-6 py-3 font-semibold text-slate-800 dark:text-slate-100"
            >
              Visit Channel
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Milestone100KShowcase;
