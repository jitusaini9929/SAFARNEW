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
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
          {/* Logo and SAFAR Title */}
          <div className="flex items-center gap-4">
            <img
              src="/safar-logo.png.jpeg"
              alt="Safar Logo"
              className="w-[90px] h-[90px] rounded-full border-2 border-black dark:border-white object-cover shadow-lg shadow-[#6EE7B7]/20"
            />
            <span className="text-[40px] font-serif font-bold text-black dark:text-white tracking-tight">SAFAR</span>
          </div>

          {/* Profile Section with Theme Toggle */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              aria-label="Toggle Theme"
              className="p-3 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 backdrop-blur-xl shadow-lg transition-all hover:scale-105 active:scale-95"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-slate-700" />}
            </button>

            {/* Profile Avatar */}
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
          <div className="relative z-20 px-8 md:px-16 lg:px-20 max-w-5xl mt-12">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-[1.2] mb-6 drop-shadow-2xl">
              <span className="inline-block whitespace-nowrap text-black font-serif">Where preparation meets care-</span><br />
              <span className="inline-block whitespace-nowrap text-black font-serif">A kinder way to move Forward</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl leading-relaxed drop-shadow-lg">
              A thoughtfully designed space to support your studies, consistency, and emotional well-being — all in one place.
              Safar helps students stay focused, emotionally steady, and connected — especially when preparation feels heavy. Because " Your marks matter, but so does your mind"
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <Link to="/dashboard" className="group flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 button-glow shadow-lg shadow-indigo-500/30">
                Start your Safar
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/register" className="flex items-center justify-center gap-2 bg-slate-200/50 dark:bg-white/5 backdrop-blur-md border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white px-8 py-4 rounded-full font-medium text-lg transition-all hover:bg-slate-300/50 dark:hover:bg-white/10">
                Learn More
              </Link>
            </div>
          </div>


        </header>

        {/* Apps Section - New Colored Box Layout */}
        <section className="bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 dark:bg-[#0B0F19] px-8 md:px-12 py-16 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Apps Grid - 4 Colored Outline Boxes with Names & Descriptions */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-10">
              {/* Nishtha - Purple Box */}
              <Link to="/nishtha" className="group flex flex-col items-center">
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-xl border-4 border-purple-500 bg-transparent hover:bg-purple-500/10 transition-all duration-300 flex items-center justify-center hover:scale-105 overflow-hidden">
                  <img src="/nishtha-silhouette.png" alt="Nishtha" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-white group-hover:text-purple-500 transition-colors">Nishtha</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[170px] mt-1">Track consistency, Journal, reflect on your emotional state</p>
              </Link>

              {/* Ekagra Mode (Focus Timer) - Yellow Box */}
              <Link to="/study" className="group flex flex-col items-center">
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-xl border-4 border-yellow-400 bg-transparent hover:bg-yellow-400/10 transition-all duration-300 flex items-center justify-center hover:scale-105 overflow-hidden">
                  <img src="/focus-timer.png" alt="Ekagra Mode" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-white group-hover:text-yellow-400 transition-colors">Ekagra Mode</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[170px] mt-1">Your focus timer for productive study</p>
              </Link>

              {/* Mehfil - Cyan Box */}
              <Link to="/mehfil" className="group flex flex-col items-center">
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-xl border-4 border-cyan-400 bg-transparent hover:bg-cyan-400/10 transition-all duration-300 flex items-center justify-center hover:scale-105 overflow-hidden">
                  <img src="/mehfil-silhouette.png" alt="Mehfil" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-white group-hover:text-cyan-400 transition-colors">Mehfil</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[170px] mt-1">Judgement free and safe emotional space</p>
              </Link>

              {/* Dhyan (Meditation) - Green Box */}
              <Link to="/meditation" className="group flex flex-col items-center">
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-xl border-4 border-green-400 bg-transparent hover:bg-green-400/10 transition-all duration-300 flex items-center justify-center hover:scale-105 overflow-hidden">
                  <img src="/meditation-silhouette.png" alt="Dhyan" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-white group-hover:text-green-400 transition-colors">Dhyan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[170px] mt-1">Meditation sessions and live chitchat with Parmar sir</p>
              </Link>


            </div>

            {/* White Dashboard Container Box - Glassmorphism */}
            <Link to="/dashboard" className="group block w-full max-w-2xl mx-auto">
              <div className="rounded-xl border border-white/30 dark:border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-md hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 py-5 px-10 flex items-center justify-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:scale-[1.02] hover:shadow-xl">
                <span className="text-white text-sm md:text-base font-bold px-8 py-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 shadow-md group-hover:shadow-orange-400/50 group-hover:from-orange-500 group-hover:to-orange-700 transition-all">Go to Dashboard</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Mehfil Community Spotlight */}
        <section className="bg-gradient-to-br from-rose-50 to-purple-50 dark:from-[#151B2B] dark:to-[#0B0F19] px-8 md:px-12 py-20 relative z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl"></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                  Join the<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-purple-500">Mehfil</span>
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                  A safe space to speak about your silent struggles and quiet wins — because here, you're not alone.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/mehfil" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-purple-500 text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-rose-500/30">
                    Explore Mehfil <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Share without judgment</h4>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">React with empathy</h4>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Find your tribe</h4>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">Celebrate together</h4>
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
        <footer className="bg-[#0B0F19] px-8 md:px-12 py-10">
          <div className="max-w-6xl mx-auto">
            {/* Top Section - Logo & Tagline */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img
                  src="/safar-logo.png.jpeg"
                  alt="Safar Logo"
                  className="w-16 h-16 rounded-full border-2 border-[#6EE7B7] object-cover shadow-lg"
                />
                <span className="text-3xl font-serif font-bold text-white">Safar</span>
              </div>
              <p className="text-slate-400 text-sm max-w-md mx-auto">Your journey to better studying starts here.</p>
            </div>

            {/* Middle Section - Links */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-400 mb-6">
              <Link to="/dashboard" className="hover:text-[#6EE7B7] transition-colors">Dashboard</Link>
              <Link to="/study" className="hover:text-[#6EE7B7] transition-colors">Focus Timer</Link>
              <Link to="/mehfil" className="hover:text-[#6EE7B7] transition-colors">Mehfil</Link>
              <Link to="/achievements" className="hover:text-[#6EE7B7] transition-colors">Achievements</Link>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800 my-6"></div>

            {/* Contact & Social Section */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Contact */}
              <div className="text-center md:text-left">
                <h4 className="text-white font-semibold mb-2 text-sm">Write to us</h4>
                <a href="mailto:safarparmar0@gmail.com" className="text-[#6EE7B7] hover:text-[#6EE7B7]/80 transition-colors text-sm">
                  safarparmar0@gmail.com
                </a>
              </div>

              {/* Instagram */}
              <div className="text-center">
                <h4 className="text-white font-semibold mb-2 text-sm">Follow us on Instagram</h4>
                <a
                  href="https://www.instagram.com/safar_parmar?igsh=MXFlOGF0YnBxcmV0bQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E4405F] hover:text-[#E4405F]/80 transition-colors text-sm inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                  @SAFAR_PARMAR
                </a>
              </div>

              {/* Parmar Academy App */}
              <div className="text-center md:text-right">
                <h4 className="text-white font-semibold mb-2 text-sm">Join Daily Meditation</h4>
                <p className="text-slate-400 text-xs mb-2">SAFAR 3.0 on Parmar Academy</p>
                <a
                  href="https://play.google.com/store/apps/details?id=com.parmar.academy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#6EE7B7] text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#6EE7B7]/90 transition-colors"
                >
                  📱 Download App
                </a>
              </div>
            </div>

            {/* Bottom - Copyright */}
            <p className="text-slate-600 text-xs text-center pt-4 border-t border-slate-800/50">© 2026 Safar. Made for students.</p>
          </div>
        </footer>
      </main>


    </div>
  );
};

export default Landing;

