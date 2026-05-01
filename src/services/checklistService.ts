import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  defaultChecklistByType,
  type ChecklistItem,
  type WorkoutChecklistInstance,
  type WorkoutChecklistTemplate,
} from "../types/checklist";
import type { WorkoutType } from "../types/workout";

const TEMPLATES_COLLECTION = "userChecklistTemplates";
const INSTANCES_COLLECTION = "workoutChecklistInstances";

const templateDocId = (userId: string, type: WorkoutType) => `${userId}_${type}`;

export const getWorkoutChecklistTemplate = async (
  userId: string,
  type: WorkoutType
): Promise<WorkoutChecklistTemplate> => {
  const ref = doc(db, TEMPLATES_COLLECTION, templateDocId(userId, type));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as { items?: ChecklistItem[] };
    return { userId, type, items: data.items || [] };
  }
  return { userId, type, items: defaultChecklistByType[type]() };
};

export const saveWorkoutChecklistTemplate = async (
  userId: string,
  type: WorkoutType,
  items: ChecklistItem[]
): Promise<void> => {
  const ref = doc(db, TEMPLATES_COLLECTION, templateDocId(userId, type));
  const cleanItems = items.map(({ id, label }) => ({ id, label }));
  await setDoc(ref, {
    userId,
    type,
    items: cleanItems,
    updatedAt: serverTimestamp(),
  });
};

export const getWorkoutChecklistInstance = async (
  assignmentId: string,
  userId: string,
  type: WorkoutType
): Promise<WorkoutChecklistInstance> => {
  const ref = doc(db, INSTANCES_COLLECTION, assignmentId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as { items?: ChecklistItem[] };
    return { assignmentId, userId, items: data.items || [] };
  }
  // Seed instance from user's template (or defaults)
  const template = await getWorkoutChecklistTemplate(userId, type);
  const items = template.items.map((it) => ({ ...it, checked: false }));
  return { assignmentId, userId, items };
};

export const saveWorkoutChecklistInstance = async (
  assignmentId: string,
  userId: string,
  items: ChecklistItem[]
): Promise<void> => {
  const ref = doc(db, INSTANCES_COLLECTION, assignmentId);
  await setDoc(ref, {
    assignmentId,
    userId,
    items,
    updatedAt: serverTimestamp(),
  });
};
