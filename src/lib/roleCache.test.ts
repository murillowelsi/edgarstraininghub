import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCachedRole, getCachedRole, ROLE_CACHE_KEY, setCachedRole } from "./roleCache";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("role cache", () => {
  it("returns the role only for the same uid", () => {
    setCachedRole("u1", "athlete");
    expect(getCachedRole("u1")).toBe("athlete");
    expect(getCachedRole("u2")).toBeNull();
  });

  it("stores only uid and role", () => {
    setCachedRole("u1", "admin");
    expect(JSON.parse(localStorage.getItem(ROLE_CACHE_KEY)!)).toEqual({ uid: "u1", role: "admin" });
  });

  it("clears on sign-out and when the role is gone", () => {
    setCachedRole("u1", "admin");
    clearCachedRole();
    expect(getCachedRole("u1")).toBeNull();
    setCachedRole("u1", "athlete");
    setCachedRole("u1", null);
    expect(getCachedRole("u1")).toBeNull();
  });

  it("ignores broken or unknown values", () => {
    localStorage.setItem(ROLE_CACHE_KEY, "{oops");
    expect(getCachedRole("u1")).toBeNull();
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ uid: "u1", role: "superuser" }));
    expect(getCachedRole("u1")).toBeNull();
  });
});
