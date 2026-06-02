import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { MessageCircle, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/apiFetch";
import { useToast } from "@/hooks/use-toast";

type FeedbackTriggerSource =
  | "floating_button"
  | "timer_session"
  | "goal_completion"
  | "usage_nudge"
  | "custom";

type FeedbackStep = "intro" | "form" | "success";

type FeedbackEventDetail = {
  trigger?: FeedbackTriggerSource;
  feature?: string;
  promptTitle?: string;
  promptBody?: string;
};

type FeedbackPayload = {
  message: string;
  type: string;
  rating?: number;
  page?: string;
  feature?: string;
  trigger?: FeedbackTriggerSource;
};

const STORAGE_KEYS = {
  lastAutoPrompt: "safar_feedback_last_auto_prompt",
  firstSeenAt: "safar_feedback_first_seen_at",
} as const;

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shouldAllowAutoPrompt() {
  try {
    const last = localStorage.getItem(STORAGE_KEYS.lastAutoPrompt);
    if (!last) return true;
    const today = getTodayKey();
    return last !== today;
  } catch {
    return true;
  }
}

function markAutoPromptShown() {
  try {
    localStorage.setItem(STORAGE_KEYS.lastAutoPrompt, getTodayKey());
  } catch {
    // ignore
  }
}

function getFirstSeenAt(): Date | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.firstSeenAt);
    if (!raw) {
      const now = new Date();
      localStorage.setItem(STORAGE_KEYS.firstSeenAt, now.toISOString());
      return now;
    }
    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  } catch {
    return null;
  }
}

export function GlobalFeedbackWidget() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<FeedbackStep>("intro");
  const [message, setMessage] = useState("");
  const [feedbackType, setFeedbackType] = useState<string>("suggestion");
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [trigger, setTrigger] = useState<FeedbackTriggerSource>("floating_button");
  const [feature, setFeature] = useState<string | undefined>(undefined);
  const [introTitle, setIntroTitle] = useState<string>("Got a suggestion?");
  const [introBody, setIntroBody] = useState<string>("Help us improve SAFAR");

  const pagePath = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.pathname, location.search, location.hash],
  );

  const mutation = useMutation({
    mutationFn: async (payload: FeedbackPayload) => {
      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.message || "Failed to submit feedback";
        throw new Error(message);
      }

      return res.json();
    },
    onSuccess: () => {
      setStep("success");
      setMessage("");
      setRating(undefined);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Feedback failed",
        description: error.message || "Failed to send feedback",
      });
    },
  });

  const openFromTrigger = useCallback((detail?: FeedbackEventDetail | null) => {
    if (!isAuthenticated) return;

    const source: FeedbackTriggerSource = (detail?.trigger as FeedbackTriggerSource) || "custom";
    if (source !== "floating_button" && !shouldAllowAutoPrompt()) {
      return;
    }

    if (source !== "floating_button") {
      markAutoPromptShown();
    }

    setTrigger(source);
    setFeature(detail?.feature);
    setIntroTitle(detail?.promptTitle || "Got a suggestion?");
    setIntroBody(detail?.promptBody || "We’re building this with you");
    setStep("intro");
    setOpen(true);
  }, [isAuthenticated]);

  const handleManualOpen = useCallback(() => {
    openFromTrigger({
      trigger: "floating_button",
      promptTitle: "Got a suggestion?",
      promptBody: "Help us improve SAFAR",
    });
  }, [openFromTrigger]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!message.trim()) return;

      const payload: FeedbackPayload = {
        message: message.trim(),
        type: feedbackType || "general",
        rating,
        page: pagePath,
        feature,
        trigger,
      };

      mutation.mutate(payload);
    },
    [message, feedbackType, rating, pagePath, feature, trigger, mutation],
  );

  // Wire global event listeners for contextual triggers
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<FeedbackEventDetail | undefined>;
      openFromTrigger(custom.detail);
    };

    window.addEventListener("safar:feedback:open", handler as EventListener);
    return () => {
      window.removeEventListener("safar:feedback:open", handler as EventListener);
    };
  }, [openFromTrigger]);

  // Simple "after 3 days of usage" trigger
  useEffect(() => {
    if (!isAuthenticated) return;
    const firstSeen = getFirstSeenAt();
    if (!firstSeen) return;
    const diffMs = Date.now() - firstSeen.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays < 3) return;
    if (!shouldAllowAutoPrompt()) return;

    openFromTrigger({
      trigger: "usage_nudge",
      promptTitle: "You’ve been using SAFAR for a few days 👀",
      promptBody: "What’s working? What’s not?",
    });
  }, [isAuthenticated, openFromTrigger]);

  if (!isAuthenticated) {
    return null;
  }

  const showIntro = step === "intro";
  const showForm = step === "form";
  const showSuccess = step === "success";

  return (
    <>
      {/* Floating feedback button */}
      <button
        type="button"
        onClick={handleManualOpen}
        className={cn(
          buttonVariants({ variant: "default", size: "lg" }),
          "fixed bottom-5 right-5 z-40 shadow-lg shadow-primary/30",
          "flex items-center gap-2 rounded-full px-4 py-2",
        )}
        aria-label="Open feedback"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Main modal */}
      <Dialog open={open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setStep("intro");
          setMessage("");
          setRating(undefined);
        }
      }}>
        <DialogContent className="max-w-md">
          {showIntro && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {introTitle}
                </DialogTitle>
                <DialogDescription>{introBody}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Not now
                </Button>
                <Button
                  variant="default"
                  onClick={() => setStep("form")}
                >
                  Yes, share
                </Button>
              </div>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <DialogHeader>
                <DialogTitle>What’s on your mind?</DialogTitle>
                <DialogDescription>
                  Tell us what you liked, didn’t like, or what&apos;s missing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Your feedback
                </label>
                <Textarea
                  required
                  minLength={3}
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Something missing? Something annoying? Tell us honestly…"
                  className="resize-none"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  What type is this? <span className="text-xs text-muted-foreground">(optional)</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  {[
                    { id: "suggestion", label: "Suggestion" },
                    { id: "bug", label: "Bug" },
                    { id: "confusing", label: "Something confusing" },
                    { id: "idea", label: "Idea" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFeedbackType(item.id)}
                      className={cn(
                        "ui-pressable rounded-xl border px-3 py-2 text-left transition-colors",
                        feedbackType === item.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/70 bg-muted/40 hover:bg-muted/70",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  How was your experience? <span className="text-xs text-muted-foreground">(optional)</span>
                </p>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = rating != null ? rating >= star : false;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={cn(
                          "ui-pressable flex h-9 w-9 items-center justify-center rounded-full text-base transition-colors",
                          active
                            ? "bg-yellow-400/20 text-yellow-400"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
                        )}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      >
                        ⭐
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !message.trim()}
                >
                  {mutation.isPending ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
            </form>
          )}

          {showSuccess && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle>🎉 Thanks for helping us improve!</DialogTitle>
                <DialogDescription>
                  We actually read every message. You&apos;re building SAFAR with us 💙
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end">
                <Button
                  variant="default"
                  onClick={() => {
                    setOpen(false);
                    setStep("intro");
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

