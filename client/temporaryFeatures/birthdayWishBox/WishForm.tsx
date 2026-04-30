import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";

import successCelebrationData from "../../public/animations/Success celebration.json";
import celebrationData from "../../public/animations/Celebration.json";
import celebrationParticleData from "../../public/animations/Celebration particle.json";
import confettiData from "../../public/animations/Confetti.json";
import confettiTransparentData from "../../public/animations/confetti on transparent background.json";
import balloonCelebrationData from "../../public/animations/BalloonCelebration.json";
import bubbleExplosionData from "../../public/animations/Bubble Explosion.json";
import ellipseBustData from "../../public/animations/Ellipse bust.json";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import "./WishForm.css";

const MAX_MESSAGE_WORDS = 60;
const SEAL_ANIMATION_MS = 2900;
const UNLIMITED_WISH_EMAILS = new Set(["steve123@example.com"]);

type MyWishResponse =
  | { hasSubmitted: false; wish: null }
  | {
      hasSubmitted: true;
      wish: {
        id: string;
        message: string;
        isAnonymous: boolean;
        status: string;
        createdAt: string;
      };
    };

type Particle = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
};

type WishFormProps = {
  onRequestSignIn?: () => void;
  onSubmitted?: () => void;
};

const WishForm: React.FC<WishFormProps> = ({ onRequestSignIn, onSubmitted }) => {
  const { user, isAuthenticated } = useAuth();
  const canSubmitUnlimited = UNLIMITED_WISH_EMAILS.has(String(user?.email || "").trim().toLowerCase());
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [lidOpen, setLidOpen] = useState(true);
  const [envelopePopped, setEnvelopePopped] = useState(false);
  const [flapOpen, setFlapOpen] = useState(false);
  const [letterOut, setLetterOut] = useState(false);
  const [envelopeSent, setEnvelopeSent] = useState(false);
  const [boxGlow, setBoxGlow] = useState(false);
  const [boxReturning, setBoxReturning] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [letterShake, setLetterShake] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [instruction, setInstruction] = useState("Write your Wishes");
  const bannerVisible = Boolean(instruction) && !isWriting;

  useEffect(() => {
    setDisplayName(user?.name || "");
  }, [user?.name]);

  const wordCount = useMemo(() => {
    const words = message.trim().match(/\S+/g);
    return words ? words.length : 0;
  }, [message]);
  const remainingWords = useMemo(() => MAX_MESSAGE_WORDS - wordCount, [wordCount]);

  const limitToWordCount = (value: string): string => {
    const words = value.match(/\S+/g);
    if (!words || words.length <= MAX_MESSAGE_WORDS) return value;

    let count = 0;
    let endIndex = 0;
    const matcher = /\S+/g;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(value)) !== null) {
      count += 1;
      endIndex = match.index + match[0].length;
      if (count === MAX_MESSAGE_WORDS) break;
    }

    return value.slice(0, endIndex);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMyWish = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setClosedMessage(null);

      try {
        const res = await apiFetch(`${API_BASE}/wishbox/my-wish`, { method: "GET" });

        if (res.status === 403) {
          const data = await res.json().catch(() => null);
          setClosedMessage(data?.message || "Wish Box is now closed.");
          return;
        }

        if (!res.ok) {
          setErrorMessage("Unable to load your wish status.");
          return;
        }

        const data = (await res.json()) as MyWishResponse;
        setHasSubmitted(!canSubmitUnlimited && Boolean(data?.hasSubmitted));
        if (!canSubmitUnlimited && data?.hasSubmitted) {
          setStatusMessage("You have already submitted your birthday wish.");
        }
      } catch (error) {
        console.error("[WISHBOX] Failed to load wish status:", error);
        setErrorMessage("Unable to load your wish status.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyWish();
  }, [canSubmitUnlimited, isAuthenticated]);

  const createParticles = () => {
    const nextParticles = Array.from({ length: 8 }, (_, index) => ({
      id: Date.now() + index,
      left: 130 + (Math.random() * 60 - 30),
      size: Math.random() * 6 + 4,
      duration: Math.random() + 0.8,
      delay: Math.random() * 0.2,
    }));

    setParticles(nextParticles);
    window.setTimeout(() => setParticles([]), 2000);
  };

  const summonEnvelope = () => {
    if (isSubmitting || isWriting) return;
    if (!isAuthenticated) {
      onRequestSignIn?.();
      return;
    }

    setErrorMessage(null);
    setIsWriting(true);
    setInstruction("");
    setLidOpen(true);
    setEnvelopeSent(false);
    setBoxReturning(false);
    setEnvelopePopped(true);
    setBoxGlow(true);

    window.setTimeout(() => setBoxGlow(false), 1000);
    window.setTimeout(() => setFlapOpen(true), 800);
    window.setTimeout(() => {
      setLetterOut(true);
      setInstruction("");
    }, 1400);
  };

  const resetComposer = () => {
    setEnvelopePopped(false);
    setEnvelopeSent(false);
    setBoxReturning(false);
    setFlapOpen(false);
    setLetterOut(false);
    setIsWriting(false);
    setInstruction("Write your Wishes");
  };

  const shakeLetter = (messageText: string) => {
    setErrorMessage(messageText);
    setLetterShake(true);
    window.setTimeout(() => setLetterShake(false), 260);
  };

  const delay = (duration: number) =>
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration);
    });

  const runSealAnimation = () => {
    setBoxReturning(false);
    setLidOpen(true);
    setLetterOut(false);
    window.setTimeout(() => setFlapOpen(false), 520);
    window.setTimeout(() => setBoxReturning(true), 860);
    window.setTimeout(() => {
      setEnvelopePopped(false);
      setEnvelopeSent(true);
      setBoxGlow(true);
      createParticles();
    }, 1080);
    window.setTimeout(() => {
      setBoxGlow(false);
      setLidOpen(false);
    }, 2050);
  };

  const restoreComposerAfterFailedSeal = () => {
    setLidOpen(true);
    setEnvelopeSent(false);
    setBoxReturning(false);
    setEnvelopePopped(true);
    setFlapOpen(true);
    setLetterOut(true);
    setIsWriting(true);
  };

  const handleMagicalSubmit = async () => {
    if (isSubmitting) return;
    if (!isAuthenticated) {
      onRequestSignIn?.();
      return;
    }

    if (message.trim().length < 5) {
      shakeLetter("Please write at least 5 characters before sealing your wish.");
      return;
    }

    if (wordCount > MAX_MESSAGE_WORDS) {
      shakeLetter(`Please keep your wish within ${MAX_MESSAGE_WORDS} words.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setInstruction("");
    runSealAnimation();
    const sealAnimationPromise = delay(SEAL_ANIMATION_MS);

    try {
      const submitPromise = apiFetch(`${API_BASE}/wishbox/wishes`, {
          method: "POST",
          timeoutMs: 15000,
          body: JSON.stringify({
            displayName,
            isAnonymous,
            message,
          }),
        })
        .then(async (res) => ({
          res,
          data: await res.json().catch(() => null),
        }));

      const [{ res, data }] = await Promise.all([
        submitPromise,
        sealAnimationPromise,
      ]);

      if (res.status === 409) {
        setHasSubmitted(!canSubmitUnlimited);
        setStatusMessage(data?.message || "You have already submitted your birthday wish.");
        return;
      }

      if (!res.ok) {
        setErrorMessage(data?.message || "Failed to submit wish.");
        restoreComposerAfterFailedSeal();
        return;
      }

      setMessage("");
      setStatusMessage(data?.message || "Your wish has been submitted.");
      setHasSubmitted(!canSubmitUnlimited);
      if (canSubmitUnlimited) {
        resetComposer();
      }
      onSubmitted?.();
    } catch (error) {
      console.error("[WISHBOX] Submission failed:", error);
      await sealAnimationPromise;
      setErrorMessage("Could not reach the Wish Box server. Please try again.");
      restoreComposerAfterFailedSeal();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (closedMessage) {
    return (
      <div className="rounded-2xl border border-amber-200/70 bg-amber-50 p-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
        <p className="text-sm font-semibold">{closedMessage}</p>
        <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-100/70">
          Thank you for sending your love and wishes.
        </p>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="wishbox-composer wishbox-composer--submitted relative overflow-hidden">
        {/* Massive Celebration Effects */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
          <Lottie animationData={successCelebrationData} loop={false} />
        </div>

        <div className="wishbox-submitted-card relative z-50 backdrop-blur-md bg-slate-950/60 border-white/20">
          <p className="wishbox-submitted-card__title text-white">
            {statusMessage || "Thank you. Your wish has been received and will appear after review."}
          </p>
          <p className="wishbox-submitted-card__body text-white/70">
            You can submit only one wish per account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishbox-composer relative">
      {/* Background Balloons */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen overflow-hidden">
        <Lottie animationData={balloonCelebrationData} loop={true} />
      </div>
      
      {/* Confetti from 4 Corners (Scaled down via grid) */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden grid grid-cols-2 grid-rows-2">
        {/* Top-Left Corner (Always visible) */}
        <div className="w-full h-full rotate-[135deg] scale-[1.3]">
          <Lottie animationData={confettiData} loop={true} />
        </div>
        {/* Top-Right Corner */}
        <div className="w-full h-full -rotate-[135deg] scale-[1.3]">
          {!(isWriting && !envelopeSent) && <Lottie animationData={confettiTransparentData} loop={true} />}
        </div>
        {/* Bottom-Left Corner */}
        <div className="w-full h-full rotate-[45deg] scale-[1.3]">
          {!(isWriting && !envelopeSent) && <Lottie animationData={confettiTransparentData} loop={true} />}
        </div>
        {/* Bottom-Right Corner */}
        <div className="w-full h-full -rotate-[45deg] scale-[1.3]">
          {!(isWriting && !envelopeSent) && <Lottie animationData={confettiData} loop={true} />}
        </div>
      </div>

      {isLoading && (
        <div className="wishbox-composer__status relative z-10">Checking your submission status...</div>
      )}

      {errorMessage && (
        <div className="wishbox-composer__error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="wishbox-title" aria-hidden="true">
        <svg className="wishbox-title__arc" viewBox="0 0 920 280" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <path id="wishboxTitleArcPath" d="M 70 228 Q 460 18 850 228" />
          </defs>
          <text className="wishbox-title__arc-text">
            <textPath href="#wishboxTitleArcPath" startOffset="50%" textAnchor="middle">
              Happy Birthday
            </textPath>
          </text>
        </svg>
        <div className="wishbox-title__bottom">Parmar Sir</div>
      </div>

      <button
        type="button"
        className={[
          "wishbox-banner",
          bannerVisible ? "wishbox-banner--visible" : "",
        ].join(" ")}
        onClick={summonEnvelope}
        disabled={isSubmitting}
        aria-label="Send birthday wishes"
      >
        <svg className="wishbox-banner__svg" viewBox="0 0 800 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="wishboxBannerPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9d31ff" />
              <stop offset="100%" stopColor="#c655ff" />
            </linearGradient>
            <linearGradient id="wishboxBannerGlossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id="wishboxBannerShimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="wishboxBannerDepthShadow" x="-20%" y="-20%" width="140%" height="150%">
              <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#4a0099" floodOpacity="0.4" />
            </filter>
            <path id="wishboxBannerTextArc" d="M 120,150 A 800,800 0 0,1 680,150" fill="none" />
            <clipPath id="wishboxBannerClip">
              <path d="M 115,115 A 815,815 0 0,1 685,115 L 685,185 A 815,815 0 0,0 115,185 Z" />
            </clipPath>
          </defs>

          <g transform="translate(130, 132) rotate(6)">
            <path d="M 0,0 L -110,5 L -80,25 L -110,45 L 0,40 Z" fill="url(#wishboxBannerPurpleGrad)" stroke="#821be3" strokeWidth="1" />
          </g>
          <g transform="translate(670, 132) rotate(-6)">
            <path d="M 0,0 L 110,5 L 80,25 L 110,45 L 0,40 Z" fill="url(#wishboxBannerPurpleGrad)" stroke="#821be3" strokeWidth="1" />
          </g>

          <path
            d="M 120,115 A 800,800 0 0,1 680,115 Q 695,115 695,130 L 695,170 Q 695,185 680,185 A 800,800 0 0,0 120,185 Q 105,185 105,170 L 105,130 Q 105,115 120,115 Z"
            fill="url(#wishboxBannerPurpleGrad)"
            filter="url(#wishboxBannerDepthShadow)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
          <path
            d="M 120,115 A 800,800 0 0,1 680,115 L 685,145 A 800,800 0 0,0 115,145 Z"
            fill="url(#wishboxBannerGlossGrad)"
            pointerEvents="none"
          />

          <g clipPath="url(#wishboxBannerClip)">
            <rect x="-400" y="0" width="150" height="300" fill="url(#wishboxBannerShimmerGrad)" transform="skewX(-20)">
              <animate attributeName="x" from="-500" to="1200" dur="3s" repeatCount="indefinite" />
            </rect>
          </g>

          <text className="wishbox-banner__text">
            <textPath href="#wishboxBannerTextArc" startOffset="50%" textAnchor="middle" dominantBaseline="middle">
              Send Birthday Wishes
            </textPath>
          </text>
        </svg>
      </button>

        <div
          className={[
            "wishbox-composer__stage",
            isWriting ? "wishbox-composer__stage--writing" : "",
            boxReturning ? "wishbox-composer__stage--sealing" : "",
          ].join(" ")}
        >
          {envelopePopped && !envelopeSent && (
            <div className="absolute top-[20%] left-1/2 w-[300px] h-[300px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 mix-blend-screen">
              <Lottie animationData={bubbleExplosionData} loop={false} />
            </div>
          )}
          {envelopeSent && (
            <div className="absolute top-[60%] left-1/2 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 mix-blend-screen">
              <Lottie animationData={ellipseBustData} loop={false} />
            </div>
          )}
        <div
          className={[
            "wishbox-envelope",
            envelopePopped ? "wishbox-envelope--popped" : "",
            envelopeSent ? "wishbox-envelope--sent" : "",
          ].join(" ")}
          aria-hidden={!isWriting}
        >
          <div className="wishbox-envelope__back" />

          <div className={["wishbox-envelope__flap", flapOpen ? "wishbox-envelope__flap--open" : ""].join(" ")}>
            <svg viewBox="0 0 256 96" className="h-full w-full drop-shadow-md" aria-hidden="true">
              <polygon points="0,0 128,96 256,0" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
            </svg>
          </div>

          <div className="wishbox-envelope__mask">
            <div
              className={[
                "wishbox-letter",
                letterOut ? "wishbox-letter--out" : "",
                letterShake ? "wishbox-letter--shake" : "",
              ].join(" ")}
            >
              <div className="wishbox-letter__body">
                <h2>My Wish...</h2>

                <div className="wishbox-letter__sender">
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    disabled={isAnonymous || isSubmitting}
                    placeholder="Your name"
                    className="wishbox-letter__name"
                  />
                  <label className="wishbox-letter__anonymous">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(event) => setIsAnonymous(event.target.checked)}
                      disabled={isSubmitting}
                    />
                    Anonymous
                  </label>
                </div>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(limitToWordCount(event.target.value))}
                  placeholder="Write your heartfelt wish here..."
                  className="wishbox-letter__textarea"
                  disabled={isSubmitting}
                  aria-label="Your wish"
                />
              </div>

              <div className="wishbox-letter__footer">
                <span>{Math.max(0, remainingWords)}/{MAX_MESSAGE_WORDS} words</span>
                <button
                  type="button"
                  className="wishbox-letter__send"
                  onClick={handleMagicalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sealing..." : "Seal & Send"}
                </button>
              </div>
            </div>
          </div>

          <div className="wishbox-envelope__front" aria-hidden="true">
            <svg viewBox="0 0 256 160" className="h-full w-full drop-shadow-lg">
              <polygon points="0,0 128,80 0,160" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
              <polygon points="256,0 128,80 256,160" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
              <polygon points="0,160 128,80 256,160" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
            </svg>
          </div>
        </div>

        <button
          type="button"
          className={[
            "wishbox-visual",
            boxGlow ? "wishbox-visual--glow" : "",
          ].join(" ")}
          onClick={isWriting ? resetComposer : summonEnvelope}
          aria-label={isWriting ? "Reset wish envelope" : "Draw an envelope from the magical box"}
          disabled={isSubmitting}
        >
          <div className="wishbox-visual__ground" />

          <svg viewBox="0 0 300 200" className="wishbox-visual__layer wishbox-visual__layer--back" aria-hidden="true">
            <defs>
              <linearGradient id="wishboxBackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2e1065" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
            </defs>
            <path d="M 40,80 L 260,80 L 230,170 L 70,170 Z" fill="url(#wishboxBackGrad)" />
            <circle cx="150" cy="130" r="30" fill="#a855f7" opacity="0.6" />
          </svg>

          <svg viewBox="0 0 300 200" className="wishbox-visual__layer wishbox-visual__layer--mail" aria-hidden="true">
            <g transform="translate(65, 95) rotate(-12) scale(0.65)">
              <rect x="0" y="0" width="100" height="60" fill="#cbd5e1" rx="2" stroke="#94a3b8" strokeWidth="1" />
              <path d="M0,0 L50,35 L100,0" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            </g>
            <g transform="translate(135, 100) rotate(15) scale(0.6)">
              <rect x="0" y="0" width="100" height="60" fill="#f1f5f9" rx="2" stroke="#cbd5e1" strokeWidth="1" />
              <path d="M0,0 L50,35 L100,0" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="50" cy="35" r="8" fill="#ef4444" />
            </g>
            <g transform="translate(95, 90) rotate(-4) scale(0.7)">
              <rect x="0" y="0" width="100" height="60" fill="#e2e8f0" rx="2" stroke="#94a3b8" strokeWidth="1" />
              <path d="M0,0 L50,35 L100,0" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
            </g>
            <g transform="translate(165, 92) rotate(8) scale(0.65)">
              <rect x="0" y="0" width="100" height="60" fill="#fffdf0" rx="2" stroke="#fde047" strokeWidth="1" />
              <path d="M0,0 L50,35 L100,0" fill="#fef08a" stroke="#fde047" strokeWidth="1" />
              <circle cx="50" cy="35" r="6" fill="#f59e0b" />
            </g>
          </svg>

          <svg viewBox="0 0 300 200" className="wishbox-visual__layer wishbox-visual__layer--front" aria-hidden="true">
            <defs>
              <linearGradient id="wishboxFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#4c1d95" />
              </linearGradient>
              <linearGradient id="wishboxTrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <path d="M 20,110 L 40,80 L 70,170 L 40,190 Z" fill="#581c87" />
            <path d="M 280,110 L 260,80 L 230,170 L 260,190 Z" fill="#3b0764" />
            <path d="M 20,110 L 280,110 L 260,190 L 40,190 Z" fill="url(#wishboxFrontGrad)" />
            <path d="M 18,110 L 282,110 L 280,115 L 20,115 Z" fill="url(#wishboxTrimGrad)" />
            <path d="M 38,190 L 262,190 L 260,195 L 40,195 Z" fill="url(#wishboxTrimGrad)" />
            <circle cx="150" cy="140" r="15" fill="url(#wishboxTrimGrad)" />
            <circle cx="150" cy="140" r="10" fill="#4c1d95" />
            <path d="M 150,132 L 152,138 L 158,138 L 153,142 L 155,148 L 150,144 L 145,148 L 147,142 L 142,138 L 148,138 Z" fill="#fef08a" />
          </svg>

          <div className={["wishbox-visual__lid", lidOpen ? "wishbox-visual__lid--open" : ""].join(" ")}>
            <svg viewBox="0 0 300 200" className="h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id="wishboxLidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#581c87" />
                </linearGradient>
                <linearGradient id="wishboxLidTrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <path d="M 40,80 L 260,80 L 280,110 L 20,110 Z" fill="url(#wishboxLidGrad)" />
              <path d="M 20,110 L 280,110 L 282,114 L 18,114 Z" fill="url(#wishboxLidTrimGrad)" />
            </svg>
          </div>
        </button>

        {particles.map((particle) => (
          <span
            key={particle.id}
            className="wishbox-particle"
            style={{
              left: `${particle.left}px`,
              bottom: "120px",
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default WishForm;
