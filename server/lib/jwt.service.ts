import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

function requireSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`[AUTH] Missing required environment variable: ${name}`);
  }
  return value;
}

const ACCESS_SECRET = requireSecret('JWT_ACCESS_SECRET');
const REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET');
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
