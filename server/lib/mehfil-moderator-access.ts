import { isAdminEmail } from './admin-emails';

export function isMehfilModeratorEmail(email: string | null | undefined): boolean {
  return isAdminEmail(email);
}
