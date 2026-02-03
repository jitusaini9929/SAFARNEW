import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeroSectionProps {
    user: any;
    setIsAuthModalOpen: (isOpen: boolean) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ user, setIsAuthModalOpen }) => {
    const { theme, toggleTheme } = useTheme();
    const video1Ref = useRef<HTMLVideoElement>(null);
    const video2Ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Smooth Cross-fade Loop Logic
        const v1 = video1Ref.current;
        const v2 = video2Ref.current;

        if (!v1 || !v2) return;

        // Set playback rate & initial state
        v1.playbackRate = 0.5;
        v2.playbackRate = 0.5;

        // We'll track the active video index
        let activeVideoIndex = 1; // 1 means v1 is active, 2 means v2 is active

        const loopCheck = () => {
            const active = activeVideoIndex === 1 ? v1 : v2;
            const next = activeVideoIndex === 1 ? v2 : v1;

            // Trigger transition at 2.5s (0.5s before end of 3s loop)
            if (active.currentTime >= 2.5) {
                // Prepare next video
                next.currentTime = 0;
                next.play();

                // Visual Cross-fade
                next.style.opacity = '1';
                active.style.opacity = '0';

                // Schedule cleanup of previous video to save resources
                const prev = active;
                setTimeout(() => {
                    prev.pause();
                    prev.currentTime = 0;
                }, 1000); // Wait for 1s transition to finish

                // Swap active index
                activeVideoIndex = activeVideoIndex === 1 ? 2 : 1;
            }

            requestAnimationFrame(loopCheck);
        };

        const animationFrameId = requestAnimationFrame(loopCheck);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="relative w-full min-h-screen">
            {/* Simplified Header - Scrollable (Absolute) */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
                {/* Logo and SAFAR Title */}
                <div className="flex items-center gap-3 md:gap-4">
                    <img
                        src="/safar-logo.png.jpeg"
                        alt="Safar Logo"
                        className="w-12 h-12 md:w-[90px] md:h-[90px] rounded-full border-2 border-black dark:border-white object-cover shadow-lg shadow-brand-accent/20 transition-all"
                    />
                    <span className="text-2xl md:text-[40px] font-serif font-bold text-black dark:text-white tracking-tight">SAFAR</span>
                </div>

                {/* Profile Section with Theme Toggle */}
                <div className="flex items-center gap-3 md:gap-4">
                    {/* Theme Toggle Button */}
                    <button
                        aria-label="Toggle Theme"
                        className="p-2 md:p-3 rounded-full bg-white/80 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 shadow-lg border-2 border-gray-200 dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
                        onClick={toggleTheme}
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" /> : <Moon className="w-5 h-5 md:w-6 md:h-6 text-slate-700" />}
                    </button>

                    {/* Conditional: Sign In Button vs Profile Avatar */}
                    {user ? (
                        <Link to="/profile" className="flex items-center justify-center p-1 md:p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 backdrop-blur-xl shadow-2xl transition-all cursor-pointer group hover:scale-105 active:scale-95">
                            <img
                                alt="User Avatar"
                                className="w-12 h-12 md:w-20 md:h-20 rounded-full object-cover shadow-md"
                                src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDpC23e9Ij3Kzg310AyhS08hUZzUO5wS83FP5YrPuwjRF6AdxBcC0qMEWdFAJiBHiiKEpJHNEbk9vqBSUUAUjgF2APRS9xFACSDScYRjzU5e2Jdzerz_s7hmwhryXd5GYbqUBly6WOzSLclpR9PSy-7IzNLc4H3bsD04CkD_UDuiADxphkdk_S6XJUWlkbEJLC8p79msm7_L_2qzmoVs8sriSKSPq99rcz8ANuarcX1JwGcgGg6NcLBVgUPi59TaljhiM80PD-94ds"}
                            />
                        </Link>
                    ) : (
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-xs md:text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </div>

            {/* Header / Hero with Video */}
            <header className="relative w-full min-h-screen flex items-center">
                <div className="absolute inset-0 z-0">
                    {/* Dual Video Setup for Cross-fade Loop */}
                    <video
                        ref={video1Ref}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                        style={{ opacity: 1, zIndex: 1 }}
                    >
                        <source src="/finak.mp4" type="video/mp4" />
                    </video>
                    <video
                        ref={video2Ref}
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                        style={{ opacity: 0, zIndex: 2 }}
                    >
                        <source src="/finak.mp4" type="video/mp4" />
                    </video>

                    {/* Subtle Vignette Effect - keeps video clear, just slight edge darkening */}
                    <div className="absolute inset-0 z-[5] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.15) 100%)' }}></div>

                    {/* Dark film for light mode text contrast */}
                    <div className="absolute inset-0 bg-black/35 dark:bg-transparent z-[6]"></div>

                    <div className="absolute inset-0 bg-gradient-to-r from-slate-50/60 via-slate-50/40 to-transparent dark:from-midnight/80 dark:via-midnight/60 dark:to-transparent/20 z-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50/70 via-slate-50/30 to-transparent dark:from-midnight/80 dark:via-transparent dark:to-transparent z-10"></div>
                </div>
                <div className="relative z-20 px-6 md:px-16 lg:px-20 max-w-5xl mt-24 md:mt-12">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 drop-shadow-2xl">
                        <span className="block whitespace-normal md:whitespace-nowrap text-black font-serif">Where preparation meets care-</span>
                        <span className="block whitespace-normal md:whitespace-nowrap text-black font-serif mt-2">A kinder way to move Forward</span>
                    </h1>
                    <p className="text-base md:text-xl text-slate-600 dark:text-slate-300 mb-8 md:mb-10 max-w-xl md:max-w-2xl leading-relaxed drop-shadow-lg">
                        A thoughtfully designed space to support your studies, consistency, and emotional well-being — all in one place.
                        Safar helps students stay focused, emotionally steady, and connected — especially when preparation feels heavy. Because " Your marks matter, but so does your mind"
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 md:gap-5 w-full sm:w-auto">
                        <Link to="/dashboard" className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg transition-all hover:scale-105 button-glow shadow-lg shadow-indigo-500/30">
                            Start your Safar
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Link>

                    </div>
                </div>
            </header>
        </div>
    );
};

export default HeroSection;
