import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Placement = "top" | "bottom" | "left" | "right" | "center";

type TourTooltipProps = {
    targetSelector: string;
    title: string;
    content: string;
    placement?: Placement;
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    isActive: boolean;
};

type Position = {
    top: number;
    left: number;
};

export default function TourTooltip({
    targetSelector,
    title,
    content,
    placement = "right",
    currentStep,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
    isActive,
}: TourTooltipProps) {
    const [position, setPosition] = useState<Position | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!isActive) {
            setPosition(null);
            return;
        }

        const updatePosition = () => {
            const element = document.querySelector(targetSelector);
            const tooltip = tooltipRef.current;

            if (element && tooltip) {
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const padding = 20;

                let top = 0;
                let left = 0;

                switch (placement) {
                    case "top":
                        top = rect.top - tooltipRect.height - padding;
                        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                        break;
                    case "bottom":
                        top = rect.bottom + padding;
                        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                        break;
                    case "left":
                        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                        left = rect.left - tooltipRect.width - padding;
                        break;
                    case "right":
                        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                        left = rect.right + padding + 30; // Extra space for pointer
                        break;
                    case "center":
                        top = window.innerHeight / 2 - tooltipRect.height / 2;
                        left = window.innerWidth / 2 - tooltipRect.width / 2;
                        break;
                }

                // Keep tooltip within viewport
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                if (left < 10) left = 10;
                if (left + tooltipRect.width > viewportWidth - 10) {
                    left = viewportWidth - tooltipRect.width - 10;
                }
                if (top < 10) top = 10;
                if (top + tooltipRect.height > viewportHeight - 10) {
                    top = viewportHeight - tooltipRect.height - 10;
                }

                setPosition({ top, left });
            }

            animationRef.current = requestAnimationFrame(updatePosition);
        };

        // Small delay to allow elements to render
        const timeout = setTimeout(() => {
            updatePosition();
        }, 150);

        return () => {
            clearTimeout(timeout);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [targetSelector, placement, isActive]);

    if (!isActive) return null;

    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;

    const tooltipContent = (
        <div
            ref={tooltipRef}
            className="fixed z-[9999] w-80 bg-[#1a1c1e] rounded-none shadow-[24px_24px_60px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden transition-all duration-300 ease-out"
            style={{
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                opacity: position ? 1 : 0,
                transform: position ? "scale(1)" : "scale(0.98)",
                fontFamily: 'Satoshi, sans-serif'
            }}
        >
            {/* Header / Meta Info */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">
                            Step {currentStep + 1}/{totalSteps}
                        </span>
                        <h3 className="text-xl font-bold text-white uppercase tracking-tight leading-tight">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onSkip}
                        className="p-1 rounded-none hover:bg-white/10 transition-colors"
                        aria-label="Skip tour"
                    >
                        <X className="w-4 h-4 text-white/40 hover:text-white" />
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 py-6 relative">
                {/* Subtle technical background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
                     style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                
                <p className="text-sm text-white/60 leading-relaxed relative z-10 font-normal">
                    {content}
                </p>
            </div>

            {/* Industrial Progress Bar (Segmented) */}
            <div className="px-6 py-2 flex gap-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 transition-all duration-500 ${
                            i === currentStep
                                ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                                : i < currentStep
                                    ? "bg-white/40"
                                    : "bg-white/10"
                        }`}
                    />
                ))}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pt-4 pb-6 flex items-center justify-between gap-4">
                <button
                    onClick={onPrev}
                    disabled={isFirstStep}
                    className={`flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        isFirstStep 
                            ? "text-white/10 cursor-not-allowed" 
                            : "text-white/40 hover:text-white hover:bg-white/5"
                    }`}
                >
                    <ChevronLeft className="w-3 h-3" />
                    BACK
                </button>

                <button
                    onClick={onNext}
                    className="flex-1 h-12 bg-white text-black font-bold text-xs uppercase tracking-widest flex items-center justify-center transition-all hover:bg-white/90 active:scale-[0.98] shadow-[4px_4px_0px_rgba(255,255,255,0.1)] hover:shadow-none"
                >
                    {isLastStep ? "FINISH PROCESS" : "PROCEED"}
                    {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
                </button>
            </div>
        </div>
    );

    return createPortal(tooltipContent, document.body);
}
