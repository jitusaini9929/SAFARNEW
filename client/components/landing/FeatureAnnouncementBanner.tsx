import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SESSION_DISMISSED_KEY = 'safar-banner:ai-planner-session-dismissed';
const TARGET_DATE = new Date('2026-06-05T15:00:00+05:30').getTime();

export default function FeatureAnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = TARGET_DATE - Date.now();
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true';
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ 
            height: 0, 
            opacity: 0,
            transition: { 
              height: { duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.25, ease: 'easeInOut' }
            } 
          }}
          className="relative z-[100] w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-midnight dark:from-midnight dark:via-[#1e1b4b] dark:to-black text-white border-b border-indigo-500/20 shadow-lg overflow-hidden"
        >
          {/* Subtle background glow effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(129,140,248,0.15),transparent_60%)] pointer-events-none" />

          <div className="max-w-[1400px] mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Decorative offset spacer to visually balance close button on desktop */}
            <div className="w-8 hidden md:block" />

            {/* Content */}
            <div className="flex-1 flex items-center justify-center gap-3.5 flex-wrap text-base md:text-[17px] font-medium">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-sm font-bold uppercase tracking-wider animate-pulse">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                  className="w-[18px] h-[18px] text-indigo-300"
                >
                  <path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z" />
                </svg>
                New Feature
              </span>
              <span className="text-slate-100 font-medium text-center">
                The Wait is over ! Your custom exam roadmap is almost here. Study Planner coming soon
              </span>
              
              {/* Dynamic countdown timer badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 dark:bg-black/25 border border-white/10 text-white text-sm font-mono font-bold tracking-wider shadow-inner">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </span>
            </div>

            {/* Close Button with motion micro-interactions */}
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
