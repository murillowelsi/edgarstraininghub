import { describe, expect, it } from "vitest";
import { isNearBottom, unseenItems } from "./chatScroll";
import { readViewport } from "@/hooks/useVisualViewport";

describe("isNearBottom", () => {
    it("is true within 120px of the end", () => {
        expect(isNearBottom({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1400 })).toBe(true);
    });
    it("is false while reading older messages", () => {
        expect(isNearBottom({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1000 })).toBe(false);
    });
});

describe("unseenItems", () => {
    it("finds new server messages even before local outbox entries", () => {
        const items = [{ id: "a" }, { id: "new" }, { id: "local" }];
        expect(unseenItems(items, new Set(["a", "local"])).map((m) => m.id)).toEqual(["new"]);
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
