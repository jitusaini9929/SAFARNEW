/**
 * Device Token Routes — FCM push notification registration.
 *
 * Mounted at: /api/devices
 *
 * POST   /register     - Save FCM token after Android login
 * DELETE /unregister   - Remove FCM token on logout
 * POST   /test-push    - Admin only: send test push to a user
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { collections } from '../db';
import { requireAuthMobile } from '../middleware/auth';
import { sendPushNotification } from '../utils/fcm';

const router = Router();

// ─── POST /api/devices/register ─────────────────────────────────────────────
// Called by Android app right after login. Upserts token for this device.

router.post('/register', requireAuthMobile, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId as string;
    const { fcmToken, deviceId, platform = 'android' } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
        return res.status(400).json({ message: 'fcmToken is required' });
    }
    if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ message: 'deviceId is required' });
    }

    try {
        await collections.deviceTokens().updateOne(
            { user_id: userId, device_id: deviceId },
            {
                $set: {
                    fcm_token: fcmToken,
                    platform,
                    updated_at: new Date(),
                },
                $setOnInsert: {
                    id: uuidv4(),
                    user_id: userId,
                    device_id: deviceId,
                    created_at: new Date(),
                },
            },
            { upsert: true }
        );

        return res.json({ success: true });
    } catch (err) {
        console.error('[DEVICES] register error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// ─── DELETE /api/devices/unregister ──────────────────────────────────────────
// Called on logout to stop receiving pushes on this device.

router.delete('/unregister', requireAuthMobile, async (req: Request, res: Response) => {
    const userId = (req.session as any).userId as string;
    const { deviceId } = req.body;

    if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ message: 'deviceId is required' });
    }

    try {
        await collections.deviceTokens().deleteOne({ user_id: userId, device_id: deviceId });
        return res.json({ success: true });
    } catch (err) {
        console.error('[DEVICES] unregister error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// ─── POST /api/devices/test-push ─────────────────────────────────────────────
// Admin-only: send a test push notification to a specific user's devices.

router.post('/test-push', requireAuthMobile, async (req: Request, res: Response) => {
    const callerId = (req.session as any).userId as string;

    // Admin check
    const caller = await collections.users().findOne({ id: callerId });
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

    if (!caller || !adminEmails.includes(caller.email?.toLowerCase())) {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const { targetUserId, title, body, data } = req.body;
    if (!targetUserId || !title || !body) {
        return res.status(400).json({ message: 'targetUserId, title, and body are required' });
    }

    try {
        const deviceDocs = await collections
            .deviceTokens()
            .find({ user_id: targetUserId })
            .project({ fcm_token: 1 })
            .toArray();

        const tokens = deviceDocs.map((d: any) => d.fcm_token).filter(Boolean);

        if (tokens.length === 0) {
            return res.json({ success: false, message: 'No registered devices for this user' });
        }

        const delivered = await sendPushNotification(tokens, { title, body, data });
        return res.json({ success: true, deliveredTo: delivered.length, totalTokens: tokens.length });
    } catch (err) {
        console.error('[DEVICES] test-push error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export const devicesRoutes = router;
