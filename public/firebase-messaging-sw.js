/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker for Abhyudaya Club

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Initialize Firebase inside the Service Worker using public web credentials
firebase.initializeApp({
  apiKey: "AIzaSyBaTTNrVGmzJmObIkZ3t8qWfdH0WuF8i3k",
  authDomain: "abhyudayaclub.firebaseapp.com",
  projectId: "abhyudayaclub",
  storageBucket: "abhyudayaclub.firebasestorage.app",
  messagingSenderId: "824083998654",
  appId: "1:824083998654:web:ab7011bb18a0a7ed69bbef"
});

const messaging = firebase.messaging();

// Handle background push notifications received via Firebase Cloud Messaging
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM-SW] Received background message:", payload);

  const notificationTitle =
    payload.notification?.title ||
    payload.data?.title ||
    "Abhyudaya Club";

  const targetUrl =
    payload.data?.link ||
    payload.data?.url ||
    payload.fcmOptions?.link ||
    "/";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "New update from Abhyudaya Club!",
    icon: payload.notification?.icon || payload.data?.icon || "/abhyudaya-logo.png",
    badge: "/favicon.png",
    data: {
      url: targetUrl,
      timestamp: Date.now(),
      ...payload.data
    },
    tag: payload.data?.tag || "abhyudaya-notification",
    renotify: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click event handler: brings the browser window to focus or opens a new tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/";
  // Convert relative url to absolute if necessary
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an open tab matches our origin, focus it and navigate
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
