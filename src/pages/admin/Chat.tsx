import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatService } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { Chat, Message } from "@/types/chat";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
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
import { toast } from "sonner";

export default function AdminChat() {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    // New Chat Dialog State
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [athletes, setAthletes] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingAthletes, setLoadingAthletes] = useState(false);

    // Delete Chat State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Subscribe to all chats where the user is a participant
    useEffect(() => {
        if (!user) return;

        const unsubscribe = ChatService.subscribeToUserChats(user.uid, (updatedChats) => {
            setChats(updatedChats);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Subscribe to messages when a chat is selected
    useEffect(() => {
        if (!selectedChat) return;

        if (user) {
            ChatService.markAsRead(selectedChat.id, user.uid);
        }

        const unsubscribe = ChatService.subscribeToMessages(selectedChat.id, (msgs) => {
            setMessages(msgs);
            if (user && msgs.length > 0) {
                ChatService.markAsRead(selectedChat.id, user.uid);
            }
        });

        return () => unsubscribe();
    }, [selectedChat, user]);

    // Load athletes for new chat dialog
    useEffect(() => {
        if (isNewChatOpen) {
            setLoadingAthletes(true);
            getAllUsers().then((users) => {
                const onlyAthletes = users.filter((u) => u.role === "athlete");
                setAthletes(onlyAthletes);
                setLoadingAthletes(false);
            });
        }
    }, [isNewChatOpen]);

    const handleSendMessage = async (text: string) => {
        if (!selectedChat || !user) return;
        await ChatService.sendMessage(selectedChat.id, user.uid, text);
    };

    const handleStartChat = async (athlete: User) => {
        if (!user) return;
        try {
            const chat = await ChatService.createOrGetChat(
                athlete.id,
                athlete.displayName,
                user.uid
            );
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
        (athlete) =>
            athlete.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            athlete.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Load all users to resolve names
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
        getAllUsers().then(setAllUsers).catch(console.error);
    }, []);

    // Helper to get display name
    const getChatDisplayName = (chat: Chat) => {
        // Find participant who is NOT me
        const otherId = chat.participantIds.find(id => id !== user?.uid);
        if (otherId) {
            const otherUser = allUsers.find(u => u.id === otherId);
            if (otherUser) return otherUser.displayName;
        }
        return chat.athleteName || "Athlete";
    };

    // Chats with resolved names
    const displayChats = chats.map(c => ({
        ...c,
        athleteName: getChatDisplayName(c)
    }));

    return (
        <AdminLayout>
            <div className="flex h-[calc(100vh-73px)]">
                <div className="w-80 border-r flex flex-col flex-shrink-0 bg-background">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Messages</h2>
                        <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" title="New Message">
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
                                            <p className="text-center text-muted-foreground p-4">
                                                No athletes found.
                                            </p>
                                        ) : (
                                            filteredAthletes.map((athlete) => (
                                                <button
                                                    key={athlete.id}
                                                    onClick={() => handleStartChat(athlete)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                                                >
                                                    <Avatar>
                                                        <AvatarFallback>
                                                            {athlete.displayName[0]?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{athlete.displayName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {athlete.email}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ChatList
                                chats={displayChats}
                                selectedChatId={selectedChat?.id || null}
                                onSelectChat={setSelectedChat}
                                currentUserId={user?.uid || ""}
                            />
                        )}
                    </div>
                </div>

                <div className="flex-1 bg-muted/10 p-4 flex flex-col">
                    {selectedChat ? (
                        <>
                            {/* Chat Header with Delete Button */}
                            <div className="flex items-center justify-between mb-2">
                                <div />
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
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <p>Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Chat Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this conversation with{" "}
                            <strong>{selectedChat?.athleteName}</strong>? This will permanently
                            remove all messages and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteChat}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
