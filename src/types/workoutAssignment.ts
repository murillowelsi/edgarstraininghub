import type { Timestamp } from "firebase/firestore";
import type { User } from "./user";
import type { Workout } from "./workout";

// Progress data for a single set
export interface SetProgressData {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
}

// Progress data for a single exercise
export interface ExerciseProgressData {
  exerciseId: string;
  sets: SetProgressData[];
}

// Workout assignment domain model
export interface WorkoutAssignment {
  id: string;
  workoutId: string;
  athleteId: string;
  scheduledDate: Date;
  assignedBy: string;
  completedAt: Date | null;
  completionPercentage?: number;
  totalTime?: number; // in seconds
  progressData?: ExerciseProgressData[];
  createdAt: Date;
  updatedAt: Date;
}

// Firestore document structure
export interface WorkoutAssignmentDocument {
  workoutId: string;
  athleteId: string;
  scheduledDate: Timestamp;
  assignedBy: string;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form data for creating assignments
export interface WorkoutAssignmentFormData {
  workoutId: string;
  athleteIds: string[];
  scheduledDate: Date;
}

// Assignment with workout details (for dashboard display)
export interface AssignmentWithWorkout extends WorkoutAssignment {
  workout: Workout;
}

// Assignment with workout and athlete details (for admin calendar)
export interface AssignmentWithDetails extends WorkoutAssignment {
  workout: Workout;
  athlete: User;
}
