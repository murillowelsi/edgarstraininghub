import { useEffect } from "react";

const APP_NAME = "EZ Training";

/** Sets document.title to "<title> · EZ Training"; without a title the current one stays. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    // Restore on unmount so pages without a title don't inherit this one
    return () => {
      document.title = previous;
    };
  }, [title]);
}
