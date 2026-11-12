/** Light vibration on supported phones (Android). No-op elsewhere or with reduced motion. */
export const haptics = {
  tap: () => {
    try {
      if (typeof window === "undefined" || !("vibrate" in navigator)) return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      navigator.vibrate(10);
    } catch {
      // ignore: vibration is a nicety
    }
  },
};
