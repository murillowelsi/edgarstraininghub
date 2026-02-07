import { Timestamp } from 'firebase/firestore';

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
    completionPercentage?: number;
    totalTime?: number; // in seconds
    progressData?: ExerciseProgressData[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Workout interface (simplified from main project)
export interface Workout {
    id: string;
    name: string;
    type: 'running' | 'cycling' | 'swimming' | 'strength';
    stages?: any[];
    exercises?: any[];
    notes?: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface WorkoutDocument {
    name: string;
    type: 'running' | 'cycling' | 'swimming' | 'strength';
    stages?: any[];
    exercises?: any[];
    notes?: string;
    authorId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Assignment with workout details
export interface AssignmentWithWorkout extends WorkoutAssignment {
    workout: Workout;
}

// Exercise definition from database
export interface Exercise {
    id: string;
    name: string;
    description?: string;
    category?: string;
    muscleGroups?: string[];
    equipment?: string[];
    gifUrl?: string; // Important for display
    videoUrl?: string;
    thumbnailUrl?: string;
    instructions?: string;
}

export interface WorkoutExercise {
    id: string;
    exerciseId?: string; // Link to master exercise
    exerciseName?: string; // Denormalized name
    exerciseGifUrl?: string; // Denormalized gif
    exerciseVideoUrl?: string;
    sets: number;
    reps: string;
    weight?: string;
    restSeconds?: number;
    notes?: string;
}
