import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: Timestamp;
  read: boolean;
}

export interface Chat {
  id: string;
  participantIds: string[];
  // 1-to-1 fields
  athleteName?: string;
  athleteId?: string;
  // Group chat fields
  isGroup?: boolean;
  teamId?: string;
  groupName?: string;
  // Common
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: Record<string, number>;
}
