import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.service';
import { isAccessTokenBlocked } from '../lib/token.store';

// Augment Express Request so downstream routes get req.user typed
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isAdmin: boolean;
        jti: string;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);

    // Check blocklist (covers logged-out tokens that haven't expired yet)
    if (await isAccessTokenBlocked(payload.jti)) {
      res.status(401).json({ error: 'token_revoked' });
      return;
    }

    req.user = {
      userId: payload.sub,
      isAdmin: payload.isAdmin,
      jti: payload.jti,
    };

    // To keep backward compatibility with existing routes that might read req.session.userId:
    // Some routes might fail if they expect 'req.session.userId', so let's mock it just in case
    // until all routes are fully migrated to use req.user.userId
    req.session = req.session || {};
    req.session.userId = payload.sub;

    next();
  } catch (err: any) {
    // Distinguish expired vs malformed — frontend needs this to know whether to refresh
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'token_expired' });
    } else {
      res.status(401).json({ error: 'invalid_token' });
    }
  }
}

// For routes that are admin-only (replaces your ADMIN_EMAILS check scattered in routes)
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  next();
}
