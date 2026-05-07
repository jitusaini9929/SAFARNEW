/**
 * NotificationOptIn — A dismissible banner that prompts authenticated
 * users to enable browser push notifications.
 *
 * Rules:
 *  - Only shown to authenticated users.
 *  - Hidden if the browser doesn't support web push.
 *  - Hidden if the user already granted permission and has a token.
 *  - Hidden if the user previously dismissed the banner.
 *  - Hidden if the browser permission is "denied" (user blocked via browser UI).
 *  - The browser permission prompt is ONLY triggered when the user clicks "Enable".
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  isWebPushSupported,
  isPushOptInDismissed,
  dismissPushOptIn,
  hasActiveWebPushToken,
  requestNotificationPermission,
  setupForegroundMessageListener,
} from "@/lib/firebase-messaging";

export function NotificationOptIn() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Determine whether to show the banner
    if (!isWebPushSupported()) return;
    if (isPushOptInDismissed()) return;
    if (hasActiveWebPushToken()) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") return;

    setVisible(true);
  }, []);

  // Set up foreground listener if permission is already granted
  useEffect(() => {
    if (!isWebPushSupported()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const unsub = setupForegroundMessageListener();
    return () => {
      unsub?.();
    };
  }, []);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        // Success — set up foreground listener and hide banner
        setupForegroundMessageListener();
        setVisible(false);
      } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        // User blocked via browser UI — hide banner permanently
        dismissPushOptIn();
        setVisible(false);
      }
      // If null but not denied, user may have dismissed the browser prompt — keep banner visible
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    dismissPushOptIn();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      id="notification-opt-in-banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/90 to-orange-950/90 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <Bell className="h-5 w-5 text-amber-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-100">
            Enable notifications
          </p>
          <p className="text-xs text-amber-300/70">
            Get Sandesh announcements and updates
          </p>
        </div>

        <button
          onClick={handleEnable}
          disabled={loading}
          className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
        >
          {loading ? "…" : "Enable"}
        </button>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-md p-1 text-amber-400/60 transition-colors hover:text-amber-300"
          aria-label="Dismiss notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
