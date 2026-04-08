/**
 * Firebase Cloud Messaging (FCM) helper for push notifications.
 *
 * To enable:
 *   1. Go to Firebase Console → Project Settings → Service Accounts
 *   2. Click "Generate new private key" → download JSON
 *   3. Set FIREBASE_SERVICE_ACCOUNT_JSON env var to the full JSON string
 *      (paste the entire JSON as one line, or use single quotes in .env)
 *
 * If the env var is missing, all push calls are silently no-ops (safe for local dev).
 */

import type { App } from 'firebase-admin/app';

let firebaseApp: App | null = null;
let messaging: import('firebase-admin/messaging').Messaging | null = null;

function getFirebaseApp(): App | null {
    if (firebaseApp) return firebaseApp;

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
        return null;
    }

    try {
        // Lazy-import so the module loads fine even if firebase-admin isn't configured
        const { initializeApp, cert } = require('firebase-admin/app');
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseApp = initializeApp({ credential: cert(serviceAccount) });
        console.log('[FCM] Firebase Admin SDK initialized');
        return firebaseApp;
    } catch (err) {
        console.error('[FCM] Failed to initialize Firebase Admin SDK:', err);
        return null;
    }
}

function getMessaging(): import('firebase-admin/messaging').Messaging | null {
    if (messaging) return messaging;
    const app = getFirebaseApp();
    if (!app) return null;
    try {
        const { getMessaging: gm } = require('firebase-admin/messaging');
        messaging = gm(app);
        return messaging;
    } catch (err) {
        console.error('[FCM] Failed to get Messaging instance:', err);
        return null;
    }
}

export interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>; // Must be string values for FCM
    imageUrl?: string;
}

/**
 * Send a push notification to one or more FCM tokens.
 * Silently no-ops if Firebase is not configured.
 *
 * @returns Array of successfully delivered tokens
 */
export async function sendPushNotification(
    tokens: string[],
    payload: PushPayload
): Promise<string[]> {
    if (tokens.length === 0) return [];

    const msg = getMessaging();
    if (!msg) {
        console.warn('[FCM] Push notification skipped — Firebase not configured');
        return [];
    }

    try {
        const response = await msg.sendEachForMulticast({
            tokens,
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
            },
            data: payload.data,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK', // works for both Flutter & React Native
                },
            },
        });

        const successTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (resp.success) {
                successTokens.push(tokens[idx]);
            } else {
                console.warn(`[FCM] Token[${idx}] failed:`, resp.error?.message);
            }
        });

        console.log(`[FCM] Sent ${successTokens.length}/${tokens.length} successfully`);
        return successTokens;
    } catch (err) {
        console.error('[FCM] sendPushNotification error:', err);
        return [];
    }
}
