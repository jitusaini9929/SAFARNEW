import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface WelcomeDialogProps {
  onClose: () => void;
  userName?: string;
}

export default function WelcomeDialog({ onClose, userName }: WelcomeDialogProps) {
  const [show, setShow] = useState(true);
  const { t } = useTranslation();

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 500); // Wait for exit animation
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Enhanced Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#07080a]/80 backdrop-blur-[12px]"
            onClick={handleClose}
          />

          {/* Premium Monolith Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 max-w-lg w-full"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -inset-4 bg-primary/10 blur-[100px] rounded-full pointer-events-none opacity-50 dark:opacity-20" />

            <Card className="rounded-3xl border-neutral-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden bg-white dark:bg-[#07080a]">
              <CardContent className="p-10 text-center space-y-8 relative">
                {/* Visual Flair */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                {/* Greeting Section */}
                <div className="space-y-4">
                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[42px] font-['Satoshi',sans-serif] font-black text-primary tracking-tight leading-none"
                  >
                    {t("welcome.hello")}
                    <span className="text-slate-950 dark:text-white">
                      {userName ? `, ${userName}` : ""}
                    </span>
                    .
                  </motion.h2>

                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-[19px] font-['Satoshi',sans-serif] text-slate-700 dark:text-slate-200 font-medium leading-relaxed"
                  >
                    {t("welcome.subtitle_1")}{" "}
                    <span className="text-primary font-black tracking-widest px-3 py-1 bg-primary/10 rounded-md border border-primary/20">
                      NISHTHA
                    </span>
                    {t("welcome.subtitle_2")}
                  </motion.p>
                </div>

                {/* Message Body with Refined Spacing */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-6 text-[17px] font-['Satoshi',sans-serif] text-slate-600 dark:text-slate-400 font-medium leading-relaxed"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-300">
                    {t("welcome.body1")}
                  </p>

                  <div className="flex flex-col gap-1 items-center">
                    <p className="text-slate-700 dark:text-slate-200">{t("welcome.body2")}</p>
                    <p className="text-slate-500 font-light translate-y-[-2px]">
                      {t("welcome.body3")}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-100 dark:border-white/5 space-y-4">
                    <p className="text-primary dark:text-primary/90 font-bold uppercase tracking-[0.2em] text-[13px]">
                      {t("welcome.body4")}
                    </p>
                    <p className="text-4xl font-['Satoshi',sans-serif] font-black text-slate-950 dark:text-white drop-shadow-sm dark:drop-shadow-neon">
                      {t("welcome.smile").replace(' :)', '')}
                    </p>
                  </div>
                </motion.div>

                {/* Tactile CTA Button */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="pt-4"
                >
                  <Button
                    onClick={handleClose}
                    className="w-full h-16 bg-primary text-white dark:text-black hover:bg-primary/90 rounded-2xl text-[18px] font-black uppercase tracking-widest shadow-[0_8px_0_rgb(20,130,110),0_15px_30px_rgba(45,212,191,0.3)] hover:shadow-[0_4px_0_rgb(20,130,110),0_10px_20px_rgba(45,212,191,0.2)] hover:translate-y-1 active:translate-y-2 active:shadow-none transition-all duration-100 flex items-center justify-center gap-3 border-none ring-0 select-none"
                  >
                    {t("welcome.cta").replace(' ✨', '')}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
