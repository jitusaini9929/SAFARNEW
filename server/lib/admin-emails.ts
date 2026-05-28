/**
 * Admin allowlist for JWT isAdmin and requireAdmin routes.
 * Uses ADMIN_EMAILS when set; otherwise matches .env defaults + Android composer allowlist.
 */
const DEFAULT_ADMIN_EMAILS =
  "steve123@example.com,safarparmar0@gmail.com,thatkindchic@gmail.com,shashank181002@gmail.com";

export function getAdminEmailSet(): Set<string> {
  const raw = (process.env.ADMIN_EMAILS ?? "").trim() || DEFAULT_ADMIN_EMAILS;
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmailSet().has(email.trim().toLowerCase());
}
