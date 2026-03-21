/**
 * NotificationService
 *
 * Handles browser notification permissions and showing chat notifications.
 * Works in two modes:
 *  - Foreground: Firestore listener detects a new message → show notification
 *    if the window is hidden/minimised.
 *  - Background (future): A Cloud Function sends a Web Push payload to the
 *    registered push subscription, and the service worker shows it even when
 *    the app is closed.
 */

export const NotificationService = {
  /** Returns true if notifications are currently granted */
  isGranted(): boolean {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted'
  },

  /** Returns true if notifications are blocked by the user */
  isDenied(): boolean {
    return typeof Notification !== 'undefined' && Notification.permission === 'denied'
  },

  /** Request permission. Returns true if granted. */
  async requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const result = await Notification.requestPermission()
    return result === 'granted'
  },

  /**
   * Show a chat notification.
   * Only fires when permission is granted AND the document is not visible
   * (i.e. the user has another tab or app focused).
   */
  async showChatNotification(
    senderName: string,
    messageText: string,
    chatUrl: string
  ): Promise<void> {
    if (!this.isGranted()) return
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') return

    const title = senderName
    const body =
      messageText.length > 80 ? messageText.substring(0, 80) + '…' : messageText

    const options: NotificationOptions = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: chatUrl },
      tag: chatUrl, // one notification per chat thread (replaces previous)
      renotify: true,
      vibrate: [200, 100, 200],
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
      } else {
        new Notification(title, options)
      }
    } catch {
      // Notification API not available in this context — silently ignore
    }
  },
}
