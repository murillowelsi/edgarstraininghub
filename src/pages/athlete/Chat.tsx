import { useEffect, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatService } from "@/services/chat";
import { useAuth } from "@/contexts/AuthContext";
import { Chat, Message } from "@/types/chat";
import { Loader2 } from "lucide-react";
import AthletePortalLayout from "@/components/athlete/AthletePortalLayout";
import { toast } from "sonner";

export default function AthleteChat() {
    const { user } = useAuth();
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const initChat = async () => {
            try {
                const chatObj = await ChatService.createOrGetChat(
                    user.uid,
                    user.displayName || "Athlete",
                    "ADMIN_ID_PLACEHOLDER"
                );
                setChat(chatObj);
            } catch (error) {
                console.error("Error initializing chat:", error);
                toast.error("Failed to load chat. Please try again.");
                setLoading(false);
            }
        };

        initChat();
    }, [user]);

    useEffect(() => {
        if (!user || !chat) return;

        const unsubscribeMsgs = ChatService.subscribeToMessages(chat.id, (msgs) => {
            setMessages(msgs);
            ChatService.markAsRead(chat.id, user.uid).catch((e) =>
                console.error("Mark read error:", e)
            );
        });

        const unsubscribeChat = ChatService.subscribeToMyChat(
            user.uid,
            (updatedChat) => {
                if (updatedChat) setChat(updatedChat);
                setLoading(false);
            }
        );

        return () => {
            unsubscribeMsgs();
            unsubscribeChat();
        };
    }, [chat?.id, user]);

    const handleSendMessage = async (text: string) => {
        if (!chat || !user) {
            toast.error("Unable to send message. Chat not loaded.");
            return;
        }

        try {
            await ChatService.sendMessage(chat.id, user.uid, text);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message. Please try again.");
        }
    };

    if (loading && !chat) {
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
            <div className="flex flex-col h-[calc(100vh-8rem)]">
                <ChatWindow
                    messages={messages}
                    currentUserId={user?.uid || ""}
                    onSendMessage={handleSendMessage}
                    participantName="Coach"
                />
            </div>
        </AthletePortalLayout>
    );
}
