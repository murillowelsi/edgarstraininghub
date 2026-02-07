import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
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

        // Sort by date (descending or ascending) - let's do ascending scheduled date
        return assignments.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
};
