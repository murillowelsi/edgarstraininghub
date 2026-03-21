import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Firebase Cloud Messaging initialization
declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST?: any }

// Import Firebase libraries at runtime for FCM background message handling
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

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

// Initialize Firebase for background message handling
try {
  (self as any).firebase?.initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })

  const messaging = (self as any).firebase.messaging()

  // Handle FCM background messages (when app is closed or backgrounded)
  messaging.onBackgroundMessage((payload: any) => {
    const title = payload.notification?.title || payload.data?.title || 'New message'
    const body = payload.notification?.body || payload.data?.body || ''
    const url = payload.data?.url || '/'
    const unreadCount = parseInt(payload.data?.unreadCount || '1', 10)

    // Update home screen badge
    if ('setAppBadge' in self) {
      self.setAppBadge(unreadCount).catch(() => {})
    }

    return self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url },
      tag: url,
      renotify: true,
      vibrate: [200, 100, 200],
    })
  })
} catch (err) {
  console.error('FCM initialization failed:', err)
}

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

// Handle incoming push messages (sent by a server/Cloud Function)
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json() as {
      title: string
      body: string
      url?: string
      senderName?: string
    }

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200],
        tag: data.url || 'chat', // collapse duplicate notifications for same chat
        renotify: true,
      })
    )
  } catch {
    // Malformed push data — ignore
  }
})
