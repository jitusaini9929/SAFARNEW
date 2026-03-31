import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ui/theme-toggle';
import { Trophy } from 'lucide-react';

// Import extracted components
import HeroSection from '../components/landing/HeroSection';
import AppsGrid from '../components/landing/AppsGrid';
import CommunitySpotlight from '../components/landing/CommunitySpotlight';
import ExternalResources from '../components/landing/ExternalResources';
import Footer from '../components/landing/Footer';
import Milestone100KModal from '../components/landing/Milestone100KModal';
import { triggerFireworks, triggerSideCannons } from '../components/ui/confetti';

const MILESTONE_MODAL_SESSION_KEY_PREFIX = 'milestone100k:auto-open-dismissed';

const Landing = () => {
  const { user, refreshUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [suppressMilestoneAutoOpen, setSuppressMilestoneAutoOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [is100KModalOpen, setIs100KModalOpen] = useState(false);
  const milestoneSessionKey = useMemo(
    () => `${MILESTONE_MODAL_SESSION_KEY_PREFIX}:${user?.id ?? 'guest'}`,
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
    setIs100KModalOpen(nextOpen);

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
      setIs100KModalOpen(true);

      // Fireworks and side cannons should appear above the modal overlay.
      window.setTimeout(() => {
        triggerFireworks();
        triggerSideCannons();
      }, 100);
    }, 750);

    return () => window.clearTimeout(timer);
  }, [suppressMilestoneAutoOpen, isAuthModalOpen]);

  return (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 selection:bg-brand-accent selection:text-black bg-gradient-to-br from-white via-slate-50 to-indigo-100 dark:bg-gradient-to-br dark:from-plum-dark dark:via-purple-deep dark:to-midnight">
      {/* Theme Toggle - Fixed Position */}


      <main className="w-full min-h-[100dvh] relative">
        <HeroSection user={user} setIsAuthModalOpen={handleOpenAuthModal} />
        
        <div className="max-w-6xl mx-auto px-4 md:px-10 py-6 md:py-10 flex justify-center relative z-20">
          <button 
            title="Open 100K Celebration"
            onClick={() => setIs100KModalOpen(true)} 
            className="inline-flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 rounded-full bg-gradient-to-br from-amber-100 to-amber-300 dark:from-amber-900/40 dark:to-amber-700/40 border border-amber-300/50 dark:border-amber-500/30 text-amber-950 dark:text-amber-100 font-bold shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all"
          >
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>100,000 YouTube Subscribers</span>
            <span className="flex w-2 h-2 rounded-full bg-red-500 animate-pulse ml-2" />
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

      <Milestone100KModal 
        open={is100KModalOpen} 
        onOpenChange={handleMilestoneOpenChange} 
      />
    </div>
  );
};

export default Landing;
