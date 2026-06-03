const MEHFIL_MODERATOR_EMAILS = new Set([
  "steve123@example.com",
  "shashank181002@gmail.com",
]);

export function canAccessMehfilModeration(
  email?: string | null,
  isAdmin: boolean = false,
): boolean {
  if (isAdmin) return true;
  return MEHFIL_MODERATOR_EMAILS.has(String(email || "").trim().toLowerCase());
}
