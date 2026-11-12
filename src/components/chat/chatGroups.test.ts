import { describe, expect, it } from "vitest";
import { groupChatRows, newMessageId, type ChatItem } from "./chatGroups";

const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m);
const item = (id: string, senderId: string, when: Date | null): ChatItem => ({
    id, text: id, senderId, at: when, read: false, status: when ? "sent" : "sending",
});

describe("groupChatRows", () => {
    it("joins one person's messages less than 5 min apart", () => {
        const rows = groupChatRows([item("a", "u1", at(11, 8, 0)), item("b", "u1", at(11, 8, 4)), item("c", "u1", at(11, 8, 10))], "me");
        const blocks = rows.filter((r) => r.kind === "block");
        expect(blocks.map((b) => b.kind === "block" && b.items.map((i) => i.id))).toEqual([["a", "b"], ["c"]]);
    });

    it("starts a new block on another sender and a new day", () => {
        const rows = groupChatRows([item("a", "u1", at(11, 8, 0)), item("b", "me", at(11, 8, 1)), item("c", "me", at(12, 8, 2))], "me");
        expect(rows.map((r) => r.kind)).toEqual(["day", "block", "block", "day", "block"]);
        const mine = rows.filter((r) => r.kind === "block" && r.mine);
        expect(mine).toHaveLength(2);
    });

    it("keeps a just-sent message (no time yet) in my last block", () => {
        const rows = groupChatRows([item("a", "me", at(11, 8, 0)), item("b", "me", null)], "me");
        expect(rows).toHaveLength(2);
        expect(rows[1].kind === "block" && rows[1].items.map((i) => i.id)).toEqual(["a", "b"]);
    });
});

describe("newMessageId", () => {
    it("makes 20-char ids that differ", () => {
        const a = newMessageId();
        expect(a).toMatch(/^[A-Za-z0-9]{20}$/);
        expect(newMessageId()).not.toBe(a);
    });
});
