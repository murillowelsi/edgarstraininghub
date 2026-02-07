import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Modal,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { getAthleteAssignments, getAllExercises, toggleAssignmentComplete } from '@/services/athleteService';
import type { AssignmentWithWorkout, Exercise, WorkoutExercise } from '@/types/workout';
import { WebView } from 'react-native-webview';

const workoutTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    running: 'walk',
    cycling: 'bicycle',
    swimming: 'water',
    strength: 'barbell',
};

const workoutTypeColors: Record<string, { bg: string; text: string; border: string }> = {
    running: { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE' },
    cycling: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
    swimming: { bg: '#CFFAFE', text: '#0891B2', border: '#A5F3FC' },
    strength: { bg: '#FED7AA', text: '#EA580C', border: '#FDBA74' },
};

const getYouTubeVideoId = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

export default function WorkoutDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

    const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (id && user) {
            loadData();
        }
    }, [id, user]);

    const loadData = async () => {
        try {
            const [assignments, allExercises] = await Promise.all([
                getAthleteAssignments(user?.uid || ''),
                getAllExercises()
            ]);

            setExercises(allExercises as Exercise[]);

            const found = assignments.find(a => a.id === id);
            if (found) {
                setAssignment(found);
            } else {
                router.back();
            }
        } catch (error) {
            console.error('Error loading workout:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async () => {
        if (!assignment) return;

        setCompleting(true);
        try {
            const newStatus = !assignment.completedAt;
            await toggleAssignmentComplete(assignment.id, newStatus);

            setAssignment({
                ...assignment,
                completedAt: newStatus ? new Date() : null
            });
        } catch (error) {
            console.error('Error toggling status:', error);
        } finally {
            setCompleting(false);
        }
    };

    const openExerciseDetails = (workoutExercise: any) => {
        const fullDetails = exercises.find(e => e.id === workoutExercise.exerciseId || e.name === workoutExercise.exerciseName);
        setSelectedExercise({
            ...workoutExercise,
            ...fullDetails,
            name: fullDetails?.name || workoutExercise.exerciseName || 'Exercise',
            gifUrl: fullDetails?.gifUrl || workoutExercise.exerciseGifUrl,
            videoUrl: fullDetails?.videoUrl || workoutExercise.exerciseVideoUrl,
        });
        setModalVisible(true);
    };

    const toggleExerciseExpanded = (exerciseId: string) => {
        setExpandedExercises(prev => {
            const newSet = new Set(prev);
            if (newSet.has(exerciseId)) {
                newSet.delete(exerciseId);
            } else {
                newSet.add(exerciseId);
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!assignment) return null;

    const workout = assignment.workout;
    const isCompleted = !!assignment.completedAt;
    const typeStyle = workoutTypeColors[workout.type] || workoutTypeColors.strength;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{workout.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Workout Header Card */}
                <View style={[styles.workoutCard, isCompleted && styles.workoutCardCompleted]}>
                    <View style={styles.workoutHeader}>
                        <TouchableOpacity
                            onPress={handleToggleComplete}
                            disabled={completing}
                            style={styles.checkButton}
                        >
                            {completing ? (
                                <ActivityIndicator size="small" color={colors.icon} />
                            ) : isCompleted ? (
                                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                            ) : (
                                <Ionicons name="ellipse-outline" size={32} color={colors.icon} />
                            )}
                        </TouchableOpacity>
                        <View style={styles.workoutInfo}>
                            <Text style={[styles.workoutName, isCompleted && styles.workoutNameCompleted]}>
                                {workout.name}
                            </Text>
                            <View style={styles.badgeRow}>
                                <View style={[styles.badge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
                                    <Ionicons name={workoutTypeIcons[workout.type]} size={12} color={typeStyle.text} />
                                    <Text style={[styles.badgeText, { color: typeStyle.text }]}>{workout.type}</Text>
                                </View>
                                {isCompleted && (
                                    <View style={styles.completedBadge}>
                                        <Ionicons name="checkmark" size={12} color="#059669" />
                                        <Text style={styles.completedBadgeText}>
                                            {assignment.completionPercentage !== undefined
                                                ? `${assignment.completionPercentage}% Completed`
                                                : 'Completed'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="calendar-outline" size={16} color={colors.icon} />
                                    <Text style={styles.metaText}>{format(assignment.scheduledDate, 'EEEE, MMM d')}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="layers-outline" size={16} color={colors.icon} />
                                    <Text style={styles.metaText}>
                                        {workout.type === 'strength'
                                            ? `${workout.exercises?.length || 0} exercises`
                                            : `${workout.stages?.length || 0} stages`}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    {workout.notes && (
                        <View style={styles.notesContainer}>
                            <Text style={styles.notesText}>{workout.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Exercises List */}
                {workout.type === 'strength' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Exercises ({workout.exercises?.length || 0})</Text>
                        {workout.exercises?.map((workoutExercise, index) => {
                            const exercise = exercises.find(e => e.id === workoutExercise.exerciseId || e.name === workoutExercise.exerciseName);
                            const exerciseName = exercise?.name || workoutExercise.exerciseName || 'Exercise';
                            const muscleGroups = exercise?.muscleGroups || workoutExercise.exerciseMuscleGroups;
                            const isExpanded = expandedExercises.has(workoutExercise.id);

                            return (
                                <View key={workoutExercise.id} style={styles.exerciseCard}>
                                    <TouchableOpacity
                                        onPress={() => toggleExerciseExpanded(workoutExercise.id)}
                                        style={styles.exerciseHeader}
                                    >
                                        <View style={styles.exerciseNumber}>
                                            <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                                        </View>
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>{exerciseName}</Text>
                                            <Text style={styles.exerciseMeta}>
                                                {workoutExercise.sets} sets × {workoutExercise.reps || '10'} reps
                                                {workoutExercise.restSeconds > 0 && ` · ${workoutExercise.restSeconds}s rest`}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                                            size={20}
                                            color={colors.icon}
                                        />
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.exerciseDetails}>
                                            {/* Inline Media */}
                                            {(exercise?.gifUrl || workoutExercise.exerciseGifUrl || exercise?.videoUrl || workoutExercise.exerciseVideoUrl) ? (
                                                <View style={styles.inlineMediaContainer}>
                                                    {(exercise?.gifUrl || workoutExercise.exerciseGifUrl) ? (
                                                        <Image
                                                            source={{ uri: exercise?.gifUrl || workoutExercise.exerciseGifUrl }}
                                                            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                                        />
                                                    ) : (
                                                        <WebView
                                                            style={{ flex: 1 }}
                                                            javaScriptEnabled={true}
                                                            domStorageEnabled={true}
                                                            source={{ uri: `https://www.youtube.com/embed/${getYouTubeVideoId(exercise?.videoUrl || workoutExercise.exerciseVideoUrl)}?rel=0` }}
                                                        />
                                                    )}
                                                </View>
                                            ) : null}

                                            <View style={styles.detailsGrid}>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>SETS</Text>
                                                    <Text style={styles.detailValue}>{workoutExercise.sets}</Text>
                                                </View>
                                                <View style={styles.detailItem}>
                                                    <Text style={styles.detailLabel}>REPS</Text>
                                                    <Text style={styles.detailValue}>{workoutExercise.reps || '10'}</Text>
                                                </View>
                                                {workoutExercise.restSeconds > 0 && (
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>REST</Text>
                                                        <Text style={styles.detailValue}>{workoutExercise.restSeconds}s</Text>
                                                    </View>
                                                )}
                                                {workoutExercise.weight && (
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>WEIGHT</Text>
                                                        <Text style={styles.detailValue}>{workoutExercise.weight}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {muscleGroups && muscleGroups.length > 0 && (
                                                <View style={styles.muscleGroupsContainer}>
                                                    {muscleGroups.map((mg: string) => (
                                                        <View key={mg} style={styles.muscleGroupBadge}>
                                                            <Text style={styles.muscleGroupText}>{mg}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            {workoutExercise.notes && (
                                                <View style={styles.exerciseNotes}>
                                                    <Text style={styles.detailLabel}>NOTES</Text>
                                                    <Text style={styles.notesText}>{workoutExercise.notes}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Action Button */}
            {workout.type === 'strength' && !isCompleted && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={() => router.push(`/session/${id}`)}
                    >
                        <Ionicons name="play" size={20} color="#000" />
                        <Text style={styles.startButtonText}>Start Workout</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Exercise Details Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            {(selectedExercise?.gifUrl || selectedExercise?.videoUrl) ? (
                                <View style={styles.mediaContainer}>
                                    {selectedExercise.gifUrl ? (
                                        <Image
                                            source={{ uri: selectedExercise.gifUrl }}
                                            style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                        />
                                    ) : (
                                        <WebView
                                            style={{ flex: 1 }}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            source={{ uri: `https://www.youtube.com/embed/${getYouTubeVideoId(selectedExercise.videoUrl)}?rel=0` }}
                                        />
                                    )}
                                </View>
                            ) : (
                                <View style={[styles.mediaContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card }]}>
                                    <Ionicons name="images-outline" size={48} color={colors.icon} />
                                    <Text style={{ color: colors.icon, marginTop: 8 }}>No media available</Text>
                                </View>
                            )}

                            <View style={styles.instructionsContainer}>
                                <Text style={styles.instructionsTitle}>Instructions</Text>
                                <Text style={styles.instructionsText}>
                                    {selectedExercise?.instructions || selectedExercise?.exerciseInstructions || 'No instructions available.'}
                                </Text>
                            </View>

                            <View style={styles.targetMuscleContainer}>
                                <Text style={styles.targetMuscleTitle}>Target Muscles</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {(selectedExercise?.muscleGroups || []).map((mg: string) => (
                                        <View key={mg} style={styles.muscleBadge}>
                                            <Text style={styles.muscleBadgeText}>{mg}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 44, // Fixed height for standard header feel
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    content: {
        flex: 1,
    },
    workoutCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        margin: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    workoutCardCompleted: {
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0',
    },
    workoutHeader: {
        flexDirection: 'row',
        gap: 16,
    },
    checkButton: {
        marginTop: 4,
    },
    workoutInfo: {
        flex: 1,
    },
    workoutName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    workoutNameCompleted: {
        textDecorationLine: 'line-through',
        color: colors.icon,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    completedBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        color: colors.icon,
    },
    notesContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
        borderRadius: 8,
    },
    notesText: {
        fontSize: 14,
        color: colors.icon,
        lineHeight: 20,
    },
    section: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    exerciseCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
        borderLeftColor: '#EA580C',
        overflow: 'hidden',
    },
    exerciseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    exerciseNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FED7AA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    exerciseNumberText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EA580C',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    exerciseMeta: {
        fontSize: 14,
        color: colors.icon,
    },
    exerciseDetails: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
        gap: 12,
    },
    videoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
    },
    videoButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.tint,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    detailItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.icon,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    muscleGroupsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    muscleGroupBadge: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    muscleGroupText: {
        fontSize: 12,
        color: colors.text,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    exerciseNotes: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F59E0B',
        paddingVertical: 16,
        borderRadius: 12,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        width: '100%',
        maxHeight: '90%',
        backgroundColor: colors.card,
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        flex: 1,
    },
    modalBody: {
        padding: 16,
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
    },
    instructionsContainer: {
        marginBottom: 20,
    },
    instructionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.icon,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    instructionsText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    targetMuscleContainer: {
        marginBottom: 20,
    },
    targetMuscleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.icon,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    muscleBadge: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    muscleBadgeText: {
        fontSize: 12,
        color: colors.text,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    inlineMediaContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
});
