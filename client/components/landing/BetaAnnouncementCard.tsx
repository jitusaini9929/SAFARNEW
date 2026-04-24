import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function BetaAnnouncementCard() {
  return (
    <div className="relative group w-full max-w-4xl mx-auto my-8 px-4 sm:px-6">
      {/* Animated gradient border */}
      <div className="absolute inset-4 sm:inset-6 -m-0.5 bg-gradient-to-r from-pink-500 via-indigo-500 to-purple-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse pointer-events-none"></div>
      
      {/* Inner Card */}
      <div className="relative flex flex-col md:flex-row items-start md:items-center p-6 md:p-8 bg-white/90 dark:bg-[#0f1115]/90 backdrop-blur-xl rounded-2xl border border-black shadow-2xl gap-6">
        

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2.5 flex-wrap font-playfair">
            Study Planner 
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs md:text-sm font-bold tracking-wide uppercase font-sans shadow-sm">
              Beta
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="focus:outline-none hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors" aria-label="What does Beta mean?">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] p-4 text-sm leading-relaxed bg-indigo-950 text-indigo-50 border border-indigo-800 shadow-2xl z-50">
                    <p>A <strong className="text-indigo-300">Beta</strong> version represents a feature-complete product undergoing rigorous real-world validation. This stage allows us to gather critical user feedback and eliminate edge-case issues in a local environment, ensuring that the final public release meets the highest standards of performance and stability.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            Update
          </h3>
          
          <div className="space-y-4 text-[15px] md:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
            <p>
              The wait is almost over. Study Planner is now feature-ready and has moved into its final testing phase.
            </p>
            <p>
              We used your feedback to refine the planning flow, tighten the experience, and smooth out the last edge cases before public release.
            </p>
            <p className="text-indigo-700 dark:text-indigo-300 font-bold">
              Launch is coming soon. Final checks are in progress, and Study Planner will be available very shortly.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
