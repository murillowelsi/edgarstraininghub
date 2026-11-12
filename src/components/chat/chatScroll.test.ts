import { describe, expect, it } from "vitest";
import { isNearBottom, newMessagesSince } from "./chatScroll";
import { readViewport } from "@/hooks/useVisualViewport";

describe("isNearBottom", () => {
    it("is true within 120px of the end", () => {
        expect(isNearBottom({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1400 })).toBe(true);
    });
    it("is false while reading older messages", () => {
        expect(isNearBottom({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1000 })).toBe(false);
    });
});

describe("newMessagesSince", () => {
    const msgs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    it("returns the messages after the last seen one", () => {
        expect(newMessagesSince(msgs, "a").map((m) => m.id)).toEqual(["b", "c"]);
    });
    it("counts nothing on first load or when the id is gone", () => {
        expect(newMessagesSince(msgs, null)).toEqual([]);
        expect(newMessagesSince(msgs, "zz")).toEqual([]);
    });
});

describe("readViewport", () => {
    it("detects the keyboard from a shorter visual viewport", () => {
        const win = { innerHeight: 844, visualViewport: { height: 508, offsetTop: 40 } } as unknown as Window;
        expect(readViewport(win)).toEqual({ height: 508, offsetTop: 40, keyboardOpen: true });
    });
    it("falls back to innerHeight without visualViewport", () => {
        const win = { innerHeight: 667, visualViewport: null } as unknown as Window;
        expect(readViewport(win)).toEqual({ height: 667, offsetTop: 0, keyboardOpen: false });
    });
});
