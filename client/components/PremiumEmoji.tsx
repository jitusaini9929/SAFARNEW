import type { ImgHTMLAttributes } from "react";

import bookOpenUser from "../../emojis/book-open-user.svg";
import bookmarksSimple from "../../emojis/bookmarks-simple.svg";
import bank from "../../emojis/bank.svg";
import bicepsFlexed from "../../emojis/biceps-flexed.svg";
import calendarDots from "../../emojis/calendar-dots.svg";
import chat from "../../emojis/chat.svg";
import circleCheck from "../../emojis/circle-check.svg";
import deviceMobile from "../../emojis/device-mobile.svg";
import dna from "../../emojis/dna.svg";
import drop from "../../emojis/drop.svg";
import flame from "../../emojis/flame.svg";
import frown from "../../emojis/frown.svg";
import handshake from "../../emojis/handshake.svg";
import handsPraying from "../../emojis/hands-praying.svg";
import leaf from "../../emojis/leaf.svg";
import lightbulb from "../../emojis/lightbulb.svg";
import library from "../../emojis/library.svg";
import lock from "../../emojis/lock.svg";
import meh from "../../emojis/meh.svg";
import partyPopper from "../../emojis/party-popper.svg";
import peace from "../../emojis/peace.svg";
import pencilSimpleLine from "../../emojis/pencil-simple-line.svg";
import personStanding from "../../emojis/person-standing.svg";
import rocket from "../../emojis/rocket.svg";
import smile from "../../emojis/smile.svg";
import sparkle from "../../emojis/sparkle.svg";
import star from "../../emojis/star.svg";
import target from "../../emojis/target.svg";
import timer from "../../emojis/timer.svg";
import train from "../../emojis/train.svg";
import trophy from "../../emojis/trophy.svg";
import waves from "../../emojis/waves.svg";
import wind from "../../emojis/wind.svg";
import zap from "../../emojis/zap.svg";

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
      className={`inline-block object-contain align-[-0.125em] ${className}`}
      draggable={false}
      {...props}
    />
  );
}
