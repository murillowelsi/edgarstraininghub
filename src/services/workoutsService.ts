import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Workout, WorkoutDocument, WorkoutFormData, WorkoutStage } from "../types/workout";
import type { WorkoutExercise } from "../types/exercise";

const WORKOUTS_COLLECTION = "workouts";

// Simple in-memory cache to avoid re-fetching on every page navigation
const CACHE_TTL = 60_000; // 1 minute
const workoutByIdCache = new Map<string, { data: Workout; ts: number }>();
let allWorkoutsCache: { data: Workout[]; ts: number } | null = null;

export const invalidateWorkoutsCache = () => {
  allWorkoutsCache = null;
  workoutByIdCache.clear();
};

// Helper to remove undefined values from an object
const removeUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
};

// Clean stages data for Firestore (remove undefined values)
const cleanStagesForFirestore = (stages: WorkoutStage[]): Record<string, unknown>[] => {
  return stages.map((stage) => {
    const cleanedStage: Record<string, unknown> = {
      id: stage.id,
      type: stage.type,
      duration: removeUndefined({
        type: stage.duration.type,
        value: stage.duration.value,
        unit: stage.duration.unit,
      }),
      intensity: removeUndefined({
        type: stage.intensity.type,
        value: stage.intensity.value,
        min: stage.intensity.min,
        max: stage.intensity.max,
        unit: stage.intensity.unit,
      }),
    };

    if (stage.notes) {
      cleanedStage.notes = stage.notes;
    }

    // Handle repeat blocks with nested stages
    if (stage.type === "repeat") {
      if (stage.repeatCount !== undefined) {
        cleanedStage.repeatCount = stage.repeatCount;
      }
      if (stage.stages && stage.stages.length > 0) {
        cleanedStage.stages = cleanStagesForFirestore(stage.stages);
      }
    }

    return cleanedStage;
  });
};

// Clean exercises data for Firestore (remove undefined values and circular refs)
const cleanExercisesForFirestore = (exercises: WorkoutExercise[]): Record<string, unknown>[] => {
  return exercises.map((exercise) =>
    removeUndefined({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      duration: exercise.duration,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      order: exercise.order,
      // Store essential exercise info for display (denormalized)
      // Use exercise lookup data if available, otherwise preserve existing denormalized data
      exerciseName: exercise.exercise?.name || exercise.exerciseName,
      exerciseVideoUrl: exercise.exercise?.videoUrl || exercise.exerciseVideoUrl,
      exerciseThumbnailUrl: exercise.exercise?.thumbnailUrl || exercise.exerciseThumbnailUrl,
      exerciseMuscleGroups: exercise.exercise?.muscleGroups || exercise.exerciseMuscleGroups,
      exerciseInstructions: exercise.exercise?.instructions || exercise.exerciseInstructions,
    })
  );
};

// Convert Firestore document to Workout
const docToWorkout = (id: string, data: WorkoutDocument): Workout => ({
  id,
  name: data.name,
  type: data.type,
  stages: data.stages || [],
  exercises: data.exercises || [],
  notes: data.notes,
  authorId: data.authorId,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Get all workouts
export const getAllWorkouts = async (): Promise<Workout[]> => {
  if (allWorkoutsCache && Date.now() - allWorkoutsCache.ts < CACHE_TTL) {
    return allWorkoutsCache.data;
  }
  const q = query(
    collection(db, WORKOUTS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((doc) =>
    docToWorkout(doc.id, doc.data() as WorkoutDocument)
  );
  allWorkoutsCache = { data, ts: Date.now() };
  // Populate per-ID cache too
  data.forEach((w) => workoutByIdCache.set(w.id, { data: w, ts: Date.now() }));
  return data;
};

// Get single workout by ID
export const getWorkoutById = async (id: string): Promise<Workout | null> => {
  const cached = workoutByIdCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  const docRef = doc(db, WORKOUTS_COLLECTION, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  const data = docToWorkout(snapshot.id, snapshot.data() as WorkoutDocument);
  workoutByIdCache.set(id, { data, ts: Date.now() });
  return data;
};

// Create new workout
export const createWorkout = async (
  data: WorkoutFormData,
  authorId: string
): Promise<string> => {
  const workoutData: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    stages: cleanStagesForFirestore(data.stages),
    notes: data.notes || "",
    authorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Add exercises for strength workouts
  if (data.type === "strength" && data.exercises) {
    workoutData.exercises = cleanExercisesForFirestore(data.exercises);
  }

  const docRef = await addDoc(collection(db, WORKOUTS_COLLECTION), workoutData);
  invalidateWorkoutsCache();
  return docRef.id;
};

// Update existing workout
export const updateWorkout = async (
  id: string,
  data: WorkoutFormData
): Promise<void> => {
  const docRef = doc(db, WORKOUTS_COLLECTION, id);

  const updateData: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    stages: cleanStagesForFirestore(data.stages),
    notes: data.notes || "",
    updatedAt: serverTimestamp(),
  };

  // Add exercises for strength workouts
  if (data.type === "strength" && data.exercises) {
    updateData.exercises = cleanExercisesForFirestore(data.exercises);
  }

  await updateDoc(docRef, updateData);
  invalidateWorkoutsCache();
};

// Delete workout
export const deleteWorkout = async (id: string): Promise<void> => {
  const docRef = doc(db, WORKOUTS_COLLECTION, id);
  await deleteDoc(docRef);
  invalidateWorkoutsCache();
};
