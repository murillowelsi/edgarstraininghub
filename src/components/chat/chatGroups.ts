import { isSameDay } from "date-fns";

/** Messages from the same person less than this apart share one block */
export const BLOCK_GAP_MS = 5 * 60 * 1000;

export type DeliveryStatus = "sent" | "sending" | "failed";

/** A message as the window shows it: server copy or a local one still in the outbox */
export interface ChatItem {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
    /** null while the server time isn't known yet */
    at: Date | null;
    read: boolean;
    status: DeliveryStatus;
}

export type ChatRow =
    | { kind: "day"; key: string; date: Date }
    | { kind: "block"; key: string; senderId: string; senderName?: string; mine: boolean; items: ChatItem[] };

/**
 * Day separators + blocks: consecutive messages from one person, on the same day,
 * each less than 5 min after the previous one. A message without a time yet
 * (just sent) joins the block before it when it's from the same person.
 */
export function groupChatRows(items: ChatItem[], me: string): ChatRow[] {
    const rows: ChatRow[] = [];
    let block: Extract<ChatRow, { kind: "block" }> | null = null;
    let lastDay: Date | null = null;
    let lastAt: Date | null = null;

    for (const item of items) {
        const at = item.at;
        if (at && (!lastDay || !isSameDay(at, lastDay))) {
            rows.push({ kind: "day", key: `day-${item.id}`, date: at });
            lastDay = at;
            block = null;
        }
        const joins =
            block !== null &&
            block.senderId === item.senderId &&
            (!at || !lastAt || at.getTime() - lastAt.getTime() < BLOCK_GAP_MS);
        if (joins && block) {
            block.items.push(item);
        } else {
            block = { kind: "block", key: `b-${item.id}`, senderId: item.senderId, senderName: item.senderName, mine: item.senderId === me, items: [item] };
            rows.push(block);
        }
        if (at) lastAt = at;
    }
    return rows;
}

/** Firestore-style random id, so a retry writes the same document */
export function newMessageId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
