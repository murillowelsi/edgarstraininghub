export interface Team {
  id: string;
  name: string;
  coachId: string;
  inviteToken: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamDocument {
  name: string;
  coachId: string;
  inviteToken: string;
  memberIds: string[];
  createdAt: import("firebase/firestore").Timestamp;
  updatedAt: import("firebase/firestore").Timestamp;
}
