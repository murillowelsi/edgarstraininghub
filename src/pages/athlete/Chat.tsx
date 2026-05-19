import { useEffect, useState, useMemo } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatService } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Chat, Message } from "@/types/chat";
import { Plus, Search, MessageSquare, Users2 } from "lucide-react";
import { SectionSpinner } from "@/components/ui/spinner";
import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { toast } from "sonner";
import { NotificationService } from "@/services/notifications";
import { NotificationBanner } from "@/components/NotificationBanner";
import { getUsersByRole } from "@/services/usersService";
import { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { CachedAvatar } from "@/components/ui/cached-avatar";

import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

const formatChatTime = (timestamp: { seconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM/yy");
};

export default function AthleteChat() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    // Admin selection state
    const [admins, setAdmins] = useState<User[]>([]);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingAdmins, setLoadingAdmins] = useState(false);

    // Admin lookup map
    const adminMap = useMemo(() => {
        const map: Record<string, { name: string; photoURL?: string }> = {};
        admins.forEach(a => { map[a.id] = { name: a.displayName, photoURL: a.photoURL }; });
        return map;
    }, [admins]);

    // Load admins
    useEffect(() => {
        const loadAdmins = async () => {
            try {
                // Fetch both admins and editors as potential chat recipients
                const [adminUsers, editorUsers] = await Promise.all([
                    getUsersByRole("admin"),
                    getUsersByRole("editor")
                ]);
                // Deduplicate by ID just in case
                const uniqueUsers = [...adminUsers, ...editorUsers].filter(
                    (v, i, a) => a.findIndex(t => t.id === v.id) === i
                );
                setAdmins(uniqueUsers);
            } catch (error) {
                console.error("Error loading admins:", error);
            }
        };
        loadAdmins();
    }, []);


    // Subscribe to athlete's chats
    useEffect(() => {
        if (!user) return;

        const unsubscribe = ChatService.subscribeToAthleteChats(user.uid, (updatedChats) => {
            // Filter out legacy chats or chats with placeholder IDs
            const validChats = updatedChats.filter(c =>
                !c.participantIds.includes("ADMIN_ID_PLACEHOLDER")
            );

            setChats(validChats);
            setLoading(false);

            // If the currently selected chat is updated, update it
            if (selectedChat) {
                const updated = validChats.find(c => c.id === selectedChat.id);
                if (updated) setSelectedChat(updated);
            }
        });

        return () => unsubscribe();
    }, [user, selectedChat?.id]);

    // Subscribe to messages when a chat is selected
    useEffect(() => {
        if (!selectedChat || !user) return;

        ChatService.markAsRead(selectedChat.id, user.uid);
        // -1 = first load (don't notify for existing messages, only for new ones)
        let previousCount = -1;

        const unsubscribe = ChatService.subscribeToMessages(selectedChat.id, (msgs) => {
            // Notify only on genuinely new messages (not the initial load)
            if (previousCount >= 0 && msgs.length > previousCount) {
                const newest = msgs[msgs.length - 1];
                if (newest && newest.senderId !== user.uid) {
                    const senderName = getChatDisplayName(selectedChat);
                    NotificationService.showChatNotification(
                        senderName,
                        newest.text,
                        '/athlete/chat'
                    );
                }
            }
            previousCount = msgs.length;
            setMessages(msgs);
            if (msgs.length > 0) {
                ChatService.markAsRead(selectedChat.id, user.uid).catch(console.error);
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat?.id, user]);

    const handleStartChat = async (admin: User) => {
        if (!user) return;
        try {
            const chatObj = await ChatService.createOrGetChat(
                user.uid,
                user.displayName || "Athlete",
                admin.id
            );
            setSelectedChat(chatObj);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error("Error starting chat:", error);
            toast.error("Failed to start chat. Please try again.");
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!selectedChat || !user) {
            toast.error("Unable to send message.");
            return;
        }

        try {
            await ChatService.sendMessage(selectedChat.id, user.uid, text, user.displayName || user.email || "Athlete");
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message.");
        }
    };

    const getChatDisplayName = (chat: Chat) => {
        if (chat.isGroup) return chat.groupName || "Team";
        const otherId = chat.participantIds.find(id => id !== user?.uid);
        if (otherId && adminMap[otherId]) {
            return adminMap[otherId].name;
        }
        return t.athlete.chat.coachFallback;
    };

    const getChatPhotoURL = (chat: Chat): string | undefined => {
        if (chat.isGroup) return undefined;
        const otherId = chat.participantIds.find(id => id !== user?.uid);
        if (otherId && adminMap[otherId]) {
            return adminMap[otherId].photoURL;
        }
        return undefined;
    };

    const filteredAdmins = admins.filter(a =>
        a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <AthletePortalLayout title="Chat">
                <SectionSpinner />
            </AthletePortalLayout>
        );
    }

    return (
        <AthletePortalLayout title="Chat" showHeader={true} fullHeight={true} hideBottomNav={!!selectedChat}>
            <NotificationBanner />
            <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-card md:rounded-lg md:border overflow-hidden md:shadow-sm">

                {/* Chat List Sidebar */}
                <div className={cn(
                    "w-full md:w-80 border-r flex flex-col bg-background",
                    selectedChat ? "hidden md:flex" : "flex"
                )}>
                    <div className="hidden sm:flex p-4 border-b items-center justify-end bg-muted/30">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsNewChatOpen(true)}>
                            <Plus className="h-5 w-5" />
                        </Button>
                        <ResponsiveModal open={isNewChatOpen} onOpenChange={setIsNewChatOpen} title={t.athlete.chat.newMessage}>
                            <div className="p-2 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t.athlete.chat.searchCoaches}
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="h-[300px] overflow-y-auto space-y-2">
                                    {filteredAdmins.length === 0 ? (
                                        <p className="text-center text-muted-foreground p-4">{t.athlete.chat.noCoachesFound}</p>
                                    ) : (
                                        filteredAdmins.map((admin) => (
                                            <button
                                                key={admin.id}
                                                onClick={() => handleStartChat(admin)}
                                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                            >
                                                <CachedAvatar
                                                    src={admin.photoURL}
                                                    alt={admin.displayName}
                                                    fallback={admin.displayName[0]?.toUpperCase()}
                                                />
                                                <div>
                                                    <p className="font-medium">{admin.displayName}</p>
                                                    <p className="text-xs text-muted-foreground">{admin.role}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </ResponsiveModal>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {chats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
                                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">{t.athlete.chat.noConversations}</p>
                                <Button
                                    variant="link"
                                    className="mt-2"
                                    onClick={() => setIsNewChatOpen(true)}
                                >
                                    {t.athlete.chat.startChat}
                                </Button>
                            </div>
                        ) : (
                            chats.map(chat => {
                                const displayName = getChatDisplayName(chat);
                                const unreadCount = user ? (chat.unreadCount?.[user.uid] || 0) : 0;

                                return (
                                    <button
                                        key={chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                                            selectedChat?.id === chat.id && "bg-muted/60"
                                        )}
                                    >
                                        <CachedAvatar
                                            src={!chat.isGroup ? getChatPhotoURL(chat) : undefined}
                                            alt={displayName}
                                            fallback={chat.isGroup ? <Users2 className="h-5 w-5" /> : displayName[0]?.toUpperCase()}
                                            className="h-12 w-12 shrink-0 ring-2 ring-[#e1b506]"
                                            fallbackClassName="text-base font-semibold"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline gap-2">
                                                <span className={cn("font-semibold truncate", unreadCount > 0 && "text-foreground")}>
                                                    {displayName}
                                                </span>
                                                {chat.lastMessageTime && (
                                                    <span className={cn("text-xs shrink-0", unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground")}>
                                                        {formatChatTime(chat.lastMessageTime)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center gap-2 mt-0.5">
                                                <p className={cn(
                                                    "text-sm truncate",
                                                    unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                                )}>
                                                    {chat.lastMessage || "No messages"}
                                                </p>
                                                {unreadCount > 0 && (
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                                        {unreadCount > 9 ? "9+" : unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={cn(
                    "flex-1 flex flex-col min-h-0 bg-muted/5",
                    !selectedChat ? "hidden md:flex" : "flex"
                )}>
                    {selectedChat ? (
                        <ChatWindow
                            messages={messages}
                            currentUserId={user?.uid || ""}
                            onSendMessage={handleSendMessage}
                            participantName={getChatDisplayName(selectedChat)}
                            participantPhotoURL={getChatPhotoURL(selectedChat)}
                            isGroup={selectedChat.isGroup}
                            onBack={() => setSelectedChat(null)}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm">{t.athlete.chat.selectConversationDescription}</p>
                        </div>
                    )}
                </div>
            </div>
        {/* Mobile FAB — only shown on chat list view */}
        {!selectedChat && (
            <button
                onClick={() => setIsNewChatOpen(true)}
                className="fixed right-4 z-30 sm:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
                aria-label={t.athlete.chat.newMessage}
            >
                <Plus className="h-6 w-6" />
            </button>
        )}
        </AthletePortalLayout>
    );
}
