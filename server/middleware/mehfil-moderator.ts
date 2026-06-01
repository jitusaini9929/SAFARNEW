import type { Request, Response, NextFunction } from 'express';
import { collections } from '../db';
import { isMehfilModeratorEmail } from '../lib/mehfil-moderator-access';

export async function requireMehfilModerator(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  try {
    const user = await collections.users().findOne(
      { id: req.user.userId },
      { projection: { email: 1 } },
    );
    if (isMehfilModeratorEmail(user?.email)) {
      next();
      return;
    }
  } catch (err) {
    console.error('[requireMehfilModerator] email lookup failed:', err);
  }

  res.status(403).json({ error: 'forbidden' });
}
