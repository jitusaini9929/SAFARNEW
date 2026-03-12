import { useMemo } from "react";
import {
  CreditCard,
  Lock,
  Smartphone,
} from "lucide-react";
import { DHYAN_COURSES } from "@shared/payments";

interface CourseBannerProps {
  user: { name: string; email: string } | null;
  courseId?: string;
}

const MEDITATION_PAYMENT_REDIRECT_URL = "https://www.parmaracademy.in/courses/75-safar-30";

export default function CourseBanner({
  user,
  courseId = "safar-30",
}: CourseBannerProps) {
  const course = useMemo(
    () => DHYAN_COURSES.find((entry) => entry.id === courseId) || DHYAN_COURSES[0],
    [courseId],
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#11131C]/80 backdrop-blur-md p-4 shadow-xl shadow-cyan-500/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold">
            Dhyan Premium Access
          </p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {course.name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {course.description}
          </p>
        </div>
        <div className="rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 p-2 text-cyan-600 dark:text-cyan-300">
          <Smartphone className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-200/60 dark:border-cyan-500/20 bg-cyan-50/70 dark:bg-cyan-500/10 p-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            One-time unlock
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">Rs {course.price}</p>
        </div>
        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
          <p className="font-medium">UPI-first checkout</p>
          <p>GPay, PhonePe, Paytm, BHIM</p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
          Pay on Parmar Academy
        </div>
      </div>

      <div className="mt-4">
        <a
          href={MEDITATION_PAYMENT_REDIRECT_URL}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm px-4 py-2.5 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:scale-[1.01] transition-all inline-flex items-center justify-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Continue to payment
        </a>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <Lock className="w-3.5 h-3.5" />
        Click the button to open the payment page.
      </div>
    </section>
  );
}
