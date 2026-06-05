import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PlannerSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const links = [
    { name: t("nav.home") || "Home", path: "/home" },
    { name: t("nav.dashboard") || "Dashboard", path: "/dashboard" },
    { name: t("apps.nishtha_name") || "Nishtha", path: "/nishtha/check-in" },
    { name: t("apps.mehfil_name") || "Mehfil", path: "/mehfil" },
    { name: t("apps.ekagra_name") || "Ekagra", path: "/study" },
    { name: "Syllabus Planner", path: "/study/planner" },
    { name: t("apps.dhyan_name") || "Dhyan", path: "/meditation" },
    { name: t("nav.profile_settings") || "Settings", path: "/profile" },
  ];

  return (
    <>
      <motion.button
        whileHover={{ scale: 0.95 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed top-6 left-6 z-[40] w-12 h-12 rounded-xl flex flex-col justify-center items-center gap-1.5 transition-colors duration-500
          bg-white/80 dark:bg-[#1e2024]/80 backdrop-blur-md
          shadow-[4px_4px_8px_rgba(166,171,189,0.4),-4px_-4px_8px_rgba(255,255,255,0.9),inset_0_1px_1px_rgba(255,255,255,1)]
          dark:shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)]
          border border-slate-300/60 dark:border-[#2b2c2c]/50
        "
      >
        <div className="w-5 h-0.5 bg-[#4b5563] dark:bg-[#e7e5e5] rounded-full shadow-[0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
        <div className="w-5 h-0.5 bg-[#4b5563] dark:bg-[#e7e5e5] rounded-full shadow-[0_1px_1px_rgba(255,255,255,0.5)] dark:shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
        <div className="w-3 h-0.5 bg-blue-500 dark:bg-[#4b5563] rounded-full shadow-[0_0_4px_rgba(59,130,246,0.5)] ml-auto mr-3.5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-[#e0f2fe]/40 dark:bg-[#000000]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%", skewX: 2 }}
              animate={{ x: 0, skewX: 0 }}
              exit={{ x: "-100%", skewX: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-72 h-[100dvh] flex flex-col p-6 overflow-y-auto
                bg-gradient-to-br from-[#f0f0f5] to-[#d6d8e1] dark:from-[#1a1c1e] dark:to-[#121315]
                border-r border-slate-300 dark:border-[#2b2c2c]
                shadow-[16px_0_32px_rgba(166,171,189,0.3)] dark:shadow-[20px_0_40px_rgba(0,0,0,0.8)]
              "
            >
              <div className="flex items-center justify-end mb-12 mt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e6e7ee] dark:bg-[#202225] shadow-[2px_2px_4px_rgba(166,171,189,0.4),-2px_-2px_4px_rgba(255,255,255,0.9),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.6),-1px_-1px_3px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] text-[#4b5563] dark:text-[#acabaa] font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {links.map((link) => {
                  const isActive =
                    location.pathname === link.path ||
                    (link.path !== "/" && location.pathname.startsWith(`${link.path}/`)) ||
                    (location.pathname === "/" && link.path === "/");
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`relative px-4 py-3 rounded-xl font-['Satoshi',sans-serif] font-bold text-sm transition-all duration-300 flex items-center justify-between group ${
                        isActive
                          ? "bg-[#d9dbe2] dark:bg-[#0e0e0e] text-blue-600 dark:text-blue-400 shadow-[inset_3px_3px_6px_rgba(166,171,189,0.6),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_8px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] border border-[#e6e7ee] dark:border-[#1a1c1e]"
                          : "bg-[#f3f4f7] dark:bg-[#202225] text-[#4b5563] dark:text-[#d1d5db] shadow-[4px_4px_8px_rgba(166,171,189,0.3),-4px_-4px_8px_rgba(255,255,255,0.8),inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.5),-2px_-2px_6px_rgba(255,255,255,0.02),inset_0_1px_1px_rgba(255,255,255,0.05)] hover:text-[#2d333b] hover:dark:text-[#fcf9f8]"
                      }`}
                    >
                      {link.name}
                      {isActive && (
                        <motion.div layoutId="navIndicator" className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
