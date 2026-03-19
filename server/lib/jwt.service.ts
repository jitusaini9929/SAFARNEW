import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

function resolveSecret(kind: 'access' | 'refresh'): string {
  const direct = kind === 'access'
    ? process.env.JWT_ACCESS_SECRET
    : process.env.JWT_REFRESH_SECRET;

  const legacy = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  const resolved = direct || legacy;

  if (resolved) return resolved;

  // Keep auth endpoints functional even when env is incomplete.
  // This avoids hard-to-diagnose 500s during signup/login in misconfigured deploys.
  const generated = crypto.randomBytes(48).toString('hex');
  console.warn(
    `[AUTH] Missing ${kind === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET'} and no JWT_SECRET/SESSION_SECRET fallback found. ` +
      `Using an ephemeral ${kind} JWT secret for this process. Set persistent secrets in production.`
  );
  return generated;
}

const ACCESS_SECRET  = resolveSecret('access');
const REFRESH_SECRET = resolveSecret('refresh');
const ACCESS_EXPIRES  = (process.env.JWT_ACCESS_EXPIRES  ?? '15m') as any;
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES ?? '30d') as any;

export interface AccessTokenPayload {
  sub: string;      // userId
  isAdmin: boolean;
  jti: string;      // unique token ID — used for blocklist
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  familyId: string; // ties all refresh tokens in a session together
  tokenId: string;  // unique per rotation
  iat: number;
  exp: number;
}

export function signAccessToken(userId: string, isAdmin: boolean): string {
  return jwt.sign(
    { sub: userId, isAdmin, jti: uuidv4() },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

export function signRefreshToken(userId: string, familyId: string, tokenId: string): string {
  return jwt.sign(
    { sub: userId, familyId, tokenId },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

// Returns remaining TTL in seconds for a token — used to set blocklist TTL
export function getTokenRemainingTTL(token: string): number {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return 0;
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
}
