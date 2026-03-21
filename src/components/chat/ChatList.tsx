import { Chat } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatListProps {
    chats: Chat[];
    selectedChatId: string | null;
    onSelectChat: (chat: Chat) => void;
    currentUserId: string;
}

export default function ChatList({
    chats,
    selectedChatId,
    onSelectChat,
    currentUserId
}: ChatListProps) {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col h-full bg-background border-r">

            <div className="flex-1 overflow-y-auto">
                {chats.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        {t.chatComponent.noChats}
                    </div>
                )}

                {chats.map((chat) => {
                    const unreadCount = chat.unreadCount?.[currentUserId] || 0;

                    return (
                        <button
                            key={chat.id}
                            onClick={() => onSelectChat(chat)}
                            className={cn(
                                "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-b",
                                selectedChatId === chat.id && "bg-muted"
                            )}
                        >
                            <Avatar>
                                <AvatarFallback>{chat.athleteName[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={cn("font-medium", unreadCount > 0 && "font-bold")}>
                                        {chat.athleteName}
                                    </span>
                                    {chat.lastMessageTime && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(chat.lastMessageTime.seconds * 1000), { addSuffix: true })}
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-between items-center">
                                    <p className={cn(
                                        "text-sm truncate max-w-[180px]",
                                        unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                    )}>
                                        {chat.lastMessage || t.chatComponent.noMessagesYet}
                                    </p>

                                    {unreadCount > 0 && (
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
