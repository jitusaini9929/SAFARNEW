import { useState, useEffect } from "react";
import { Sparkles, ShieldCheck, Loader2, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import { DHYAN_COURSES, type Course } from "@shared/payments";
import {
  loadRazorpayScript,
  createOrder,
  checkPurchaseStatus,
  openRazorpayCheckout,
} from "@/utils/paymentService";

interface CourseBannerProps {
  user: { name: string; email: string } | null;
  courseId?: string;
}

type PaymentState = "idle" | "loading" | "success" | "error" | "already-purchased";

export default function CourseBanner({ user, courseId = "safar-30" }: CourseBannerProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPurchased, setIsPurchased] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const course = DHYAN_COURSES.find((c) => c.id === courseId) || DHYAN_COURSES[0];

  // Check if user already purchased this course
  useEffect(() => {
    async function checkStatus() {
      if (!user) {
        setIsCheckingStatus(false);
        return;
      }
      try {
        const status = await checkPurchaseStatus(courseId);
        if (status.purchased) {
          setIsPurchased(true);
          setPaymentState("already-purchased");
        }
      } catch (err) {
        // Silently fail - we'll let them try to purchase
      } finally {
        setIsCheckingStatus(false);
      }
    }
    checkStatus();
  }, [user, courseId]);

  // Handle purchase flow
  const handlePurchase = async () => {
    if (!user) {
      setErrorMessage("Please sign in to purchase this course.");
      setPaymentState("error");
      return;
    }

    setPaymentState("loading");
    setErrorMessage("");

    try {
      // Step 1: Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway. Please check your internet connection.");
      }

      // Step 2: Create order on server
      const orderData = await createOrder(courseId);

      if (!orderData.success) {
        throw new Error("Failed to create order. Please try again.");
      }

      // Step 3: Open Razorpay checkout
      setPaymentState("idle"); // Reset so button shows normal state while checkout is open
      openRazorpayCheckout({
        course,
        orderData,
        user,
        onSuccess: (_paymentId) => {
          setPaymentState("success");
          setIsPurchased(true);
        },
        onFailure: (error) => {
          setErrorMessage(error);
          setPaymentState("error");
        },
      });
    } catch (error: any) {
      setErrorMessage(error.message || "Something went wrong. Please try again.");
      setPaymentState("error");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Course Banner Image */}
      <div
        onClick={!isPurchased ? handlePurchase : undefined}
        className={`block rounded-2xl overflow-hidden shadow-lg transition-all duration-300 ring-2 
          ${isPurchased 
            ? "ring-emerald-400/60 cursor-default" 
            : "ring-cyan-400/60 hover:shadow-xl cursor-pointer hover:scale-[1.01]"
          }`}
        style={{
          boxShadow: isPurchased
            ? "0 0 15px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2)"
            : "0 0 15px rgba(34, 211, 238, 0.4), 0 0 30px rgba(34, 211, 238, 0.2)",
        }}
      >
        <div className="relative">
          <img
            src={course.imageUrl || "/Banner.jpeg"}
            alt={course.name}
            className="w-full h-auto object-cover"
          />

          {/* Overlay for purchased state */}
          {isPurchased && (
            <div className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  Course Purchased
                </span>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {paymentState === "loading" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
                <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Preparing checkout...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status / CTA Text */}
      <div className="text-center mt-1">
        {isCheckingStatus ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking purchase status...
          </p>
        ) : isPurchased ? (
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              You have access to this course
            </p>
          </div>
        ) : paymentState === "success" ? (
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Payment successful! Course unlocked.
            </p>
          </div>
        ) : paymentState === "error" ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-500" />
              <p className="text-xs text-red-500 font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={handlePurchase}
              className="text-xs text-cyan-500 hover:text-cyan-400 underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handlePurchase}
              disabled={paymentState === "loading"}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Enroll Now — ₹{course.price}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Secure payment via Razorpay
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
