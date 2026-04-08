import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NostrilBreathingVisualization = () => {
  const [phase, setPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

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
      intervalRef.current = setInterval(() => {
        setPhase((prev) => (prev + 1) % phases.length);
      }, duration);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, duration]);

  const current = phases[phase];

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetExercise = () => {
    setPhase(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Nadi Shodhana
          </h1>
          <p className="text-slate-500 text-sm">Alternate Nostril Breathing</p>
        </div>

        {/* Main Visualization */}
        <div className="relative h-80 flex justify-center items-center mb-8">
          {/* Left Nostril Channel */}
          <div className="absolute left-16 flex flex-col items-center">
            <div className="text-xs font-medium text-slate-400 mb-2">Left</div>
            <div className="w-4 h-56 bg-gradient-to-b from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner relative">
              <motion.div
                animate={{
                  height: current.side === 'left' || current.side === 'both' 
                    ? (current.action === 'inhale' || current.action === 'hold' ? '100%' : '0%') 
                    : '0%',
                }}
                transition={{ duration: duration / 1000, ease: "easeInOut" }}
                className={`absolute bottom-0 w-full bg-gradient-to-t ${current.side === 'left' ? 'from-blue-500 to-blue-400' : 'from-purple-500 to-purple-400'} shadow-lg`}
              />
              
              {/* Breathing particles */}
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
              animate={{
                scale: current.action === 'hold' ? [1, 1.15, 1] : 1,
              }}
              transition={{ 
                duration: 2,
                repeat: current.action === 'hold' ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="relative"
            >
              {/* Outer glow ring */}
              <motion.div
                animate={{
                  opacity: current.action === 'hold' ? [0.3, 0.6, 0.3] : 0.2,
                  scale: current.action === 'hold' ? [1, 1.3, 1] : 1,
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute inset-0 rounded-full bg-gradient-to-r ${current.color} blur-xl -z-10`}
              />
              
              {/* Main circle */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-slate-100 border-4 border-white shadow-xl flex items-center justify-center">
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
                  <h3 className="text-2xl font-light text-slate-700">{current.label}</h3>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right Nostril Channel */}
          <div className="absolute right-16 flex flex-col items-center">
            <div className="text-xs font-medium text-slate-400 mb-2">Right</div>
            <div className="w-4 h-56 bg-gradient-to-b from-slate-200 to-slate-100 rounded-full overflow-hidden shadow-inner relative">
              <motion.div
                animate={{
                  height: current.side === 'right' || current.side === 'both'
                    ? (current.action === 'inhale' || current.action === 'hold' ? '100%' : '0%')
                    : '0%',
                }}
                transition={{ duration: duration / 1000, ease: "easeInOut" }}
                className={`absolute bottom-0 w-full bg-gradient-to-t ${current.side === 'right' ? 'from-teal-500 to-teal-400' : 'from-purple-500 to-purple-400'} shadow-lg`}
              />
              
              {/* Breathing particles */}
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
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
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
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            ↻ Reset
          </button>
        </div>

        {/* Speed Control */}
        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-600">Speed</label>
            <span className="text-sm text-slate-500">{speed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong className="text-blue-700">Tip:</strong> Nadi Shodhana balances the left and right hemispheres of the brain, 
            promoting calmness and mental clarity. Practice for 5-10 minutes daily for best results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NostrilBreathingVisualization;
