import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  read: boolean;
}

export interface Chat {
  id: string; // The chat ID will be the athleteId for simplicity in 1-to-1 coaching
  participantIds: string[]; // [adminId, athleteId]
  athleteName: string;
  athleteId: string;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: Record<string, number>; // { [userId]: count }
}
