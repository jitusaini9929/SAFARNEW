/**
 * Firebase Cloud Messaging — Web Push support.
 *
 * Handles FCM token lifecycle (request → register → revoke) and
 * foreground message display.  All Firebase config comes from
 * VITE_ environment variables so QA / production can differ.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { apiFetch, API_BASE } from "@/utils/apiFetch";
import { toast } from "sonner";

// ── Local-storage keys ───────────────────────────────────────
const LS_FCM_TOKEN = "safar.web_fcm_token";
const LS_PUSH_DISMISSED = "safar.push_opt_in_dismissed";

// ── Firebase config from Vite env ────────────────────────────
function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };
}

function getVapidKey(): string {
  return import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
}

// ── Singleton instances ──────────────────────────────────────
let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return !!(config.apiKey && config.projectId && config.messagingSenderId);
}

function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;

  const existing = getApps();
  if (existing.length > 0) {
    firebaseApp = existing[0];
    return firebaseApp;
  }

  firebaseApp = initializeApp(getFirebaseConfig());
  return firebaseApp;
}

function getFirebaseMessaging(): Messaging {
  if (messaging) return messaging;
  messaging = getMessaging(getFirebaseApp());
  return messaging;
}

// ── Public helpers ───────────────────────────────────────────

/** Whether the browser supports web push notifications at all. */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    isFirebaseConfigured()
  );
}

/** Whether the user previously dismissed the opt-in banner. */
export function isPushOptInDismissed(): boolean {
  try {
    return localStorage.getItem(LS_PUSH_DISMISSED) === "true";
  } catch {
    return false;
  }
}

/** Mark the opt-in banner as dismissed so it won't show again. */
export function dismissPushOptIn(): void {
  try {
    localStorage.setItem(LS_PUSH_DISMISSED, "true");
  } catch {
    // Non-fatal.
  }
}

/** Whether notifications are already granted AND a token exists. */
export function hasActiveWebPushToken(): boolean {
  if (typeof window === "undefined") return false;
  return Notification.permission === "granted" && !!localStorage.getItem(LS_FCM_TOKEN);
}

/**
 * Request notification permission, get FCM token, and register it
 * with the backend.  Returns the token on success, or null.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!isWebPushSupported()) {
    console.warn("[WEB PUSH] Not supported in this browser");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("[WEB PUSH] Permission denied or dismissed");
      return null;
    }

    // Pass config via URL so the SW has it synchronously on cold start
    const config = getFirebaseConfig();
    const swUrl = `/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(config))}`;
    
    // Register service worker
    const swRegistration = await navigator.serviceWorker.register(
      swUrl,
      { scope: "/" },
    );

    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.error("[WEB PUSH] VITE_FIREBASE_VAPID_KEY is not set");
      return null;
    }

    const fcmToken = await getToken(getFirebaseMessaging(), {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!fcmToken) {
      console.error("[WEB PUSH] Failed to get FCM token");
      return null;
    }

    // Register token with the real backend
    await apiFetch(`${API_BASE}/device-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceToken: fcmToken,
        platform: "web",
        notificationsEnabled: true,
      }),
      credentials: "include",
    });

    // Persist the token locally for revocation on logout
    try {
      localStorage.setItem(LS_FCM_TOKEN, fcmToken);
    } catch {
      // Non-fatal.
    }

    console.info("[WEB PUSH] Token registered successfully");
    return fcmToken;
  } catch (error) {
    console.error("[WEB PUSH] requestNotificationPermission error:", error);
    return null;
  }
}

/**
 * Revoke the current web FCM token on the backend.
 * Called during logout.
 */
export async function revokeNotificationToken(): Promise<void> {
  const token = localStorage.getItem(LS_FCM_TOKEN);
  if (!token) return;

  try {
    await apiFetch(`${API_BASE}/device-tokens/revoke`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceToken: token }),
      credentials: "include",
    });
  } catch (error) {
    console.warn("[WEB PUSH] Token revocation failed:", error);
  } finally {
    try {
      localStorage.removeItem(LS_FCM_TOKEN);
    } catch {
      // Non-fatal.
    }
  }
}

/**
 * Listen for foreground FCM messages and show them as toast
 * notifications.  Call once after the app mounts.
 */
export function setupForegroundMessageListener(): (() => void) | null {
  if (!isWebPushSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    const unsubscribe = onMessage(getFirebaseMessaging(), (payload) => {
      const data = payload.data || {};
      const title = data.title || payload.notification?.title || "SAFAR";
      const body = data.body || payload.notification?.body || "";

      toast(title, {
        description: body,
        duration: 6000,
        action: data.deepLink
          ? {
              label: "View",
              onClick: () => {
                window.location.href = data.deepLink!;
              },
            }
          : undefined,
      });
    });

    return unsubscribe;
  } catch {
    return null;
  }
}
