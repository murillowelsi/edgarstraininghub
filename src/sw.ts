import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

declare let self: ServiceWorkerGlobalScope

// Initialize Firebase in the service worker so FCM can deliver background push
// messages via onBackgroundMessage (required — raw push events alone are unreliable
// when the app is closed because Firebase SDK expects to own the push lifecycle).
const _firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
})

const _messaging = getMessaging(_firebaseApp)

onBackgroundMessage(_messaging, (payload) => {
  const title = payload.notification?.title || (payload.data?.title as string) || 'New message'
  const body  = payload.notification?.body  || (payload.data?.body  as string) || ''
  const url   = (payload.data?.url as string) || '/'
  const unreadCount = parseInt((payload.data?.unreadCount as string) || '1', 10)

  if ('setAppBadge' in self) {
    (self as any).setAppBadge(unreadCount).catch(() => {})
  }

  return self.registration.showNotification(title, {
    body,
    icon:     '/pwa-192x192.png',
    badge:    '/pwa-192x192.png',
    data:     { url },
    vibrate:  [200, 100, 200],
    tag:      url,
    renotify: true,
  })
})

self.skipWaiting()
clientsClaim()

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA navigation fallback — all routes (/, /app, /athlete, /admin/...) serve index.html
// This is required so the PWA works correctly when opened at any deep URL
const handler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(handler, {
  // Exclude the Firebase messaging SW from the fallback
  denylist: [/firebase-messaging-sw\.js/],
}))

// Runtime caching rules (mirrors vite.config.ts runtimeCaching)
registerRoute(
  ({ url }) => url.origin === 'https://firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firebase-api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

registerRoute(
  ({ url }) => url.origin === 'https://res.cloudinary.com',
  new CacheFirst({
    cacheName: 'cloudinary-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Handle notification click — open or focus the app at the right URL
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  notification.close()

  const targetUrl = (notification.data?.url as string) || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // If a window is already open, focus it and navigate
        for (const client of clients) {
          if ('focus' in client) {
            client.focus()
            client.navigate(targetUrl)
            return
          }
        }
        // No open window — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})

