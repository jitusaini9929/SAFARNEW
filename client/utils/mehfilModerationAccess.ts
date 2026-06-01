export const MEHFIL_MODERATOR_EMAIL = 'steve123@example.com';

export function canAccessMehfilModeration(email?: string | null): boolean {
  return String(email || '').trim().toLowerCase() === MEHFIL_MODERATOR_EMAIL;
}
