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
        const chatRef = doc(db, "chats", athleteId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            const newChat: Chat = {
                id: athleteId,
                participantIds: [adminId, athleteId],
                athleteName,
                athleteId,
                unreadCount: {
                    [adminId]: 0,
                    [athleteId]: 0
                }
            };
            // We use setDoc with merge: true just in case, though doc id is specific
            await setDoc(chatRef, newChat);
            return newChat;
        }
        return chatSnap.data() as Chat;
    },

    // Send a message
    sendMessage: async (chatId: string, senderId: string, text: string) => {
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
        const chatData = chatSnap.data() as Chat;

        // Calculate unread updates
        const participants = chatData.participantIds || [];
        const unreadUpdates: Record<string, any> = {};

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

    // Subscribe to list of chats (for Admin)
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

    // Subscribe to single chat (for Athlete)
    subscribeToMyChat: (athleteId: string, callback: (chat: Chat | null) => void) => {
        const chatRef = doc(db, "chats", athleteId);

        return onSnapshot(chatRef, (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() } as Chat);
            } else {
                callback(null);
            }
        }, (error) => {
            console.error("Error subscribing to my chat:", error);
        });
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
