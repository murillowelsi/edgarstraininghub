import { ArrowDown, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PULL_RESISTANCE = 0.5;
const MAX_PULL = 140;
const THRESHOLD = 80;
const REFRESH_DELAY = 200;

const isStandalonePWA = () => {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(displayMode || iosStandalone);
};

const hasScrolledAncestor = (target: EventTarget | null) => {
  let node = target as HTMLElement | null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
};

export const PullToRefresh = () => {
  const [enabled, setEnabled] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  useEffect(() => {
    setEnabled(isStandalonePWA());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      if (hasScrolledAncestor(e.target)) return;

      startY.current = e.touches[0].clientY;
      tracking.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current === null || refreshing) return;

      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }

      const dampened = Math.min(delta * PULL_RESISTANCE, MAX_PULL);
      setPull(dampened);

      if (e.cancelable) e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      startY.current = null;

      if (pull >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        window.setTimeout(() => {
          window.location.reload();
        }, REFRESH_DELAY);
      } else {
        setPull(0);
      }
    };

    const handleTouchCancel = () => {
      tracking.current = false;
      startY.current = null;
      setPull(0);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [enabled, pull, refreshing]);

  if (!enabled || (pull === 0 && !refreshing)) return null;

  const passedThreshold = pull >= THRESHOLD || refreshing;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[100] flex justify-center"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        transform: `translateY(${pull * 0.6}px)`,
        transition: tracking.current ? "none" : "transform 200ms ease-out",
      }}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/80 shadow-md backdrop-blur-md transition-colors ${
          passedThreshold ? "text-amber-500" : "text-muted-foreground"
        }`}
        style={{ opacity: refreshing ? 1 : Math.max(progress, 0.4) }}
      >
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ArrowDown
            className="h-5 w-5 transition-transform duration-200"
            style={{ transform: passedThreshold ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </div>
    </div>
  );
};

export default PullToRefresh;
