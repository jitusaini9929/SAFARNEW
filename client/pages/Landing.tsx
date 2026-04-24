import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ui/theme-toggle';
import { Youtube } from 'lucide-react';

// Import extracted components
import HeroSection from '../components/landing/HeroSection';
import AppsGrid from '../components/landing/AppsGrid';
import CommunitySpotlight from '../components/landing/CommunitySpotlight';
import ExternalResources from '../components/landing/ExternalResources';
import Footer from '../components/landing/Footer';
import YoutubePromotionModal from '../components/landing/YoutubePromotionModal';

const YOUTUBE_MODAL_SESSION_KEY_PREFIX = 'youtube-modal:auto-open-dismissed';

const Landing = () => {
  const { user, refreshUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [suppressMilestoneAutoOpen, setSuppressMilestoneAutoOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
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
    setIsAuthModalOpen(true);
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
    if (suppressMilestoneAutoOpen || isAuthModalOpen) return;

    const timer = window.setTimeout(() => {
      setIsYoutubeModalOpen(true);
    }, 750);

    return () => window.clearTimeout(timer);
  }, [suppressMilestoneAutoOpen, isAuthModalOpen]);

  return (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 selection:bg-brand-accent selection:text-black bg-gradient-to-br from-white via-slate-50 to-indigo-100 dark:bg-gradient-to-br dark:from-plum-dark dark:via-purple-deep dark:to-midnight">
      {/* Theme Toggle - Fixed Position */}


      <main className="w-full min-h-[100dvh] relative">
        <HeroSection
          user={user}
          setIsAuthModalOpen={handleOpenAuthModal}
          showStudyPlanner={false}
        />

        <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10 flex justify-center relative z-20">
          <button 
            title="Open Latest Video"
            onClick={() => setIsYoutubeModalOpen(true)} 
            className="inline-flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 rounded-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-950/40 dark:to-red-900/40 border border-red-200 dark:border-red-500/30 text-rose-950 dark:text-red-100 font-bold shadow-lg shadow-red-500/10 hover:shadow-red-500/20 hover:-translate-y-0.5 transition-all"
          >
            <Youtube className="w-5 h-5 text-red-600 dark:text-red-500" />
            <span>Watch Latest Dhyan Video</span>
            <span className="flex w-2 h-2 rounded-full bg-red-600 dark:bg-red-500 animate-[pulse_2s_ease-in-out_infinite] ml-2" />
          </button>
        </div>

        {/* Combined Apps & Community Section */}
        <section className="bg-transparent light:bg-[#311B92]/10 dark:bg-transparent px-8 md:px-12 py-28 relative z-10 overflow-hidden">
          <AppsGrid />

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
    </div>
  );
};

export default Landing;
