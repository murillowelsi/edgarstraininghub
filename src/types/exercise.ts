import type { Timestamp } from "firebase/firestore";

// Exercise categories/muscle groups
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "fullBody";

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  core: "Core",
  glutes: "Glutes",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves",
  fullBody: "Full Body",
};

// Equipment types
export type EquipmentType =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "kettlebell"
  | "cable"
  | "machine"
  | "resistanceBand"
  | "medicineBall"
  | "foamRoller"
  | "bench"
  | "pullupBar"
  | "other";

export const equipmentTypeLabels: Record<EquipmentType, string> = {
  bodyweight: "Body Weight",
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  kettlebell: "Kettlebell",
  cable: "Cable",
  machine: "Machine",
  resistanceBand: "Resistance Band",
  medicineBall: "Medicine Ball",
  foamRoller: "Foam Roller",
  bench: "Bench",
  pullupBar: "Pull-up Bar",
  other: "Other",
};

// Exercise domain model
export interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  videoUrl?: string; // YouTube URL
  thumbnailUrl?: string;
  muscleGroups: MuscleGroup[];
  equipment: EquipmentType[];
  isCustom: boolean; // true if created by user, false if predefined
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Firestore document structure
export interface ExerciseDocument {
  name: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  muscleGroups: MuscleGroup[];
  equipment: EquipmentType[];
  isCustom: boolean;
  createdBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form data for creating/editing exercises
export interface ExerciseFormData {
  name: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  muscleGroups: MuscleGroup[];
  equipment: EquipmentType[];
}

// Exercise in a workout (with sets, reps, etc.)
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise?: Exercise; // Populated when loading
  sets: number;
  reps?: string; // Can be "8-12" or "10" or "AMRAP"
  weight?: string; // Can be "20kg" or "bodyweight"
  duration?: number; // In seconds, for timed exercises
  restSeconds: number;
  notes?: string;
  order: number;
  // Denormalized exercise data (stored with workout for offline access)
  exerciseName?: string;
  exerciseVideoUrl?: string;
  exerciseThumbnailUrl?: string;
  exerciseMuscleGroups?: MuscleGroup[];
  exerciseInstructions?: string;
}

// Helper to extract YouTube video ID
export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Helper to get YouTube thumbnail
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

// Generate unique exercise ID
export const generateExerciseId = (): string => {
  return `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
