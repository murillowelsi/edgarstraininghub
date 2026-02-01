import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type {
  AssignmentWithDetails,
  AssignmentWithWorkout,
  WorkoutAssignment,
  WorkoutAssignmentDocument,
  WorkoutAssignmentFormData,
} from "../types/workoutAssignment";
import { getUserById } from "./usersService";
import { getAllWorkouts, getWorkoutById } from "./workoutsService";

const ASSIGNMENTS_COLLECTION = "workoutAssignments";

// Convert Firestore document to WorkoutAssignment
const docToAssignment = (
  id: string,
  data: WorkoutAssignmentDocument
): WorkoutAssignment => ({
  id,
  workoutId: data.workoutId,
  athleteId: data.athleteId,
  scheduledDate: data.scheduledDate?.toDate() || new Date(),
  assignedBy: data.assignedBy,
  completedAt: data.completedAt?.toDate() || null,
  createdAt: data.createdAt?.toDate() || new Date(),
  updatedAt: data.updatedAt?.toDate() || new Date(),
});

// Create assignments for multiple athletes
export const createAssignments = async (
  data: WorkoutAssignmentFormData,
  assignedBy: string
): Promise<string[]> => {
  const ids: string[] = [];

  for (const athleteId of data.athleteIds) {
    const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), {
      workoutId: data.workoutId,
      athleteId,
      scheduledDate: Timestamp.fromDate(data.scheduledDate),
      assignedBy,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    ids.push(docRef.id);
  }

  return ids;
};

// Mark assignment as complete or incomplete
export const toggleAssignmentComplete = async (
  id: string,
  completed: boolean
): Promise<void> => {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
  await updateDoc(docRef, {
    completedAt: completed ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
};

// Get assignments for a specific athlete
export const getAssignmentsByAthlete = async (
  athleteId: string
): Promise<WorkoutAssignment[]> => {
  const q = query(
    collection(db, ASSIGNMENTS_COLLECTION),
    where("athleteId", "==", athleteId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) =>
    docToAssignment(doc.id, doc.data() as WorkoutAssignmentDocument)
  );
};

// Get assignments with workout details for an athlete
export const getAssignmentsWithWorkoutsByAthlete = async (
  athleteId: string
): Promise<AssignmentWithWorkout[]> => {
  const assignments = await getAssignmentsByAthlete(athleteId);
  const assignmentsWithWorkouts: AssignmentWithWorkout[] = [];

  for (const assignment of assignments) {
    const workout = await getWorkoutById(assignment.workoutId);
    if (workout) {
      assignmentsWithWorkouts.push({
        ...assignment,
        workout,
      });
    }
  }

  // Sort by scheduled date (ascending)
  return assignmentsWithWorkouts.sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
  );
};

// Delete a single assignment
export const deleteAssignment = async (id: string): Promise<void> => {
  const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
  await deleteDoc(docRef);
};

// Delete all assignments for a specific workout (cascade delete)
export const deleteAssignmentsByWorkout = async (
  workoutId: string
): Promise<void> => {
  const q = query(
    collection(db, ASSIGNMENTS_COLLECTION),
    where("workoutId", "==", workoutId)
  );
  const snapshot = await getDocs(q);

  for (const docSnapshot of snapshot.docs) {
    await deleteDoc(docSnapshot.ref);
  }
};

// Get all assignments (for admin calendar)
export const getAllAssignments = async (): Promise<WorkoutAssignment[]> => {
  const snapshot = await getDocs(collection(db, ASSIGNMENTS_COLLECTION));
  return snapshot.docs.map((doc) =>
    docToAssignment(doc.id, doc.data() as WorkoutAssignmentDocument)
  );
};

// Get all assignments with workout and athlete details (for admin calendar)
export const getAllAssignmentsWithDetails = async (): Promise<
  AssignmentWithDetails[]
> => {
  const [assignments, workouts] = await Promise.all([
    getAllAssignments(),
    getAllWorkouts(),
  ]);

  // Create a map of workouts by ID for quick lookup
  const workoutMap = new Map(workouts.map((w) => [w.id, w]));

  // Get unique athlete IDs
  const athleteIds = [...new Set(assignments.map((a) => a.athleteId))];

  // Fetch all athletes in parallel
  const athletes = await Promise.all(athleteIds.map((id) => getUserById(id)));
  const athleteMap = new Map(
    athletes.filter((a) => a !== null).map((a) => [a!.id, a!])
  );

  // Combine assignments with workout and athlete details
  const assignmentsWithDetails: AssignmentWithDetails[] = [];

  for (const assignment of assignments) {
    const workout = workoutMap.get(assignment.workoutId);
    const athlete = athleteMap.get(assignment.athleteId);

    if (workout && athlete) {
      assignmentsWithDetails.push({
        ...assignment,
        workout,
        athlete,
      });
    }
  }

  // Sort by scheduled date (ascending)
  return assignmentsWithDetails.sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
  );
};
