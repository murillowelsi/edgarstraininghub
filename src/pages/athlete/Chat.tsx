import { useEffect, useState, useMemo } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatService } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Chat, Message } from "@/types/chat";
import { Loader2, Plus, Search, MessageSquare, ChevronLeft } from "lucide-react";
import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { toast } from "sonner";
import { NotificationService } from "@/services/notifications";
import { NotificationBanner } from "@/components/NotificationBanner";
import { getUsersByRole } from "@/services/usersService";
import { User } from "@/types/user";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

    // Admin lookup map for names
    const adminMap = useMemo(() => {
        const map: Record<string, string> = {};
        admins.forEach(a => map[a.id] = a.displayName);
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
        // Find the participant that is NOT the current user
        const otherId = chat.participantIds.find(id => id !== user?.uid);
        if (otherId && adminMap[otherId]) {
            return adminMap[otherId];
        }
        return t.athlete.chat.coachFallback; // Fallback
    };

    const filteredAdmins = admins.filter(a =>
        a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <AthletePortalLayout title="Chat">
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AthletePortalLayout>
        );
    }

    return (
        <AthletePortalLayout title="Chat" showHeader={true}>
            <NotificationBanner />
            <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] bg-card rounded-lg border overflow-hidden shadow-sm">

                {/* Chat List Sidebar */}
                <div className={cn(
                    "w-full md:w-80 border-r flex flex-col bg-background",
                    selectedChat ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold">{t.athlete.chat.title}</h3>
                        <Button size="icon" variant="ghost" className="hidden sm:flex h-8 w-8" onClick={() => setIsNewChatOpen(true)}>
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
                                                <Avatar>
                                                    <AvatarFallback>{admin.displayName[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
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
                                            "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-b",
                                            selectedChat?.id === chat.id && "bg-muted"
                                        )}
                                    >
                                        <Avatar>
                                            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={cn("font-medium", unreadCount > 0 && "font-bold")}>
                                                    {displayName}
                                                </span>
                                                {chat.lastMessageTime && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {formatDistanceToNow(new Date(chat.lastMessageTime.seconds * 1000), { addSuffix: true })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={cn(
                                                    "text-sm truncate max-w-[160px]",
                                                    unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                                                )}>
                                                    {chat.lastMessage || "No messages"}
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
                            })
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={cn(
                    "flex-1 flex flex-col bg-muted/5",
                    !selectedChat ? "hidden md:flex" : "flex"
                )}>
                    {selectedChat ? (
                        <>
                            {/* Mobile Header to go back */}
                            <div className="md:hidden p-3 border-b flex items-center gap-3 bg-background sticky top-0 z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 -ml-1"
                                    onClick={() => setSelectedChat(null)}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{getChatDisplayName(selectedChat)[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm">{getChatDisplayName(selectedChat)}</span>
                            </div>

                            <ChatWindow
                                messages={messages}
                                currentUserId={user?.uid || ""}
                                onSendMessage={handleSendMessage}
                                participantName={getChatDisplayName(selectedChat)}
                            />
                        </>
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
