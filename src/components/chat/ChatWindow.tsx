import { useRef, useEffect } from "react";
import { Send, Check, CheckCheck, ChevronLeft, Trash2, Users2 } from "lucide-react";
import { Message } from "@/types/chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatWindowProps {
    messages: Message[];
    currentUserId: string;
    onSendMessage: (text: string) => void;
    isLoading?: boolean;
    participantName: string;
    isGroup?: boolean;
    onBack?: () => void;
    onDelete?: () => void;
}

function DateSeparator({ date }: { date: Date }) {
    return (
        <div className="flex justify-center my-2">
            <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                {format(date, "dd/MM")}
            </span>
        </div>
    );
}

export default function ChatWindow({
    messages,
    currentUserId,
    onSendMessage,
    isLoading,
    participantName,
    isGroup,
    onBack,
    onDelete,
}: ChatWindowProps) {
    const { t } = useLanguage();
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const message = formData.get("message") as string;
        if (message.trim()) {
            onSendMessage(message);
            (e.target as HTMLFormElement).reset();
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-background overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-2 py-2 border-b bg-background shrink-0">
                {/* Back arrow — mobile only */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="md:hidden p-1.5 rounded-full hover:bg-accent transition-colors shrink-0"
                        aria-label="Voltar"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}

                <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-sm font-semibold">
                        {isGroup ? <Users2 className="h-4 w-4" /> : participantName[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                <span className="flex-1 font-semibold text-sm truncate">{participantName}</span>

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-full hover:bg-accent transition-colors text-destructive shrink-0"
                        aria-label="Apagar conversa"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-4 scroll-smooth">
                <div className="flex flex-col min-h-0">
                    {messages.length === 0 && (
                        <div className="flex items-center justify-center text-muted-foreground text-sm py-8">
                            {t.chatComponent.noMessages}
                        </div>
                    )}

                    {messages.map((msg, i) => {
                        const isMe = msg.senderId === currentUserId;
                        const msgDate = msg.createdAt?.seconds
                            ? new Date(msg.createdAt.seconds * 1000)
                            : null;
                        const prevMsg = messages[i - 1];
                        const prevDate = prevMsg?.createdAt?.seconds
                            ? new Date(prevMsg.createdAt.seconds * 1000)
                            : null;
                        const showDateSep = msgDate && (!prevDate || !isSameDay(msgDate, prevDate));

                        return (
                            <div key={msg.id}>
                                {showDateSep && <DateSeparator date={msgDate} />}
                                <div
                                    className={cn(
                                        "flex flex-col max-w-[75%] mb-1",
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
                                            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                            isMe
                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                : "bg-muted text-foreground rounded-bl-sm"
                                        )}
                                    >
                                        {msg.text}
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-0.5 mt-0.5 px-1",
                                        isMe ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <span className="text-[10px] text-muted-foreground">
                                            {msgDate ? format(msgDate, "HH:mm") : "..."}
                                        </span>
                                        {isMe && (
                                            msg.read
                                                ? <CheckCheck className="h-3 w-3 text-primary" />
                                                : <Check className="h-3 w-3 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t bg-background flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-muted rounded-full px-4 py-1">
                    <input
                        name="message"
                        placeholder={t.chatComponent.placeholder ?? "Enviar uma mensagem"}
                        disabled={isLoading}
                        autoComplete="off"
                        className="flex-1 bg-transparent text-[16px] outline-none py-2 text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="shrink-0 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                        aria-label="Send"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
