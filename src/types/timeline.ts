import type { UserRole } from "./user";
import type { Timestamp } from "firebase/firestore";

export interface TimelinePost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorPhotoURL?: string;
  caption: string;
  imageUrl?: string;
  likedBy: string[];
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelinePostDocument {
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorPhotoURL?: string;
  caption: string;
  imageUrl?: string;
  likedBy: string[];
  commentsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TimelineCommentReplyTo {
  commentId: string;
  authorName: string;
}

export interface TimelineComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorPhotoURL?: string;
  text: string;
  replyTo?: TimelineCommentReplyTo;
  likedBy: string[];
  createdAt: Date;
}

export interface TimelineCommentDocument {
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorPhotoURL?: string;
  text: string;
  replyTo?: TimelineCommentReplyTo;
  likedBy?: string[];
  createdAt: Timestamp;
}

export interface TimelinePostFormData {
  caption: string;
  imageUrl?: string;
}
