import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Wrench, Zap, Star, Shield, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { updates, type UpdateEntry, type TagType } from '../data/updates';
import Footer from '../components/landing/Footer';
import BetaAnnouncementCard from '../components/landing/BetaAnnouncementCard';

// ─── Tag colour map ───────────────────────────────────────────────────────────
const TAG_STYLES: Record<TagType, string> = {
  "New Feature":    "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  "Bug Fix":        "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  "UX Improvement": "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
  "Performance":    "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  "Architecture":   "bg-violet-500/15 text-violet-400 border border-violet-500/30",
};

const TAG_STYLES_LIGHT: Record<TagType, string> = {
  "New Feature":    "bg-teal-100 text-teal-700 border border-teal-200",
  "Bug Fix":        "bg-rose-100 text-rose-700 border border-rose-200",
  "UX Improvement": "bg-indigo-100 text-indigo-700 border border-indigo-200",
  "Performance":    "bg-amber-100 text-amber-700 border border-amber-200",
  "Architecture":   "bg-violet-100 text-violet-700 border border-violet-200",
};

const PATCH_TAG_ICON: Record<TagType, React.ReactNode> = {
  "New Feature":    <Star className="w-3 h-3" />,
  "Bug Fix":        <Wrench className="w-3 h-3" />,
  "UX Improvement": <Zap className="w-3 h-3" />,
  "Performance":    <Cpu className="w-3 h-3" />,
  "Architecture":   <Shield className="w-3 h-3" />,
};

// ─── Tag Pill ─────────────────────────────────────────────────────────────────
function TagPill({ tag, size = "sm" }: { tag: TagType; size?: "xs" | "sm" }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-semibold tracking-wide
        ${size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}
        dark:${TAG_STYLES[tag]} ${TAG_STYLES_LIGHT[tag].split(' ').map(c => `light:${c}`).join(' ')}
        [.dark_&]:bg-opacity-100
      `}
      style={{
        // Inline fallback for dark mode since arbitrary dark: selectors aren't always tree-shaken
      }}
    >
      {PATCH_TAG_ICON[tag]}
      {tag}
    </span>
  );
}

// ─── Animated entry wrapper ───────────────────────────────────────────────────
function FadeInCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(28px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ feature }: { feature: UpdateEntry["features"][number] }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200">
      <CheckCircle2 className="w-5 h-5 text-teal-400 dark:text-teal-400 light:text-teal-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm text-white dark:text-white light:text-slate-900 mb-0.5">{feature.title}</p>
        <p className="text-xs text-white/60 dark:text-white/60 light:text-slate-500 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  );
}

// ─── Patch Card ───────────────────────────────────────────────────────────────
function PatchCard({ patch }: { patch: UpdateEntry["patches"][number] }) {
  return (
    <div className="rounded-xl border border-rose-500/20 dark:border-rose-500/20 light:border-rose-200 bg-rose-500/5 dark:bg-rose-500/5 light:bg-rose-50 p-4">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-rose-400 dark:text-rose-400 light:text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-rose-400 dark:text-rose-400 light:text-rose-600 uppercase tracking-widest">{patch.id}</span>
            <span className="hidden sm:block text-white/20 dark:text-white/20 light:text-slate-300 text-xs">|</span>
            <span className="font-semibold text-sm text-white dark:text-white light:text-slate-900">{patch.title}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {patch.tags.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border
                  dark:bg-opacity-20 dark:border-opacity-30"
                style={{
                  background: t === "Bug Fix" ? "rgba(244,63,94,0.15)" : t === "UX Improvement" ? "rgba(99,102,241,0.15)" : "rgba(139,92,246,0.15)",
                  borderColor: t === "Bug Fix" ? "rgba(244,63,94,0.3)" : t === "UX Improvement" ? "rgba(99,102,241,0.3)" : "rgba(139,92,246,0.3)",
                  color: t === "Bug Fix" ? "#fb7185" : t === "UX Improvement" ? "#818cf8" : "#a78bfa",
                }}
              >
                {PATCH_TAG_ICON[t]}
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-6 space-y-1.5">
        <div>
          <span className="text-xs font-semibold text-white/40 dark:text-white/40 light:text-slate-400 uppercase tracking-wider">Issue</span>
          <p className="text-xs text-white/70 dark:text-white/70 light:text-slate-600 mt-0.5 leading-relaxed">{patch.issue}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-teal-400/80 dark:text-teal-400/80 light:text-teal-700 uppercase tracking-wider">Fix</span>
          <p className="text-xs text-white/70 dark:text-white/70 light:text-slate-600 mt-0.5 leading-relaxed">{patch.correction}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Single Update Entry Card ─────────────────────────────────────────────────
function UpdateCard({ entry, isLatest, index }: { entry: UpdateEntry; isLatest: boolean; index: number }) {
  return (
    <FadeInCard delay={index * 120}>
      <div className="relative flex gap-6 md:gap-10">
        {/* Timeline rail */}
        <div className="flex flex-col items-center">
          {/* Dot */}
          <div
            className={`
              relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              font-bold text-xs shadow-lg
              ${isLatest
                ? "bg-gradient-to-br from-teal-400 to-teal-600 text-black shadow-teal-500/40"
                : "bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-400 dark:text-slate-400 light:text-slate-600 border border-slate-700 dark:border-slate-700 light:border-slate-300"
              }
            `}
          >
            {isLatest ? <Star className="w-4 h-4" /> : entry.version.replace("V", "")}
          </div>
          {/* Vertical line below dot */}
          <div className="flex-1 w-px bg-gradient-to-b from-slate-700/80 dark:from-slate-700/80 light:from-slate-300 to-transparent mt-2" />
        </div>

        {/* Card body */}
        <div className="flex-1 min-w-0 pb-16">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span
              className={`
                text-2xl md:text-3xl font-playfair font-extrabold tracking-tight
                ${isLatest ? "text-teal-400 dark:text-teal-400 light:text-teal-700" : "text-white dark:text-white light:text-slate-800"}
              `}
            >
              {entry.version}
            </span>
            {isLatest && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                Sabse Naya
              </span>
            )}
            <span className="ml-auto text-xs text-white/40 dark:text-white/40 light:text-slate-400 font-medium">{entry.date}</span>
          </div>

          <p className="text-lg md:text-xl font-semibold text-white/90 dark:text-white/90 light:text-slate-800 mb-1 font-manrope leading-snug">{entry.name}</p>
          <p className="text-sm text-white/50 dark:text-white/50 light:text-slate-500 mb-5 leading-relaxed max-w-2xl">{entry.summary}</p>

          {/* Tags row */}
          <div className="flex flex-wrap gap-2 mb-6">
            {entry.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: tag === "New Feature" ? "rgba(45,212,191,0.12)" : tag === "Bug Fix" ? "rgba(244,63,94,0.12)" : tag === "UX Improvement" ? "rgba(99,102,241,0.12)" : tag === "Architecture" ? "rgba(139,92,246,0.12)" : "rgba(245,158,11,0.12)",
                  borderColor: tag === "New Feature" ? "rgba(45,212,191,0.3)" : tag === "Bug Fix" ? "rgba(244,63,94,0.3)" : tag === "UX Improvement" ? "rgba(99,102,241,0.3)" : tag === "Architecture" ? "rgba(139,92,246,0.3)" : "rgba(245,158,11,0.3)",
                  color: tag === "New Feature" ? "#2dd4bf" : tag === "Bug Fix" ? "#fb7185" : tag === "UX Improvement" ? "#818cf8" : tag === "Architecture" ? "#a78bfa" : "#fbbf24",
                }}
              >
                {PATCH_TAG_ICON[tag]}
                {tag}
              </span>
            ))}
          </div>

          {/* Features */}
          {entry.features.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-white/40 dark:text-white/40 light:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Naya Kya Hai
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entry.features.map((f, i) => (
                  <FeatureCard key={i} feature={f} />
                ))}
              </div>
            </div>
          )}

          {/* Patch Notes */}
          {entry.patches.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-white/40 dark:text-white/40 light:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" /> Galtiyan Sudhari
              </h3>
              <div className="space-y-3">
                {entry.patches.map((p, i) => (
                  <PatchCard key={i} patch={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </FadeInCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Updates() {
  return (
    <div className="min-h-[100dvh] font-sans bg-gradient-to-br from-[#0a0c10] via-[#0f1115] to-[#0d0f13] dark:from-[#0a0c10] dark:via-[#0f1115] dark:to-[#0d0f13] light:from-white light:via-slate-50 light:to-indigo-50 text-white dark:text-white light:text-slate-900">

      {/* Ambient glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-teal-500/5 dark:bg-teal-500/5 light:bg-teal-200/30 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 dark:bg-indigo-500/5 light:bg-indigo-200/20 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">

        {/* Back link */}
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-sm text-white/50 dark:text-white/50 light:text-slate-500 hover:text-teal-400 dark:hover:text-teal-400 light:hover:text-teal-600 transition-colors mb-10 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Home par Vapas
        </Link>

        {/* Page hero */}
        <FadeInCard delay={0}>
          <div className="mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-400 dark:text-teal-400 light:text-teal-700 text-xs font-bold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse inline-block" />
              Nayi Updates
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-extrabold text-white dark:text-white light:text-slate-900 leading-tight tracking-tight mb-4">
              SAFAR mein<br />
              <span className="text-teal-400 dark:text-teal-400 light:text-teal-600">Kya Naya Hai</span>
            </h1>
            <p className="text-base md:text-lg text-white/50 dark:text-white/50 light:text-slate-500 max-w-xl leading-relaxed">
              Ek-ek sudhar, bug fix aur naya feature upgrade — jo SAFAR team aapke liye laayi hai.
            </p>
          </div>
        </FadeInCard>

        <FadeInCard delay={50}>
          <BetaAnnouncementCard />
        </FadeInCard>

        {/* Updates timeline */}
        <div className="mt-8">
          {updates.map((entry, index) => (
            <UpdateCard
              key={entry.version}
              entry={entry}
              isLatest={index === 0}
              index={index}
            />
          ))}
        </div>

        {/* End of timeline */}
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-px h-12 bg-gradient-to-b from-slate-700/80 dark:from-slate-700/80 light:from-slate-300 to-transparent" />
          <div className="w-3 h-3 rounded-full border-2 border-slate-700 dark:border-slate-700 light:border-slate-300" />
          <p className="text-xs text-white/30 dark:text-white/30 light:text-slate-400 font-medium mt-2">Updates ka Safar yahin tak</p>
        </div>

      </div>

      <Footer />
    </div>
  );
}
