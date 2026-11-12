import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Guard for editors with unsaved changes (WE-2). The app uses <BrowserRouter>,
 * so react-router's useBlocker isn't available; this covers the three exits:
 * - closing / reloading the tab → the browser's own beforeunload prompt;
 * - clicking an in-app link (top bar, sidebar, tabs) → our confirm;
 * - the browser / phone back button → our confirm (a sentinel history entry).
 * Call `leave(to)` for the page's own "back" button.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | number | null>(null);
  const bypass = useRef(false);
  const sentinel = useRef(false);

  // Tab close / reload
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // In-app links (capture phase, before react-router handles the click)
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (bypass.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = url.pathname + url.search + url.hash;
      if (to === window.location.pathname + window.location.search + window.location.hash) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(to);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  // Back button: keep one extra entry on top while dirty, and catch the pop
  useEffect(() => {
    if (!dirty) return;
    if (!sentinel.current) {
      window.history.pushState({ ...(window.history.state ?? {}), ezGuard: true }, "");
      sentinel.current = true;
    }
    const onPop = () => {
      if (bypass.current) return;
      // The sentinel was popped: put it back and ask
      window.history.pushState({ ...(window.history.state ?? {}), ezGuard: true }, "");
      setPending(-1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty]);

  // Saved (clean again): drop the sentinel so "back" works in one step
  useEffect(() => {
    if (dirty || !sentinel.current) return;
    sentinel.current = false;
    if (window.history.state?.ezGuard) {
      bypass.current = true;
      window.history.back();
      window.setTimeout(() => (bypass.current = false), 0);
    }
  }, [dirty]);

  const go = useCallback(
    (to: string | number) => {
      bypass.current = true;
      if (typeof to === "number") {
        // Pop the sentinel and the editor itself
        window.history.go(sentinel.current ? to - 1 : to);
      } else {
        if (sentinel.current) {
          // Replace the sentinel so it doesn't linger in history
          navigate(to, { replace: true });
        } else {
          navigate(to);
        }
      }
      sentinel.current = false;
      window.setTimeout(() => (bypass.current = false), 0);
    },
    [navigate]
  );

  /** For the page's own back / cancel buttons */
  const leave = useCallback((to: string) => (dirty ? setPending(to) : navigate(to)), [dirty, navigate]);

  return {
    /** A navigation is waiting for confirmation */
    confirmOpen: pending !== null,
    /** Discard the changes and go */
    confirmLeave: () => {
      const to = pending;
      setPending(null);
      if (to !== null) go(to);
    },
    /** Stay on the page */
    cancelLeave: () => setPending(null),
    leave,
  };
}
