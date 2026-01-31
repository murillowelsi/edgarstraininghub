import type { Timestamp } from "firebase/firestore";

// Workout type (currently only running, future: cycling, swimming, strength)
export type WorkoutType = "running";

// Stage types with associated colors
export type StageType = "warmup" | "run" | "cooldown" | "recovery" | "interval" | "repeat";

export const stageColors: Record<StageType, string> = {
  warmup: "#ef4444",    // Red
  run: "#3b82f6",       // Blue
  cooldown: "#22c55e",  // Green
  recovery: "#eab308",  // Yellow
  interval: "#8b5cf6",  // Purple
  repeat: "#6366f1",    // Indigo
};

export const stageLabels: Record<StageType, string> = {
  warmup: "Warmup",
  run: "Run",
  cooldown: "Cooldown",
  recovery: "Recovery",
  interval: "Interval",
  repeat: "Repeat",
};

// Duration types
export type DurationType = "time" | "distance" | "lapButton" | "calories" | "heartRate";

export const durationLabels: Record<DurationType, string> = {
  time: "Time",
  distance: "Distance",
  lapButton: "Press Lap Button",
  calories: "Calories",
  heartRate: "Heart Rate",
};

// Duration units
export type DurationUnit = "km" | "m" | "mi" | "min" | "sec" | "kcal" | "bpm";

// Intensity goal types
export type IntensityType =
  | "none"
  | "pace"
  | "cadence"
  | "heartRateZone"
  | "customHeartRate"
  | "powerZone"
  | "customPower";

export const intensityLabels: Record<IntensityType, string> = {
  none: "No Target",
  pace: "Pace",
  cadence: "Cadence",
  heartRateZone: "Heart Rate Zone",
  customHeartRate: "Custom Heart Rate",
  powerZone: "Power Zone",
  customPower: "Custom Power",
};

// Stage duration configuration
export interface StageDuration {
  type: DurationType;
  value?: number;
  unit?: DurationUnit;
}

// Stage intensity configuration
export interface StageIntensity {
  type: IntensityType;
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
}

// Workout stage
export interface WorkoutStage {
  id: string;
  type: StageType;
  duration: StageDuration;
  intensity: StageIntensity;
  notes?: string;
  // For repeat stages
  repeatCount?: number;
  stages?: WorkoutStage[];
}

// Workout domain model
export interface Workout {
  id: string;
  name: string;
  type: WorkoutType;
  stages: WorkoutStage[];
  notes?: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Form data for creating/editing workouts
export interface WorkoutFormData {
  name: string;
  type: WorkoutType;
  stages: WorkoutStage[];
  notes?: string;
}

// Firestore document structure
export interface WorkoutDocument {
  name: string;
  type: WorkoutType;
  stages: WorkoutStage[];
  notes?: string;
  authorId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Helper to generate unique stage ID
export const generateStageId = (): string => {
  return `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Default stage values
export const createDefaultStage = (type: StageType = "run"): WorkoutStage => ({
  id: generateStageId(),
  type,
  duration: {
    type: "lapButton",
  },
  intensity: {
    type: "none",
  },
});

// Create a repeat block with default nested stages
export const createRepeatBlock = (repeatCount: number = 2): WorkoutStage => ({
  id: generateStageId(),
  type: "repeat",
  duration: { type: "lapButton" },
  intensity: { type: "none" },
  repeatCount,
  stages: [
    createDefaultStage("interval"),
    createDefaultStage("recovery"),
  ],
});
