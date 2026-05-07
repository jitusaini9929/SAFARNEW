/**
 * Firebase Messaging Service Worker
 *
 * Handles background push notifications for the SAFAR web app.
 * Firebase config is received at runtime from the main thread via
 * postMessage — no hardcoded values in this file.
 */

/* global importScripts, firebase, self, clients */

importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js");

let messagingInitialized = false;

// Read config synchronously from the URL query string
const urlParams = new URLSearchParams(self.location.search);
const configStr = urlParams.get("config");

if (configStr) {
  try {
    const config = JSON.parse(configStr);
    firebase.initializeApp(config);

    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const data = payload.data || {};
      const title = data.title || "SAFAR";
      const body = data.body || "";

      self.registration.showNotification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { deepLink: data.deepLink || "/" },
      });
    });

    messagingInitialized = true;
  } catch (err) {
    console.error("[SW] Firebase init error:", err);
  }
}

/**
 * Fallback: if the push event fires before Firebase config is received
 * (e.g. cold start), handle the raw push payload directly.
 */
self.addEventListener("push", (event) => {
  if (messagingInitialized) return; // Firebase SDK will handle it

  let data = {};
  try {
    const json = event.data && event.data.json();
    data = (json && json.data) || json || {};
  } catch {
    // Non-JSON payload — ignore
    return;
  }

  const title = data.title || "SAFAR";
  const body = data.body || "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { deepLink: data.deepLink || "/" },
    })
  );
});

/**
 * Handle notification click — open or focus the correct page.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const deepLink = (event.notification.data && event.notification.data.deepLink) || "/";
  const urlToOpen = new URL(deepLink, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});
