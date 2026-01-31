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

const WORKOUTS_COLLECTION = "workouts";

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

// Convert Firestore document to Workout
const docToWorkout = (id: string, data: WorkoutDocument): Workout => ({
  id,
  name: data.name,
  type: data.type,
  stages: data.stages || [],
  notes: data.notes,
  authorId: data.authorId,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Get all workouts
export const getAllWorkouts = async (): Promise<Workout[]> => {
  const q = query(
    collection(db, WORKOUTS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) =>
    docToWorkout(doc.id, doc.data() as WorkoutDocument)
  );
};

// Get single workout by ID
export const getWorkoutById = async (id: string): Promise<Workout | null> => {
  const docRef = doc(db, WORKOUTS_COLLECTION, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return docToWorkout(snapshot.id, snapshot.data() as WorkoutDocument);
};

// Create new workout
export const createWorkout = async (
  data: WorkoutFormData,
  authorId: string
): Promise<string> => {
  const docRef = await addDoc(collection(db, WORKOUTS_COLLECTION), {
    name: data.name,
    type: data.type,
    stages: cleanStagesForFirestore(data.stages),
    notes: data.notes || "",
    authorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

// Update existing workout
export const updateWorkout = async (
  id: string,
  data: WorkoutFormData
): Promise<void> => {
  const docRef = doc(db, WORKOUTS_COLLECTION, id);

  await updateDoc(docRef, {
    name: data.name,
    type: data.type,
    stages: cleanStagesForFirestore(data.stages),
    notes: data.notes || "",
    updatedAt: serverTimestamp(),
  });
};

// Delete workout
export const deleteWorkout = async (id: string): Promise<void> => {
  const docRef = doc(db, WORKOUTS_COLLECTION, id);
  await deleteDoc(docRef);
};
