// Firebase Cloud Messaging Service Worker
// Handles background push messages when the app is closed or backgrounded.

importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDQEuJeX-fd3GXcT83nlzoywDY9CqtUcBU",
  authDomain: "edgarzanin-3953f.firebaseapp.com",
  projectId: "edgarzanin-3953f",
  storageBucket: "edgarzanin-3953f.firebasestorage.app",
  messagingSenderId: "269272881764",
  appId: "1:269272881764:web:c227fec0de5f93aafb5d71",
});

const messaging = firebase.messaging();

// Background messages (app minimized or closed)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'New message';
  const body = payload.notification?.body || payload.data?.body || '';
  const chatUrl = payload.data?.url || '/';
  const unreadCount = parseInt(payload.data?.unreadCount || '1', 10);

  // Update app icon badge
  if ('setAppBadge' in self) {
    self.setAppBadge(unreadCount).catch(() => {});
  }

  return self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: chatUrl },
    tag: chatUrl,
    renotify: true,
    vibrate: [200, 100, 200],
  });
});

// Open/focus app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
