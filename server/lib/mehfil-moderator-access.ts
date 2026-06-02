/** Mehfil report review UI + APIs — restricted to this account only. */
export const MEHFIL_MODERATOR_EMAIL = 'steve123@example.com';

export function isMehfilModeratorEmail(email: string | null | undefined): boolean {
  return String(email || '').trim().toLowerCase() === MEHFIL_MODERATOR_EMAIL;
}
