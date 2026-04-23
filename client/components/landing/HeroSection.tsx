import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import LanguageToggle from '../LanguageToggle';
import AnimatedBorderPill from './AnimatedBorderPill';
import HeroAnimation from './HeroAnimation';

interface HeroSectionProps {
    user: any;
    setIsAuthModalOpen: (isOpen: boolean) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ user, setIsAuthModalOpen }) => {
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const video1Ref = useRef<HTMLVideoElement>(null);
    const video2Ref = useRef<HTMLVideoElement>(null);
    const titlePart1 = t('landing.title_part1');
    const titlePart2 = t('landing.title_part2');
    const subtitleRaw = t('landing.subtitle');
    const supportSubject = 'Support Request from SAFAR website';
    const supportSenderEmail = user?.email ? String(user.email).trim() : '';
    const supportBody = [
        'Hi SAFAR team,',
        '',
        'I need help with:',
        '',
        `Sender Email: ${supportSenderEmail || '[add your email]'}`,
    ].join('\n');
    const supportGmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent('onesaffar@gmail.com')}&su=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

    const normalize = (value: string) => value.trim().toLowerCase();
    const subtitleLines = subtitleRaw.split('\n');
    const subtitleBody =
        subtitleLines.length >= 2 &&
            normalize(subtitleLines[0]) === normalize(titlePart1) &&
            normalize(subtitleLines[1]) === normalize(titlePart2)
            ? subtitleLines.slice(2).join('\n').trim()
            : subtitleRaw;

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
        <div className="relative w-full min-h-[100dvh]">
            {/* Simplified Header - Scrollable (Absolute) */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-4 md:px-8 md:py-5 backdrop-blur-md bg-white/10 dark:bg-black/10 border-b border-white/20 dark:border-white/5">
                <div className="w-full max-w-[1400px] flex items-center justify-between">
                    {/* Logo and SAFAR Title */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="flex items-center justify-center rounded-full shadow-2xl shadow-black/25 dark:shadow-white/15">
                            <img loading="lazy"
                                src="/safar-logo.png.webp"
                                alt="Safar Logo"
                                className="w-10 h-10 md:w-[74px] md:h-[74px] rounded-full object-cover shadow-md border-[4px] md:border-[5px] border-gray-700"
                            />
                        </div>
                        <span className="text-2xl md:text-[40px] font-playfair font-bold text-black dark:text-white tracking-tight">SAFAR</span>
                    </div>

                    <div className="hidden md:flex items-center md:gap-4 md:ml-auto md:mr-6 md:-translate-x-[30%]">
                        <Link
                            to="/updates"
                            className="inline-flex items-center px-[14px] py-[10px] rounded-lg text-black dark:text-white/80 font-semibold text-[17px] leading-none hover:text-black dark:hover:text-white transition-all duration-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                        >
                            Updates
                        </Link>
                        <a
                            href={supportGmailHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-[14px] py-[10px] rounded-lg text-black dark:text-white/80 font-semibold text-[17px] leading-none hover:text-black dark:hover:text-white transition-all duration-200 hover:scale-105 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                        >
                            Contact
                        </a>
                    </div>

                    {/* Profile Section with Theme Toggle */}
                    <div className="flex items-center gap-4 md:gap-5 md:-translate-x-[30%]">
                        {/* Pill-shaped Theme Toggle Switch */}
                        <button
                            aria-label="Toggle Theme"
                            onClick={toggleTheme}
                            className="relative w-[52px] h-[28px] rounded-full transition-colors duration-300 focus:outline-none cursor-pointer"
                            style={{
                                backgroundColor: theme === 'dark' ? '#4B5563' : 'rgba(0,0,0,0.35)',
                            }}
                        >
                            <span
                                className="absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-transform duration-300"
                                style={{
                                    transform: theme === 'dark' ? 'translateX(24px)' : 'translateX(0px)',
                                }}
                            />
                        </button>

                        <LanguageToggle className="!text-black dark:!text-white/80 text-[17px] px-[14px] py-[10px] rounded-lg transition-all duration-200 hover:scale-105 hover:bg-slate-100/80 dark:hover:bg-slate-800/80" />

                        {user ? (
                            /* Profile icon - Hover padding effect */
                            <Link
                                to="/profile"
                                className="flex items-center justify-center w-[52px] h-[52px] p-2 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                            >
                                <img loading="lazy"
                                    alt="User Avatar"
                                    className="w-full h-full rounded-full object-cover object-top"
                                    src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDpC23e9Ij3Kzg310AyhS08hUZzUO5wS83FP5YrPuwjRF6AdxBcC0qMEWdFAJiBHiiKEpJHNEbk9vqBSUUAUjgF2APRS9xFACSDScYRjzU5e2Jdzerz_s7hmwhryXd5GYbqUBly6WOzSLclpR9PSy-7IzNLc4H3bsD04CkD_UDuiADxphkdk_S6XJUWlkbEJLC8p79msm7_L_2qzmoVs8sriSKSPq99rcz8ANuarcX1JwGcgGg6NcLBVgUPi59TaljhiM80PD-94ds"}
                                />
                            </Link>
                        ) : (
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="px-6 py-2 md:px-8 md:py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold text-sm md:text-base transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                                <span>{t('auth.signin')}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Header / Hero with Video */}
            <header className="relative w-full min-h-[100dvh] flex items-start justify-center">
                <div className="absolute inset-0 z-0">
                    <HeroAnimation />

                    {/* Subtle Vignette Effect - keeps image clear, just slight edge darkening */}
                    <div className="absolute inset-0 z-[5] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.15) 100%)' }}></div>

                    {/* Removed dark film — text contrast handled by drop-shadow */}

                    <div
                        className="absolute inset-0 z-10"
                        style={{
                            background:
                                "linear-gradient(100deg, rgba(49,25,178,0.14) 0%, rgba(49,25,178,0.08) 38%, rgba(0,0,0,0) 72%)",
                        }}
                    ></div>
                    <div
                        className="absolute inset-0 z-10"
                        style={{
                            background:
                                "linear-gradient(180deg, rgba(49,25,178,0.09) 0%, rgba(49,25,178,0.05) 35%, rgba(49,25,178,0.12) 100%)",
                        }}
                    ></div>
                </div>
                <div className="relative z-20 w-full max-w-[1400px] px-6 md:px-8 mt-[32vh] md:mt-[24vh] flex flex-col items-start text-left">
                    {/* Glassmorphic Scrim / Soft Glow - Left Aligned */}
                    <div className="absolute top-1/2 left-0 -translate-x-[15%] -translate-y-1/2 w-[110%] h-[150%] z-[-1] bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.8)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_left,rgba(0,0,0,0.8)_0%,transparent_70%)] pointer-events-none blur-3xl opacity-90"></div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-playfair font-normal leading-tight mb-6 drop-shadow-md">
                        <span className="block whitespace-normal md:whitespace-nowrap font-extrabold text-black dark:text-white">{titlePart1}</span>
                        <span className="block whitespace-normal md:whitespace-nowrap font-medium text-black dark:text-white mt-2">{titlePart2}</span>
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl font-sans text-slate-800 dark:text-slate-100 mb-10 md:mb-12 max-w-[600px] leading-8 whitespace-pre-line">
                        {subtitleBody}
                    </p>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 md:gap-6 justify-start w-full sm:w-auto mt-2">
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center justify-center gap-3 bg-indigo-600 dark:bg-[#0099ff] text-white px-7 py-3.5 md:px-10 md:py-4 rounded-full text-base md:text-lg font-semibold shadow-lg shadow-indigo-900/20 dark:shadow-blue-900/20 active:scale-[0.98] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl group"
                        >
                            <span>{t('landing.start_btn')}</span>
                            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>

                        <Link
                            to="/study/planner"
                            className="group relative flex items-center justify-center gap-3 bg-transparent border-2 border-slate-800 text-slate-900 dark:border-emerald-500 dark:text-emerald-400 px-8 py-3.5 md:px-10 md:py-4 rounded-full font-bold text-base md:text-lg transition-all duration-300 hover:-translate-y-1 active:translate-y-0 hover:bg-slate-900/5 dark:hover:bg-emerald-500/10 cursor-pointer"
                        >
                            <span className="relative z-10">Try Study Planner</span>
                            <ArrowRight className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>

                    </div>
                </div>
            </header>
        </div>
    );
};

export default HeroSection;
