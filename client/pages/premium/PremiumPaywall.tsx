import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Check,
  Shield,
  Sparkles,
  Zap,
  MessageSquare,
  Timer,
  Infinity as InfinityIcon,
  Crown,
  Lock,
  ArrowLeft,
  Loader2,
  Calendar,
} from "lucide-react";
import confetti from "canvas-confetti";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  badge?: string;
  savings?: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "study-planner-pro-monthly",
    name: "Monthly Pro",
    price: 199,
    duration: "/ month",
  },
  {
    id: "study-planner-pro-exam",
    name: "Exam Season (3 Mo)",
    price: 499,
    duration: "/ 3 months",
    badge: "Recommended",
    savings: "Save 15%",
    popular: true,
  },
  {
    id: "study-planner-pro-annual",
    name: "Annual Pro",
    price: 999,
    duration: "/ year",
    badge: "Best Value",
    savings: "Save 60%",
  },
];

// Helper to load script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PremiumPaywall() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("study-planner-pro-exam");
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Trigger confetti when success is shown
  useEffect(() => {
    if (success) {
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [success]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast({
          title: "Payment Gateway Error",
          description: "Could not load the payment SDK. Check your network.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Create Razorpay order
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedPlanId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create order");
      }

      const orderData = await response.json();

      // 3. Configure and launch checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "SAFAR Pro",
        description: orderData.course.name,
        image: "/favicon.svg",
        order_id: orderData.order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#10b981", // Emerald 500 theme accent
        },
        handler: async (paymentResponse: any) => {
          setLoading(true);
          try {
            // 4. Verify payment
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                courseId: selectedPlanId,
              }),
            });

            if (!verifyRes.ok) {
              const verifyError = await verifyRes.json();
              throw new Error(verifyError.message || "Verification failed");
            }

            // 5. Success states
            toast({
              title: "Payment Successful!",
              description: "Thank you for upgrading to SAFAR Pro.",
            });
            setSuccess(true);
            await refreshUser(true);
          } catch (verifyErr: any) {
            console.error("Verification error:", verifyErr);
            toast({
              title: "Verification Failed",
              description: verifyErr.message || "Please contact support with your payment receipt.",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout failed",
        description: error.message || "An unexpected error occurred during checkout.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] px-6 text-white text-center">
        <div className="max-w-md space-y-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-4 ring-emerald-500/20 animate-bounce">
            <Crown className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">You're Pro!</h1>
            <p className="text-slate-400">
              Welcome to the premium club. Your SAFAR Pro subscription is now active!
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#151D30] p-5">
            <h3 className="font-semibold text-emerald-400">Features Unlocked:</h3>
            <ul className="mt-3 text-left text-sm text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Unlimited study schedules & auto-planning</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Private 1:1 direct messages in Mehfil</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Comprehensive mindfulness & scorecard insights</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Premium crown badge in your profile</span>
              </li>
            </ul>
          </div>
          <Button
            size="lg"
            className="w-full bg-emerald-500 text-[#0B0F19] hover:bg-emerald-400 font-bold transition-all duration-200"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Already premium fallback
  if (user?.isPremium) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0F19] px-6 text-white text-center">
        <div className="max-w-md space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20">
            <Crown className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Active Pro Subscription</h1>
            <p className="text-slate-400">
              You are currently enjoying all premium benefits of SAFAR Pro.
            </p>
          </div>
          {user.premiumUntil && (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-400">
              <Calendar className="h-4 w-4" />
              <span>Valid until: {new Date(user.premiumUntil).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 border-slate-800 text-white hover:bg-slate-800" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <Button className="flex-1 bg-emerald-500 text-[#0B0F19] hover:bg-emerald-400 font-medium" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A13] text-white p-6 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <div className="max-w-5xl mx-auto space-y-10 relative z-10 py-6">
        <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Shield className="h-4 w-4" />
            <span className="text-xs tracking-wider uppercase">Secure Checkout</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-2xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Elevate Your Mindset & Productivity</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Unlock <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">SAFAR Pro</span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            Say goodbye to limits. Organize your exam syllabus seamlessly, connect directly with study peers, and unlock advanced scoreboard logs.
          </p>
        </section>

        {/* Plan Cards */}
        <section className="grid md:grid-cols-3 gap-6 pt-4">
          {PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative flex flex-col justify-between cursor-pointer rounded-3xl p-6 border transition-all duration-300 transform hover:-translate-y-1 ${
                  isSelected
                    ? "bg-gradient-to-b from-[#151d33] to-[#0d1324] border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50"
                    : "bg-[#0f1422] border-slate-800/80 hover:border-slate-700 hover:bg-[#131b2e]"
                }`}
              >
                {plan.badge && (
                  <div className={`absolute top-0 right-6 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold tracking-wider text-black ${
                    plan.popular ? "bg-emerald-400" : "bg-indigo-400"
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">{plan.name}</h3>
                    {plan.savings && (
                      <span className="inline-block mt-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        {plan.savings}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.duration}</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                    {isSelected ? "Selected Plan" : "Select Plan"}
                  </span>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    isSelected ? "bg-emerald-500 border-emerald-400 text-[#0B0F19]" : "border-slate-700"
                  }`}>
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* CTA Button */}
        <section className="flex flex-col items-center justify-center pt-2 space-y-3">
          <Button
            size="lg"
            className="w-full max-w-md bg-emerald-500 text-[#0B0F19] hover:bg-emerald-400 font-black text-lg py-7 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.3)] transition-all duration-200"
            disabled={loading}
            onClick={handleCheckout}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Preparing Gateway...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5 fill-current" />
                Unlock Pro Access Now
              </>
            )}
          </Button>
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            100% Secure payments handled by Razorpay
          </span>
        </section>

        {/* Comparison Section */}
        <section className="bg-[#0b0e17] rounded-3xl border border-slate-800/70 p-6 md:p-8 space-y-6 mt-10">
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Compare Pro vs Free</h2>
            <p className="text-sm text-slate-400">Maximize your focus efficiency by unlocking our premium toolbox.</p>
          </div>

          <div className="divide-y divide-slate-800/80">
            <div className="grid grid-cols-2 md:grid-cols-3 py-4 text-xs md:text-sm font-bold text-slate-400">
              <div>Feature</div>
              <div className="text-center">Free Edition</div>
              <div className="text-center text-emerald-400 hidden md:block">SAFAR Pro</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 py-4 text-sm items-center">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-indigo-400" />
                <span>Study Planner Schedules</span>
              </div>
              <div className="text-center text-slate-400">Basic Manual</div>
              <div className="text-center text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <Crown className="h-3.5 w-3.5 text-emerald-400 fill-current" />
                <span>AI Auto-Scheduled</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 py-4 text-sm items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <span>Mehfil 1:1 Direct Messages</span>
              </div>
              <div className="text-center text-slate-400">Locked</div>
              <div className="text-center text-emerald-400 font-semibold">Unlimited chats</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 py-4 text-sm items-center">
              <div className="flex items-center gap-2">
                <InfinityIcon className="h-4 w-4 text-indigo-400" />
                <span>Active Goals Tracker</span>
              </div>
              <div className="text-center text-slate-400">Max 3 goals</div>
              <div className="text-center text-emerald-400 font-semibold">Unlimited goals</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 py-4 text-sm items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Profile Customization</span>
              </div>
              <div className="text-center text-slate-400">Standard avatar</div>
              <div className="text-center text-emerald-400 font-semibold">Crown badge & titles</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
