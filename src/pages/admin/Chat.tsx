import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatService } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Chat, Message } from "@/types/chat";
import { ChevronLeft, Loader2, MessageSquare, Plus, Search, Trash2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAllUsers } from "@/services/usersService";
import { getTeamsByCoach } from "@/services/teamsService";
import { User } from "@/types/user";
import { Team } from "@/types/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { ResponsiveConfirm } from "@/components/ui/responsive-confirm";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { NotificationService } from "@/services/notifications";
import { NotificationBanner } from "@/components/NotificationBanner";

export default function AdminChat() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    // New Chat Dialog
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [newChatTab, setNewChatTab] = useState<"direct" | "group">("direct");
    const [athletes, setAthletes] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingAthletes, setLoadingAthletes] = useState(false);

    // Teams for group chat
    const [teams, setTeams] = useState<Team[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [openingGroupChat, setOpeningGroupChat] = useState<string | null>(null);

    // Delete Chat
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // All users for name resolution
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
        getAllUsers().then(setAllUsers).catch(console.error);
    }, []);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = ChatService.subscribeToUserChats(user.uid, (updatedChats) => {
            setChats(updatedChats);
            setLoading(false);
            if (selectedChat) {
                const updated = updatedChats.find(c => c.id === selectedChat.id);
                if (updated) setSelectedChat(updated);
            }
        });
        return () => unsubscribe();
    }, [user, selectedChat?.id]);

    // Open specific chat when navigated here with state (e.g., from TeamDetail)
    useEffect(() => {
        const state = location.state as { openChatId?: string } | null;
        if (!state?.openChatId || chats.length === 0) return;
        const target = chats.find(c => c.id === state.openChatId);
        if (target) {
            setSelectedChat(target);
            // Clear state so refresh doesn't re-select
            window.history.replaceState({}, "");
        }
    }, [location.state, chats]);

    useEffect(() => {
        if (!selectedChat || !user) return;
        ChatService.markAsRead(selectedChat.id, user.uid);
        let previousCount = -1;
        const unsubscribe = ChatService.subscribeToMessages(selectedChat.id, (msgs) => {
            if (previousCount >= 0 && msgs.length > previousCount) {
                const newest = msgs[msgs.length - 1];
                if (newest && newest.senderId !== user.uid) {
                    NotificationService.showChatNotification(
                        getChatDisplayName(selectedChat),
                        newest.text,
                        '/admin/chat'
                    );
                }
            }
            previousCount = msgs.length;
            setMessages(msgs);
            if (msgs.length > 0) ChatService.markAsRead(selectedChat.id, user.uid).catch(console.error);
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChat?.id, user]);

    useEffect(() => {
        if (!isNewChatOpen) return;
        setNewChatTab("direct");
        setSearchQuery("");
        setLoadingAthletes(true);
        getAllUsers().then((users) => {
            setAthletes(users.filter((u) => u.role === "athlete"));
            setLoadingAthletes(false);
        });
        if (user) {
            setLoadingTeams(true);
            getTeamsByCoach(user.uid).then((t) => {
                setTeams(t);
                setLoadingTeams(false);
            }).catch(() => setLoadingTeams(false));
        }
    }, [isNewChatOpen, user]);

    const handleOpenGroupChatFromModal = async (team: Team) => {
        if (!user) return;
        setOpeningGroupChat(team.id);
        try {
            const chat = await ChatService.createOrGetGroupChat(team.id, team.name, user.uid, team.memberIds);
            setSelectedChat(chat);
            setIsNewChatOpen(false);
        } catch {
            toast.error("Failed to open group chat.");
        } finally {
            setOpeningGroupChat(null);
        }
    };

    const getChatDisplayName = (chat: Chat) => {
        if (chat.isGroup) return chat.groupName || "Team";
        const otherId = chat.participantIds.find(id => id !== user?.uid);
        if (otherId) {
            const otherUser = allUsers.find(u => u.id === otherId);
            if (otherUser) return otherUser.displayName;
        }
        return chat.athleteName || t.admin.chat.athleteFallback;
    };

    const handleSendMessage = async (text: string) => {
        if (!selectedChat || !user) return;
        await ChatService.sendMessage(selectedChat.id, user.uid, text, user.displayName || user.email || "Coach");
    };

    const handleStartChat = async (athlete: User) => {
        if (!user) return;
        try {
            const chat = await ChatService.createOrGetChat(athlete.id, athlete.displayName, user.uid);
            setSelectedChat(chat);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error("Failed to start chat", error);
        }
    };

    const handleDeleteChat = async () => {
        if (!selectedChat) return;
        setDeleting(true);
        try {
            await ChatService.deleteChat(selectedChat.id);
            setSelectedChat(null);
            setMessages([]);
            setIsDeleteDialogOpen(false);
            toast.success(t.admin.chat.toast.deleteSuccess);
        } catch (error) {
            console.error("Failed to delete chat", error);
            toast.error(t.admin.chat.toast.deleteError);
        } finally {
            setDeleting(false);
        }
    };

    const filteredAthletes = athletes.filter(
        (a) =>
            a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const newChatModalContent = (
        <div className="p-2 space-y-4">
            {/* Tabs */}
            <div className="flex rounded-lg bg-muted p-1 gap-1">
                <button
                    className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", newChatTab === "direct" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => { setNewChatTab("direct"); setSearchQuery(""); }}
                >
                    {t.admin.chat.tabDirect}
                </button>
                <button
                    className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", newChatTab === "group" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => { setNewChatTab("group"); setSearchQuery(""); }}
                >
                    {t.admin.chat.tabGroup}
                </button>
            </div>

            {newChatTab === "direct" ? (
                <>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.admin.chat.searchAthletes}
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="h-[280px] overflow-y-auto space-y-2">
                        {loadingAthletes ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredAthletes.length === 0 ? (
                            <p className="text-center text-muted-foreground p-4">{t.admin.chat.noAthletesFound}</p>
                        ) : (
                            filteredAthletes.map((athlete) => (
                                <button
                                    key={athlete.id}
                                    onClick={() => handleStartChat(athlete)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                >
                                    <Avatar>
                                        <AvatarFallback>{athlete.displayName[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{athlete.displayName}</p>
                                        <p className="text-xs text-muted-foreground">{athlete.email}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="h-[320px] overflow-y-auto space-y-2">
                    {loadingTeams ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : teams.length === 0 ? (
                        <p className="text-center text-muted-foreground p-4">{t.admin.chat.noTeams}</p>
                    ) : (
                        teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => handleOpenGroupChatFromModal(team)}
                                disabled={openingGroupChat === team.id}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-60"
                            >
                                <Avatar>
                                    <AvatarFallback>
                                        {openingGroupChat === team.id
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Users2 className="h-4 w-4" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{team.name}</p>
                                    <p className="text-xs text-muted-foreground">{team.memberIds.length} {team.memberIds.length === 1 ? t.admin.teams.member : t.admin.teams.members}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );

    return (
        <AdminLayout>
            <NotificationBanner />
            <div className="flex flex-col md:flex-row h-[calc(100vh-73px)] md:m-4 bg-card md:rounded-lg md:border overflow-hidden md:shadow-sm">

                {/* Chat List Sidebar */}
                <div className={cn(
                    "w-full md:w-80 border-r flex flex-col bg-background",
                    selectedChat ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold">{t.admin.chat.title}</h3>
                        <Button size="icon" variant="ghost" className="hidden sm:flex h-8 w-8" onClick={() => setIsNewChatOpen(true)}>
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
                                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">{t.admin.chat.noConversations}</p>
                                <Button variant="link" className="mt-2" onClick={() => setIsNewChatOpen(true)}>
                                    {t.admin.chat.startChat}
                                </Button>
                            </div>
                        ) : (
                            chats.map((chat) => {
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
                                            <AvatarFallback>
                                                {chat.isGroup
                                                    ? <Users2 className="h-4 w-4" />
                                                    : displayName[0]?.toUpperCase()}
                                            </AvatarFallback>
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
                                                    {chat.lastMessage || t.admin.chat.noMessages}
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
                            {/* Mobile header */}
                            <div className="md:hidden p-3 border-b flex items-center gap-3 bg-background sticky top-0 z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 -ml-1 shrink-0"
                                    onClick={() => setSelectedChat(null)}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback>
                                        {selectedChat.isGroup
                                            ? <Users2 className="h-4 w-4" />
                                            : getChatDisplayName(selectedChat)[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm flex-1 truncate">
                                    {getChatDisplayName(selectedChat)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Desktop header */}
                            <div className="hidden md:flex items-center justify-end p-2 border-b">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {t.admin.chat.deleteChat}
                                </Button>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <ChatWindow
                                    messages={messages}
                                    currentUserId={user?.uid || ""}
                                    onSendMessage={handleSendMessage}
                                    participantName={getChatDisplayName(selectedChat)}
                                    isGroup={selectedChat.isGroup}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">{t.admin.chat.selectConversation}</p>
                            <p className="text-sm">{t.admin.chat.selectConversationDescription}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile FAB */}
            {!selectedChat && (
                <button
                    onClick={() => setIsNewChatOpen(true)}
                    className="fixed right-4 z-30 sm:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                    style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
                    aria-label={t.admin.chat.newMessage}
                >
                    <Plus className="h-6 w-6" />
                </button>
            )}

            {/* New Chat Modal */}
            <ResponsiveModal
                open={isNewChatOpen}
                onOpenChange={setIsNewChatOpen}
                title={t.admin.chat.newMessage}
            >
                {newChatModalContent}
            </ResponsiveModal>

            {/* Delete Confirmation */}
            <ResponsiveConfirm
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title={t.admin.chat.deleteConversation}
                description={
                    <>
                        {t.admin.chat.deleteConversationDescription.replace("{{name}}", selectedChat ? getChatDisplayName(selectedChat) : "")}
                    </>
                }
                confirmLabel="Delete"
                destructive
                loading={deleting}
                onConfirm={handleDeleteChat}
            />
        </AdminLayout>
    );
}
