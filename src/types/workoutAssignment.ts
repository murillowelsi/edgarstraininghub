import type { Timestamp } from "firebase/firestore";
import type { User } from "./user";
import type { Workout } from "./workout";

// Progress data for a single set
export interface SetProgressData {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
  time?: number; // seconds tracked by the per-set timer
}

// Progress data for a single exercise
export interface ExerciseProgressData {
  exerciseId: string;
  sets: SetProgressData[];
}

// Actual time recorded for one stage (regular or nested inside a repeat)
// For regular stages: time in seconds
// For repeat stages: one entry per repetition, each with times per nested stage
export interface StageTimeData {
  stageIndex: number; // index in workout.stages
  time?: number | null; // for regular stages
  reps?: Array<{ times: (number | null)[] }>; // for repeat stages
}

// Activity data for endurance workouts (running, cycling, swimming)
export interface ActivityData {
  elapsedTime?: number; // in seconds
  distance?: number;    // km for running/cycling, m for swimming
  avgHeartRate?: number; // bpm
  avgPace?: number;     // seconds per km (running) or per 100m (swimming)
  avgSpeed?: number;    // km/h (cycling)
  avgPower?: number;    // watts (cycling, optional)
  stageTimes?: StageTimeData[]; // actual time per stage
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
  activityData?: ActivityData;
  skipped?: boolean;
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
  completionPercentage?: number;
  totalTime?: number; // in seconds
  progressData?: ExerciseProgressData[];
  activityData?: ActivityData;
  skipped?: boolean;
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
