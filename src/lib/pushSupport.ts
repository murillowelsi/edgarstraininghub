/**
 * Push notifications: what this device can do and what the switch shows.
 * Pure functions (no globals) so they can be tested; readEnvironment() reads
 * the browser.
 */
export interface PushEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  /** Opened from the home-screen icon (display-mode: standalone) */
  standalone: boolean;
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
}

export type PushSupport = "supported" | "ios-needs-install" | "unsupported";
export type PushState = "on" | "off" | "blocked" | "unsupported" | "needs-install";
export type Permission = "default" | "granted" | "denied";

/** iPhone/iPad, including iPadOS that reports itself as a Mac */
export const isIOS = (env: Pick<PushEnvironment, "userAgent" | "maxTouchPoints">) =>
  /iPhone|iPad|iPod/i.test(env.userAgent) || (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1);

export const pushSupport = (env: PushEnvironment): PushSupport => {
  // iOS only allows web push for apps added to the Home Screen (16.4+)
  if (isIOS(env) && !env.standalone) return "ios-needs-install";
  if (!env.hasNotification || !env.hasServiceWorker || !env.hasPushManager) return "unsupported";
  return "supported";
};

/**
 * What the "Notifications" switch shows. `optedOut` = the person turned it off
 * on this device (we keep the browser permission but drop the token).
 */
export const pushState = (support: PushSupport, permission: Permission, optedOut: boolean): PushState => {
  if (support === "ios-needs-install") return "needs-install";
  if (support === "unsupported") return "unsupported";
  if (permission === "denied") return "blocked";
  if (permission === "granted" && !optedOut) return "on";
  return "off";
};

export const readEnvironment = (): PushEnvironment => {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const win = typeof window !== "undefined" ? window : undefined;
  return {
    userAgent: nav?.userAgent ?? "",
    maxTouchPoints: nav?.maxTouchPoints ?? 0,
    standalone:
      !!win?.matchMedia?.("(display-mode: standalone)").matches ||
      (nav as Navigator & { standalone?: boolean } | undefined)?.standalone === true,
    hasNotification: !!win && "Notification" in win,
    hasServiceWorker: !!nav && "serviceWorker" in nav,
    hasPushManager: !!win && "PushManager" in win,
  };
};

// Per-device choice and the token saved for this user, in localStorage
const OPT_KEY = "ez-push-opt-v1";
const TOKEN_KEY = "ez-push-token-v1";

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export const isOptedOut = (uid: string): boolean => storage()?.getItem(`${OPT_KEY}:${uid}`) === "off";
export const setOptedOut = (uid: string, off: boolean): void => {
  if (off) storage()?.setItem(`${OPT_KEY}:${uid}`, "off");
  else storage()?.removeItem(`${OPT_KEY}:${uid}`);
};

export const getSavedToken = (uid: string): string | null => storage()?.getItem(`${TOKEN_KEY}:${uid}`) ?? null;
export const setSavedToken = (uid: string, token: string | null): void => {
  if (token) storage()?.setItem(`${TOKEN_KEY}:${uid}`, token);
  else storage()?.removeItem(`${TOKEN_KEY}:${uid}`);
};

/** Contextual invitations (chat, first workout) are shown once per place */
const ASKED_KEY = "ez-push-asked-v1";
export const wasAsked = (place: string): boolean => storage()?.getItem(`${ASKED_KEY}:${place}`) === "1";
export const markAsked = (place: string): void => storage()?.setItem(`${ASKED_KEY}:${place}`, "1");
