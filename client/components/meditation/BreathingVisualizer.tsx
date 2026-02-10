import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BreathingVisualizerProps {
    sessionId: string;
    breathPhase: 'inhale' | 'hold' | 'exhale' | 'hold-empty';
    isActive: boolean;
    cycle?: { inhale: number; holdIn: number; exhale: number; holdOut: number };
}

// ─── 1. Diaphragmatic: Belly Breathing Visualization ─────────────────────────
const WavyPathViz: React.FC<{ breathPhase: string; isActive: boolean }> = ({ breathPhase, isActive }) => {
    const isInhale = breathPhase === 'inhale';
    const isExhale = breathPhase === 'exhale';
    const isHold = breathPhase === 'hold' || breathPhase === 'hold-empty';

    const orbScale = isInhale ? 1.35 : isExhale ? 0.75 : isHold && breathPhase === 'hold' ? 1.35 : 0.75;
    const glowOpacity = isInhale ? 0.6 : isExhale ? 0.15 : 0.4;
    const particleDirection = isInhale ? -120 : isExhale ? 120 : 0;

    const phaseColor = isInhale ? '#10b981' : isExhale ? '#6366f1' : '#f59e0b';
    const phaseGradient = isInhale ? 'from-emerald-400 to-teal-500' : isExhale ? 'from-indigo-400 to-purple-500' : 'from-amber-400 to-orange-500';

    return (
        <div className="w-72 h-72 flex items-center justify-center relative">
            {/* Concentric pulse rings */}
            {[1, 2, 3].map((ring) => (
                <motion.div
                    key={ring}
                    animate={{
                        scale: isActive ? (isInhale ? [1, 1.2 + ring * 0.15] : isExhale ? [1.2 + ring * 0.15, 1] : 1.1 + ring * 0.1) : 1,
                        opacity: isActive ? (isInhale ? [0.15, 0.05] : isExhale ? [0.05, 0.15] : 0.08) : 0.05,
                    }}
                    transition={{ duration: isInhale ? 4 : isExhale ? 6 : 1, ease: 'easeInOut' }}
                    className="absolute rounded-full border"
                    style={{
                        width: `${120 + ring * 50}px`,
                        height: `${120 + ring * 50}px`,
                        borderColor: phaseColor,
                        borderWidth: '1.5px',
                    }}
                />
            ))}

            {/* Outer glow */}
            <motion.div
                animate={{
                    scale: isActive ? orbScale * 1.4 : 1,
                    opacity: isActive ? glowOpacity * 0.5 : 0.1,
                }}
                transition={{ duration: isInhale ? 4 : 6, ease: 'easeInOut' }}
                className={`absolute w-40 h-40 rounded-full bg-gradient-to-r ${phaseGradient} blur-2xl`}
            />

            {/* Main breathing orb */}
            <motion.div
                animate={{
                    scale: isActive ? orbScale : 1,
                }}
                transition={{ duration: isInhale ? 4 : isExhale ? 6 : 0.5, ease: 'easeInOut' }}
                className="relative"
            >
                {/* Orb ring glow */}
                <motion.div
                    animate={{ opacity: isActive ? [0.3, 0.6, 0.3] : 0.2 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className={`absolute inset-[-8px] rounded-full bg-gradient-to-r ${phaseGradient} blur-lg opacity-30`}
                />

                {/* Core orb */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden relative">
                    {/* Inner gradient fill that rises/falls */}
                    <motion.div
                        animate={{
                            height: isActive ? (isInhale || (isHold && breathPhase === 'hold') ? '100%' : '20%') : '50%',
                        }}
                        transition={{ duration: isInhale ? 4 : isExhale ? 6 : 0.5, ease: 'easeInOut' }}
                        className={`absolute bottom-0 w-full bg-gradient-to-t ${phaseGradient} opacity-30`}
                    />

                    {/* Phase icon */}
                    <motion.div
                        animate={{ y: isActive ? (isInhale ? -4 : isExhale ? 4 : 0) : 0 }}
                        transition={{ duration: isInhale ? 4 : 6, ease: 'easeInOut' }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <motion.span
                            animate={{ scale: isActive ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-3xl mb-1"
                        >
                            {isInhale ? '🫁' : isExhale ? '💨' : '✨'}
                        </motion.span>
                    </motion.div>
                </div>
            </motion.div>

            {/* Floating air particles */}
            {isActive && !isHold && (
                <>
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={`particle-${breathPhase}-${i}`}
                            initial={{
                                y: isInhale ? 80 : -80,
                                x: (i - 2.5) * 20,
                                opacity: 0,
                                scale: 0.5,
                            }}
                            animate={{
                                y: particleDirection,
                                opacity: [0, 0.7, 0],
                                scale: [0.5, 1, 0.3],
                            }}
                            transition={{
                                duration: isInhale ? 3 : 4,
                                delay: i * 0.3,
                                repeat: Infinity,
                                ease: 'easeOut',
                            }}
                            className={`absolute w-2 h-2 rounded-full ${isInhale ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                            style={{ filter: 'blur(1px)' }}
                        />
                    ))}
                </>
            )}

            {/* Bottom belly wave indicator */}
            <div className="absolute -bottom-2 flex items-center gap-1">
                <motion.div
                    animate={{
                        scaleY: isActive ? (isInhale ? [1, 1.6] : isExhale ? [1.6, 1] : 1.3) : 1,
                    }}
                    transition={{ duration: isInhale ? 4 : 6, ease: 'easeInOut' }}
                    className="w-6 h-3 rounded-full bg-gradient-to-r from-emerald-400/40 to-teal-400/40 dark:from-emerald-500/30 dark:to-teal-500/30"
                />
                <motion.div
                    animate={{
                        scaleY: isActive ? (isInhale ? [1, 2] : isExhale ? [2, 1] : 1.5) : 1,
                    }}
                    transition={{ duration: isInhale ? 4 : 6, ease: 'easeInOut', delay: 0.1 }}
                    className="w-8 h-3 rounded-full bg-gradient-to-r from-teal-400/50 to-emerald-400/50 dark:from-teal-500/40 dark:to-emerald-500/40"
                />
                <motion.div
                    animate={{
                        scaleY: isActive ? (isInhale ? [1, 1.6] : isExhale ? [1.6, 1] : 1.3) : 1,
                    }}
                    transition={{ duration: isInhale ? 4 : 6, ease: 'easeInOut' }}
                    className="w-6 h-3 rounded-full bg-gradient-to-r from-emerald-400/40 to-teal-400/40 dark:from-emerald-500/30 dark:to-teal-500/30"
                />
            </div>

            {/* Phase label */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={breathPhase}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="absolute -bottom-10 text-center"
                >
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${phaseGradient} text-white shadow-md`}>
                        {isInhale ? 'Belly Rise' : isExhale ? 'Belly Lower' : breathPhase === 'hold' ? 'Hold Full' : 'Hold'}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// ─── 2. Pursed Lip / Lion Breath: Expanding/contracting golden orb ──────────
const GoldenOrbViz: React.FC<{ breathPhase: string; isActive: boolean }> = ({ breathPhase, isActive }) => {
    const scale = breathPhase === 'inhale' ? 1.4
        : breathPhase === 'exhale' ? 0.6
            : breathPhase === 'hold' ? 1.4
                : 0.6;

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center relative">
            <div
                className="absolute rounded-full transition-all ease-in-out"
                style={{
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.15) 0%, transparent 70%)',
                    transform: `scale(${isActive ? scale * 1.3 : 1})`,
                    transitionDuration: breathPhase === 'inhale' ? '4000ms' : breathPhase === 'exhale' ? '4000ms' : '500ms',
                }}
            />
            <div
                className="absolute rounded-full transition-all ease-in-out"
                style={{
                    width: '160px',
                    height: '160px',
                    background: 'radial-gradient(circle, rgba(250,204,21,0.25) 0%, rgba(251,191,36,0.1) 60%, transparent 80%)',
                    transform: `scale(${isActive ? scale * 1.1 : 1})`,
                    transitionDuration: breathPhase === 'inhale' ? '4000ms' : breathPhase === 'exhale' ? '4000ms' : '500ms',
                }}
            />
            <div
                className="rounded-full transition-all ease-in-out flex items-center justify-center relative z-10"
                style={{
                    width: '90px',
                    height: '90px',
                    background: 'radial-gradient(circle at 40% 35%, #fde047, #f59e0b, #d97706)',
                    boxShadow: isActive
                        ? `0 0 40px rgba(250,204,21,0.5), 0 0 80px rgba(245,158,11,0.3)`
                        : `0 0 20px rgba(250,204,21,0.2)`,
                    transform: `scale(${isActive ? scale : 1})`,
                    transitionDuration: breathPhase === 'inhale' ? '4000ms' : breathPhase === 'exhale' ? '4000ms' : '500ms',
                }}
            >
                <span className="text-white/90 text-xs font-bold uppercase tracking-wider drop-shadow-md">
                    {isActive ? breathPhase.replace('-', ' ') : '●'}
                </span>
            </div>
        </div>
    );
};

// ─── 3. Box Breathing: Square with dot tracing edges ────────────────────────
const BoxTraceViz: React.FC<{ breathPhase: string; isActive: boolean; cycle?: { inhale: number; holdIn: number; exhale: number; holdOut: number } }> = ({ breathPhase, isActive, cycle }) => {
    const dotRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const phaseRef = useRef(breathPhase);

    useEffect(() => { phaseRef.current = breathPhase; }, [breathPhase]);

    const boxSize = 160;
    const offset = 20;
    const corners = [
        { x: offset, y: offset },
        { x: offset + boxSize, y: offset },
        { x: offset + boxSize, y: offset + boxSize },
        { x: offset, y: offset + boxSize },
    ];

    useEffect(() => {
        if (!isActive || !dotRef.current) return;

        startTimeRef.current = performance.now();

        const getPhaseEdge = (phase: string) => {
            switch (phase) {
                case 'inhale': return 0;
                case 'hold': return 1;
                case 'exhale': return 2;
                case 'hold-empty': return 3;
                default: return 0;
            }
        };

        const getPhaseDuration = (phase: string) => {
            if (!cycle) return 4;
            switch (phase) {
                case 'inhale': return cycle.inhale;
                case 'hold': return cycle.holdIn;
                case 'exhale': return cycle.exhale;
                case 'hold-empty': return cycle.holdOut;
                default: return 4;
            }
        };

        const animate = () => {
            const edge = getPhaseEdge(phaseRef.current);
            const duration = getPhaseDuration(phaseRef.current) * 1000;
            const elapsed = performance.now() - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            const from = corners[edge];
            const to = corners[(edge + 1) % 4];
            const x = from.x + (to.x - from.x) * progress;
            const y = from.y + (to.y - from.y) * progress;

            if (dotRef.current) {
                dotRef.current.style.left = `${x}px`;
                dotRef.current.style.top = `${y}px`;
            }

            animRef.current = requestAnimationFrame(animate);
        };

        startTimeRef.current = performance.now();
        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [isActive, breathPhase]);

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center relative" style={{ width: '200px', height: '200px' }}>
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
                <rect
                    x={offset} y={offset} width={boxSize} height={boxSize}
                    fill="rgba(219,234,254,0.3)"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    rx="4"
                    opacity={isActive ? 0.8 : 0.4}
                />
                <text x={offset + boxSize / 2} y={offset - 6} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7">INHALE</text>
                <text x={offset + boxSize + 6} y={offset + boxSize / 2} textAnchor="start" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7" transform={`rotate(90, ${offset + boxSize + 6}, ${offset + boxSize / 2})`}>HOLD</text>
                <text x={offset + boxSize / 2} y={offset + boxSize + 16} textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7">EXHALE</text>
                <text x={offset - 6} y={offset + boxSize / 2} textAnchor="end" fill="#3b82f6" fontSize="10" fontWeight="bold" opacity="0.7" transform={`rotate(-90, ${offset - 6}, ${offset + boxSize / 2})`}>HOLD</text>
            </svg>
            <div
                ref={dotRef}
                className="absolute w-5 h-5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 -translate-x-1/2 -translate-y-1/2 z-10"
                style={{
                    left: `${offset}px`,
                    top: `${offset}px`,
                    transition: isActive ? 'none' : 'all 0.3s',
                }}
            >
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
            </div>
        </div>
    );
};

// ─── 4. 4-7-8 Breathing: Circular arc filling clockwise ─────────────────────
const ArcRingViz: React.FC<{ breathPhase: string; isActive: boolean; cycle?: { inhale: number; holdIn: number; exhale: number; holdOut: number } }> = ({ breathPhase, isActive, cycle }) => {
    const [arcProgress, setArcProgress] = useState(0);
    const animRef = useRef<number>(0);
    const startTimeRef = useRef(0);

    useEffect(() => {
        if (!isActive) {
            setArcProgress(0);
            return;
        }

        const getPhaseDuration = () => {
            if (!cycle) return 4;
            switch (breathPhase) {
                case 'inhale': return cycle.inhale;
                case 'hold': return cycle.holdIn;
                case 'exhale': return cycle.exhale;
                case 'hold-empty': return cycle.holdOut;
                default: return 4;
            }
        };

        startTimeRef.current = performance.now();
        const duration = getPhaseDuration() * 1000;

        const animate = () => {
            const elapsed = performance.now() - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            setArcProgress(progress);
            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate);
            }
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, [isActive, breathPhase]);

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - arcProgress);

    const phaseColor = breathPhase === 'inhale' ? '#3b82f6'
        : breathPhase === 'exhale' ? '#8b5cf6'
            : breathPhase === 'hold' ? '#f59e0b'
                : '#64748b';

    return (
        <div className="w-52 h-52 md:w-60 md:h-60 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="6" opacity="0.1" />
                <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke={phaseColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke 0.3s' }}
                />
                <circle
                    cx="100" cy="100" r={radius}
                    fill="none"
                    stroke={phaseColor}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    opacity="0.15"
                    filter="blur(4px)"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold" style={{ color: phaseColor }}>
                    {breathPhase === 'inhale' ? '↑' : breathPhase === 'exhale' ? '↓' : '•'}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                    {breathPhase.replace('-', ' ')}
                </span>
            </div>
        </div>
    );
};

// ─── 5. Alternate Nostril: Full Self-Contained Visualization ─────────────────
const NostrilViz: React.FC<{ breathPhase: string; isActive: boolean }> = () => {
    const [phase, setPhase] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const localIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const baseDuration = 4000;
    const duration = baseDuration / speed;

    const phases = [
        { label: 'Inhale Left', side: 'left', action: 'inhale', color: 'from-blue-400 to-blue-500', icon: '🌊' },
        { label: 'Hold', side: 'both', action: 'hold', color: 'from-purple-400 to-purple-500', icon: '✨' },
        { label: 'Exhale Right', side: 'right', action: 'exhale', color: 'from-teal-400 to-teal-500', icon: '🍃' },
        { label: 'Inhale Right', side: 'right', action: 'inhale', color: 'from-teal-400 to-teal-500', icon: '🍃' },
        { label: 'Hold', side: 'both', action: 'hold', color: 'from-purple-400 to-purple-500', icon: '✨' },
        { label: 'Exhale Left', side: 'left', action: 'exhale', color: 'from-blue-400 to-blue-500', icon: '🌊' },
    ];

    useEffect(() => {
        if (isPlaying) {
            localIntervalRef.current = setInterval(() => {
                setPhase((prev) => (prev + 1) % phases.length);
            }, duration);
        }
        return () => {
            if (localIntervalRef.current) clearInterval(localIntervalRef.current);
        };
    }, [isPlaying, speed, duration]);

    const current = phases[phase];

    const togglePlayPause = () => setIsPlaying(!isPlaying);
    const resetExercise = () => setPhase(0);

    return (
        <div className="flex items-center justify-center w-full">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/20 dark:border-white/10">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Nadi Shodhana
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Alternate Nostril Breathing</p>
                </div>

                {/* Main Visualization */}
                <div className="relative h-80 flex justify-center items-center mb-8">
                    {/* Left Nostril Channel */}
                    <div className="absolute left-16 flex flex-col items-center">
                        <div className="text-xs font-medium text-slate-400 mb-2">Left</div>
                        <div className="w-4 h-56 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full overflow-hidden shadow-inner relative">
                            <motion.div
                                animate={{
                                    height: current.side === 'left' || current.side === 'both'
                                        ? (current.action === 'inhale' || current.action === 'hold' ? '100%' : '0%')
                                        : '0%',
                                }}
                                transition={{ duration: duration / 1000, ease: "easeInOut" }}
                                className={`absolute bottom-0 w-full bg-gradient-to-t ${current.side === 'left' ? 'from-blue-500 to-blue-400' : 'from-purple-500 to-purple-400'} shadow-lg`}
                            />
                            {(current.side === 'left' && current.action === 'inhale') && (
                                <motion.div
                                    initial={{ y: 56 * 4, opacity: 0 }}
                                    animate={{ y: 0, opacity: [0, 1, 0] }}
                                    transition={{ duration: duration / 1000, repeat: Infinity }}
                                    className="absolute w-2 h-2 bg-blue-300 rounded-full left-1"
                                />
                            )}
                        </div>
                    </div>

                    {/* Center Focus Point */}
                    <div className="flex flex-col items-center">
                        <motion.div
                            animate={{ scale: current.action === 'hold' ? [1, 1.15, 1] : 1 }}
                            transition={{ duration: 2, repeat: current.action === 'hold' ? Infinity : 0, ease: "easeInOut" }}
                            className="relative"
                        >
                            <motion.div
                                animate={{
                                    opacity: current.action === 'hold' ? [0.3, 0.6, 0.3] : 0.2,
                                    scale: current.action === 'hold' ? [1, 1.3, 1] : 1,
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`absolute inset-0 rounded-full bg-gradient-to-r ${current.color} blur-xl -z-10`}
                            />
                            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border-4 border-white dark:border-slate-700 shadow-xl flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${current.color} shadow-lg flex items-center justify-center text-3xl`}
                                >
                                    {current.icon}
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Breathing instruction */}
                        <div className="mt-6 min-h-[60px] flex flex-col items-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={current.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-center"
                                >
                                    <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-gradient-to-r ${current.color} text-white shadow-md`}>
                                        {current.action}
                                    </span>
                                    <h3 className="text-2xl font-light text-slate-700 dark:text-slate-200">{current.label}</h3>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Nostril Channel */}
                    <div className="absolute right-16 flex flex-col items-center">
                        <div className="text-xs font-medium text-slate-400 mb-2">Right</div>
                        <div className="w-4 h-56 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-full overflow-hidden shadow-inner relative">
                            <motion.div
                                animate={{
                                    height: current.side === 'right' || current.side === 'both'
                                        ? (current.action === 'inhale' || current.action === 'hold' ? '100%' : '0%')
                                        : '0%',
                                }}
                                transition={{ duration: duration / 1000, ease: "easeInOut" }}
                                className={`absolute bottom-0 w-full bg-gradient-to-t ${current.side === 'right' ? 'from-teal-500 to-teal-400' : 'from-purple-500 to-purple-400'} shadow-lg`}
                            />
                            {(current.side === 'right' && current.action === 'inhale') && (
                                <motion.div
                                    initial={{ y: 56 * 4, opacity: 0 }}
                                    animate={{ y: 0, opacity: [0, 1, 0] }}
                                    transition={{ duration: duration / 1000, repeat: Infinity }}
                                    className="absolute w-2 h-2 bg-teal-300 rounded-full left-1"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                            key={phase}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: duration / 1000, ease: "linear" }}
                            className={`h-full bg-gradient-to-r ${current.color} shadow-sm`}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-400">
                        <span>Cycle {Math.floor(phase / 6) + 1}</span>
                        <span>Phase {phase + 1}/6</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={togglePlayPause}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <button
                        onClick={resetExercise}
                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        ↻ Reset
                    </button>
                </div>

                {/* Speed Control */}
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Speed</label>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{speed}x</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Slower</span>
                        <span>Faster</span>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className="text-blue-700 dark:text-blue-400">Tip:</strong> Nadi Shodhana balances the left and right hemispheres of the brain,
                        promoting calmness and mental clarity. Practice for 5-10 minutes daily for best results.
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Main Visualizer Component ──────────────────────────────────────────────
const BreathingVisualizer: React.FC<BreathingVisualizerProps> = ({ sessionId, breathPhase, isActive, cycle }) => {
    switch (sessionId) {
        case '1':
            return <WavyPathViz breathPhase={breathPhase} isActive={isActive} />;
        case '2':
            return <GoldenOrbViz breathPhase={breathPhase} isActive={isActive} />;
        case '3':
            return <BoxTraceViz breathPhase={breathPhase} isActive={isActive} cycle={cycle} />;
        case '4':
            return <ArcRingViz breathPhase={breathPhase} isActive={isActive} cycle={cycle} />;
        case '5':
            return <NostrilViz breathPhase={breathPhase} isActive={isActive} />;
        default:
            return <GoldenOrbViz breathPhase={breathPhase} isActive={isActive} />;
    }
};

export default BreathingVisualizer;
