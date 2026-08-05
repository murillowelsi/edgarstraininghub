export interface TeamAssignment {
  workoutId: string;
  scheduledDate: Date;
}

export interface TeamAssignmentDocument {
  workoutId: string;
  scheduledDate: import("firebase/firestore").Timestamp;
  // Timezone-safe calendar day ("YYYY-MM-DD") — source of truth for the
  // scheduled day. Optional because legacy entries only have the Timestamp.
  scheduledDay?: string;
}

export interface Team {
  id: string;
  name: string;
  color?: string;
  photoURL?: string;
  coachId: string;
  inviteToken: string;
  memberIds: string[];
  assignedWorkouts: TeamAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamDocument {
  name: string;
  color?: string;
  photoURL?: string;
  coachId: string;
  inviteToken: string;
  memberIds: string[];
  assignedWorkouts?: TeamAssignmentDocument[];
  createdAt: import("firebase/firestore").Timestamp;
  updatedAt: import("firebase/firestore").Timestamp;
}
