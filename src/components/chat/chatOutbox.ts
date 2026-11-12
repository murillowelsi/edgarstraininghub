import { useSyncExternalStore } from "react";

/** A message not confirmed by the server yet, or one that failed */
export interface OutboxEntry {
    id: string;
    text: string;
    status: "sending" | "failed";
}

/**
 * Per-conversation outbox kept in sessionStorage, so a failed message survives
 * leaving the conversation (or a reload) and can still be retried. It lives outside
 * the component: a send that fails after the window closed is still recorded.
 */
const key = (chatId: string) => `ez-chat-outbox-v1:${chatId}`;
const cache = new Map<string, OutboxEntry[]>();
const listeners = new Set<() => void>();
/** Sends running in this tab; anything else marked "sending" was cut off (reload) */
const inFlight = new Set<string>();
const EMPTY: OutboxEntry[] = [];

function load(chatId: string): OutboxEntry[] {
    const hit = cache.get(chatId);
    if (hit) return hit;
    let entries: OutboxEntry[] = EMPTY;
    try {
        const raw = sessionStorage.getItem(key(chatId));
        if (raw) {
            entries = (JSON.parse(raw) as OutboxEntry[]).map((e) =>
                e.status === "sending" && !inFlight.has(e.id) ? { ...e, status: "failed" as const } : e
            );
        }
    } catch {
        entries = EMPTY;
    }
    cache.set(chatId, entries);
    return entries;
}

function write(chatId: string, entries: OutboxEntry[]) {
    cache.set(chatId, entries);
    try {
        if (entries.length) sessionStorage.setItem(key(chatId), JSON.stringify(entries));
        else sessionStorage.removeItem(key(chatId));
    } catch {
        /* quota or private mode: kept in memory for this tab */
    }
    listeners.forEach((l) => l());
}

export const chatOutbox = {
    get: load,
    put(chatId: string, entry: OutboxEntry) {
        if (entry.status === "sending") inFlight.add(entry.id);
        else inFlight.delete(entry.id);
        write(chatId, [...load(chatId).filter((e) => e.id !== entry.id), entry]);
    },
    remove(chatId: string, id: string) {
        inFlight.delete(id);
        const entries = load(chatId);
        if (entries.some((e) => e.id === id)) write(chatId, entries.filter((e) => e.id !== id));
    },
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    /** Tests only */
    reset() {
        cache.clear();
        inFlight.clear();
    },
};

export function useChatOutbox(chatId: string): OutboxEntry[] {
    return useSyncExternalStore(chatOutbox.subscribe, () => chatOutbox.get(chatId), () => EMPTY);
}
