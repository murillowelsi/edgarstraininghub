/**
 * FCM Token Service
 *
 * Registers the device with Firebase Cloud Messaging and saves the token
 * to Firestore so the Cloud Function can send push notifications to this device.
 *
 * SETUP REQUIRED:
 * 1. Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
 *    → Generate Key Pair → copy the key to VITE_FIREBASE_VAPID_KEY in .env
 * 2. Deploy the Cloud Function in docs/push-notification-function.ts
 */

import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { messaging } from "../lib/firebase";
import { db } from "../lib/firebase";
import { NotificationService } from "./notifications";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export const FCMService = {
  /**
   * Register this device for push notifications.
   * Saves the FCM token to Firestore under users/{userId}/fcmTokens/{token}.
   * Call this after the user grants notification permission.
   */
  async registerToken(userId: string): Promise<string | null> {
    if (!messaging) {
      console.warn("FCM: Messaging not initialized");
      return null;
    }
    if (!VAPID_KEY) {
      console.warn("FCM: VITE_FIREBASE_VAPID_KEY not set. Push notifications won't work.");
      return null;
    }

    try {
      console.log("FCM: Requesting FCM token with existing PWA service worker...");

      // Use the existing PWA service worker (registered by vite-plugin-pwa)
      // The PWA service worker now includes FCM background message handling
      const swRegistration = await navigator.serviceWorker.ready;

      console.log("FCM: Using service worker:", swRegistration);

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        console.warn("FCM: Failed to get FCM token - it returned null");
        return null;
      }

      console.log("FCM: Token obtained successfully:", token.substring(0, 20) + "...");

      // Save token to Firestore so Cloud Function can look it up
      await setDoc(
        doc(db, "users", userId, "fcmTokens", token),
        { token, updatedAt: new Date(), platform: navigator.userAgent }
      );

      console.log("FCM: Token saved to Firestore");

      return token;
    } catch (err) {
      console.error("FCM token registration failed:", err);
      return null;
    }
  },

  /**
   * Listen for foreground messages (app open and visible).
   * Shows a browser notification when a message arrives while the user
   * is on a different page of the app.
   */
  listenForeground(currentChatUrl: string) {
    if (!messaging) return () => {};

    const unsubscribe = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || payload.data?.title || "New message";
      const body = payload.notification?.body || payload.data?.body || "";
      const url = payload.data?.url || currentChatUrl;

      // Show notification if user is not currently on the chat page
      if (!window.location.pathname.includes("chat") || document.visibilityState !== "visible") {
        NotificationService.showChatNotification(title, body, url);
      }

      // Update badge
      const unreadCount = parseInt(payload.data?.unreadCount || "1", 10);
      NotificationService.setBadge(unreadCount);
    });

    return unsubscribe;
  },
};
