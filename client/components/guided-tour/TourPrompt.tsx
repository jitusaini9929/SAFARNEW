import { useState, useEffect } from "react";
import { useGuidedTour, TourConfig } from "@/contexts/GuidedTourContext";
import { tourDescriptions } from "@/components/guided-tour/tourSteps";
import { X, Play, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface TourPromptProps {
    tour: TourConfig;
    featureName: string;
}

export default function TourPrompt({ tour, featureName }: TourPromptProps) {
    const { startTour, hasSeenTour, markTourSeen, isActive } = useGuidedTour();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show prompt after a short delay if tour hasn't been seen
        if (!hasSeenTour(tour.id)) {
            const timer = setTimeout(() => setIsVisible(true), 1200);
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

    if (isActive) return null;

    const description = tourDescriptions[tour.id] || `Learn how to use ${featureName} effectively.`;

    // If tour has been seen, show a persistent minimalist helper button
    if (hasSeenTour(tour.id)) {
        return (
            <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startTour(tour)}
                className="fixed bottom-6 right-6 z-40 rounded-none w-12 h-12 flex items-center justify-center bg-[#1a1c1e] border border-white/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-white"
                title={`Start ${featureName} Tour`}
            >
                <HelpCircle className="w-6 h-6" />
            </motion.button>
        );
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="relative bg-[#1a1c1e] rounded-none border border-white/5 p-10 max-w-lg w-[90vw] shadow-[24px_24px_60px_rgba(0,0,0,0.8)]"
                    >
                        {/* Technical Grid Background Overlay (Subtle) */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                        {/* Close button */}
                        <button
                            onClick={handleSkip}
                            className="absolute top-6 right-6 p-2 rounded-none hover:bg-white/10 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5 text-white/40 hover:text-white" />
                        </button>

                        {/* Content Hierarchy */}
                        <div className="flex flex-col mb-10 relative z-10">
                            {/* Headline */}
                            <h2 className="text-3xl font-bold text-white mb-4 leading-tight tracking-tight uppercase" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                                ABOUT <br /> {featureName}
                            </h2>

                            {/* Description with Satoshi Regular */}
                            <p className="text-lg text-white/60 leading-relaxed font-normal" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                                {description}
                            </p>
                        </div>

                        {/* Tactical Buttons */}
                        <div className="flex flex-col gap-4 relative z-10">
                            <motion.button
                                whileHover={{ scale: 1.01, backgroundColor: '#ffffff', color: '#000000' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStartTour}
                                className="w-full h-16 bg-white text-black text-lg font-bold uppercase tracking-widest flex items-center justify-center transition-colors rounded-none shadow-[8px_8px_0px_rgba(255,255,255,0.1)] hover:shadow-none"
                                style={{ fontFamily: 'Satoshi, sans-serif' }}
                            >
                                <Play className="w-5 h-5 mr-3 fill-current" />
                                Start Tutorial
                            </motion.button>

                            <button
                                onClick={handleSkip}
                                className="w-full py-4 text-white/30 hover:text-white text-xs font-bold uppercase tracking-[0.2em] transition-colors rounded-none"
                                style={{ fontFamily: 'Satoshi, sans-serif' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
