import type { Collection } from "mongodb";
import { collections } from "../../db";

export type WishStatus = "pending" | "approved" | "rejected" | "flagged";
export type ModerationMethod = "none" | "local" | "ai" | "manual";

export type WishModeration = {
  method: ModerationMethod;
  language: string;
  toxicityScore: number;
  categories: string[];
  reason: string | null;
  checkedAt: Date | null;
};

export type BirthdayWish = {
  id: string;
  eventKey: string;
  userId: string;
  displayName: string | null;
  isAnonymous: boolean;
  message: string;
  normalizedMessageHash: string;
  status: WishStatus;
  publicVisible: boolean;
  moderation: WishModeration;
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export function getBirthdayWishCollection(): Collection<BirthdayWish> {
  return collections.birthdayWishes() as unknown as Collection<BirthdayWish>;
}
