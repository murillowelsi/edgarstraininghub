import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    Timestamp,
    doc,
    updateDoc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    serverTimestamp,
    increment
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Chat, Message } from "../types/chat";
import { UserRole } from "../types/user";

export const ChatService = {
    // Create or get existing chat
    createOrGetChat: async (athleteId: string, athleteName: string, adminId: string) => {
        // Use composite ID to allow one chat per athlete-admin pair
        const compositeId = `${athleteId}_${adminId}`;

        // Check for new format first
        let chatRef = doc(db, "chats", compositeId);
        let chatSnap = await getDoc(chatRef);

        // If not found, check legacy format (just athleteId) if this is the first admin (optional, or just migrate)
        // For now, let's treat legacy chats as distinct or we can migrate them. 
        // Simplest strategy: prefer composite ID. 
        // If we want to support the legacy one seamlessly, we'd check if doc(db, "chats", athleteId) exists and if the participant is this admin.

        if (!chatSnap.exists()) {
            const newChat: Chat = {
                id: compositeId,
                participantIds: [adminId, athleteId],
                athleteName,
                athleteId,
                unreadCount: {
                    [adminId]: 0,
                    [athleteId]: 0
                }
            };
            await setDoc(chatRef, newChat);
            return newChat;
        }
        return chatSnap.data() as Chat;
    },

    // Send a message
    sendMessage: async (
        chatId: string,
        senderId: string,
        text: string,
        senderName?: string
    ) => {
        const messagesRef = collection(db, "chats", chatId, "messages");

        // Add message to subcollection
        await addDoc(messagesRef, {
            text,
            senderId,
            createdAt: serverTimestamp(),
            read: false
        });

        // Update parent chat with last message and increment unread count for OTHERS
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) return;

        const chatData = chatSnap.data() as Chat;

        // Calculate unread updates
        const participants = chatData.participantIds || [];
        const unreadUpdates: Record<string, unknown> = {};

        participants.forEach(pId => {
            if (pId !== senderId) {
                unreadUpdates[`unreadCount.${pId}`] = increment(1);
            }
        });

        await updateDoc(chatRef, {
            lastMessage: text,
            lastMessageTime: serverTimestamp(),
            ...unreadUpdates
        });

        // Trigger push notification via Vercel API (fire-and-forget, don't block the send)
        const recipientId = participants.find(pId => pId !== senderId);
        if (recipientId) {
            try {
                const { getAuth } = await import("firebase/auth");
                const { auth } = await import("../lib/firebase");
                const idToken = await getAuth(auth.app).currentUser?.getIdToken();
                if (idToken) {
                    fetch("/api/notify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chatId,
                            messageText: text,
                            senderName: senderName || "Coach",
                            recipientId,
                            idToken,
                        }),
                    }).catch(() => {
                        // Notification failed silently — message was already saved
                    });
                }
            } catch {
                // Auth token unavailable — skip notification
            }
        }
    },

    // Subscribe to messages for a specific chat
    subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            callback(messages);
        }, (error) => {
            console.error("Error subscribing to messages:", error);
        });
    },

    // Subscribe to list of chats (for Super Admin or if we want to see everything)
    subscribeToAllChats: (callback: (chats: Chat[]) => void) => {
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, orderBy("lastMessageTime", "desc"));

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chat[];
            callback(chats);
        }, (error) => {
            console.error("Error subscribing to chats:", error);
        });
    },

    // Subscribe to chats where the user is a participant (Generic for both Athlete and Admin)
    subscribeToUserChats: (userId: string, callback: (chats: Chat[]) => void) => {
        const chatsRef = collection(db, "chats");
        // Query chats where the user is a participant
        const q = query(chatsRef, where("participantIds", "array-contains", userId));

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chat[];
            // Sort client-side since we can't do array-contains + orderBy easily without composite index sometimes
            chats.sort((a, b) => {
                const timeA = a.lastMessageTime?.toMillis?.() || 0;
                const timeB = b.lastMessageTime?.toMillis?.() || 0;
                return timeB - timeA;
            });
            callback(chats);
        }, (error) => {
            console.error("Error subscribing to user chats:", error);
        });
    },

    // Deprecated alias - use subscribeToUserChats
    subscribeToAthleteChats: (athleteId: string, callback: (chats: Chat[]) => void) => {
        return ChatService.subscribeToUserChats(athleteId, callback);
    },

    // Mark messages as read
    markAsRead: async (chatId: string, userId: string) => {
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
            [`unreadCount.${userId}`]: 0
        });
    },

    // Delete a chat and all its messages
    deleteChat: async (chatId: string) => {
        // First, delete all messages in the subcollection
        const messagesRef = collection(db, "chats", chatId, "messages");
        const messagesSnapshot = await getDocs(messagesRef);

        const deletePromises = messagesSnapshot.docs.map(msgDoc =>
            deleteDoc(doc(db, "chats", chatId, "messages", msgDoc.id))
        );
        await Promise.all(deletePromises);

        // Then delete the chat document itself
        const chatRef = doc(db, "chats", chatId);
        await deleteDoc(chatRef);
    }
};
