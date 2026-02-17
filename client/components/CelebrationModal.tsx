import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────
interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    achievement: {
        id: string;
        name: string;
        description?: string | null;
        requirement?: string;
        type: 'badge' | 'title';
        category?: string;
        tier?: number | null;
    } | null;
    achievementImage?: string;
}

// ─── Confetti / Balloon Particle ────────────────────────────
interface Particle {
    id: number;
    type: 'confetti' | 'balloon' | 'streamer';
    x: number;
    delay: number;
    duration: number;
    color: string;
    size: number;
    rotation: number;
    swingAmp: number;
}

const CONFETTI_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
    '#FF69B4', '#00CED1', '#FFD700', '#7B68EE', '#FF4500',
];

const BALLOON_COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFD700', '#BB8FCE', '#45B7D1',
    '#FF69B4', '#82E0AA', '#F7DC6F',
];

function generateParticles(count: number): Particle[] {
    const particles: Particle[] = [];
    // Confetti
    for (let i = 0; i < count; i++) {
        particles.push({
            id: i,
            type: 'confetti',
            x: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 2.5 + Math.random() * 2,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: 4 + Math.random() * 8,
            rotation: Math.random() * 360,
            swingAmp: 15 + Math.random() * 40,
        });
    }
    // Balloons
    for (let i = 0; i < 8; i++) {
        particles.push({
            id: count + i,
            type: 'balloon',
            x: 5 + Math.random() * 90,
            delay: Math.random() * 1.5,
            duration: 4 + Math.random() * 3,
            color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
            size: 30 + Math.random() * 20,
            rotation: -15 + Math.random() * 30,
            swingAmp: 10 + Math.random() * 20,
        });
    }
    // Streamers
    for (let i = 0; i < 12; i++) {
        particles.push({
            id: count + 8 + i,
            type: 'streamer',
            x: Math.random() * 100,
            delay: Math.random() * 1,
            duration: 3 + Math.random() * 2,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            size: 3 + Math.random() * 4,
            rotation: Math.random() * 360,
            swingAmp: 20 + Math.random() * 30,
        });
    }
    return particles;
}

// ─── Celebration Sound via Web Audio API ────────────────────
function playCelebrationSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Play a fun ascending arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
        const durations = [0.12, 0.12, 0.12, 0.25, 0.12, 0.12, 0.4];

        let startTime = ctx.currentTime + 0.05;
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + durations[i]);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + durations[i] + 0.05);
            startTime += durations[i] * 0.85;
        });

        // Add a shimmer sound
        setTimeout(() => {
            const shimmer = ctx.createOscillator();
            const shimmerGain = ctx.createGain();
            shimmer.type = 'triangle';
            shimmer.frequency.value = 2093;
            shimmerGain.gain.setValueAtTime(0.08, ctx.currentTime);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            shimmer.connect(shimmerGain);
            shimmerGain.connect(ctx.destination);
            shimmer.start(ctx.currentTime);
            shimmer.stop(ctx.currentTime + 0.8);
        }, 600);
    } catch {
        // Audio not available, silently skip
    }
}

// ─── Main Component ─────────────────────────────────────────
export default function CelebrationModal({ isOpen, onClose, achievement, achievementImage }: CelebrationModalProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showContent, setShowContent] = useState(false);
    const soundPlayedRef = useRef(false);

    useEffect(() => {
        if (isOpen && achievement) {
            setParticles(generateParticles(50));
            // Delay content reveal for dramatic effect
            const timer = setTimeout(() => setShowContent(true), 400);
            // Play sound once
            if (!soundPlayedRef.current) {
                setTimeout(() => playCelebrationSound(), 200);
                soundPlayedRef.current = true;
            }
            return () => clearTimeout(timer);
        } else {
            setShowContent(false);
            soundPlayedRef.current = false;
        }
    }, [isOpen, achievement]);

    const handleClose = useCallback(() => {
        setShowContent(false);
        setTimeout(onClose, 200);
    }, [onClose]);

    if (!isOpen || !achievement) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
                onClick={handleClose}
            />

            {/* ─── Particle Layer ─── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((p) => {
                    if (p.type === 'confetti') {
                        return (
                            <div
                                key={p.id}
                                className="absolute"
                                style={{
                                    left: `${p.x}%`,
                                    top: '-3%',
                                    width: p.size,
                                    height: p.size * 0.6,
                                    backgroundColor: p.color,
                                    borderRadius: p.size > 8 ? '2px' : '50%',
                                    animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
                                    transform: `rotate(${p.rotation}deg)`,
                                    '--swing': `${p.swingAmp}px`,
                                } as React.CSSProperties}
                            />
                        );
                    }
                    if (p.type === 'balloon') {
                        return (
                            <div
                                key={p.id}
                                className="absolute"
                                style={{
                                    left: `${p.x}%`,
                                    bottom: '-15%',
                                    animation: `balloonRise ${p.duration}s ease-out ${p.delay}s both`,
                                    transform: `rotate(${p.rotation}deg)`,
                                    '--swing': `${p.swingAmp}px`,
                                } as React.CSSProperties}
                            >
                                {/* Balloon body */}
                                <div
                                    style={{
                                        width: p.size,
                                        height: p.size * 1.2,
                                        backgroundColor: p.color,
                                        borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                                        position: 'relative',
                                        boxShadow: `inset -${p.size * 0.15}px -${p.size * 0.1}px ${p.size * 0.3}px rgba(0,0,0,0.15), inset ${p.size * 0.1}px ${p.size * 0.1}px ${p.size * 0.2}px rgba(255,255,255,0.3)`,
                                    }}
                                >
                                    {/* Balloon knot */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: -4,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 6,
                                            height: 6,
                                            backgroundColor: p.color,
                                            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                                            filter: 'brightness(0.85)',
                                        }}
                                    />
                                </div>
                                {/* String */}
                                <div
                                    style={{
                                        width: 1,
                                        height: p.size * 1.5,
                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                        margin: '0 auto',
                                    }}
                                />
                            </div>
                        );
                    }
                    // Streamer
                    return (
                        <div
                            key={p.id}
                            className="absolute"
                            style={{
                                left: `${p.x}%`,
                                top: '-5%',
                                width: p.size,
                                height: 40 + Math.random() * 30,
                                background: `linear-gradient(180deg, ${p.color} 0%, transparent 100%)`,
                                borderRadius: '2px',
                                animation: `streamerFall ${p.duration}s ease-in ${p.delay}s both`,
                                transform: `rotate(${p.rotation}deg)`,
                                '--swing': `${p.swingAmp}px`,
                                opacity: 0.8,
                            } as React.CSSProperties}
                        />
                    );
                })}
            </div>

            {/* ─── Card Content ─── */}
            <div
                className={`relative z-10 w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                    }`}
            >
                {/* Gradient Header */}
                <div className="relative bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-8 pb-12 text-center overflow-hidden">
                    {/* Sparkle dots */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(15)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-white"
                                style={{
                                    width: 2 + Math.random() * 4,
                                    height: 2 + Math.random() * 4,
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animation: `sparkle ${1 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                                    opacity: 0,
                                }}
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <p className="text-white/80 text-xs font-bold uppercase tracking-[0.3em] mb-3 animate-in slide-in-from-bottom-2 duration-500">
                        {achievement.type === 'badge' ? '🏆 New Badge Earned!' : '✨ New Title Unlocked!'}
                    </p>

                    {/* Achievement Image */}
                    {achievementImage && (
                        <div className="relative w-28 h-28 mx-auto mb-3 animate-in zoom-in-50 duration-700 delay-300">
                            <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl animate-pulse" />
                            <img loading="lazy"
                                src={achievementImage}
                                alt={achievement.name}
                                className="relative w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.6)] animate-in spin-in-180 duration-700 delay-300"
                            />
                        </div>
                    )}

                    <h2 className="text-2xl font-bold text-white drop-shadow-lg animate-in slide-in-from-bottom-3 duration-500 delay-500">
                        {achievement.name}
                    </h2>
                </div>

                {/* Body */}
                <div className="bg-white dark:bg-[#1A1A1A] p-6 text-center">
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5 animate-in fade-in duration-500 delay-700">
                        {achievement.requirement || achievement.description || 'Congratulations on this amazing achievement!'}
                    </p>

                    {achievement.tier && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-4">
                            {'★'.repeat(achievement.tier)} Tier {achievement.tier}
                        </div>
                    )}

                    <button
                        onClick={handleClose}
                        className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Awesome!
                    </button>
                </div>
            </div>

            {/* ─── Keyframe Animations ─── */}
            <style>{`
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) translateX(0) rotate(0deg) scale(1);
                        opacity: 1;
                    }
                    25% {
                        transform: translateY(25vh) translateX(var(--swing, 30px)) rotate(180deg) scale(0.9);
                    }
                    50% {
                        transform: translateY(50vh) translateX(calc(var(--swing, 30px) * -0.5)) rotate(360deg) scale(0.8);
                    }
                    75% {
                        transform: translateY(75vh) translateX(var(--swing, 30px)) rotate(540deg) scale(0.6);
                    }
                    100% {
                        transform: translateY(105vh) translateX(calc(var(--swing, 30px) * -1)) rotate(720deg) scale(0.3);
                        opacity: 0;
                    }
                }

                @keyframes balloonRise {
                    0% {
                        transform: translateY(0) translateX(0) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    25% {
                        transform: translateY(-30vh) translateX(var(--swing, 20px)) rotate(5deg);
                    }
                    50% {
                        transform: translateY(-60vh) translateX(calc(var(--swing, 20px) * -1)) rotate(-5deg);
                    }
                    75% {
                        transform: translateY(-90vh) translateX(var(--swing, 20px)) rotate(3deg);
                    }
                    100% {
                        transform: translateY(-130vh) translateX(0) rotate(0deg);
                        opacity: 0;
                    }
                }

                @keyframes streamerFall {
                    0% {
                        transform: translateY(0) translateX(0) rotate(var(--rotation, 0deg));
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(110vh) translateX(var(--swing, 20px)) rotate(calc(var(--rotation, 0deg) + 180deg));
                        opacity: 0;
                    }
                }

                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0.5); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
}
