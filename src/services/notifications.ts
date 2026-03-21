/**
 * NotificationService
 *
 * Handles browser notification permissions, chat notifications, and app badge.
 */

export const NotificationService = {
  isGranted(): boolean {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  },

  isDenied(): boolean {
    return typeof Notification !== "undefined" && Notification.permission === "denied";
  },

  async requestPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  },

  /**
   * Show a chat notification.
   * Only fires when permission is granted AND document is not visible.
   */
  async showChatNotification(
    senderName: string,
    messageText: string,
    chatUrl: string
  ): Promise<void> {
    if (!this.isGranted()) return;
    if (typeof document !== "undefined" && document.visibilityState === "visible") return;

    const body = messageText.length > 80 ? messageText.substring(0, 80) + "…" : messageText;

    const options: NotificationOptions = {
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: chatUrl },
      tag: chatUrl,
      renotify: true,
      vibrate: [200, 100, 200],
    };

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(senderName, options);
      } else {
        new Notification(senderName, options);
      }
    } catch {
      // Silently ignore
    }
  },

  /** Update the app icon badge with the total unread count. */
  async setBadge(count: number): Promise<void> {
    if (!("setAppBadge" in navigator)) return;
    try {
      if (count > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).setAppBadge(count);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).clearAppBadge();
      }
    } catch {
      // Not supported or permission denied
    }
  },
};
