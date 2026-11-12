/**
 * FCM token service: registers this device for push notifications and keeps
 * its token in users/{uid}/fcmTokens/{token}, which the server (/api/notify,
 * /api/rest-timer) reads to send. Needs VITE_FIREBASE_VAPID_KEY (set in
 * Vercel); without it (local, emulator) registration is skipped quietly.
 */

import { deleteToken, getToken, onMessage } from "firebase/messaging";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { messaging } from "../lib/firebase";
import { db } from "../lib/firebase";
import { NotificationService } from "./notifications";
import { getSavedToken, setSavedToken } from "../lib/pushSupport";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export const FCMService = {
  /** False on local/emulator builds (no VAPID key or no messaging): push is off there. */
  isConfigured(): boolean {
    return !!messaging && !!VAPID_KEY;
  },

  /**
   * Register this device. Call only after permission is granted. Saves the
   * token for this user (and drops the previous one if FCM rotated it).
   */
  async registerToken(userId: string): Promise<string | null> {
    if (!messaging || !VAPID_KEY) return null;
    try {
      // The PWA service worker (vite-plugin-pwa, src/sw.ts) also handles FCM
      const swRegistration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });
      if (!token) return null;

      const previous = getSavedToken(userId);
      if (previous && previous !== token) {
        await deleteDoc(doc(db, "users", userId, "fcmTokens", previous)).catch(() => {});
      }
      await setDoc(doc(db, "users", userId, "fcmTokens", token), {
        token,
        updatedAt: new Date(),
        platform: navigator.userAgent,
      });
      setSavedToken(userId, token);
      return token;
    } catch (err) {
      console.error("FCM token registration failed:", err);
      return null;
    }
  },

  /** Turn push off on this device: remove its token from Firestore and from FCM. */
  async unregisterToken(userId: string): Promise<void> {
    const token = getSavedToken(userId);
    setSavedToken(userId, null);
    if (token) {
      await deleteDoc(doc(db, "users", userId, "fcmTokens", token)).catch((err) =>
        console.error("FCM token delete failed:", err)
      );
    }
    if (messaging) await deleteToken(messaging).catch(() => {});
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
