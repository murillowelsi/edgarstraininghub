import { beforeEach, describe, expect, it } from "vitest";
import { chatOutbox } from "./chatOutbox";

const store = new Map<string, string>();
Object.assign(globalThis, {
    sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    },
});

describe("chatOutbox", () => {
    beforeEach(() => {
        store.clear();
        chatOutbox.reset();
    });

    it("keeps a failed message per conversation until it is sent", () => {
        chatOutbox.put("c1", { id: "m1", text: "oi", status: "sending" });
        chatOutbox.put("c1", { id: "m1", text: "oi", status: "failed" });
        expect(chatOutbox.get("c1")).toEqual([{ id: "m1", text: "oi", status: "failed" }]);
        expect(chatOutbox.get("c2")).toEqual([]);
        chatOutbox.remove("c1", "m1");
        expect(chatOutbox.get("c1")).toEqual([]);
        expect(store.size).toBe(0);
    });

    it("treats a send cut off by a reload as failed", () => {
        store.set("ez-chat-outbox-v1:c1", JSON.stringify([{ id: "m1", text: "oi", status: "sending" }]));
        expect(chatOutbox.get("c1")[0].status).toBe("failed");
    });
});
