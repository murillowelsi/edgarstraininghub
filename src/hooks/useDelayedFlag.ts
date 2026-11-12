import { useEffect, useState } from "react";

/**
 * True only after `active` has stayed true for `delay` ms. Loading states use
 * it so fast loads never flash a skeleton (design system 8.2).
 */
export function useDelayedFlag(active: boolean, delay = 300): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(id);
  }, [active, delay]);
  return active && shown;
}
