import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../utils/authService';
import AuthModal from '../components/AuthModal';
import ThemeToggle from '../components/ui/theme-toggle';

// Import extracted components
import HeroSection from '../components/landing/HeroSection';
import AppsGrid from '../components/landing/AppsGrid';
import CommunitySpotlight from '../components/landing/CommunitySpotlight';
import ExternalResources from '../components/landing/ExternalResources';
import Footer from '../components/landing/Footer';

const Landing = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

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

