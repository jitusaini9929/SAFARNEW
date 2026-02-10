import { useState, useEffect } from "react";
import { useGuidedTour, TourConfig } from "@/contexts/GuidedTourContext";
import { tourDescriptions } from "@/components/guided-tour/tourSteps";
import { Sparkles, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourPromptProps {
    tour: TourConfig;
    featureName: string;
}

export default function TourPrompt({ tour, featureName }: TourPromptProps) {
    const { startTour, hasSeenTour, markTourSeen } = useGuidedTour();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show prompt after a short delay if tour hasn't been seen
        if (!hasSeenTour(tour.id)) {
            const timer = setTimeout(() => setIsVisible(true), 800);
            return () => clearTimeout(timer);
        }
    }, [tour.id, hasSeenTour]);

    const handleStartTour = () => {
        setIsVisible(false);
        startTour(tour);
    };

    const handleSkip = () => {
        setIsVisible(false);
        markTourSeen(tour.id);
    };

    if (!isVisible) return null;

    const description = tourDescriptions[tour.id] || `Learn how to use ${featureName} effectively.`;

    return (
        /* Full-screen modal overlay */
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md w-[90vw] animate-in slide-in-from-bottom-4 zoom-in-95 duration-500">

                {/* Close button */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>

                {/* Icon + Badge */}
                <div className="flex flex-col items-center text-center mb-6">
                    {/* Pulsing icon */}
                    <div className="relative mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-indigo-500/30 animate-ping" />
                    </div>

                    {/* About badge */}
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full mb-3">
                        About {featureName}
                    </span>

                    {/* Feature description */}
                    <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-5" />

                {/* Buttons */}
                <div className="flex flex-col items-center gap-3">
                    <Button
                        onClick={handleStartTour}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all animate-pulse py-3 text-base font-semibold rounded-xl"
                    >
                        <Play className="w-4 h-4 mr-2 fill-white" />
                        Start Tour
                    </Button>
                    <Button
                        onClick={handleSkip}
                        variant="ghost"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm"
                    >
                        Skip
                    </Button>
                </div>
            </div>
        </div>
    );
}
