import { useEffect, useState } from "react";

/** With the on-screen keyboard open, the visual viewport is at least this much shorter than the window */
const KEYBOARD_MIN_PX = 120;

export interface ViewportState {
  /** Visible height in px (shrinks when the keyboard opens) */
  height: number;
  /** How far the visible area is scrolled down inside the layout viewport (iOS) */
  offsetTop: number;
  keyboardOpen: boolean;
}

export function readViewport(win: Pick<Window, "innerHeight" | "visualViewport"> = window): ViewportState {
  const vv = win.visualViewport;
  const height = Math.round(vv?.height ?? win.innerHeight);
  const offsetTop = Math.max(0, Math.round(vv?.offsetTop ?? 0));
  return { height, offsetTop, keyboardOpen: win.innerHeight - height > KEYBOARD_MIN_PX };
}

/**
 * Tracks the visible area (window.visualViewport) and mirrors it in CSS vars on <html>:
 * --app-vh (height) and --app-vv-top (offsetTop). A `fixed` screen sized with
 * `height: var(--app-vh, 100dvh)` and moved by --app-vv-top stays right above the iOS
 * keyboard, which `100vh` doesn't do. While active, it also locks the page scroll
 * behind the screen. The vars are removed on unmount, so 100dvh is the fallback.
 */
export function useVisualViewport(active = true): ViewportState {
  const [state, setState] = useState<ViewportState>(() =>
    typeof window === "undefined" ? { height: 0, offsetTop: 0, keyboardOpen: false } : readViewport()
  );

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readViewport();
        root.style.setProperty("--app-vh", `${next.height}px`);
        root.style.setProperty("--app-vv-top", `${next.offsetTop}px`);
        setState((prev) =>
          prev.height === next.height && prev.offsetTop === next.offsetTop && prev.keyboardOpen === next.keyboardOpen
            ? prev
            : next
        );
      });
    };

    // Page behind the screen must not scroll (iOS scrolls it to reveal a focused field)
    const prevOverflow = root.style.overflow;
    const prevOverscroll = root.style.overscrollBehavior;
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--app-vh");
      root.style.removeProperty("--app-vv-top");
      root.style.overflow = prevOverflow;
      root.style.overscrollBehavior = prevOverscroll;
    };
  }, [active]);

  return state;
}
