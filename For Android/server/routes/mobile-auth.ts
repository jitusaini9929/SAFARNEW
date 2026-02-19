/**
 * Mobile Auth Routes — JWT token management for Android app.
 *
 * Mounted at: /api/mobile/auth
 *
 * POST /refresh     - Exchange a refresh token for a new access token (token rotation)
 * POST /logout      - Invalidate a refresh token (call on Android logout)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    hashRefreshToken,
} from '../utils/jwt';

const router = Router();

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── POST /api/mobile/auth/refresh ───────────────────────────────────────────
// Exchange a valid refresh token for a new access token + rotated refresh token.

router.post('/refresh', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ message: 'refreshToken is required' });
    }

    // 1. Verify the JWT signature and that it's a refresh token
    let payload: { userId: string };
    try {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.type !== 'refresh') throw new Error('Wrong token type');
        payload = decoded;
    } catch {
        return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // 2. Check that this token exists in the DB (not revoked)
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await collections.refreshTokens().findOne({ token_hash: tokenHash });
    if (!storedToken) {
        return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    // 3. Confirm user still exists
    const user = await collections.users().findOne({ id: payload.userId });
    if (!user) {
        return res.status(401).json({ message: 'User not found' });
    }

    // 4. Rotate: delete old token, issue new pair
    await collections.refreshTokens().deleteOne({ token_hash: tokenHash });

    const newAccessToken = signAccessToken(payload.userId);
    const newRefreshToken = signRefreshToken(payload.userId);
    const newRefreshHash = hashRefreshToken(newRefreshToken);

    await collections.refreshTokens().insertOne({
        id: uuidv4(),
        user_id: payload.userId,
        token_hash: newRefreshHash,
        expires_at: new Date(Date.now() + REFRESH_TTL_MS),
        created_at: new Date(),
    });

    return res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    });
});

// ─── POST /api/mobile/auth/logout ────────────────────────────────────────────
// Revoke a refresh token (call this on Android logout before clearing local storage).

router.post('/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ message: 'refreshToken is required' });
    }

    try {
        const tokenHash = hashRefreshToken(refreshToken);
        await collections.refreshTokens().deleteOne({ token_hash: tokenHash });
    } catch {
        // Non-fatal: even if deletion fails, the JWT will expire on its own
    }

    return res.json({ success: true, message: 'Logged out successfully' });
});

export const mobileAuthRoutes = router;
export { REFRESH_TTL_MS };
