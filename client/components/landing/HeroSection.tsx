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
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-5 md:px-8 md:py-6">
                <div className="w-full max-w-[1400px] flex items-center justify-between">
                    {/* Logo and SAFAR Title */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="flex items-center justify-center rounded-full shadow-2xl shadow-black/25 dark:shadow-white/15">
                            <img loading="lazy"
                                src="/safar-logo.png.jpeg"
                                alt="Safar Logo"
                                className="w-10 h-10 md:w-[74px] md:h-[74px] rounded-full object-cover shadow-md"
                            />
                        </div>
                        <span className="text-2xl md:text-[40px] font-serif font-bold text-black dark:text-white tracking-tight">SAFAR</span>
                    </div>

                    {/* Profile Section with Theme Toggle */}
                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Theme Toggle Button - Refined Icon Button */}
                        <button
                            aria-label="Toggle Theme"
                            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center border-2 border-amber-300/30 dark:border-slate-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-400 dark:hover:border-slate-500 transition-all duration-300 cursor-pointer"
                            onClick={toggleTheme}
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
                        </button>

                        {/* Conditional: Sign In Button vs Profile Avatar */}
                        {user ? (
                            <Link to="/profile" className="w-[52px] h-[52px] rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md flex items-center justify-center p-0.5 border-2 border-amber-300/30 dark:border-slate-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-400 dark:hover:border-slate-500 transition-all duration-300 cursor-pointer overflow-hidden">
                                <img loading="lazy"
                                    alt="User Avatar"
                                    className="w-full h-full rounded-lg object-cover object-top"
                                    src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDpC23e9Ij3Kzg310AyhS08hUZzUO5wS83FP5YrPuwjRF6AdxBcC0qMEWdFAJiBHiiKEpJHNEbk9vqBSUUAUjgF2APRS9xFACSDScYRjzU5e2Jdzerz_s7hmwhryXd5GYbqUBly6WOzSLclpR9PSy-7IzNLc4H3bsD04CkD_UDuiADxphkdk_S6XJUWlkbEJLC8p79msm7_L_2qzmoVs8sriSKSPq99rcz8ANuarcX1JwGcgGg6NcLBVgUPi59TaljhiM80PD-94ds"}
                                />
                            </Link>
                        ) : (
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="px-5 py-2.5 md:px-7 md:py-3 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 text-white font-semibold text-sm md:text-base shadow-lg shadow-cyan-500/30 border-2 border-white/20 hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 relative overflow-hidden group"
                            >
                                <span className="relative z-10">Sign In</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Header / Hero with Video */}
            <header className="relative w-full min-h-screen flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                    {/* Static Background Image */}
                    <img loading="lazy"
                        src="/hero-background.png"
                        alt="Hero background"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Subtle Vignette Effect - keeps image clear, just slight edge darkening */}
                    <div className="absolute inset-0 z-[5] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.15) 100%)' }}></div>

                    {/* Dark film for light mode text contrast */}
                    <div className="absolute inset-0 bg-black/35 dark:bg-transparent z-[6]"></div>

                    <div className="absolute inset-0 bg-gradient-to-r from-slate-50/40 via-slate-50/20 to-transparent dark:from-midnight/80 dark:via-midnight/60 dark:to-transparent/20 z-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50/50 via-slate-50/10 to-transparent dark:from-midnight/80 dark:via-transparent dark:to-transparent z-10"></div>
                </div>
                <div className="relative z-20 w-full max-w-[1400px] px-6 md:px-8 mt-24 md:mt-12">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 drop-shadow-2xl">
                        <span className="block whitespace-normal md:whitespace-nowrap text-black dark:text-cyan-400 font-serif">Where preparation meets care—</span>
                        <span className="block whitespace-normal md:whitespace-nowrap text-black dark:text-cyan-400 font-serif mt-2">A kinder way to move Forward</span>
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl text-slate-800 dark:text-slate-100 font-bold mb-10 md:mb-12 max-w-xl md:max-w-2xl leading-relaxed">
                        A thoughtfully designed space to support your studies, consistency, and emotional well-being — all in one place.
                        Safar helps students stay focused, emotionally steady, and connected — especially when preparation feels heavy. Because "Your marks matter, but so does your mind"
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 md:gap-5 w-full sm:w-auto">
                        <Link
                            to="/dashboard"
                            className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 to-cyan-600 text-white px-8 py-4 md:px-10 md:py-5 rounded-full font-semibold text-base md:text-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 overflow-hidden shadow-lg shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/50 border-2 border-white/20"
                        >
                            <span className="relative z-10">Start your Safar</span>
                            <ArrowRight className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
                        </Link>
                    </div>
                </div>
            </header>
        </div>
    );
};

export default HeroSection;
