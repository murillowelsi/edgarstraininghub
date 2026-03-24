import { useRef, useEffect } from "react";
import { Send, Users2 } from "lucide-react";
import { Message } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatWindowProps {
    messages: Message[];
    currentUserId: string;
    onSendMessage: (text: string) => void;
    isLoading?: boolean;
    participantName: string;
    isGroup?: boolean;
}

export default function ChatWindow({
    messages,
    currentUserId,
    onSendMessage,
    isLoading,
    participantName,
    isGroup,
}: ChatWindowProps) {
    const { t } = useLanguage();
    const scrollRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
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
        <div className="flex flex-col h-full bg-background overflow-hidden relative">
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
                <h3 className="font-semibold flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>
                            {isGroup ? <Users2 className="h-4 w-4" /> : participantName[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {participantName}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                <div className="flex flex-col gap-4 min-h-0">
                    {messages.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-8">
                            {t.chatComponent.noMessages}
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex flex-col max-w-[85%]",
                                    isMe ? "self-end items-end" : "self-start items-start"
                                )}
                            >
                                {isGroup && !isMe && msg.senderName && (
                                    <span className="text-[11px] font-medium text-muted-foreground mb-0.5 px-1">
                                        {msg.senderName}
                                    </span>
                                )}
                                <div
                                    className={cn(
                                        "px-4 py-2 rounded-2xl text-sm",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-muted rounded-bl-none"
                                    )}
                                >
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                    {msg.createdAt?.seconds
                                        ? format(new Date(msg.createdAt.seconds * 1000), "p")
                                        : "Sending..."}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </div>

            <div className="p-3 border-t bg-background flex-shrink-0">
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="flex gap-2"
                >
                    <Input
                        name="message"
                        placeholder="Type a message..."
                        disabled={isLoading}
                        autoComplete="off"
                        className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
