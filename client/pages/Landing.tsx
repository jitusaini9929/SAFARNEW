import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../utils/authService';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ui/theme-toggle';
import { ExternalLink, X } from 'lucide-react';

// Import extracted components
import HeroSection from '../components/landing/HeroSection';
import AppsGrid from '../components/landing/AppsGrid';
import CommunitySpotlight from '../components/landing/CommunitySpotlight';
import ExternalResources from '../components/landing/ExternalResources';
import Footer from '../components/landing/Footer';

const LANDING_UPDATE_NOTIFICATION = {
  title: 'New Video Is Live.',
  youtubeUrl: 'https://youtu.be/FRvwIgCs6T8?si=jQYpQXaKS9TkOIxf',
};

const getYoutubeVideoId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
};

const getSkipStorageKey = (userId: string, videoId: string) =>
  `landing.updateOverlay.skipped:${userId}:${videoId}`;

const Landing = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false);
  const [hasShownUpdateOverlay, setHasShownUpdateOverlay] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const updateVideoId = getYoutubeVideoId(LANDING_UPDATE_NOTIFICATION.youtubeUrl);
  const primaryUpdateThumbnail = updateVideoId
    ? `https://img.youtube.com/vi/${updateVideoId}/maxresdefault.jpg`
    : '/meditation-silhouette.png';
  const fallbackUpdateThumbnail = updateVideoId
    ? `https://img.youtube.com/vi/${updateVideoId}/hqdefault.jpg`
    : '/meditation-silhouette.png';
  const [updateThumbnailSrc, setUpdateThumbnailSrc] = useState(primaryUpdateThumbnail);

  // Auto-open AuthModal if signin=true query param is present
  useEffect(() => {
    if (searchParams.get('signin') === 'true') {
      setIsAuthModalOpen(true);
      // Clear the query param after opening modal
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        if (userData && userData.user) {
          setUser(userData.user);
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && !hasShownUpdateOverlay) {
      const userId = String(user.id || "");
      const currentVideoId = updateVideoId || "default-video";
      const skipKey = getSkipStorageKey(userId, currentVideoId);
      const wasSkipped = typeof window !== "undefined" && window.localStorage.getItem(skipKey) === "1";

      setUpdateThumbnailSrc(primaryUpdateThumbnail);
      setShowUpdateOverlay(!wasSkipped);
      setHasShownUpdateOverlay(true);
    }
  }, [user, hasShownUpdateOverlay, primaryUpdateThumbnail, updateVideoId]);

  useEffect(() => {
    if (!showUpdateOverlay) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUpdateOverlay(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showUpdateOverlay]);

  const handleTakeMeThere = () => {
    window.open(LANDING_UPDATE_NOTIFICATION.youtubeUrl, '_blank', 'noopener,noreferrer');
    setShowUpdateOverlay(false);
  };

  const handleSkipUpdateOverlay = () => {
    const userId = String(user?.id || "");
    const currentVideoId = updateVideoId || "default-video";
    if (typeof window !== "undefined" && userId) {
      window.localStorage.setItem(getSkipStorageKey(userId, currentVideoId), "1");
    }
    setShowUpdateOverlay(false);
  };

  return (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-100 selection:bg-brand-accent selection:text-black bg-slate-50 dark:bg-midnight">
      {/* Theme Toggle - Fixed Position */}


      <main className="w-full min-h-[100dvh] relative">
        <HeroSection user={user} setIsAuthModalOpen={setIsAuthModalOpen} />

        {/* Combined Apps & Community Section */}
        <section className="bg-gradient-to-br from-rose-100 via-pink-50 to-purple-100 dark:from-plum-dark dark:via-purple-deep dark:to-midnight px-8 md:px-12 py-28 relative z-10 overflow-hidden">
          <AppsGrid />

          {/* Decorative blobs for the combined section */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent my-16 opacity-50"></div>

          <CommunitySpotlight />
        </section>

        <ExternalResources />
        <Footer />
      </main>

      {/* Logged-in User Notification Overlay */}
      {showUpdateOverlay && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowUpdateOverlay(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-update-title"
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#15151A] border border-slate-200 dark:border-white/10 shadow-2xl p-5 md:p-6 animate-in zoom-in-95 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  New update
                </p>
                <h2 id="landing-update-title" className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {LANDING_UPDATE_NOTIFICATION.title}
                </h2>
              </div>
              <button
                onClick={() => setShowUpdateOverlay(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <span className="sr-only">Close update notification</span>
                <X className="w-5 h-5" />
              </button>
            </div>

            <a
              href={LANDING_UPDATE_NOTIFICATION.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:opacity-95 transition-opacity"
            >
              <img
                loading="lazy"
                src={updateThumbnailSrc}
                alt="Latest Dhyan YouTube video thumbnail"
                className="w-full h-52 md:h-64 object-cover"
                onError={() => {
                  if (updateThumbnailSrc !== fallbackUpdateThumbnail) {
                    setUpdateThumbnailSrc(fallbackUpdateThumbnail);
                    return;
                  }
                  setUpdateThumbnailSrc('/meditation-silhouette.png');
                }}
              />
            </a>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={handleSkipUpdateOverlay}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-white/20 bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleTakeMeThere}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 dark:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-emerald-400 transition-colors"
              >
                Take me there
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          // Refresh user state
          authService.getCurrentUser().then((userData) => {
            if (userData && userData.user) {
              setUser(userData.user);
            }
          });
        }}
      />
    </div>
  );
};

export default Landing;

