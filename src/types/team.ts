export interface TeamAssignment {
  workoutId: string;
  scheduledDate: Date;
}

export interface TeamAssignmentDocument {
  workoutId: string;
  scheduledDate: import("firebase/firestore").Timestamp;
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
