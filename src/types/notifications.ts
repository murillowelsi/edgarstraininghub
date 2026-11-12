/**
 * `renotify` and `vibrate` are part of the Notifications spec and supported by
 * Chromium/Android, but TypeScript's DOM lib does not declare them.
 */
export interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  vibrate?: number | number[];
}
