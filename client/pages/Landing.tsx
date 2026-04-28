import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ui/theme-toggle';
import { AnimatePresence, motion } from 'framer-motion';

// Import extracted components
import HeroSection from '../components/landing/HeroSection';
import AppsGrid from '../components/landing/AppsGrid';
import CommunitySpotlight from '../components/landing/CommunitySpotlight';
import ExternalResources from '../components/landing/ExternalResources';
import Footer from '../components/landing/Footer';
import YoutubePromotionModal from '../components/landing/YoutubePromotionModal';
import BirthdayWishBoxModal from '../temporaryFeatures/birthdayWishBox/BirthdayWishBoxModal';

const YOUTUBE_MODAL_SESSION_KEY_PREFIX = 'youtube-modal:auto-open-dismissed';

const Landing = () => {
  const { user, refreshUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [suppressMilestoneAutoOpen, setSuppressMilestoneAutoOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
  const [wishboxOpen, setWishboxOpen] = useState(false);
  const [wishboxTab, setWishboxTab] = useState<'write' | 'view'>('write');
  const [wishboxIntroOpen, setWishboxIntroOpen] = useState(false);
  const [hasShownWishboxIntro, setHasShownWishboxIntro] = useState(false);
  const milestoneSessionKey = useMemo(
    () => `${YOUTUBE_MODAL_SESSION_KEY_PREFIX}:${user?.id ?? 'guest'}`,
    [user?.id],
  );
  const wishboxIntroCopy = useMemo(
    () => ({
      eyebrow: 'Birthday Wishbox for Parmar Sir',
      title: 'Share one heartfelt wish',
      description:
        'Write a warm birthday message for your teacher. Choose public if you want it on the wall, or anonymous if it should stay private.',
      note: 'One account can submit one wish. Public wishes appear only after moderation.',
      primaryAction: 'write',
      secondaryAction: 'view',
    }),
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasDismissedForSession = window.sessionStorage.getItem(milestoneSessionKey) === '1';
    setSuppressMilestoneAutoOpen(wasDismissedForSession);
  }, [milestoneSessionKey]);

  const handleOpenAuthModal = () => {
    setSuppressMilestoneAutoOpen(true);
    setIsAuthModalOpen(true);
  };

  const handleOpenWishbox = (tab: 'write' | 'view') => {
    setSuppressMilestoneAutoOpen(true);
    setWishboxIntroOpen(false);
    setWishboxTab(tab);
    setWishboxOpen(true);
  };

  const handleDismissWishboxIntro = () => {
    setWishboxIntroOpen(false);
  };

  const handleIntroWishboxAction = (mode: 'write' | 'view') => {
    handleOpenWishbox(mode);
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

  useEffect(() => {
    if (hasShownWishboxIntro || isAuthModalOpen || wishboxOpen) return;
    if (searchParams.get('signin') === 'true') return;

    const timer = window.setTimeout(() => {
      setSuppressMilestoneAutoOpen(true);
      setHasShownWishboxIntro(true);
      setWishboxIntroOpen(true);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [hasShownWishboxIntro, isAuthModalOpen, searchParams, wishboxOpen]);

  useEffect(() => {
    if (!wishboxIntroOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleDismissWishboxIntro();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [wishboxIntroOpen]);

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
      />

      <AnimatePresence>
        {wishboxIntroOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07110D]/76 px-4 py-6 text-white backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="presentation"
            onMouseDown={handleDismissWishboxIntro}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="wishbox-intro-title"
              aria-describedby="wishbox-intro-description"
              onMouseDown={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[560px] overflow-hidden rounded-[32px] border border-white/12 bg-[#07100D] shadow-[0_34px_120px_rgba(0,0,0,0.64)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(244,114,182,0.30),transparent_34%),radial-gradient(circle_at_96%_18%,rgba(74,222,128,0.24),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.025)_42%,rgba(16,185,129,0.07))]" />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-pink-200/70 to-transparent" />
              <div className="pointer-events-none absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-emerald-200/28 to-transparent" />

              <button
                type="button"
                onClick={handleDismissWishboxIntro}
                className="absolute right-5 top-5 z-30 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs font-bold tracking-wide text-white/70 backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
                aria-label="Close Wishbox announcement"
              >
                Close
              </button>

              <div className="relative z-10 px-6 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.3 }}
                  className="mb-7 inline-flex rounded-full border border-pink-200/20 bg-pink-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-pink-100/90"
                >
                  {wishboxIntroCopy.eyebrow}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.36 }}
                  className="max-w-[30rem]"
                >
                  <h2
                    id="wishbox-intro-title"
                    className="text-[2.35rem] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[3.1rem]"
                  >
                    {wishboxIntroCopy.title}
                  </h2>

                  <p
                    id="wishbox-intro-description"
                    className="mt-5 text-[15px] font-medium leading-7 text-emerald-50/78 sm:text-base"
                  >
                    {wishboxIntroCopy.description}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.36 }}
                  className="mt-7 rounded-[24px] border border-emerald-200/12 bg-emerald-300/[0.055] p-4 text-sm font-medium leading-6 text-emerald-50/78"
                >
                  <span className="font-extrabold text-pink-100">Simple rule:</span> {wishboxIntroCopy.note}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.36 }}
                  className="mt-7 flex flex-col gap-3 sm:flex-row"
                >
                  <motion.button
                    type="button"
                    onClick={() => handleIntroWishboxAction('write')}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-pink-200 via-rose-200 to-emerald-200 px-5 py-3.5 text-sm font-black text-[#07100D] shadow-[0_18px_44px_rgba(244,114,182,0.22)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-pink-100"
                  >
                    Write a Wish
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => handleIntroWishboxAction('view')}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-full border border-emerald-200/16 bg-emerald-300/[0.06] px-5 py-3.5 text-sm font-extrabold text-emerald-50 transition hover:bg-emerald-300/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-100/50 sm:flex-none"
                  >
                    View Wishes
                  </motion.button>
                </motion.div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
