import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCheck, ChevronLeft, MoreVertical, Trash2, Users2 } from "lucide-react";
import { Message } from "@/types/chat";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { formatChatDay } from "./chatDates";
import { formatDate } from "@/lib/dates";
import { isNearBottom, unseenItems } from "./chatScroll";
import { groupChatRows, newMessageId, type ChatItem } from "./chatGroups";
import { chatOutbox, useChatOutbox } from "./chatOutbox";

export interface SenderInfo {
    photoURL?: string;
    /** Coach names stand out in group chats */
    isCoach?: boolean;
}

interface ChatWindowProps {
    /** Keys the per-conversation draft */
    chatId: string;
    messages: Message[];
    currentUserId: string;
    /** Saves the message under `messageId` (the same id on a retry); rejects on failure */
    onSendMessage: (text: string, messageId: string) => Promise<void>;
    /** Avatar and role of a group member */
    senderInfo?: (senderId: string) => SenderInfo | undefined;
    participantName: string;
    participantPhotoURL?: string;
    /** Line under the name: "Your coach", "Athlete", "4 people" */
    subtitle?: string;
    isGroup?: boolean;
    onBack?: () => void;
    onDelete?: () => void;
}

/** The field grows up to 5 lines, then scrolls inside */
const MAX_FIELD_LINES = 5;

const draftKey = (chatId: string) => `ez-chat-draft-v1:${chatId}`;
const readDraft = (chatId: string) => {
    try {
        return sessionStorage.getItem(draftKey(chatId)) ?? "";
    } catch {
        return "";
    }
};
const saveDraft = (chatId: string, text: string) => {
    try {
        if (text) sessionStorage.setItem(draftKey(chatId), text);
        else sessionStorage.removeItem(draftKey(chatId));
    } catch {
        /* private mode: the draft just isn't kept */
    }
};

function DateSeparator({ date }: { date: Date }) {
    const { t, language } = useLanguage();
    return (
        <div className="flex justify-center my-2">
            <span className="px-3 py-1 rounded-full bg-surface-2 text-muted-foreground text-[11px] font-semibold">
                {formatChatDay(date, language, { today: t.common.today, yesterday: t.timeline.activity.yesterday })}
            </span>
        </div>
    );
}

/**
 * One conversation. On phones it is a full-screen layer (fixed, as tall as the
 * visible area, so the field sits right above the keyboard) with its own header;
 * from md up it fills the panel next to the list.
 */
export default function ChatWindow({
    chatId,
    messages,
    currentUserId,
    onSendMessage,
    senderInfo,
    participantName,
    participantPhotoURL,
    subtitle,
    isGroup,
    onBack,
    onDelete,
}: ChatWindowProps) {
    const { t, language } = useLanguage();
    const tc = t.chatComponent;
    const isMobile = useIsMobile();
    const { keyboardOpen } = useVisualViewport(isMobile);

    const listRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLTextAreaElement>(null);
    const [draft, setDraftState] = useState(() => readDraft(chatId));
    const setDraft = useCallback((text: string) => {
        setDraftState(text);
        saveDraft(chatId, text);
    }, [chatId]);
    const outbox = useChatOutbox(chatId);

    // Server messages + local ones not saved yet, each with its delivery status
    const items: ChatItem[] = useMemo(() => {
        const local = new Map(outbox.map((o) => [o.id, o]));
        const list: ChatItem[] = messages.map((m) => ({
            id: m.id,
            text: m.text,
            senderId: m.senderId,
            senderName: m.senderName,
            at: m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : null,
            read: m.read,
            status: local.get(m.id)?.status ?? (m.createdAt ? "sent" : "sending"),
        }));
        const onServer = new Set(messages.map((m) => m.id));
        for (const o of outbox) {
            if (!onServer.has(o.id)) list.push({ id: o.id, text: o.text, senderId: currentUserId, at: null, read: false, status: o.status });
        }
        return list;
    }, [messages, outbox, currentUserId]);
    const rows = useMemo(() => groupChatRows(items, currentUserId), [items, currentUserId]);

    // ---- Scroll: follow the end only when the reader is already there ----
    const atBottomRef = useRef(true);
    const seenRef = useRef<Set<string> | null>(null);
    const [unseen, setUnseen] = useState(0);

    const scrollToEnd = useCallback((smooth: boolean) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
        atBottomRef.current = true;
        setUnseen(0);
    }, []);

    const onScroll = () => {
        const el = listRef.current;
        if (!el) return;
        atBottomRef.current = isNearBottom(el);
        if (atBottomRef.current) setUnseen(0);
    };

    useLayoutEffect(() => {
        // Wait for the server history before the first jump to the end
        if (messages.length === 0) return;
        const seen = seenRef.current;
        const firstLoad = seen === null;
        const fresh = firstLoad ? [] : unseenItems(items, seen);
        seenRef.current = new Set(items.map((m) => m.id));
        if (firstLoad) return scrollToEnd(false);
        if (fresh.length === 0) return;
        const mine = fresh.some((m) => m.senderId === currentUserId);
        if (mine || atBottomRef.current) scrollToEnd(true);
        else setUnseen((n) => n + fresh.length);
    }, [items, messages.length, currentUserId, scrollToEnd]);

    // Keyboard opening or the field growing shrinks the list: keep the last message in view
    useEffect(() => {
        const el = listRef.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        let lastHeight = el.clientHeight;
        const ro = new ResizeObserver(() => {
            if (el.clientHeight !== lastHeight && atBottomRef.current) el.scrollTop = el.scrollHeight;
            lastHeight = el.clientHeight;
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ---- Field: textarea that grows to 5 lines ----
    useLayoutEffect(() => {
        const ta = fieldRef.current;
        if (!ta) return;
        const style = getComputedStyle(ta);
        const line = parseFloat(style.lineHeight) || 22;
        const pad = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        const max = line * MAX_FIELD_LINES + pad + border;
        ta.style.height = "auto";
        const next = Math.min(ta.scrollHeight + border, max);
        ta.style.height = `${next}px`;
        ta.style.overflowY = ta.scrollHeight + border > max ? "auto" : "hidden";
    }, [draft]);

    const canSend = draft.trim().length > 0;

    // The text moves from the field to a "Sending…" bubble at once; it is never lost:
    // on failure the bubble stays with "Not sent · Try again" (same id, so no duplicates)
    const deliver = useCallback(async (id: string, text: string) => {
        chatOutbox.put(chatId, { id, text, status: "sending" });
        try {
            await onSendMessage(text, id);
            chatOutbox.remove(chatId, id);
        } catch {
            chatOutbox.put(chatId, { id, text, status: "failed" });
        }
    }, [chatId, onSendMessage]);

    const send = () => {
        if (!canSend) return;
        const text = draft.trim();
        setDraft("");
        fieldRef.current?.focus();
        void deliver(newMessageId(), text);
    };

    const retry = (item: ChatItem) => void deliver(item.id, item.text);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Phones: Enter is a new line, sending is the button. Desktop: Enter sends, Shift+Enter breaks.
        if (e.key !== "Enter" || e.shiftKey || isMobile || e.nativeEvent.isComposing) return;
        e.preventDefault();
        send();
    };

    const menuItems: ActionMenuItem[] = onDelete
        ? [{ icon: Trash2, label: tc.deleteConversation, onClick: onDelete, destructive: true }]
        : [];

    // "Read" shows once, under my latest message
    const lastMineId = [...items].reverse().find((m) => m.senderId === currentUserId && m.status === "sent")?.id;

    return (
        <div
            className={cn(
                "flex flex-col bg-background overflow-hidden",
                // Phone: full-screen layer over the app chrome, sized to the visible area
                "max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-50 max-md:h-[var(--app-vh,100dvh)] max-md:translate-y-[var(--app-vv-top,0px)]",
                "md:flex-1 md:min-h-0"
            )}
        >
            {/* Header: back, who, ⋮ */}
            <div className="shrink-0 border-b bg-background max-md:pt-[env(safe-area-inset-top)]">
                <div className="flex h-[52px] items-center gap-1 px-1 md:px-2">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="md:hidden h-11 w-11 flex items-center justify-center rounded-full hover:bg-accent transition-colors shrink-0"
                            aria-label={t.athlete.chat.back}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}

                    <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
                        <CachedAvatar
                            src={!isGroup ? participantPhotoURL : undefined}
                            alt={participantName}
                            fallback={isGroup ? <Users2 className="h-4 w-4" /> : participantName[0]?.toUpperCase()}
                            className="h-9 w-9 shrink-0"
                            fallbackClassName="bg-surface-2 text-sm font-semibold"
                        />
                        <div className="min-w-0">
                            <p className="truncate text-title-sm">{participantName}</p>
                            {subtitle && <p className="truncate text-caption text-muted-foreground">{subtitle}</p>}
                        </div>
                    </div>

                    {menuItems.length > 0 && (
                        <ActionMenu title={participantName} items={menuItems}>
                            <button
                                type="button"
                                className="h-11 w-11 flex items-center justify-center rounded-full hover:bg-accent transition-colors shrink-0"
                                aria-label={tc.moreActions}
                            >
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </ActionMenu>
                    )}
                </div>
            </div>

            {/* Messages: the only part that scrolls */}
            <div className="relative flex-1 min-h-0">
                <div
                    ref={listRef}
                    onScroll={onScroll}
                    className="h-full overflow-y-auto overscroll-contain px-3 py-4"
                    data-testid="chat-messages"
                >
                    <div className="flex flex-col">
                        {items.length === 0 && (
                            <div className="flex items-center justify-center text-muted-foreground text-sm py-8">
                                {tc.noMessages}
                            </div>
                        )}

                        {rows.map((row) =>
                            row.kind === "day" ? (
                                <DateSeparator key={row.key} date={row.date} />
                            ) : (
                                <MessageBlock
                                    key={row.key}
                                    mine={row.mine}
                                    items={row.items}
                                    senderName={isGroup && !row.mine ? row.senderName : undefined}
                                    sender={isGroup && !row.mine ? senderInfo?.(row.senderId) : undefined}
                                    showAvatar={!!isGroup && !row.mine}
                                    lastMineId={lastMineId}
                                    onRetry={retry}
                                />
                            )
                        )}
                    </div>
                </div>

                {/* "N new ↓" while reading older messages */}
                {unseen > 0 && (
                    <button
                        type="button"
                        onClick={() => scrollToEnd(true)}
                        aria-label={tc.jumpToLatest}
                        className="absolute bottom-2 right-3 flex h-9 items-center gap-1.5 rounded-full border bg-surface-2 px-3 text-[13px] font-semibold shadow-lg"
                    >
                        <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
                        {unseen === 1 ? tc.newOne : tc.newOther.replace("{{n}}", String(unseen))}
                        <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                )}
            </div>

            {/* Field */}
            <div
                className={cn(
                    "shrink-0 border-t bg-background px-2 pt-2 md:px-3 md:pb-3",
                    // Home-indicator gap only while the keyboard is closed
                    keyboardOpen ? "pb-2" : "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                )}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send();
                    }}
                    className="flex items-end gap-2"
                >
                    <textarea
                        ref={fieldRef}
                        name="message"
                        rows={1}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={tc.messageTo.replace("{{name}}", participantName)}
                        aria-label={tc.messageTo.replace("{{name}}", participantName)}
                        enterKeyHint={isMobile ? "enter" : "send"}
                        autoComplete="off"
                        className="min-h-11 flex-1 resize-none rounded-[22px] border border-input bg-card px-4 py-[10px] text-[16px] leading-[1.35] text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    />
                    <button
                        type="submit"
                        disabled={!canSend}
                        // Keep focus (and the keyboard) on the field when tapping send
                        onMouseDown={(e) => e.preventDefault()}
                        aria-label={t.athlete.chat.send}
                        className={cn(
                            "shrink-0 h-11 w-11 flex items-center justify-center rounded-full transition-colors",
                            canSend ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
                        )}
                    >
                        <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
                    </button>
                </form>
            </div>
        </div>
    );
}

interface MessageBlockProps {
    mine: boolean;
    items: ChatItem[];
    /** Group chats: name above the first bubble, avatar beside the last */
    senderName?: string;
    sender?: SenderInfo;
    showAvatar: boolean;
    lastMineId?: string;
    onRetry: (item: ChatItem) => void;
}

/** Consecutive messages from one person: one time, the "tail" only on the last bubble */
function MessageBlock({ mine, items, senderName, sender, showAvatar, lastMineId, onRetry }: MessageBlockProps) {
    const { t, language } = useLanguage();
    const tc = t.chatComponent;
    const last = items[items.length - 1];
    const sent = items.filter((i) => i.status === "sent");
    const lastSent = sent[sent.length - 1];
    const showRead = mine && lastSent && lastSent.id === lastMineId;

    return (
        <div className={cn("mt-2 flex items-end gap-2", mine && "justify-end")}>
            {showAvatar && (
                <CachedAvatar
                    src={sender?.photoURL}
                    alt={senderName ?? ""}
                    fallback={senderName?.[0]?.toUpperCase()}
                    className="mb-5 h-6 w-6 shrink-0"
                    fallbackClassName={cn("text-[11px] font-bold", sender?.isCoach ? "bg-primary text-primary-foreground" : "bg-surface-2")}
                />
            )}
            <div className={cn("flex max-w-[78%] min-w-0 flex-col gap-0.5", mine ? "items-end" : "items-start")}>
                {senderName && (
                    <span className={cn("px-3 text-xs font-semibold", sender?.isCoach ? "text-primary-ink" : "text-muted-foreground")}>
                        {senderName}
                    </span>
                )}
                {items.map((item, i) => {
                    const first = i === 0;
                    const isLast = i === items.length - 1;
                    return (
                        <div key={item.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                            <div
                                className={cn(
                                    "rounded-[18px] px-3.5 py-2 text-[15px] leading-[1.4] whitespace-pre-wrap break-words",
                                    mine
                                        ? cn("bg-primary text-primary-foreground rounded-r-md", first && "rounded-tr-[18px]", isLast && "rounded-br-[4px]")
                                        : cn("bg-card border text-foreground rounded-l-md", first && "rounded-tl-[18px]", isLast && "rounded-bl-[4px]"),
                                    item.status !== "sent" && "opacity-60",
                                    item.status === "failed" && "border border-dashed border-destructive-ink"
                                )}
                            >
                                {item.text}
                            </div>
                            {item.status === "sending" && item !== last && (
                                <span className="px-1.5 text-[11px] text-muted-foreground">{tc.sending}</span>
                            )}
                            {item.status === "failed" && (
                                <span role="alert" className="flex items-center gap-1 px-1.5 text-xs text-destructive-ink">
                                    {tc.notSent} ·
                                    <button type="button" onClick={() => onRetry(item)} className="min-h-6 font-semibold text-foreground underline-offset-2 hover:underline">
                                        {tc.retry}
                                    </button>
                                </span>
                            )}
                        </div>
                    );
                })}
                {last.status !== "failed" && (
                    <span className="flex items-center gap-1 px-1.5 text-[11px] text-muted-foreground">
                        {last.status === "sending" || !last.at ? tc.sending : formatDate(last.at, "time", language)}
                        {showRead && (lastSent.read ? (
                            <>
                                {" · "}
                                <CheckCheck className="h-3.5 w-3.5 text-primary-ink" aria-hidden />
                                {tc.read}
                            </>
                        ) : (
                            <Check className="h-3.5 w-3.5" aria-label={tc.sent} />
                        ))}
                    </span>
                )}
            </div>
        </div>
    );
}
