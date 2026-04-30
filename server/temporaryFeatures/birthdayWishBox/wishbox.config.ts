export const WISHBOX_CONFIG = {
  enabled: true,
  eventKey: "teacher_birthday_2026",

  launchDate: new Date("2026-04-28T00:00:00+05:30"),
  endDate: new Date("2026-05-04T23:59:59+05:30"),
  purgeDate: new Date("2026-05-06T23:59:59+05:30"),

  maxMessageLength: 3000,
  maxMessageWords: 300,
  minMessageLength: 5,

  maxBatchSize: 15,
  moderationIntervalMs: 30000,

  cacheTTLSeconds: 60,
};

export function isWishBoxActive(now: Date = new Date()): boolean {
  if (!WISHBOX_CONFIG.enabled) return false;
  return now >= WISHBOX_CONFIG.launchDate && now <= WISHBOX_CONFIG.endDate;
}

export function getWishBoxInactiveMessage(now: Date = new Date()): string {
  if (!WISHBOX_CONFIG.enabled) return "Wish Box is now closed.";
  if (now < WISHBOX_CONFIG.launchDate) return "Wish Box has not opened yet.";
  return "Wish Box is now closed.";
}

export function isWishBoxAdminWindowOpen(now: Date = new Date()): boolean {
  if (!WISHBOX_CONFIG.enabled) return false;
  return now <= WISHBOX_CONFIG.purgeDate;
}

export function getWishBoxPurgeAt(): Date {
  return WISHBOX_CONFIG.purgeDate;
}
