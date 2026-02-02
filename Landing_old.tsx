import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  ArrowRight,
  Sun,
  Moon,
  Flame,
  ExternalLink,
  Play,
} from 'lucide-react';
import { authService } from '../utils/authService';
import youtubeImg from "@/assets/youtube-thumbnail.png";
import courseImg from "@/assets/course-thumbnail.png";

const Landing = () => {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = React.useState<any>(null);
  const video1Ref = React.useRef<HTMLVideoElement>(null);
  const video2Ref = React.useRef<HTMLVideoElement>(null);

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
    <div className="min-h-screen font-sans text-slate-800 dark:text-slate-100 selection:bg-[#6EE7B7] selection:text-black bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <main className="w-full min-h-screen relative">

        {/* Simplified Header - Scrollable (Absolute) */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
          {/* Logo and SAFAR Title */}
          <div className="flex items-center gap-4">
            <img
              src="/safar-logo.png.jpeg"
              alt="Safar Logo"
              className="w-[90px] h-[90px] rounded-full border-2 border-black dark:border-white object-cover shadow-lg shadow-[#6EE7B7]/20"
            />
            <span className="text-[40px] font-sans font-bold text-black dark:text-white tracking-tight">SAFAR</span>
          </div>

          {/* Profile Section - Distinct & Bold */}
          <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center justify-center p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 backdrop-blur-xl shadow-2xl transition-all cursor-pointer group hover:scale-105 active:scale-95">
              <img
                alt="User Avatar"
                className="w-20 h-20 rounded-full object-cover shadow-md"
                src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDpC23e9Ij3Kzg310AyhS08hUZzUO5wS83FP5YrPuwjRF6AdxBcC0qMEWdFAJiBHiiKEpJHNEbk9vqBSUUAUjgF2APRS9xFACSDScYRjzU5e2Jdzerz_s7hmwhryXd5GYbqUBly6WOzSLclpR9PSy-7IzNLc4H3bsD04CkD_UDuiADxphkdk_S6XJUWlkbEJLC8p79msm7_L_2qzmoVs8sriSKSPq99rcz8ANuarcX1JwGcgGg6NcLBVgUPi59TaljhiM80PD-94ds"}
              />
            </Link>
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

            <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC]/60 via-[#F8FAFC]/40 to-transparent dark:from-[#0B0F19]/80 dark:via-[#0B0F19]/60 dark:to-transparent/20 z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC]/70 via-[#F8FAFC]/30 to-transparent dark:from-[#0B0F19]/80 dark:via-transparent dark:to-transparent z-10"></div>
          </div>
          <div className="relative z-20 px-8 md:px-16 lg:px-20 max-w-4xl mt-12">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-serif font-bold leading-[1.1] text-slate-900 dark:text-white mb-6 drop-shadow-2xl">
              <span className="inline-block scale-105">Where preparation meets care-</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6EE7B7] to-teal-200 text-glow font-sans not-italic" style={{ WebkitTextStroke: '1.3px rgba(110, 231, 183, 0.9)' }}>A kinder way to move Forward</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl leading-relaxed drop-shadow-lg">
              A thoughtfully designed space to support your studies, consistency, and emotional well-being — all in one place.
              Safar helps students stay focused, emotionally steady, and connected — especially when preparation feels heavy. Because " Your marks matter, but so does your mind"
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <Link to="/dashboard" className="group flex items-center justify-center gap-2 bg-gradient-to-r from-[#6EE7B7] to-teal-300 text-black px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 button-glow shadow-lg shadow-[#6EE7B7]/30">
                Start your Safar
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/register" className="flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-white/5 backdrop-blur-md border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white px-8 py-4 rounded-full font-medium text-lg transition-all hover:bg-slate-300/50 dark:hover:bg-white/10">
                Learn More
              </Link>
            </div>
          </div>


        </header>

        {/* Apps Section */}
        <section className="bg-[#F8FAFC] dark:bg-[#0B0F19] px-8 md:px-12 py-16 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">Our Apps</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                A suite of tools designed to support your academic journey and mental well-being
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Nishta Skeuomorphic Card */}
              <Link to="/nishtha" className="flex flex-col items-center justify-center gap-6 group py-8">
                <div className="skeuo-outer-rim w-48 h-48 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105 active:scale-95 shadow-2xl">
                  <div className="skeuo-plate w-40 h-40 rounded-full flex items-center justify-center">
                    <div className="skeuo-ring w-32 h-32 rounded-full flex items-center justify-center">
                      <div className="knob-metal w-24 h-24 rounded-full flex items-center justify-center relative shadow-inner">
                        <Flame className="w-10 h-10 text-black fill-black drop-shadow-md filter transition-transform group-hover:scale-110" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 tracking-wide group-hover:text-[#6EE7B7] transition-colors">Nishtha</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Wellness Companion</p>
                </div>
              </Link>

              {/* Focus Timer Card */}
              {/* Focus Timer Skeuomorphic Card */}
              <Link to="/study" className="flex flex-col items-center justify-center gap-6 group py-8">
                <div className="timer-bg w-48 h-48 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105 active:scale-95 shadow-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(234,179,8,0.15),transparent_70%)]"></div>

                  {/* Hourglass Construction - Geometric X Shape */}
                  <div className="relative transform group-hover:rotate-180 transition-transform duration-700 ease-in-out scale-[2.5]">
                    <div className="relative w-[40px] h-[60px] flex flex-col items-center justify-center">
                      {/* Glass Outline (SVG) */}
                      <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 z-20 drop-shadow-lg">
                        <path d="M5 2 L35 2 L21 29 L21 31 L35 58 L5 58 L19 31 L19 29 Z" stroke="white" strokeWidth="3" strokeLinejoin="round" />
                      </svg>

                      {/* Top Sand Container */}
                      <div className="absolute top-[2px] w-[30px] h-[28px] overflow-hidden z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}>
                        <div className="w-full h-full bg-white origin-bottom transition-transform duration-[3000ms] group-hover:scale-y-0"></div>
                      </div>

                      {/* Bottom Sand Container */}
                      <div className="absolute bottom-[2px] w-[30px] h-[28px] overflow-hidden z-10" style={{ clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }}>
                        <div className="w-full h-full bg-white origin-bottom transition-transform duration-[3000ms] scale-y-0 group-hover:scale-y-100"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 tracking-wide group-hover:text-yellow-500 transition-colors focus-title">Focus Timer</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Productivity</p>
                </div>
              </Link>

              {/* Mehfil Card */}
              {/* Mehfil Social UI Button */}
              <Link to="/mehfil" className="flex flex-col items-center justify-center gap-6 group py-8">
                <div className="w-48 h-48 rounded-[40px] flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-95 bg-gradient-to-br from-[#FF3B7F] to-[#D81B60] shadow-[0_20px_40px_-10px_rgba(255,59,127,0.4)] group-hover:shadow-[0_30px_60px_-15px_rgba(255,59,127,0.6)] relative overflow-hidden">

                  {/* Gloss/Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                  {/* Inner Depth */}
                  <div className="w-32 h-32 rounded-[24px] bg-white/10 backdrop-blur-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_4px_8px_rgba(0,0,0,0.1)] flex items-center justify-center">
                    <span className="text-6xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] filter transition-transform group-hover:scale-110 group-hover:rotate-12">👥</span>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 tracking-wide group-hover:text-[#FF3B7F] transition-colors">Mehfil</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Community</p>
                </div>
              </Link>

              {/* Meditation Card */}
              <Link to="/meditation" className="flex flex-col items-center justify-center gap-6 group py-8">
                <div className="w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105 active:scale-95 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shadow-2xl border-4 border-slate-200 dark:border-slate-700 group-hover:border-emerald-400 group-hover:shadow-[0_0_40px_rgba(52,211,153,0.3)] relative overflow-hidden">

                  {/* Meditation Image */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC03jxU5u_cgQDKXbMsTTcYxSeQWddHxS7XfwCab3gFZQiE6cK7cyPkPFJ8OwtNZ492fyl_KmoZHgHE0djejqLziIrqMAFwUD-VIM1O7LaYGMtrjAYDrgsjMz1M6uDBLiySXSgL3WojSwxGls6yMb3J3bmUYvMVGFey1aJV0NUgD4IstZNbe4UT_ZsSuJTwdkb6h0-B82SelK-SuD083O4z3SmruVOS3wDLibDcTuKG-LZKP8rlw-CZYq2cSiz5nnbW9uXoJ6LGfrx-"
                    alt="Meditation"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ filter: 'grayscale(100%) contrast(110%) brightness(105%)' }}
                  />
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2 tracking-wide group-hover:text-emerald-500 transition-colors">Meditation</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">Mindfulness</p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Mehfil Community Spotlight */}
        <section className="bg-gradient-to-br from-rose-50 to-purple-50 dark:from-[#151B2B] dark:to-[#0B0F19] px-8 md:px-12 py-20 relative z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block px-4 py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-sm font-semibold mb-6">
                  ✨ Community Feature
                </span>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                  Join the<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-500">Mehfil</span>
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                  A safe space where students come together to share their journeys, celebrate wins, and support each other through challenges. Because studying is better together.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/mehfil" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-purple-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-rose-500/30">
                    Explore Mehfil <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-slate-900 dark:text-white">Anonymous Posts</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Share without judgment</p>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-slate-900 dark:text-white">Peer Support</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">React with empathy</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-slate-900 dark:text-white">Study Groups</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Find your tribe</p>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg">
                    <h4 className="font-bold text-slate-900 dark:text-white">Achievements</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Celebrate together</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* External Sources Section */}
        <section className="bg-slate-50 dark:bg-[#0B0F19] px-8 md:px-12 py-20 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full text-sm font-semibold mb-4">
                Resources
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-4">
                External Sources
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Helpful resources for your well-being and study journey
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* YouTube Channel */}
              <a
                href="https://youtube.com/@safarparmar?si=Mvs6U5JaSGojIzSM"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="relative aspect-video bg-gradient-to-br from-red-900/20 to-red-600/20 overflow-hidden">
                  <img
                    src={youtubeImg}
                    alt="Safar Parmar YouTube Channel"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all flex items-center justify-center">
                    <Play className="w-16 h-16 text-white/90 group-hover:text-white group-hover:scale-110 transition-all drop-shadow-lg" />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <p className="text-white font-semibold text-sm drop-shadow-lg">Safar Parmar</p>
                    <p className="text-white/90 text-xs drop-shadow-lg">YouTube Channel</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Wellness & Motivation</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                    Visit for inspiring content to fuel your journey
                  </p>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400 text-sm font-medium">
                    <span>Watch on YouTube</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </a>

              {/* Course Link */}
              <a
                href="https://parmaracademy.in/courses/75"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="relative aspect-video bg-gradient-to-br from-pink-900/20 to-pink-600/20 overflow-hidden">
                  <img
                    src={courseImg}
                    alt="Parmar Academy Course"
                    className="w-full h-full object-contain bg-white p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <p className="text-white font-semibold text-sm drop-shadow-lg">Parmar Academy</p>
                    <p className="text-white/90 text-xs drop-shadow-lg">Professional Course</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Comprehensive Learning</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                    Explore structured courses for your growth
                  </p>
                  <div className="flex items-center gap-2 text-pink-500 dark:text-pink-400 text-sm font-medium">
                    <span>View Course</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0B0F19] px-8 md:px-12 py-12 text-center">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6EE7B7] to-teal-600 flex items-center justify-center text-black font-serif text-xl font-bold">
                S
              </div>
              <span className="text-2xl font-serif font-semibold text-white">Safar</span>
            </div>
            <p className="text-slate-400 mb-6">Your journey to better studying starts here.</p>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <Link to="/dashboard" className="hover:text-[#6EE7B7] transition-colors">Dashboard</Link>
              <Link to="/study" className="hover:text-[#6EE7B7] transition-colors">Focus Timer</Link>
              <Link to="/mehfil" className="hover:text-[#6EE7B7] transition-colors">Mehfil</Link>
              <Link to="/achievements" className="hover:text-[#6EE7B7] transition-colors">Achievements</Link>
            </div>
            <p className="text-slate-600 text-sm mt-8">© 2026 Safar. Made for students.</p>
          </div>
        </footer>
      </main>

      {/* Floating Theme Toggle */}
      <button
        aria-label="Toggle Theme"
        className="fixed bottom-4 right-4 z-50 p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white hover:scale-110 transition-transform"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default Landing;

