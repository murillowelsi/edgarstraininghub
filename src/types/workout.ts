import type { Timestamp } from "firebase/firestore";

// Workout types
export type WorkoutType = "running" | "cycling" | "swimming";

export const workoutTypeLabels: Record<WorkoutType, string> = {
  running: "Running",
  cycling: "Cycling",
  swimming: "Swimming",
};

// Stage types with associated colors
// Common: warmup, cooldown, recovery, repeat
// Running: run, interval
// Cycling: bike, rest
// Swimming: swim
export type StageType = "warmup" | "run" | "cooldown" | "recovery" | "interval" | "repeat" | "bike" | "rest" | "swim";

export const stageColors: Record<StageType, string> = {
  warmup: "#ef4444",    // Red
  run: "#3b82f6",       // Blue
  cooldown: "#22c55e",  // Green
  recovery: "#eab308",  // Yellow
  interval: "#8b5cf6",  // Purple
  repeat: "#6366f1",    // Indigo
  bike: "#3b82f6",      // Blue (same as run)
  rest: "#94a3b8",      // Gray
  swim: "#06b6d4",      // Cyan
};

export const stageLabels: Record<StageType, string> = {
  warmup: "Warmup",
  run: "Run",
  cooldown: "Cooldown",
  recovery: "Recovery",
  interval: "Interval",
  repeat: "Repeat",
  bike: "Bike",
  rest: "Rest",
  swim: "Swim",
};

// Stage types available per workout type (excluding repeat which is always available)
export const stageTypesByWorkout: Record<WorkoutType, StageType[]> = {
  running: ["warmup", "run", "cooldown", "recovery", "interval"],
  cycling: ["warmup", "bike", "recovery", "rest", "cooldown"],
  swimming: ["warmup", "swim", "cooldown", "recovery", "rest"],
};

// Duration types
export type DurationType = "time" | "distance" | "lapButton" | "calories" | "heartRate" | "power";

export const durationLabels: Record<DurationType, string> = {
  time: "Time",
  distance: "Distance",
  lapButton: "Press Lap Button",
  calories: "Calories",
  heartRate: "Heart Rate",
  power: "Power",
};

// Duration types available per workout type
export const durationTypesByWorkout: Record<WorkoutType, DurationType[]> = {
  running: ["time", "distance", "lapButton", "calories", "heartRate"],
  cycling: ["time", "distance", "lapButton", "calories", "heartRate", "power"],
  swimming: ["time", "distance", "lapButton"],
};

// Duration units
export type DurationUnit = "km" | "m" | "mi" | "min" | "sec" | "kcal" | "bpm" | "w";

// Intensity goal types
// Common: none, heartRateZone, customHeartRate, powerZone, customPower
// Running: pace, cadence
// Cycling: speed, bikeCadence
// Swimming: effortBased, targetPace, cssBasedPace
export type IntensityType =
  | "none"
  | "pace"
  | "cadence"
  | "heartRateZone"
  | "customHeartRate"
  | "powerZone"
  | "customPower"
  | "speed"
  | "bikeCadence"
  | "effortBased"
  | "targetPace"
  | "cssBasedPace";

export const intensityLabels: Record<IntensityType, string> = {
  none: "No Target",
  pace: "Pace",
  cadence: "Cadence",
  heartRateZone: "Heart Rate Zone",
  customHeartRate: "Custom Heart Rate",
  powerZone: "Power Zone",
  customPower: "Custom Power",
  speed: "Speed",
  bikeCadence: "Bike Cadence",
  effortBased: "Effort Based",
  targetPace: "Target Pace",
  cssBasedPace: "CSS Based Pace",
};

// Intensity types available per workout type
export const intensityTypesByWorkout: Record<WorkoutType, IntensityType[]> = {
  running: ["none", "pace", "cadence", "heartRateZone", "customHeartRate", "powerZone", "customPower"],
  cycling: ["none", "speed", "bikeCadence", "heartRateZone", "customHeartRate", "powerZone", "customPower"],
  swimming: ["none", "effortBased", "targetPace", "cssBasedPace"],
};

// Swimming-specific types
export type SwimmingStrokeType =
  | "freestyle"
  | "breaststroke"
  | "backstroke"
  | "butterfly"
  | "choice"
  | "im"
  | "imByRound"
  | "reverseIm"
  | "mixed";

export const strokeLabels: Record<SwimmingStrokeType, string> = {
  freestyle: "Freestyle",
  breaststroke: "Breaststroke",
  backstroke: "Backstroke",
  butterfly: "Butterfly",
  choice: "Choice",
  im: "Individual Medley (IM)",
  imByRound: "IM by Round",
  reverseIm: "Reverse IM (RIMO)",
  mixed: "Mixed",
};

export type SwimmingDrillType = "none" | "kick" | "arms" | "drill";

export const drillLabels: Record<SwimmingDrillType, string> = {
  none: "None",
  kick: "Kick",
  arms: "Arms",
  drill: "Drill",
};

export type SwimmingEquipmentType = "none" | "fins" | "kickboard" | "paddles" | "pullBuoy" | "snorkel";

export const equipmentLabels: Record<SwimmingEquipmentType, string> = {
  none: "None",
  fins: "Fins",
  kickboard: "Kickboard",
  paddles: "Paddles",
  pullBuoy: "Pull Buoy",
  snorkel: "Snorkel",
};

// Swimming distance presets (in meters)
export const swimmingDistancePresets = [25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500];

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
  // Swimming-specific fields
  strokeType?: SwimmingStrokeType;
  drillType?: SwimmingDrillType;
  equipment?: SwimmingEquipmentType;
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

// Get default main stage type for a workout type
export const getDefaultStageType = (workoutType: WorkoutType): StageType => {
  if (workoutType === "cycling") return "bike";
  if (workoutType === "swimming") return "swim";
  return "run";
};

// Get default interval stage type for a workout type (for repeat blocks)
export const getDefaultIntervalType = (workoutType: WorkoutType): StageType => {
  if (workoutType === "cycling") return "bike";
  if (workoutType === "swimming") return "swim";
  return "interval";
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
export const createRepeatBlock = (repeatCount: number = 2, workoutType: WorkoutType = "running"): WorkoutStage => ({
  id: generateStageId(),
  type: "repeat",
  duration: { type: "lapButton" },
  intensity: { type: "none" },
  repeatCount,
  stages: [
    createDefaultStage(getDefaultIntervalType(workoutType)),
    createDefaultStage("recovery"),
  ],
});
