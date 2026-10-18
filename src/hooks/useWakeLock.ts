import { useEffect } from "react";

/**
 * Keeps the screen on while `active` (Screen Wake Lock API, Safari 16.4+ /
 * Chrome). The browser drops the lock whenever the page is hidden, so it is
 * re-acquired when the page becomes visible again. Fails silently where the
 * API is unsupported or denied.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
        } else {
          sentinel = lock;
        }
      } catch {
        // Denied (e.g. low battery mode) — nothing to do
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        request();
      }
    };

    request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
