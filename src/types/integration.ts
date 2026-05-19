import type { Timestamp } from "firebase/firestore";

export interface StravaIntegration {
  athleteId: number | null;
  athleteUsername: string | null;
  scope: string | null;
  connectedAt: Date | null;
  lastSyncAt: Date | null;
}

export interface StravaIntegrationDocument {
  athleteId: number | null;
  athleteUsername: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string | null;
  connectedAt: Timestamp | null;
  lastSyncAt: Timestamp | null;
  updatedAt?: Timestamp;
}
