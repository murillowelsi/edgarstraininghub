import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    TextInput,
    Alert,
    BackHandler,
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
import { getAthleteAssignments, getAllExercises, completeWorkoutWithProgress } from '@/services/athleteService';
import type { AssignmentWithWorkout, Exercise, WorkoutExercise } from '@/types/workout';
import { WebView } from 'react-native-webview';

// Format time as MM:SS
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Types for tracking
interface SetProgress {
    setNumber: number;
    reps: string;
    weight: string;
    completed: boolean;
}

interface ExerciseProgress {
    exerciseId: string;
    sets: SetProgress[];
    exerciseTime: number;
}

export default function WorkoutSessionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

    const [assignment, setAssignment] = useState<AssignmentWithWorkout | null>(null);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Workout State
    const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
    const [totalElapsedTime, setTotalElapsedTime] = useState(0);
    const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
    const [exerciseProgress, setExerciseProgress] = useState<Map<string, ExerciseProgress>>(new Map());

    // Modal for video/gif
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<any>(null);

    // Timers
    const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (id && user) {
            loadData();
        }
        // Handle back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => {
            backHandler.remove();
            stopTimers();
        };
    }, [id, user]);

    const stopTimers = () => {
        if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
        totalTimerRef.current = null;
        exerciseTimerRef.current = null;
    };

    const handleBackPress = () => {
        Alert.alert(
            'Exit Workout?',
            'Your progress will be lost unless you save.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Exit',
                    style: 'destructive',
                    onPress: () => {
                        stopTimers();
                        router.back();
                    }
                }
            ]
        );
        return true;
    };

    const loadData = async () => {
        try {
            const [assignments, allExercises] = await Promise.all([
                getAthleteAssignments(user?.uid || ''),
                getAllExercises()
            ]);

            setExercises(allExercises as Exercise[]);

            const found = assignments.find(a => a.id === id);
            if (found && found.workout.type === 'strength') {
                setAssignment(found);

                // Initialize progress
                const initialProgress = new Map<string, ExerciseProgress>();
                found.workout.exercises?.forEach(we => {
                    const sets: SetProgress[] = Array.from({ length: we.sets }, (_, i) => ({
                        setNumber: i + 1,
                        reps: '',
                        weight: '',
                        completed: false
                    }));
                    initialProgress.set(we.id, {
                        exerciseId: we.exerciseId,
                        sets,
                        exerciseTime: 0
                    });
                });
                setExerciseProgress(initialProgress);
                startWorkout();
            } else {
                Alert.alert('Error', 'Workout not found or not supported');
                router.back();
            }
        } catch (error) {
            console.error('Error loading session:', error);
            Alert.alert('Error', 'Failed to load workout session');
        } finally {
            setLoading(false);
        }
    };

    const startWorkout = useCallback(() => {
        if (isWorkoutStarted) return;
        setIsWorkoutStarted(true);
        totalTimerRef.current = setInterval(() => {
            setTotalElapsedTime(prev => prev + 1);
        }, 1000);
    }, [isWorkoutStarted]);

    const handleStartExerciseTimer = (exerciseId: string) => {
        if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
        setActiveExerciseId(exerciseId);
        exerciseTimerRef.current = setInterval(() => {
            setExerciseProgress(prev => {
                const newMap = new Map(prev);
                const progress = newMap.get(exerciseId);
                if (progress) {
                    newMap.set(exerciseId, {
                        ...progress,
                        exerciseTime: progress.exerciseTime + 1
                    });
                }
                return newMap;
            });
        }, 1000);
    };

    const handleStopExerciseTimer = () => {
        if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
        setActiveExerciseId(null);
    };

    const handleUpdateSet = (exerciseId: string, setIndex: number, field: 'reps' | 'weight', value: string) => {
        setExerciseProgress(prev => {
            const newMap = new Map(prev);
            const progress = newMap.get(exerciseId);
            if (progress) {
                const newSets = [...progress.sets];
                newSets[setIndex] = { ...newSets[setIndex], [field]: value };
                newMap.set(exerciseId, { ...progress, sets: newSets });
            }
            return newMap;
        });
    };

    const handleToggleSetComplete = (exerciseId: string, setIndex: number) => {
        setExerciseProgress(prev => {
            const newMap = new Map(prev);
            const progress = newMap.get(exerciseId);
            if (progress) {
                const newSets = [...progress.sets];
                newSets[setIndex] = { ...newSets[setIndex], completed: !newSets[setIndex].completed };
                newMap.set(exerciseId, { ...progress, sets: newSets });
            }
            return newMap;
        });
    };

    const handleAddSet = (exerciseId: string) => {
        setExerciseProgress(prev => {
            const newMap = new Map(prev);
            const progress = newMap.get(exerciseId);
            if (progress) {
                const newSet: SetProgress = {
                    setNumber: progress.sets.length + 1,
                    reps: '',
                    weight: '',
                    completed: false
                };
                newMap.set(exerciseId, { ...progress, sets: [...progress.sets, newSet] });
            }
            return newMap;
        });
    };

    const getCompletionPercentage = () => {
        let totalSets = 0;
        let completedSets = 0;
        exerciseProgress.forEach(progress => {
            totalSets += progress.sets.length;
            completedSets += progress.sets.filter(s => s.completed).length;
        });
        return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    };

    const handleSave = async () => {
        if (!assignment) return;

        stopTimers();
        setSaving(true);
        try {
            const progressData = Array.from(exerciseProgress.entries()).map(([, progress]) => ({
                exerciseId: progress.exerciseId,
                sets: progress.sets.map(set => ({
                    setNumber: set.setNumber,
                    reps: set.reps,
                    weight: set.weight,
                    completed: set.completed
                }))
            }));

            const completionPercentage = getCompletionPercentage();

            await completeWorkoutWithProgress(
                assignment.id,
                progressData,
                completionPercentage,
                totalElapsedTime
            );

            Alert.alert('Success', 'Workout completed!');
            router.replace('/workouts-list');
        } catch (error) {
            console.error('Error saving workout:', error);
            Alert.alert('Error', 'Failed to save workout');
            setSaving(false);
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!assignment) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.timerContainer}>
                    <Text style={styles.timerLabel}>Total Time</Text>
                    <Text style={styles.timerValue}>{formatTime(totalElapsedTime)}</Text>
                </View>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
                    {saving ? <ActivityIndicator color={colors.tint} /> : <Text style={styles.saveText}>Finish</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {assignment.workout.exercises?.map((we, index) => {
                    const progress = exerciseProgress.get(we.id);
                    if (!progress) return null;

                    const isActive = activeExerciseId === we.id;
                    const allComplete = progress.sets.every(s => s.completed);

                    return (
                        <View key={we.id} style={[styles.card, isActive && styles.activeCard, allComplete && styles.completedCard]}>
                            <TouchableOpacity onPress={() => openExerciseDetails(we)} style={styles.exerciseHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exerciseName}>{we.exerciseName}</Text>
                                    <Text style={styles.exerciseMeta}>{we.sets} sets × {we.reps} reps</Text>
                                </View>
                                <Ionicons name="information-circle-outline" size={24} color={colors.tint} />
                            </TouchableOpacity>

                            {/* Timer Control */}
                            <View style={styles.exerciseTimerRow}>
                                <View style={styles.row}>
                                    <Ionicons name="timer-outline" size={20} color={isActive ? colors.tint : colors.icon} />
                                    <Text style={[styles.exerciseTimerText, isActive && { color: colors.tint }]}>
                                        {formatTime(progress.exerciseTime)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => isActive ? handleStopExerciseTimer() : handleStartExerciseTimer(we.id)}
                                    style={[styles.timerButton, isActive ? styles.stopButton : styles.startButton]}
                                >
                                    <Ionicons name={isActive ? "stop" : "play"} size={16} color="#FFF" />
                                    <Text style={styles.timerButtonText}>{isActive ? "Stop" : "Start"}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Sets */}
                            <View style={styles.setsContainer}>
                                <View style={styles.setHeaderRow}>
                                    <Text style={styles.setHeaderText}>SET</Text>
                                    <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                                    <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>KG</Text>
                                    <View style={{ width: 40 }} />
                                </View>
                                {progress.sets.map((set, setIndex) => (
                                    <View key={setIndex} style={[styles.setRow, set.completed && styles.completedSetRow]}>
                                        <Text style={styles.setNumber}>{set.setNumber}</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={set.reps}
                                            onChangeText={(text) => handleUpdateSet(we.id, setIndex, 'reps', text)}
                                            placeholder={we.reps}
                                            placeholderTextColor={colors.icon}
                                            keyboardType="numeric"
                                            editable={!set.completed}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            value={set.weight}
                                            onChangeText={(text) => handleUpdateSet(we.id, setIndex, 'weight', text)}
                                            placeholder="0"
                                            placeholderTextColor={colors.icon}
                                            keyboardType="numeric"
                                            editable={!set.completed}
                                        />
                                        <TouchableOpacity
                                            onPress={() => handleToggleSetComplete(we.id, setIndex)}
                                            style={[styles.checkButton, set.completed && styles.checkButtonActive]}
                                        >
                                            <Ionicons name="checkmark" size={20} color={set.completed ? "#FFF" : colors.icon} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity onPress={() => handleAddSet(we.id)} style={styles.addSetButton}>
                                <Ionicons name="add" size={16} color={colors.tint} />
                                <Text style={styles.addSetText}>Add Set</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
                <View style={{ height: 40 }} />
            </ScrollView>

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

const getYouTubeVideoId = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

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
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerButton: {
        padding: 8,
    },
    timerContainer: {
        alignItems: 'center',
    },
    timerLabel: {
        fontSize: 10,
        color: colors.icon,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    timerValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.tint,
        fontVariant: ['tabular-nums'],
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.tint,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeCard: {
        borderColor: colors.tint,
        borderWidth: 2,
    },
    completedCard: {
        borderColor: '#059669',
        backgroundColor: isDark ? 'rgba(5, 150, 105, 0.1)' : '#ECFDF5',
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    exerciseName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    exerciseMeta: {
        fontSize: 14,
        color: colors.icon,
    },
    exerciseTimerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F3F4F6',
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    exerciseTimerText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        fontVariant: ['tabular-nums'],
    },
    timerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    startButton: {
        backgroundColor: colors.tint,
    },
    stopButton: {
        backgroundColor: '#DC2626', // Red
    },
    timerButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    setsContainer: {
        gap: 8,
    },
    setHeaderRow: {
        flexDirection: 'row',
        paddingHorizontal: 4,
        marginBottom: 4,
    },
    setHeaderText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.icon,
        textTransform: 'uppercase',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    completedSetRow: {
        opacity: 0.6,
    },
    setNumber: {
        width: 24,
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        height: 36,
        backgroundColor: isDark ? colors.background : '#FFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        textAlign: 'center',
        color: colors.text,
        fontSize: 14,
    },
    checkButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? colors.background : '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    checkButtonActive: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        marginTop: 8,
        gap: 4,
    },
    addSetText: {
        color: colors.tint,
        fontSize: 14,
        fontWeight: '600',
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
});
