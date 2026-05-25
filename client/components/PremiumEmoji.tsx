import type { ImgHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import bookOpenUser from "../../Extras/emojis/book-open-user.svg";
import bookmarksSimple from "../../Extras/emojis/bookmarks-simple.svg";
import bank from "../../Extras/emojis/bank.svg";
import bicepsFlexed from "../../Extras/emojis/biceps-flexed.svg";
import calendarDots from "../../Extras/emojis/calendar-dots.svg";
import chat from "../../Extras/emojis/chat.svg";
import circleCheck from "../../Extras/emojis/circle-check.svg";
import deviceMobile from "../../Extras/emojis/device-mobile.svg";
import dna from "../../Extras/emojis/dna.svg";
import drop from "../../Extras/emojis/drop.svg";
import flame from "../../Extras/emojis/flame.svg";
import frown from "../../Extras/emojis/frown.svg";
import handshake from "../../Extras/emojis/handshake.svg";
import handsPraying from "../../Extras/emojis/hands-praying.svg";
import leaf from "../../Extras/emojis/leaf.svg";
import lightbulb from "../../Extras/emojis/lightbulb.svg";
import library from "../../Extras/emojis/library.svg";
import lock from "../../Extras/emojis/lock.svg";
import meh from "../../Extras/emojis/meh.svg";
import partyPopper from "../../Extras/emojis/party-popper.svg";
import peace from "../../Extras/emojis/peace.svg";
import pencilSimpleLine from "../../Extras/emojis/pencil-simple-line.svg";
import personStanding from "../../Extras/emojis/person-standing.svg";
import rocket from "../../Extras/emojis/rocket.svg";
import smile from "../../Extras/emojis/smile.svg";
import sparkle from "../../Extras/emojis/sparkle.svg";
import star from "../../Extras/emojis/star.svg";
import target from "../../Extras/emojis/target.svg";
import triangleAlert from "../../Extras/emojis/triangle-alert.svg";
import timer from "../../Extras/emojis/timer.svg";
import train from "../../Extras/emojis/train.svg";
import trophy from "../../Extras/emojis/trophy.svg";
import waves from "../../Extras/emojis/waves.svg";
import wind from "../../Extras/emojis/wind.svg";
import zap from "../../Extras/emojis/zap.svg";

const premiumEmojiAssets = {
  bank,
  biceps: bicepsFlexed,
  book: bookOpenUser,
  bookmarks: bookmarksSimple,
  calendar: calendarDots,
  chat,
  check: circleCheck,
  deviceMobile,
  dna,
  drop,
  flame,
  frown,
  handshake,
  handsPraying,
  leaf,
  lightbulb,
  library,
  lock,
  meh,
  party: partyPopper,
  peace,
  pencil: pencilSimpleLine,
  person: personStanding,
  rocket,
  smile,
  sparkle,
  star,
  target,
  warning: triangleAlert,
  timer,
  train,
  trophy,
  waves,
  wind,
  zap,
} as const;

export type PremiumEmojiName = keyof typeof premiumEmojiAssets;

const emojiToPremiumName: Record<string, PremiumEmojiName> = {
  "🏆": "trophy",
  "✨": "sparkle",
  "💨": "wind",
  "🌊": "waves",
  "🍃": "leaf",
  "🌱": "leaf",
  "🌿": "leaf",
  "🎉": "party",
  "📋": "bookmarks",
  "✏️": "pencil",
  "📚": "library",
  "📝": "pencil",
  "📖": "book",
  "🎯": "target",
  "⏱️": "timer",
  "⚡": "zap",
  "🚀": "rocket",
  "🔒": "lock",
  "📅": "calendar",
  "🤝": "handshake",
  "💬": "chat",
  "✅": "check",
  "🚶": "person",
  "📱": "deviceMobile",
  "💡": "lightbulb",
  "💧": "drop",
  "🚂": "train",
  "🏦": "bank",
  "🧬": "dna",
  "🙏": "handsPraying",
  "💪": "biceps",
  "☮️": "peace",
  "🧘": "peace",
  "😌": "smile",
  "😃": "smile",
  "😊": "smile",
  "😐": "meh",
  "😶": "meh",
  "😔": "frown",
  "😟": "frown",
  "😠": "frown",
  "😢": "frown",
  "😰": "frown",
  "😕": "meh",
  "🌟": "star",
};

export function getPremiumEmojiName(emoji: string | null | undefined): PremiumEmojiName | null {
  if (!emoji) return null;
  return emojiToPremiumName[emoji] ?? null;
}

type PremiumEmojiProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  name?: PremiumEmojiName | null;
  emoji?: string | null;
  fallback?: string;
};

export function PremiumEmoji({
  name,
  emoji,
  fallback,
  alt,
  className = "h-[1em] w-[1em]",
  ...props
}: PremiumEmojiProps) {
  const resolvedName = name ?? getPremiumEmojiName(emoji);
  const src = resolvedName ? premiumEmojiAssets[resolvedName] : null;

  if (!src) {
    return fallback || emoji ? <span className={className}>{fallback ?? emoji}</span> : null;
  }

  return (
    <img
      src={src}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      className={cn(
        "inline-block object-contain align-[-0.125em]",
        /* SVGs use currentColor strokes; as <img> they render black — invert in dark mode */
        "dark:brightness-0 dark:invert",
        className,
      )}
      draggable={false}
      {...props}
    />
  );
}
