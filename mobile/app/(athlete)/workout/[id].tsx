import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
    AssignmentWithWorkout,
    WorkoutAssignmentDocument,
    WorkoutDocument
} from '@/types/workout';

export default function WorkoutDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (id) {
            loadWorkoutAssignment();
        }
    }, [id]);

    const loadWorkoutAssignment = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get the assignment document
            const assignmentRef = doc(db, 'workoutAssignments', id);
            const assignmentSnap = await getDoc(assignmentRef);

            if (!assignmentSnap.exists()) {
                setError('Workout assignment not found');
                setLoading(false);
                return;
            }

            const assignmentData = assignmentSnap.data() as WorkoutAssignmentDocument;

            // Get the workout document
            const workoutRef = doc(db, 'workouts', assignmentData.workoutId);
            const workoutSnap = await getDoc(workoutRef);

            if (!workoutSnap.exists()) {
                setError('Workout not found');
                setLoading(false);
                return;
            }

            const workoutData = workoutSnap.data() as WorkoutDocument;

            // Combine assignment and workout data
            const assignmentWithWorkout: AssignmentWithWorkout = {
                id: assignmentSnap.id,
                workoutId: assignmentData.workoutId,
                athleteId: assignmentData.athleteId,
                scheduledDate: assignmentData.scheduledDate?.toDate() || new Date(),
                assignedBy: assignmentData.assignedBy,
                completedAt: assignmentData.completedAt?.toDate() || null,
                completionPercentage: assignmentData.completionPercentage,
                totalTime: assignmentData.totalTime,
                progressData: assignmentData.progressData,
                createdAt: assignmentData.createdAt?.toDate() || new Date(),
                updatedAt: assignmentData.updatedAt?.toDate() || new Date(),
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
                },
            };

            setAssignment(assignmentWithWorkout);
        } catch (error) {
            console.error('Error loading workout assignment:', error);
            setError('Failed to load workout. Please try again.');
            Alert.alert('Error', 'Failed to load workout details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </SafeAreaView>
        );
    }

    if (error || !assignment) {
        return (
            <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Workout</Text>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.emptyState}>
                    <Ionicons name="alert-circle" size={48} color="#9CA3AF" />
                    <Text style={[styles.emptyStateText, isDark && styles.emptyStateTextDark]}>
                        {error || 'Workout not found'}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={loadWorkoutAssignment}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const workout = assignment.workout;
    const isCompleted = !!assignment.completedAt;

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, isDark && styles.headerDark]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>Workout Details</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Workout Header */}
                    <View style={[styles.workoutHeader, isDark && styles.workoutHeaderDark]}>
                        <Text style={[styles.workoutTitle, isDark && styles.workoutTitleDark]}>{workout.name}</Text>
                        <Text style={[styles.workoutType, isDark && styles.workoutTypeDark]}>{workout.type}</Text>
                        <Text style={[styles.scheduledDate, isDark && styles.scheduledDateDark]}>
                            Scheduled: {format(assignment.scheduledDate, 'MMMM d, yyyy')}
                        </Text>
                    </View>

                    {/* Status Card */}
                    <View style={[styles.statusCard, isCompleted && styles.statusCardCompleted, isDark && (isCompleted ? styles.statusCardCompletedDark : styles.statusCardDark)]}>
                        <View style={styles.statusIcon}>
                            <Ionicons
                                name={isCompleted ? 'checkmark-circle' : 'time'}
                                size={32}
                                color={isCompleted ? '#059669' : '#3B82F6'}
                            />
                        </View>
                        <View style={styles.statusInfo}>
                            <Text style={[styles.statusLabel, isDark && styles.statusLabelDark]}>Status</Text>
                            <Text style={[styles.statusValue, isCompleted && styles.statusValueCompleted]}>
                                {isCompleted ? 'Completed' : 'Pending'}
                            </Text>
                            {isCompleted && assignment.completedAt && (
                                <Text style={[styles.completedDate, isDark && styles.completedDateDark]}>
                                    Completed on {format(assignment.completedAt, 'MMM d, yyyy')}
                                </Text>
                            )}
                            {assignment.totalTime && (
                                <Text style={[styles.completedDate, isDark && styles.completedDateDark]}>
                                    Duration: {Math.floor(assignment.totalTime / 60)} min {assignment.totalTime % 60} sec
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Description */}
                    {workout.notes && (
                        <View style={[styles.section, isDark && styles.sectionDark]}>
                            <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Notes</Text>
                            <Text style={[styles.description, isDark && styles.descriptionDark]}>{workout.notes}</Text>
                        </View>
                    )}

                    {/* Workout Content */}
                    <View style={[styles.section, isDark && styles.sectionDark]}>
                        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                            {workout.type === 'strength' ? 'Exercises' : 'Stages'}
                        </Text>
                        {workout.type === 'strength' ? (
                            <View style={styles.exercisesList}>
                                {workout.exercises && workout.exercises.length > 0 ? (
                                    workout.exercises.map((exercise, index) => (
                                        <View key={index} style={[styles.exerciseItem, isDark && styles.exerciseItemDark]}>
                                            <View style={styles.exerciseNumber}>
                                                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                                            </View>
                                            <View style={styles.exerciseDetails}>
                                                <Text style={[styles.exerciseName, isDark && styles.exerciseNameDark]}>
                                                    {exercise.exerciseName || 'Exercise'}
                                                </Text>
                                                <Text style={[styles.exerciseInfo, isDark && styles.exerciseInfoDark]}>
                                                    {exercise.sets && `${exercise.sets} sets`}
                                                    {exercise.reps && ` × ${exercise.reps} reps`}
                                                    {exercise.weight && ` @ ${exercise.weight}`}
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>No exercises</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.stagesList}>
                                {workout.stages && workout.stages.length > 0 ? (
                                    workout.stages.map((stage, index) => (
                                        <View key={index} style={[styles.stageItem, isDark && styles.stageItemDark]}>
                                            <View style={styles.stageNumber}>
                                                <Text style={styles.stageNumberText}>{index + 1}</Text>
                                            </View>
                                            <View style={styles.stageDetails}>
                                                <Text style={[styles.stageName, isDark && styles.stageNameDark]}>
                                                    {stage.type}
                                                </Text>
                                                <Text style={[styles.stageInfo, isDark && styles.stageInfoDark]}>
                                                    {stage.duration?.value} {stage.duration?.unit}
                                                    {stage.intensity?.value && ` at ${stage.intensity.value}${stage.intensity.unit || ''}`}
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>No stages</Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Action Button */}
                    {!isCompleted && (
                        <TouchableOpacity style={styles.startButton}>
                            <Text style={styles.startButtonText}>Start Workout</Text>
                            <Ionicons name="play" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingContainerDark: {
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerDark: {
        backgroundColor: '#1F2937',
        borderBottomColor: '#374151',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    headerTitleDark: {
        color: '#F9FAFB',
    },
    headerRight: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    workoutHeader: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    workoutHeaderDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    workoutTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    workoutTitleDark: {
        color: '#F9FAFB',
    },
    workoutType: {
        fontSize: 14,
        color: '#6B7280',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    workoutTypeDark: {
        color: '#9CA3AF',
    },
    scheduledDate: {
        fontSize: 14,
        color: '#6B7280',
    },
    scheduledDateDark: {
        color: '#9CA3AF',
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    statusCardDark: {
        backgroundColor: '#1E3A5F',
        borderColor: '#2563EB',
    },
    statusCardCompleted: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    statusCardCompletedDark: {
        backgroundColor: '#064E3B',
        borderColor: '#059669',
    },
    statusIcon: {
        marginRight: 16,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    statusLabelDark: {
        color: '#9CA3AF',
    },
    statusValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#3B82F6',
    },
    statusValueCompleted: {
        color: '#059669',
    },
    completedDate: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    completedDateDark: {
        color: '#9CA3AF',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    sectionTitleDark: {
        color: '#F9FAFB',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    descriptionDark: {
        color: '#9CA3AF',
    },
    exercisesList: {
        gap: 8,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    exerciseItemDark: {
        backgroundColor: '#111827',
    },
    exerciseNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    exerciseNumberText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    exerciseDetails: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    exerciseNameDark: {
        color: '#F9FAFB',
    },
    exerciseInfo: {
        fontSize: 12,
        color: '#6B7280',
    },
    exerciseInfoDark: {
        color: '#9CA3AF',
    },
    stagesList: {
        gap: 8,
    },
    stageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
    },
    stageItemDark: {
        backgroundColor: '#111827',
    },
    stageNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stageNumberText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    stageDetails: {
        flex: 1,
    },
    stageName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    stageNameDark: {
        color: '#F9FAFB',
    },
    stageInfo: {
        fontSize: 12,
        color: '#6B7280',
    },
    stageInfoDark: {
        color: '#9CA3AF',
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        paddingVertical: 12,
    },
    emptyTextDark: {
        color: '#9CA3AF',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        padding: 16,
        gap: 8,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 12,
        marginBottom: 16,
    },
    emptyStateTextDark: {
        color: '#9CA3AF',
    },
    retryButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
