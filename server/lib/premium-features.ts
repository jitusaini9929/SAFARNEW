import { ObjectId } from "mongodb";
import { collections } from "../db";

export const MEHFIL_DM_FEATURE = "mehfil_dm";

const PREMIUM_TIERS = new Set(["premium", "pro", "plus"]);

const USER_PREMIUM_PROJECTION = {
  id: 1,
  email: 1,
  is_premium: 1,
  subscription_tier: 1,
  paid_features: 1,
  premium_until: 1,
} as const;

function toObjectId(value: string): ObjectId | null {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function getDevPremiumEmails(): string[] {
  return String(process.env.DEV_PREMIUM_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function findUserForPremiumCheck(userId: string) {
  let user = await collections.users().findOne({ id: userId }, { projection: USER_PREMIUM_PROJECTION });

  if (!user) {
    const userObjectId = toObjectId(userId);
    if (userObjectId) {
      user = await collections.users().findOne({ _id: userObjectId }, { projection: USER_PREMIUM_PROJECTION });
    }
  }

  return user;
}

function userHasPremiumEntitlement(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return false;

  const email = String(user.email || "")
    .trim()
    .toLowerCase();
  const devPremiumEmails = getDevPremiumEmails();
  if (email && devPremiumEmails.includes(email)) {
    return true;
  }

  const hasTier = PREMIUM_TIERS.has(String(user.subscription_tier || "").toLowerCase());
  const hasFlag = Boolean(user.is_premium);
  const hasFeature = Array.isArray(user.paid_features)
    ? user.paid_features.includes(MEHFIL_DM_FEATURE)
    : false;

  const premiumUntil = user.premium_until ? new Date(String(user.premium_until)) : null;
  const isStillPremium = premiumUntil ? premiumUntil.getTime() > Date.now() : false;

  return hasTier || hasFlag || hasFeature || isStillPremium;
}

export async function canUseMehfilDm(userId: string): Promise<boolean> {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return false;

  const user = await findUserForPremiumCheck(normalizedUserId);
  return userHasPremiumEntitlement(user);
}
