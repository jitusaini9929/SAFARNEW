import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'jwt-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'jwt-refresh-secret-change-in-production';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

export interface JwtPayload {
    userId: string;
    type: 'access' | 'refresh';
}

export function signAccessToken(userId: string): string {
    return jwt.sign({ userId, type: 'access' } satisfies JwtPayload, ACCESS_SECRET, {
        expiresIn: ACCESS_TTL as any,
    });
}

export function signRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' } satisfies JwtPayload, REFRESH_SECRET, {
        expiresIn: REFRESH_TTL as any,
    });
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

/** Hash a refresh token for safe storage in MongoDB (SHA-256) */
export function hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
