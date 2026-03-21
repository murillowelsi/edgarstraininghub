import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatService } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { Chat, Message } from "@/types/chat";
import { ChevronLeft, Loader2, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getAllUsers } from "@/services/usersService";
import { User } from "@/types/user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function AdminChat() {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    // New Chat Dialog
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [athletes, setAthletes] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingAthletes, setLoadingAthletes] = useState(false);

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

    useEffect(() => {
        if (!selectedChat || !user) return;
        ChatService.markAsRead(selectedChat.id, user.uid);
        const unsubscribe = ChatService.subscribeToMessages(selectedChat.id, (msgs) => {
            setMessages(msgs);
            if (msgs.length > 0) ChatService.markAsRead(selectedChat.id, user.uid).catch(console.error);
        });
        return () => unsubscribe();
    }, [selectedChat, user]);

    useEffect(() => {
        if (!isNewChatOpen) return;
        setLoadingAthletes(true);
        getAllUsers().then((users) => {
            setAthletes(users.filter((u) => u.role === "athlete"));
            setLoadingAthletes(false);
        });
    }, [isNewChatOpen]);

    const getChatDisplayName = (chat: Chat) => {
        const otherId = chat.participantIds.find(id => id !== user?.uid);
        if (otherId) {
            const otherUser = allUsers.find(u => u.id === otherId);
            if (otherUser) return otherUser.displayName;
        }
        return chat.athleteName || "Athlete";
    };

    const handleSendMessage = async (text: string) => {
        if (!selectedChat || !user) return;
        await ChatService.sendMessage(selectedChat.id, user.uid, text);
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
            toast.success("Chat deleted successfully");
        } catch (error) {
            console.error("Failed to delete chat", error);
            toast.error("Failed to delete chat. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const filteredAthletes = athletes.filter(
        (a) =>
            a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const NewChatDialog = () => (
        <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Plus className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <div className="p-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search athletes..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="h-[300px] overflow-y-auto space-y-2">
                        {loadingAthletes ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredAthletes.length === 0 ? (
                            <p className="text-center text-muted-foreground p-4">No athletes found.</p>
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
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <AdminLayout>
            <div className="flex flex-col md:flex-row h-[calc(100vh-73px)] md:m-4 bg-card md:rounded-lg md:border overflow-hidden md:shadow-sm">

                {/* Chat List Sidebar */}
                <div className={cn(
                    "w-full md:w-80 border-r flex flex-col bg-background",
                    selectedChat ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                        <h3 className="font-semibold">Messages</h3>
                        <NewChatDialog />
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
                                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No conversations yet.</p>
                                <Button variant="link" className="mt-2" onClick={() => setIsNewChatOpen(true)}>
                                    Start a chat
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
                            {/* Mobile header: back + avatar + name + delete */}
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
                                    <AvatarFallback>{getChatDisplayName(selectedChat)[0]?.toUpperCase()}</AvatarFallback>
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

                            {/* Desktop header: delete button */}
                            <div className="hidden md:flex items-center justify-end p-2 border-b">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete Chat
                                </Button>
                            </div>

                            <div className="flex-1 overflow-hidden">
                                <ChatWindow
                                    messages={messages}
                                    currentUserId={user?.uid || ""}
                                    onSendMessage={handleSendMessage}
                                    participantName={getChatDisplayName(selectedChat)}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Select a conversation</p>
                            <p className="text-sm">Choose an athlete from the list or start a new chat.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this conversation with{" "}
                            <strong>{selectedChat ? getChatDisplayName(selectedChat) : ""}</strong>?
                            This will permanently remove all messages and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteChat}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
