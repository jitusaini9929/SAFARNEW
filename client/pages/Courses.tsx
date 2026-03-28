import { useEffect, useMemo, useState } from "react";
import TopNavbar from "@/components/TopNavbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkPurchaseStatus,
  createOrder,
  getPaymentConfig,
  loadRazorpayScript,
  openRazorpayCheckout,
} from "@/utils/paymentService";
import { DHYAN_COURSES, type Course } from "@shared/payments";
import {
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Loader2,
} from "lucide-react";

type UserIdentity = { name: string; email: string };

export default function Courses() {
  const { user: authUser } = useAuth();
  const [purchaseState, setPurchaseState] = useState<Record<string, boolean>>({});
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [paymentsAvailable, setPaymentsAvailable] = useState(true);

  const courses = useMemo(() => DHYAN_COURSES, []);
  const user = useMemo<UserIdentity | null>(() => {
    if (!authUser?.email) return null;
    return {
      name: authUser.name || "Student",
      email: authUser.email,
    };
  }, [authUser?.email, authUser?.name]);

  useEffect(() => {
    let isCancelled = false;

    const loadPaymentConfig = async () => {
      try {
        const config = await getPaymentConfig();
        if (!isCancelled) {
          setPaymentsAvailable(config.available);
          if (!config.available && config.message) {
            setStatusMessage(config.message);
          }
        }
      } catch (error) {
        console.error("Failed to load payment config", error);
      }
    };

    loadPaymentConfig();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const loadPurchaseState = async () => {
      setIsChecking(true);
      try {
        const entries = await Promise.all(
          courses.map(async (course) => {
            const status = await checkPurchaseStatus(course.id).catch(() => ({
              purchased: false,
            }));
            return [course.id, Boolean(status.purchased)] as const;
          }),
        );
        if (!isCancelled) {
          setPurchaseState(Object.fromEntries(entries));
        }
      } finally {
        if (!isCancelled) {
          setIsChecking(false);
        }
      }
    };

    loadPurchaseState();
    return () => {
      isCancelled = true;
    };
  }, [courses, user]);

  const handlePurchase = async (course: Course) => {
    if (!user) {
      setStatusMessage("Please sign in to purchase this course.");
      return;
    }

    setStatusMessage("");
    setLoadingCourseId(course.id);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setStatusMessage("Razorpay failed to load. Please refresh and try again.");
        setLoadingCourseId(null);
        return;
      }

      const orderData = await createOrder(course.id);

      openRazorpayCheckout({
        course,
        orderData,
        user,
        onSuccess: () => {
          setPurchaseState((prev) => ({ ...prev, [course.id]: true }));
          setStatusMessage("Payment successful. Access granted.");
          setLoadingCourseId(null);
        },
        onFailure: (error) => {
          setStatusMessage(error);
          setLoadingCourseId(null);
        },
      });

      setLoadingCourseId(null);
    } catch (error: any) {
      setStatusMessage(error?.message || "Unable to start payment right now.");
      setLoadingCourseId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19]">
      <TopNavbar />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-500 font-semibold">
            Courses
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-slate-900 dark:text-white">
            Dhyan Learning Tracks
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Deepen your meditation journey with guided courses, daily structure, and
            progress checkpoints. Unlock once and access anytime.
          </p>
        </div>

        {statusMessage && (
          <div className="mt-6 rounded-xl border border-emerald-200/70 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">
            {statusMessage}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {courses.map((course) => {
            const isPurchased = Boolean(purchaseState[course.id]);
            const isLoading = loadingCourseId === course.id;

            return (
              <article
                key={course.id}
                className="rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-[#101624]/90 shadow-lg shadow-emerald-500/5 overflow-hidden"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-[#0B0F19]">
                  <img
                    src={course.imageUrl || "/Banner.jpeg"}
                    alt={course.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {course.name}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {course.description}
                      </p>
                    </div>
                    {isPurchased ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <Lock className="h-4 w-4" />
                        Locked
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 dark:border-emerald-500/30 px-3 py-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Razorpay secured checkout
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1">
                      <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                      UPI-first payment
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                        One-time access
                      </p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                        Rs {course.price}
                      </p>
                    </div>
                    <Button
                      disabled={
                        isPurchased || isLoading || isChecking || !paymentsAvailable
                      }
                      onClick={() => handlePurchase(course)}
                      className="w-full sm:w-auto rounded-xl px-5 py-6 text-sm font-semibold"
                    >
                      {isPurchased ? (
                        "Access granted"
                      ) : !paymentsAvailable ? (
                        "Payments unavailable"
                      ) : isLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Starting payment
                        </span>
                      ) : (
                        "Unlock with Razorpay"
                      )}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
