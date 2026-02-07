import {
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    setDoc,
    getDoc,
    getDocs,
    serverTimestamp,
    increment,
    Timestamp
} from "firebase/firestore";
import { db } from "../lib/firebase";

// Define simplified types for mobile usage
export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: { seconds: number } | Date;
    read: boolean;
}

export interface Chat {
    id: string;
    participantIds: string[];
    athleteName?: string;
    athleteId?: string;
    lastMessage?: string;
    lastMessageTime?: { seconds: number } | Date;
    unreadCount?: Record<string, number>;
}

export interface User {
    id: string;
    displayName: string;
    email: string;
    role: string;
}

export const ChatService = {
    // Get all coaches/admins for starting a chat
    getCoaches: async (): Promise<User[]> => {
        const usersRef = collection(db, "users");
        try {
            // Restrict query to 'admin' role to comply with Firestore rules
            // Rules only allow reading 'admin' or 'editor' roles for non-admins
            const q = query(usersRef, where("role", "==", "admin"));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => {
                const data = doc.data() as any;
                return {
                    id: doc.id,
                    displayName: data.displayName || data.email,
                    email: data.email,
                    role: data.role
                };
            }) as User[];
        } catch (error) {
            console.error("Error fetching coaches:", error);
            // Try fallback to 'editor' if admin returns nothing?? No, just return empty
            return [];
        }
    },

    // Create or get existing chat
    createOrGetChat: async (athleteId: string, athleteName: string, adminId: string) => {
        const compositeId = `${athleteId}_${adminId}`;
        const chatRef = doc(db, "chats", compositeId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            const newChat = {
                id: compositeId,
                participantIds: [adminId, athleteId],
                athleteName,
                athleteId,
                unreadCount: {
                    [adminId]: 0,
                    [athleteId]: 0
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            await setDoc(chatRef, newChat);
            return newChat;
        }
        return { id: chatSnap.id, ...chatSnap.data() } as Chat;
    },

    // Send a message
    sendMessage: async (chatId: string, senderId: string, text: string) => {
        const messagesRef = collection(db, "chats", chatId, "messages");

        await addDoc(messagesRef, {
            text,
            senderId,
            createdAt: serverTimestamp(),
            read: false
        });

        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) return;

        const chatData = chatSnap.data();
        const participants = chatData?.participantIds || [];
        const unreadUpdates: Record<string, any> = {};

        participants.forEach((pId: string) => {
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

    subscribeToUserChats: (userId: string, callback: (chats: Chat[]) => void) => {
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participantIds", "array-contains", userId));

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Chat[];

            chats.sort((a, b) => {
                const timeA = (a.lastMessageTime as any)?.seconds || 0;
                const timeB = (b.lastMessageTime as any)?.seconds || 0;
                return timeB - timeA;
            });

            callback(chats);
        }, (error) => {
            console.error("Error subscribing to chats:", error);
        });
    },

    subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            callback(messages);
        });
    },

    markAsRead: async (chatId: string, userId: string) => {
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
            [`unreadCount.${userId}`]: 0
        });
    }
};
