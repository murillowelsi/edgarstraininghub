import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY, getConsent, onConsentChange, setConsent } from "./consent";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe("consent", () => {
  it("starts undecided", () => {
    expect(getConsent()).toBeNull();
  });

  it("saves the choice and tells listeners", () => {
    const seen: string[] = [];
    const off = onConsentChange((c) => seen.push(c));
    setConsent("granted");
    expect(getConsent()).toBe("granted");
    setConsent("denied");
    expect(getConsent()).toBe("denied");
    off();
    setConsent("granted");
    expect(seen).toEqual(["granted", "denied"]);
  });

  it("ignores unknown stored values", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "yes");
    expect(getConsent()).toBeNull();
  });

  it("works without storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(getConsent()).toBeNull();
    expect(() => setConsent("denied")).not.toThrow();
  });
});
