import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import { Eye, Timer } from 'lucide-react';

// Import extracted components
import HeroSection from '../components/landing/HeroSection';
import AppsGrid from '../components/landing/AppsGrid';
import CommunitySpotlight from '../components/landing/CommunitySpotlight';
import ExternalResources from '../components/landing/ExternalResources';
import Footer from '../components/landing/Footer';
import YoutubePromotionModal from '../components/landing/YoutubePromotionModal';
import BirthdayWishBoxModal from '../temporaryFeatures/birthdayWishBox/BirthdayWishBoxModal';

const YOUTUBE_MODAL_SESSION_KEY_PREFIX = 'youtube-modal:auto-open-dismissed';
const WISHBOX_COUNTDOWN_TARGET_MS = new Date('2026-05-01T00:00:00+05:30').getTime();

function getWishboxCountdown() {
  const remainingMs = Math.max(0, WISHBOX_COUNTDOWN_TARGET_MS - Date.now());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isClosed: remainingMs <= 0 };
}

const Starfield = React.memo(function Starfield() {
  const stars = useMemo(() => Array.from({ length: 56 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 1.8 + 0.8,
    opacity: 0.15 + Math.random() * 0.45,
  })), []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
});

const DisintegratingBorder = React.memo(function DisintegratingBorder() {
  const specks = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1,
        duration: `${Math.random() * 6 + 8}s`,
        delay: `${Math.random() * 5}s`,
        opacity: 0.2 + Math.random() * 0.55,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-[40px] pointer-events-none">
      <div className="absolute inset-0 rounded-[40px] border border-pink-400/18 shadow-[0_0_0_1px_rgba(236,72,153,0.08),0_0_42px_rgba(236,72,153,0.12)]" />
      <div className="absolute inset-[-8%] rounded-[48px] bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.18),transparent_58%)] opacity-70 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/80 to-transparent opacity-70" />
      <div className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-pink-300/80 to-transparent opacity-70" />
      <div className="absolute inset-y-10 left-0 w-px bg-gradient-to-b from-transparent via-pink-300/60 to-transparent opacity-60" />
      <div className="absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-pink-300/60 to-transparent opacity-60" />
      {specks.map((speck) => (
        <div
          key={speck.id}
          className="absolute rounded-full bg-pink-300 shadow-[0_0_8px_rgba(244,114,182,0.75)] will-change-transform"
          style={{
            left: speck.left,
            top: speck.top,
            width: speck.size,
            height: speck.size,
            opacity: speck.opacity,
            animation: `wishboxSpeckFloat ${speck.duration} ease-in-out ${speck.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
});

type WishboxCountdownBannerProps = {
  onOpenWishbox: (tab: 'write' | 'view') => void;
};

const WishboxCountdownBanner = React.memo(function WishboxCountdownBanner({
  onOpenWishbox,
}: WishboxCountdownBannerProps) {
  const [wishboxCountdown, setWishboxCountdown] = useState(getWishboxCountdown);
  const sectionRef = useRef<HTMLElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWishboxCountdown(getWishboxCountdown());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = confettiCanvasRef.current;
    if (!section || !canvas || !wishboxCountdown.isClosed) return;

    let burstInterval: number | undefined;
    let loopInterval: number | undefined;
    const scopedConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const fireSectionConfetti = () => {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        scalar: 0.7,
      };

      if (burstInterval) window.clearInterval(burstInterval);

      burstInterval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          if (burstInterval) window.clearInterval(burstInterval);
          return;
        }

        const particleCount = 35 * (timeLeft / duration);
        scopedConfetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        scopedConfetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 380);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fireSectionConfetti();
          if (!loopInterval) {
            loopInterval = window.setInterval(fireSectionConfetti, 5000);
          }
        } else if (loopInterval) {
          window.clearInterval(loopInterval);
          loopInterval = undefined;
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      if (burstInterval) window.clearInterval(burstInterval);
      if (loopInterval) window.clearInterval(loopInterval);
      scopedConfetti.reset();
    };
  }, [wishboxCountdown.isClosed]);

  const countdownUnits = [
    ...(wishboxCountdown.days > 0 ? [['Days', wishboxCountdown.days] as const] : []),
    ['Hours', wishboxCountdown.hours] as const,
    ['Minutes', wishboxCountdown.minutes] as const,
    ['Seconds', wishboxCountdown.seconds] as const,
  ];

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-[#020202] px-5 py-32 text-white sm:px-8 md:px-12 min-h-[60vh] flex items-center justify-center overflow-hidden"
    >
      <style>{`
        @keyframes wishboxSpeckFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(0.92);
          }
          50% {
            transform: translate3d(0, -8px, 0) scale(1.08);
          }
        }
      `}</style>
      <Starfield />
      <canvas
        ref={confettiCanvasRef}
        className="absolute inset-0 z-[8] h-full w-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="group relative z-10 mx-auto w-full max-w-6xl">
        <DisintegratingBorder />

        <div className="relative z-10 flex w-full flex-col gap-6 overflow-hidden rounded-[40px] border border-pink-400/12 bg-[linear-gradient(135deg,rgba(63,11,34,0.94),rgba(34,7,22,0.94))] p-5 shadow-[inset_0_0_20px_rgba(236,72,153,0.04),0_20px_45px_rgba(0,0,0,0.28)] md:flex-row md:items-center md:justify-between md:p-7">
          <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_18%_20%,rgba(244,114,182,0.12),transparent_26%),radial-gradient(circle_at_75%_40%,rgba(236,72,153,0.08),transparent_28%)]" />
          <div className="absolute -inset-x-1/4 top-1/2 z-0 h-40 -translate-y-1/2 animate-[pulse_10s_ease-in-out_infinite] bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.12),transparent_62%)] blur-3xl" />

          <div className="relative z-10 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-900/40 text-pink-300 shadow-[inset_0_0_15px_rgba(236,72,153,0.2)]">
              <Timer className="h-6 w-6" />
            </div>
            <div>
              <h2 className="mt-1 font-playfair text-3xl font-black leading-tight text-white drop-shadow-[0_0_12px_rgba(236,72,153,0.4)]">
                Time left Until Parmar Sir Birthday
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-pink-100/70">
                Jinhone humein inspire kiya, unke liye ek wish toh banti hai
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-h-[96px] items-center justify-center gap-4 rounded-[22px] border border-pink-500/20 bg-pink-950/40 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_rgba(236,72,153,0.15)] backdrop-blur-md">
              {wishboxCountdown.isClosed ? (
                <p className="m-0 text-center text-[22px] font-semibold leading-[1.2em] text-pink-300 drop-shadow-[0_0_12px_rgba(236,72,153,0.5)] sm:text-[26px] md:text-[30px]">
                  Happy Birthday Parmar Sir
                </p>
              ) : (
                countdownUnits.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex min-w-[72px] select-none flex-col items-center justify-center gap-1"
                  >
                    <span className="block text-[40px] font-semibold leading-[1.2em] tabular-nums text-pink-300 drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
                      {String(value).padStart(2, '0')}
                    </span>
                    <span className="block text-[13px] font-semibold capitalize leading-[1.2em] text-pink-200/60">
                      {label}
                    </span>
                  </div>
                ))
              )}
            </div>

            {!wishboxCountdown.isClosed && (
              <button
                type="button"
                onClick={() => onOpenWishbox('view')}
                className="group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-pink-400/50 bg-gradient-to-r from-pink-500 to-rose-400 px-7 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(236,72,153,0.25)] transition-all hover:scale-105 hover:shadow-[0_12px_32px_rgba(236,72,153,0.4)] focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-white dark:border-pink-500/30 dark:from-pink-600 dark:to-rose-500 dark:focus:ring-offset-slate-950"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-full" />
                <Eye className="h-4 w-4" />
                <span>View Wishes</span>
              </button>
            )}
          </div>
        </div>

        {wishboxCountdown.isClosed && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => onOpenWishbox('view')}
              className="group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-pink-400/50 bg-gradient-to-r from-pink-500 to-rose-400 px-7 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(236,72,153,0.25)] transition-all hover:scale-105 hover:shadow-[0_12px_32px_rgba(236,72,153,0.4)] focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-white dark:border-pink-500/30 dark:from-pink-600 dark:to-rose-500 dark:focus:ring-offset-slate-950"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 ease-in-out group-hover:translate-x-full" />
              <Eye className="h-4 w-4" />
              <span>View Wishes</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

const Landing = () => {
  const { user, refreshUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [suppressMilestoneAutoOpen, setSuppressMilestoneAutoOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [wishboxOpen, setWishboxOpen] = useState(true);
  const [wishboxTab, setWishboxTab] = useState<'write' | 'view'>('write');
  const milestoneSessionKey = useMemo(
    () => `${YOUTUBE_MODAL_SESSION_KEY_PREFIX}:${user?.id ?? 'guest'}`,
    [user?.id],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasDismissedForSession = window.sessionStorage.getItem(milestoneSessionKey) === '1';
    setSuppressMilestoneAutoOpen(wasDismissedForSession);
  }, [milestoneSessionKey]);

  const handleOpenAuthModal = () => {
    setSuppressMilestoneAutoOpen(true);
    setWishboxOpen(false);
    setIsAuthModalOpen(true);
  };

  const handleOpenWishbox = (tab: 'write' | 'view') => {
    setSuppressMilestoneAutoOpen(true);
    setWishboxTab(tab);
    setWishboxOpen(true);
  };

  const handleWishSubmitted = () => {
    setWishboxOpen(false);
  };

  const handleMilestoneOpenChange = (nextOpen: boolean) => {
    setIsYoutubeModalOpen(nextOpen);

    if (typeof window === 'undefined') return;

    if (nextOpen) {
      return;
    }

    window.sessionStorage.setItem(milestoneSessionKey, '1');
    setSuppressMilestoneAutoOpen(true);
  };

  // Auto-open AuthModal if signin=true query param is present
  useEffect(() => {
    if (searchParams.get('signin') === 'true') {
      setSuppressMilestoneAutoOpen(true);
      setIsAuthModalOpen(true);
      // Clear the query param after opening modal
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 selection:bg-brand-accent selection:text-black bg-gradient-to-br from-white via-slate-50 to-indigo-100 dark:bg-gradient-to-br dark:from-plum-dark dark:via-purple-deep dark:to-midnight">
      {/* Theme Toggle - Fixed Position */}


      <main className="w-full min-h-[100dvh] relative">
        <HeroSection
          user={user}
          setIsAuthModalOpen={handleOpenAuthModal}
          showStudyPlanner={false}
          onOpenWishbox={handleOpenWishbox}
        />

        <WishboxCountdownBanner onOpenWishbox={handleOpenWishbox} />

        {/* Combined Apps & Community Section */}
        <section className="bg-transparent light:bg-[#311B92]/10 dark:bg-transparent px-8 md:px-12 py-28 relative z-10 overflow-hidden">
          <AppsGrid />

          {/* Wishbox card removed from the main section — gateway moved to navbar */}

          {/* Decorative blobs for the combined section */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#311B92]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#311B92]/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#311B92]/20 dark:via-slate-700 to-transparent my-16 opacity-50"></div>

          <CommunitySpotlight />
        </section>

        <div className="light:bg-[#311B92]/10">
          <ExternalResources />
        </div>
        <Footer />
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          void refreshUser(true);
        }}
      />

      <YoutubePromotionModal 
        open={isYoutubeModalOpen} 
        onOpenChange={handleMilestoneOpenChange} 
      />

      <BirthdayWishBoxModal
        open={wishboxOpen}
        onOpenChange={setWishboxOpen}
        initialTab={wishboxTab}
        onRequestSignIn={handleOpenAuthModal}
        onWishSubmitted={handleWishSubmitted}
      />
    </div>
  );
};

export default Landing;

