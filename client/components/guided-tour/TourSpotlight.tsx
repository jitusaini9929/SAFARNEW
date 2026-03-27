import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

type TourSpotlightProps = {
    targetSelector: string;
    padding?: number;
    isActive: boolean;
};

type TargetRect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

export default function TourSpotlight({
    targetSelector,
    padding = 8,
    isActive
}: TourSpotlightProps) {
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        if (!isActive) {
            setTargetRect(null);
            return;
        }

        const updatePosition = () => {
            const element = document.querySelector(targetSelector);
            if (element) {
                // Scroll element into view if it's not visible
                const rect = element.getBoundingClientRect();
                const isInViewport = (
                    rect.top >= 0 &&
                    rect.bottom <= window.innerHeight
                );
                if (!isInViewport) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Wait for scroll to finish before positioning
                    setTimeout(() => {
                        const newRect = element.getBoundingClientRect();
                        setTargetRect({
                            top: newRect.top - padding,
                            left: newRect.left - padding,
                            width: newRect.width + padding * 2,
                            height: newRect.height + padding * 2,
                        });
                    }, 400);
                    return;
                }
                setTargetRect({
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                });
            }
            animationRef.current = requestAnimationFrame(updatePosition);
        };

        // Small delay to allow page elements to render
        const timeout = setTimeout(() => {
            updatePosition();
        }, 100);

        return () => {
            clearTimeout(timeout);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [targetSelector, padding, isActive]);

    if (!isActive || !targetRect) return null;

    const overlayContent = (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
            {/* Dark overlay with cutout */}
            <svg
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "auto" }}
            >
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left}
                            y={targetRect.top}
                            width={targetRect.width}
                            height={targetRect.height}
                            rx="0"
                            ry="0"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.85)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Spotlight glow ring - Sharp technical border */}
            <div
                className="absolute rounded-none transition-all duration-300 ease-out border border-white/20"
                style={{
                    top: targetRect.top,
                    left: targetRect.left,
                    width: targetRect.width,
                    height: targetRect.height,
                    boxShadow: "0 0 40px 10px rgba(255, 255, 255, 0.05)",
                    pointerEvents: "none",
                }}
            />

            {/* Technical block indicator */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.left + targetRect.width + 20,
                    transform: "translateY(-50%)",
                }}
            >
                <div className="relative">
                    {/* Industrial Arrow Pointer */}
                    <div
                        className="absolute -left-4 top-1/2 -translate-y-1/2 w-0 h-0"
                        style={{
                            borderTop: "6px solid transparent",
                            borderBottom: "6px solid transparent",
                            borderRight: "10px solid white",
                        }}
                    />
                    {/* Pulsing Square Indicator */}
                    <div className="w-3 h-3 rounded-none bg-white opacity-40 animate-pulse" style={{ animationDuration: '4s' }} />
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-none border border-white/20 animate-ping"
                        style={{ animationDuration: '3s' }}
                    />
                </div>
            </div>
        </div>
    );

    return createPortal(overlayContent, document.body);
}
