/**
 * Analytics consent. Nothing that tracks the visitor (Google Analytics) runs
 * until the choice is "granted". The choice is kept on this device only.
 */
export type ConsentChoice = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "ez-analytics-consent-v1";
const CHANGE_EVENT = "ez:consent-change";
const OPEN_EVENT = "ez:consent-open";

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // e.g. storage blocked in private mode
  }
};

/** null = the visitor hasn't chosen yet (show the banner). */
export const getConsent = (): ConsentChoice | null => {
  const value = storage()?.getItem(CONSENT_STORAGE_KEY);
  return value === "granted" || value === "denied" ? value : null;
};

export const setConsent = (choice: ConsentChoice): void => {
  storage()?.setItem(CONSENT_STORAGE_KEY, choice);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ConsentChoice>(CHANGE_EVENT, { detail: choice }));
  }
};

export const onConsentChange = (listener: (choice: ConsentChoice) => void): (() => void) => {
  const handler = (e: Event) => listener((e as CustomEvent<ConsentChoice>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
};

/** Footer "Cookie preferences": shows the banner again. */
export const openConsentSettings = (): void => {
  window.dispatchEvent(new Event(OPEN_EVENT));
};

export const onConsentSettingsOpen = (listener: () => void): (() => void) => {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
};
