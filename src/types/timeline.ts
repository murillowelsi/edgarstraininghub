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
  // Strength sessions
  volumeKg?: number;
  workingSets?: number;
  totalSets?: number;
  records?: number; // new personal records in this session
  highlights?: SummaryHighlight[]; // heaviest set of the main exercises
  rpe?: number; // perceived effort 1–10
}

export interface SummaryHighlight {
  name: string;
  value: string; // "60 kg × 8"
  pr?: boolean;
}

/** Someone tagged in a post, kept so their @name can be highlighted. */
export interface PostMention {
  id: string;
  name: string;
}

export interface TimelinePost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorPhotoURL?: string;
  caption: string;
  imageUrl?: string; // first photo — kept for older posts/clients
  imageUrls: string[];
  mentions: PostMention[];
  workoutSummary?: WorkoutSummary;
  /** Old strength post whose caption only repeated the stats now shown in the card */
  captionIsSummary?: boolean;
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
  imageUrls?: string[];
  mentions?: PostMention[];
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
  imageUrls?: string[];
  mentions?: PostMention[];
  workoutSummary?: WorkoutSummary;
}

/** What the post composer hands back to its caller. */
export interface ComposerResult {
  caption: string;
  imageUrls: string[];
  mentions: PostMention[];
}
