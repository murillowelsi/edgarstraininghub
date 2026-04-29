import type { UserRole } from "./user";
import type { Timestamp } from "firebase/firestore";

export interface SummaryStageTime {
  label: string;
  type: "regular" | "repeat";
  time?: number | null; // regular
  nestedLabels?: string[]; // repeat
  reps?: Array<{ times: (number | null)[] }>; // repeat
}

export interface WorkoutSummary {
  workoutName: string;
  workoutType: string; // "running" | "cycling" | "swimming" | "strength"
  elapsedTime?: number;   // seconds
  distance?: number;      // km or m (swimming)
  avgHeartRate?: number;  // bpm
  avgPace?: number;       // seconds per km or per 100m (swimming)
  avgSpeed?: number;      // km/h (cycling)
  completionPercentage?: number; // for strength
  stageTimes?: SummaryStageTime[];
}

export interface TimelinePost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorPhotoURL?: string;
  caption: string;
  imageUrl?: string;
  workoutSummary?: WorkoutSummary;
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
  workoutSummary?: WorkoutSummary;
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
  workoutSummary?: WorkoutSummary;
}
