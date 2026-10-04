import type { Timestamp } from "firebase/firestore";
import type { WorkoutType } from "./workout";

export interface ChecklistItem {
  id: string;
  label: string;
  checked?: boolean;
}

export interface WorkoutChecklistTemplate {
  userId: string;
  type: WorkoutType;
  items: ChecklistItem[];
  updatedAt?: Date;
}

export interface WorkoutChecklistTemplateDocument {
  userId: string;
  type: WorkoutType;
  items: ChecklistItem[];
  updatedAt: Timestamp;
}

export interface WorkoutChecklistInstance {
  assignmentId: string;
  userId: string;
  items: ChecklistItem[];
  updatedAt?: Date;
}

export const generateChecklistItemId = (): string =>
  `cli_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const make = (labels: string[]): ChecklistItem[] =>
  labels.map((label) => ({ id: generateChecklistItemId(), label }));

/**
 * Default gear list for a workout type, built from the caller's active language.
 * Items are persisted once saved, so switching language later leaves them untouched.
 */
export const defaultChecklistFor = (
  type: WorkoutType,
  labels: Record<WorkoutType, readonly string[]>
): ChecklistItem[] => make([...(labels[type] ?? [])]);
