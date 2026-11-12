import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, CheckCheck, ChevronLeft, MoreVertical, Trash2, Users2 } from "lucide-react";
import { Message } from "@/types/chat";
import { CachedAvatar } from "@/components/ui/cached-avatar";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { cn } from "@/lib/utils";
import { isSameDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { formatChatDay } from "./chatDates";
import { formatDate } from "@/lib/dates";
import { isNearBottom, newMessagesSince } from "./chatScroll";

interface ChatWindowProps {
    messages: Message[];
    currentUserId: string;
    /** Resolves when the message is saved; rejects on failure (the draft stays in the field) */
    onSendMessage: (text: string) => Promise<void>;
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
    messages,
    currentUserId,
    onSendMessage,
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
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [sendFailed, setSendFailed] = useState(false);

    // ---- Scroll: follow the end only when the reader is already there ----
    const atBottomRef = useRef(true);
    const lastSeenIdRef = useRef<string | null>(null);
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
        if (messages.length === 0) return;
        const firstLoad = lastSeenIdRef.current === null;
        const fresh = newMessagesSince(messages, lastSeenIdRef.current);
        lastSeenIdRef.current = messages[messages.length - 1].id;
        if (firstLoad) return scrollToEnd(false);
        if (fresh.length === 0) return;
        const mine = fresh.some((m) => m.senderId === currentUserId);
        if (mine || atBottomRef.current) scrollToEnd(true);
        else setUnseen((n) => n + fresh.length);
    }, [messages, currentUserId, scrollToEnd]);

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

    const canSend = draft.trim().length > 0 && !sending;

    const send = async () => {
        if (!canSend) return;
        const text = draft;
        setSending(true);
        setSendFailed(false);
        try {
            await onSendMessage(text);
            // Only now the text leaves the field; keep anything typed meanwhile
            setDraft((current) => (current === text ? "" : current.startsWith(text) ? current.slice(text.length).trimStart() : current));
        } catch {
            setSendFailed(true);
        } finally {
            setSending(false);
            fieldRef.current?.focus();
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Phones: Enter is a new line, sending is the button. Desktop: Enter sends, Shift+Enter breaks.
        if (e.key !== "Enter" || e.shiftKey || isMobile || e.nativeEvent.isComposing) return;
        e.preventDefault();
        void send();
    };

    const menuItems: ActionMenuItem[] = onDelete
        ? [{ icon: Trash2, label: tc.deleteConversation, onClick: onDelete, destructive: true }]
        : [];

    const lastMineIndex = messages.reduce((acc, m, i) => (m.senderId === currentUserId ? i : acc), -1);

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
                        {messages.length === 0 && (
                            <div className="flex items-center justify-center text-muted-foreground text-sm py-8">
                                {tc.noMessages}
                            </div>
                        )}

                        {messages.map((msg, i) => {
                            const isMe = msg.senderId === currentUserId;
                            const msgDate = msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000) : null;
                            const prevMsg = messages[i - 1];
                            const prevDate = prevMsg?.createdAt?.seconds ? new Date(prevMsg.createdAt.seconds * 1000) : null;
                            const showDateSep = msgDate && (!prevDate || !isSameDay(msgDate, prevDate));

                            return (
                                <div key={msg.id}>
                                    {showDateSep && <DateSeparator date={msgDate} />}
                                    <div
                                        className={cn(
                                            "flex flex-col max-w-[78%] mb-1",
                                            isMe ? "self-end items-end ml-auto" : "self-start items-start"
                                        )}
                                    >
                                        {isGroup && !isMe && msg.senderName && (
                                            <span className="text-[11px] font-medium text-muted-foreground mb-0.5 px-2">
                                                {msg.senderName}
                                            </span>
                                        )}
                                        <div
                                            className={cn(
                                                "px-3.5 py-2 rounded-2xl text-[15px] leading-[1.4] whitespace-pre-wrap break-words",
                                                isMe
                                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                                    : "bg-card border text-foreground rounded-bl-sm"
                                            )}
                                        >
                                            {msg.text}
                                        </div>
                                        <div className={cn("flex items-center gap-0.5 mt-0.5 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                                            <span className="text-[11px] text-muted-foreground">
                                                {msgDate ? formatDate(msgDate, "time", language) : tc.sending}
                                            </span>
                                            {isMe && i === lastMineIndex && (
                                                msg.read
                                                    ? <CheckCheck className="h-3.5 w-3.5 text-primary-ink" aria-hidden />
                                                    : <Check className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                {sendFailed && (
                    <p role="alert" className="px-2 pb-1.5 text-caption text-destructive-ink">
                        {tc.sendFailed}
                    </p>
                )}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                    }}
                    className="flex items-end gap-2"
                >
                    <textarea
                        ref={fieldRef}
                        name="message"
                        rows={1}
                        value={draft}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            if (sendFailed) setSendFailed(false);
                        }}
                        onKeyDown={onKeyDown}
                        readOnly={sending}
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
                        aria-label={sending ? tc.sending : t.athlete.chat.send}
                        className={cn(
                            "shrink-0 h-11 w-11 flex items-center justify-center rounded-full transition-colors",
                            canSend ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground",
                            sending && "motion-safe:animate-pulse"
                        )}
                    >
                        <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
                    </button>
                </form>
            </div>
        </div>
    );
}
