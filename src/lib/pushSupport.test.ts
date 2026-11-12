import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSavedToken, isIOS, isOptedOut, markAsked, pushState, pushSupport, setOptedOut, setSavedToken, wasAsked, type PushEnvironment } from "./pushSupport";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
const full = { hasNotification: true, hasServiceWorker: true, hasPushManager: true };
const env = (o: Partial<PushEnvironment>): PushEnvironment => ({ userAgent: ANDROID, maxTouchPoints: 5, standalone: false, ...full, ...o });

describe("pushSupport", () => {
  it("iPhone in Safari must be installed first; installed it is supported", () => {
    expect(pushSupport(env({ userAgent: IPHONE }))).toBe("ios-needs-install");
    expect(pushSupport(env({ userAgent: IPHONE, standalone: true }))).toBe("supported");
  });

  it("iPadOS that reports a Mac with touch counts as iOS; a real Mac does not", () => {
    expect(isIOS({ userAgent: IPAD_AS_MAC, maxTouchPoints: 5 })).toBe(true);
    expect(isIOS({ userAgent: IPAD_AS_MAC, maxTouchPoints: 0 })).toBe(false);
  });

  it("Android and desktop with the APIs are supported; without them, not", () => {
    expect(pushSupport(env({}))).toBe("supported");
    expect(pushSupport(env({ hasPushManager: false }))).toBe("unsupported");
  });
});

describe("pushState", () => {
  it("maps support, permission and the per-device choice", () => {
    expect(pushState("ios-needs-install", "default", false)).toBe("needs-install");
    expect(pushState("unsupported", "granted", false)).toBe("unsupported");
    expect(pushState("supported", "denied", false)).toBe("blocked");
    expect(pushState("supported", "granted", false)).toBe("on");
    expect(pushState("supported", "granted", true)).toBe("off");
    expect(pushState("supported", "default", false)).toBe("off");
  });
});

describe("per-device storage", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps opt-out, token and asked flags per user/place", () => {
    setOptedOut("u1", true);
    expect(isOptedOut("u1")).toBe(true);
    expect(isOptedOut("u2")).toBe(false);
    setOptedOut("u1", false);
    expect(isOptedOut("u1")).toBe(false);
    setSavedToken("u1", "tok");
    expect(getSavedToken("u1")).toBe("tok");
    setSavedToken("u1", null);
    expect(getSavedToken("u1")).toBeNull();
    expect(wasAsked("chat")).toBe(false);
    markAsked("chat");
    expect(wasAsked("chat")).toBe(true);
  });
});
