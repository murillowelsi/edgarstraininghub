import { collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AssignmentWithWorkout, WorkoutAssignmentDocument, WorkoutDocument } from '../types/workout';

export const getAthleteProfile = async (userId: string) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                id: userDoc.id,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Athlete',
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching athlete profile:', error);
        return null;
    }
};

export const toggleAssignmentComplete = async (
    id: string,
    completed: boolean
): Promise<void> => {
    try {
        const docRef = doc(db, 'workoutAssignments', id);
        await updateDoc(docRef, {
            completedAt: completed ? serverTimestamp() : null,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error toggling assignment completion:', error);
        throw error;
    }
};

export const getAthleteAssignments = async (userId: string): Promise<AssignmentWithWorkout[]> => {
    try {
        const assignmentsRef = collection(db, 'workoutAssignments');
        // Note: Composite index might be required for complex queries. 
        // Simple query first: get all assignments for athlete
        const q = query(
            assignmentsRef,
            where('athleteId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const assignments: AssignmentWithWorkout[] = [];

        // We need to fetch workout details for each assignment
        // To optimize, we could batch fetch or cache workouts, but simple loop is fine for fewer items
        for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data() as WorkoutAssignmentDocument;

            // Fetch workout details
            const workoutRef = doc(db, 'workouts', data.workoutId);
            const workoutSnap = await getDoc(workoutRef);

            if (workoutSnap.exists()) {
                const workoutData = workoutSnap.data() as WorkoutDocument;

                assignments.push({
                    id: docSnapshot.id,
                    workoutId: data.workoutId,
                    athleteId: data.athleteId,
                    scheduledDate: data.scheduledDate?.toDate() || new Date(),
                    assignedBy: data.assignedBy,
                    completedAt: data.completedAt?.toDate() || null,
                    completionPercentage: data.completionPercentage,
                    totalTime: data.totalTime,
                    progressData: data.progressData,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    workout: {
                        id: workoutSnap.id,
                        name: workoutData.name,
                        type: workoutData.type,
                        stages: workoutData.stages || [],
                        exercises: workoutData.exercises || [],
                        notes: workoutData.notes,
                        authorId: workoutData.authorId,
                        createdAt: workoutData.createdAt?.toDate() || new Date(),
                        updatedAt: workoutData.updatedAt?.toDate() || new Date(),
                    }
                });
            }
        }

        return assignments.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
};

export const getAllExercises = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'exercises'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching exercises:', error);
        return [];
    }
};

export const completeWorkoutWithProgress = async (
    assignmentId: string,
    progressData: any[],
    completionPercentage: number,
    totalTime: number
) => {
    try {
        const docRef = doc(db, 'workoutAssignments', assignmentId);
        await updateDoc(docRef, {
            completedAt: serverTimestamp(),
            progressData,
            completionPercentage,
            totalTime,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error completing workout with progress:', error);
        throw error;
    }
};
