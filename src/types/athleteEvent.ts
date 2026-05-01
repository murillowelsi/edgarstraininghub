import type { Timestamp } from "firebase/firestore";

export type AthleteEventType = "race" | "test" | "milestone" | "other";

export const athleteEventTypeLabels: Record<AthleteEventType, string> = {
  race: "Race",
  test: "Test",
  milestone: "Milestone",
  other: "Other",
};

export interface EventGoal {
  id: string;
  text: string;
  achieved: boolean;
}

export interface AthleteEvent {
  id: string;
  athleteId: string;
  title: string;
  eventDate: Date;
  type: AthleteEventType;
  description?: string;
  goals: EventGoal[];
  notifiedDays?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AthleteEventDocument {
  athleteId: string;
  title: string;
  eventDate: Timestamp;
  type: AthleteEventType;
  description?: string;
  goals: EventGoal[];
  notifiedDays?: number[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AthleteEventFormData {
  title: string;
  eventDate: Date;
  type: AthleteEventType;
  description?: string;
  goals: EventGoal[];
}
