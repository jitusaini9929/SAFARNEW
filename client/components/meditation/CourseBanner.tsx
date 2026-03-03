import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { DHYAN_COURSES } from "@shared/payments";
import {
  checkPurchaseStatus,
  createOrder,
  loadRazorpayScript,
  openRazorpayCheckout,
} from "@/utils/paymentService";

interface CourseBannerProps {
  user: { name: string; email: string } | null;
  courseId?: string;
}

type UnlockState = "checking" | "locked" | "unlocked";
type CheckoutState = "idle" | "loading" | "error";

export default function CourseBanner({
  user,
  courseId = "safar-30",
}: CourseBannerProps) {
  const course = useMemo(
    () => DHYAN_COURSES.find((entry) => entry.id === courseId) || DHYAN_COURSES[0],
    [courseId],
  );

  const [unlockState, setUnlockState] = useState<UnlockState>("checking");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStatus() {
      if (!user) {
        setUnlockState("locked");
        return;
      }

      setUnlockState("checking");
      try {
        const status = await checkPurchaseStatus(courseId);
        setUnlockState(status.purchased ? "unlocked" : "locked");
      } catch {
        setUnlockState("locked");
      }
    }

    loadStatus();
  }, [courseId, user]);

  const handleUnlock = async () => {
    if (!user) {
      setErrorMessage("Please sign in to unlock this section.");
      setCheckoutState("error");
      return;
    }

    setCheckoutState("loading");
    setErrorMessage("");

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load Razorpay checkout.");
      }

      const orderData = await createOrder(courseId);
      if (!orderData.success) {
        throw new Error("Failed to create order.");
      }

      setCheckoutState("idle");
      openRazorpayCheckout({
        course,
        orderData,
        user,
        onSuccess: () => {
          setUnlockState("unlocked");
          setCheckoutState("idle");
          setErrorMessage("");
        },
        onFailure: (error) => {
          setCheckoutState("error");
          setErrorMessage(error || "Payment failed. Please try again.");
        },
      });
    } catch (error: any) {
      setCheckoutState("error");
      setErrorMessage(error?.message || "Unable to start payment.");
    }
  };

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
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Secure Razorpay payment
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Unlock recorded on your account
        </div>
      </div>

      <div className="mt-4">
        {unlockState === "checking" ? (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking access...
          </div>
        ) : unlockState === "unlocked" ? (
          <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Access unlocked for this account.
            </p>
          </div>
        ) : (
          <button
            onClick={handleUnlock}
            disabled={checkoutState === "loading"}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-semibold text-sm px-4 py-2.5 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {checkoutState === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing UPI checkout...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Unlock with Razorpay UPI
                </>
              )}
            </span>
          </button>
        )}
      </div>

      {unlockState === "locked" && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Lock className="w-3.5 h-3.5" />
          Access is locked until payment is completed.
        </div>
      )}

      {checkoutState === "error" && errorMessage && (
        <div className="mt-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-300">{errorMessage}</p>
        </div>
      )}
    </section>
  );
}
