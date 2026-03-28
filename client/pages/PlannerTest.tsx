import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import PlannerSidebar from "@/components/PlannerSidebar";

export default function PlannerTest() {
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const checking = status === "loading";
  const isAuthed = Boolean(user?.id);

  return (
    <>
      <PlannerSidebar />
      <div className="min-h-[100dvh] bg-gradient-to-br from-[#E0F2FE] via-[#F5F3FF] to-[#FFF1F2] dark:from-[#131416] dark:via-[#131416] dark:to-[#131416] p-4 md:p-10 flex items-center justify-center font-['Poppins',sans-serif] text-[#3c4146] dark:text-[#e7e5e5] transition-colors duration-500">
        
        {/* Physical Console Chassis */}
      <motion.div 
        initial={{ opacity: 0, y: 20, rotateX: 5 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        style={{ perspective: "1000px" }}
        className="max-w-xl w-full mx-auto"
      >
        <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden transition-all duration-500
          bg-gradient-to-br from-[#f0f0f5] to-[#d6d8e1] dark:from-[#1e2024] dark:to-[#121315]
          shadow-[16px_16px_32px_rgba(166,171,189,0.4),-16px_-16px_32px_rgba(255,255,255,0.9),inset_0_1px_2px_rgba(255,255,255,1)]
          dark:shadow-[12px_12px_24px_rgba(0,0,0,0.8),-8px_-8px_16px_rgba(255,255,255,0.03),inset_0_1px_1px_rgba(255,255,255,0.05)]
          border border-[#ffffff] dark:border-[#2b2c2c]
        ">
          
          {/* Surface Texture Noise */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />

          {/* Machined Branding Label */}
          <div className="inline-flex rounded-full px-4 py-1.5 mb-8 transition-colors duration-500
            bg-[#d9dbe2] dark:bg-[#0e0e0e] 
            shadow-[inset_2px_2px_4px_rgba(166,171,189,0.6),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]
            dark:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]
          ">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6b7280] dark:text-[#767575] flex items-center gap-2 font-['Satoshi',sans-serif]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
              100K DIAGNOSTIC UNIT
            </p>
          </div>

          <h1 className="text-4xl md:text-5xl font-['Playfair_Display',serif] font-bold tracking-tight mb-4 text-[#2d333b] dark:text-[#fcf9f8] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Test Console.
          </h1>
          <p className="text-sm md:text-base leading-relaxed mb-10 font-medium text-[#6b7280] dark:text-[#acabaa]">
            System diagnostics and auth state verification module for the syllabus array.
          </p>

          <div className="grid gap-6">
            
            {/* LCD LCD Display Tray for Auth */}
            <div className="rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-500
              bg-[#cdd0d8] dark:bg-[#080808]
              shadow-[inset_4px_4px_8px_rgba(166,171,189,0.7),inset_-4px_-4px_8px_rgba(255,255,255,0.6)]
              dark:shadow-[inset_4px_4px_12px_rgba(0,0,0,0.9),inset_-1px_-1px_3px_rgba(255,255,255,0.05)]
              border border-[#d0d3db] dark:border-[#131416]
            ">
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-widest mb-2 text-[#5a6270] dark:text-[#565555]">System Status</h2>
                
                <div className="font-mono text-sm tracking-tight flex items-center gap-3">
                  {checking ? (
                    <span className="text-amber-600 dark:text-amber-400 drop-shadow-[0_0_4px_rgba(217,119,6,0.5)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> AWAITING PING...
                    </span>
                  ) : (
                    <span className={`drop-shadow-[0_0_6px_currentColor] flex items-center gap-2 ${isAuthed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAuthed ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-[0_0_8px_currentColor] ${isAuthed ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      </span>
                      {isAuthed ? "AUTH: VERIFIED" : "AUTH: BLOCKED"}
                    </span>
                  )}
                </div>
              </div>
              
              {!isAuthed && !checking && (
                <div className="self-start md:self-auto rounded px-3 py-1 bg-red-100/50 dark:bg-red-900/20 border border-red-300 dark:border-red-800/50 text-[10px] uppercase font-bold text-red-700 dark:text-red-400">
                  Manual Override Req.
                </div>
              )}
            </div>

            {/* Hardware Convex Buttons */}
            <div className="flex flex-col gap-5 mt-6 relative z-10 font-['Satoshi',sans-serif]">
              <motion.button
                whileHover={{ scale: 0.985 }}
                whileTap={{ scale: 0.95, y: 2 }}
                onClick={() => navigate("/study/planner")}
                className="group relative w-full rounded-xl p-[1px] focus:outline-none"
              >
                <div className="relative w-full rounded-xl px-6 py-4 flex items-center justify-center font-bold text-lg tracking-wide transition-all duration-300
                  bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white
                  shadow-[0_4px_10px_rgba(37,99,235,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-4px_8px_rgba(0,0,0,0.2)]
                  dark:from-[#1d4ed8] dark:to-[#1e3a8a] dark:shadow-[0_6px_15px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-4px_8px_rgba(0,0,0,0.4)]
                  active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]
                ">
                  Launch Planner UI
                </div>
              </motion.button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/?signin=true"
                    className="block w-full rounded-xl px-6 py-3.5 font-bold text-center text-sm transition-all duration-300
                      bg-[#f3f4f7] dark:bg-[#202225] text-[#4b5563] dark:text-[#d1d5db]
                      shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)]
                      dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]
                      active:shadow-[inset_2px_2px_4px_rgba(166,171,189,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.5)]
                      dark:active:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(255,255,255,0.02)]
                    "
                  >
                    Authenticate
                  </Link>
                </motion.div>
                
                <motion.div whileHover={{ scale: 0.98 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to="/"
                    className="block w-full rounded-xl px-6 py-3.5 font-bold text-center text-sm transition-all duration-300
                      bg-[#e6e7ee] dark:bg-[#1a1c1e] text-[#6b7280] dark:text-[#767575]
                      shadow-[inset_3px_3px_6px_rgba(166,171,189,0.3),inset_-3px_-3px_6px_rgba(255,255,255,0.6)]
                      dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.4),inset_-1px_-1px_3px_rgba(255,255,255,0.02)]
                      hover:shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)]
                      hover:dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]
                    "
                  >
                    Abort to Main
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Hardware Etched Labels */}
            <div className="mt-8 pt-6 border-t border-[#d9dbe2] dark:border-[#252626]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-[#8b919e] dark:text-[#565555] drop-shadow-sm font-['Playfair_Display',serif]">Operation Sequence</h3>
              <ul className="space-y-3 text-xs font-medium text-[#6b7280] dark:text-[#acabaa]">
                <li className="flex items-center gap-4">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#131313] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.5)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)] text-[9px] font-bold text-[#4b5563] dark:text-[#767575]">1</span> 
                  <span>Ensure primary linkage (Auth)</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#131313] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.5)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)] text-[9px] font-bold text-[#4b5563] dark:text-[#767575]">2</span> 
                  <span>Trigger "Launch Planner UI" module</span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#d9dbe2] dark:bg-[#131313] shadow-[inset_1px_1px_2px_rgba(166,171,189,0.5)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8)] text-[9px] font-bold text-[#4b5563] dark:text-[#767575]">3</span> 
                  <span>Engage localized storage protocols</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
}
