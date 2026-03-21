// Firebase Cloud Messaging Service Worker
// Receives push notifications from FCM even when the app is closed or backgrounded.
// This file is served at /firebase-messaging-sw.js and registered automatically by FCM.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDQEuJeX-fd3GXcT83nlzoywDY9CqtUcBU",
  authDomain: "edgarzanin-3953f.firebaseapp.com",
  projectId: "edgarzanin-3953f",
  storageBucket: "edgarzanin-3953f.firebasestorage.app",
  messagingSenderId: "269272881764",
  appId: "1:269272881764:web:c227fec0de5f93aafb5d71",
});

const messaging = firebase.messaging();

// Handle background push (app minimised or closed)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'New message';
  const body  = payload.notification?.body  || payload.data?.body  || '';
  const url   = payload.data?.url || '/';
  const unreadCount = parseInt(payload.data?.unreadCount || '1', 10);

  // Update home screen badge
  if ('setAppBadge' in self) {
    self.setAppBadge(unreadCount).catch(() => {});
  }

  return self.registration.showNotification(title, {
    body,
    icon:    '/pwa-192x192.png',
    badge:   '/pwa-192x192.png',
    data:    { url },
    tag:     url,
    renotify: true,
    vibrate: [200, 100, 200],
  });
});

// Open or focus the app when the notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, just focus it and navigate
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
