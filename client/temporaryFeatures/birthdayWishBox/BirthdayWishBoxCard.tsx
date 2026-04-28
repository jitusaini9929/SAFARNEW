import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BirthdayWishBoxCardProps = {
  onOpen: (tab: "write" | "view") => void;
  className?: string;
};

const BirthdayWishBoxCard: React.FC<BirthdayWishBoxCardProps> = ({ onOpen, className }) => {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/40 bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 px-6 py-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] dark:border-white/10 dark:from-[#1a1b24] dark:via-[#1d1824] dark:to-[#132026]",
        className,
      )}
    >
      <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-500/10" />
      <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-400/10" />

      <div className="relative z-10 grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-white/70 px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.22em] text-amber-900 shadow-sm dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-200">
            <Sparkles className="h-4 w-4" />
            Temporary Birthday Wish Box
          </div>

          <h2 className="font-playfair text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Leave a heartfelt birthday wish for Sir
          </h2>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-700/90 dark:text-slate-200/70">
            One wish per account. Post with your name or anonymously. Public wall displays only approved, non-anonymous wishes.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <Button
            className="h-12 w-full rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-900/90 dark:bg-white dark:text-slate-900"
            onClick={() => onOpen("write")}
          >
            Write Your Wish
          </Button>
          <Button
            variant="outline"
            className="h-12 w-full rounded-2xl border-slate-900/10 bg-white/60 text-slate-800 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white"
            onClick={() => onOpen("view")}
          >
            View Wishes
          </Button>
        </div>
      </div>

      {/* present icon removed from card; gateway now in navbar */}
    </section>
  );
};

export default BirthdayWishBoxCard;
