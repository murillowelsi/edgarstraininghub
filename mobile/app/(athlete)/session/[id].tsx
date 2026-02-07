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

const getYouTubeVideoId = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
};

const getYouTubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [workoutStats, setWorkoutStats] = useState({ percentage: 0, time: 0 });

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

            // Show success modal
            setWorkoutStats({ percentage: completionPercentage, time: totalElapsedTime });
            setSuccessModalVisible(true);
        } catch (error) {
            console.error('Error saving workout:', error);
            Alert.alert('Error', 'Failed to save workout');
        } finally {
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

    const completionPercentage = getCompletionPercentage();

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header with Total Timer */}
            <View style={styles.headerContainer}>
                {/* Total Timer Bar */}
                <View style={styles.totalTimerBar}>
                    <Text style={styles.totalTimerLabel}>Total Time</Text>
                    <Text style={styles.totalTimerValue}>{formatTime(totalElapsedTime)}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                        {saving ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Workout Info Card */}
                <View style={styles.workoutInfoCard}>
                    <View style={styles.workoutInfoHeader}>
                        <View style={[
                            styles.completionCircle,
                            completionPercentage === 100 && styles.completionCircleComplete
                        ]}>
                            {completionPercentage === 100 && (
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.workoutTitle}>{assignment.workout.name}</Text>
                            <View style={styles.workoutMeta}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="barbell" size={16} color={colors.icon} />
                                    <Text style={styles.metaText}>{assignment.workout.exercises?.length || 0} Exercises</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.icon} />
                                    <Text style={styles.metaText}>{completionPercentage}% Complete</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${completionPercentage}%` }]} />
                    </View>
                </View>

                {/* Exercises */}
                {assignment.workout.exercises?.map((we, index) => {
                    const progress = exerciseProgress.get(we.id);
                    if (!progress) return null;

                    const exercise = exercises.find(e => e.id === we.exerciseId || e.name === we.exerciseName);
                    const isActive = activeExerciseId === we.id;
                    const completedSets = progress.sets.filter(s => s.completed).length;
                    const allComplete = completedSets === progress.sets.length;

                    const videoUrl = exercise?.videoUrl || we.exerciseVideoUrl;
                    const gifUrl = exercise?.gifUrl || we.exerciseGifUrl;
                    const videoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
                    const thumbnail = videoId ? getYouTubeThumbnail(videoId) : null;
                    const mediaUrl = gifUrl || thumbnail;
                    const hasMedia = !!mediaUrl || !!videoId;

                    // Determine left border color
                    const borderColor = isActive ? '#3B82F6' : allComplete ? '#22C55E' : '#F97316';

                    return (
                        <View key={we.id} style={[
                            styles.exerciseCard,
                            { borderLeftColor: borderColor },
                            isActive && styles.activeCard,
                            allComplete && !isActive && styles.completedCard
                        ]}>
                            {/* Exercise Header */}
                            <View style={styles.exerciseHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.exerciseName}>{we.exerciseName}</Text>
                                    <Text style={styles.exerciseMeta}>
                                        {we.sets} sets × {we.reps} reps
                                    </Text>
                                </View>
                                <View style={styles.headerActions}>
                                    {allComplete && (
                                        <View style={styles.completeBadge}>
                                            <Ionicons name="checkmark" size={12} color="#059669" />
                                            <Text style={styles.completeBadgeText}>Complete</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Media Preview */}
                            {hasMedia && (
                                <TouchableOpacity
                                    onPress={() => openExerciseDetails(we)}
                                    style={[styles.mediaPreview, gifUrl && styles.mediaPreviewSquare]}
                                >
                                    {mediaUrl && (
                                        <Image
                                            source={{ uri: mediaUrl }}
                                            style={styles.mediaImage}
                                        />
                                    )}
                                    <View style={styles.mediaOverlay} />
                                    {!gifUrl && (
                                        <View style={styles.playButtonContainer}>
                                            <View style={styles.playButton}>
                                                <Ionicons name="play" size={28} color="#000" style={{ marginLeft: 3 }} />
                                            </View>
                                        </View>
                                    )}
                                    <View style={styles.mediaLabel}>
                                        <Text style={styles.mediaLabelText}>
                                            {gifUrl ? 'View full animation' : 'Watch how to do it'}
                                        </Text>
                                        <View style={[styles.mediaBadge, gifUrl ? styles.gifBadge : styles.videoBadge]}>
                                            <Ionicons name="play" size={12} color="#FFF" />
                                            <Text style={styles.mediaBadgeText}>{gifUrl ? 'GIF' : 'Video'}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Exercise Timer */}
                            <View style={[
                                styles.timerControl,
                                isActive && styles.timerControlActive
                            ]}>
                                <View style={styles.timerInfo}>
                                    <Ionicons name="timer" size={20} color={isActive ? '#2563EB' : colors.icon} />
                                    <View>
                                        <Text style={[styles.timerLabel, isActive && styles.timerLabelActive]}>
                                            Exercise Timer
                                        </Text>
                                        <Text style={[styles.timerValue, isActive && styles.timerValueActive]}>
                                            {formatTime(progress.exerciseTime)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => isActive ? handleStopExerciseTimer() : handleStartExerciseTimer(we.id)}
                                    style={[styles.timerButton, isActive ? styles.stopTimerButton : styles.startTimerButton]}
                                >
                                    <Ionicons name={isActive ? 'stop-circle' : 'play'} size={16} color="#FFF" />
                                    <Text style={styles.timerButtonText}>{isActive ? 'Stop' : 'Start'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Rest Time Info */}
                            {we.restSeconds > 0 && (
                                <View style={styles.restInfo}>
                                    <Ionicons name="time-outline" size={16} color={colors.icon} />
                                    <Text style={styles.restText}>Rest {we.restSeconds}s between sets</Text>
                                </View>
                            )}

                            {/* Sets Table */}
                            <View style={styles.setsTable}>
                                <View style={styles.setsHeader}>
                                    <Text style={[styles.setsHeaderText, { width: 40 }]}>Set</Text>
                                    <Text style={[styles.setsHeaderText, { flex: 1 }]}>Previous</Text>
                                    <Text style={[styles.setsHeaderText, { width: 80, textAlign: 'center' }]}>Reps</Text>
                                    <Text style={[styles.setsHeaderText, { width: 80, textAlign: 'center' }]}>Kg</Text>
                                    <View style={{ width: 40 }} />
                                </View>

                                {progress.sets.map((set, setIndex) => (
                                    <View key={setIndex} style={[styles.setRow, set.completed && styles.setRowCompleted]}>
                                        <Text style={styles.setNumber}>{set.setNumber}</Text>
                                        <Text style={styles.previousText}>-</Text>
                                        <TextInput
                                            style={styles.setInput}
                                            value={set.reps}
                                            onChangeText={(text) => handleUpdateSet(we.id, setIndex, 'reps', text)}
                                            placeholder={we.reps}
                                            placeholderTextColor={colors.icon}
                                            keyboardType="numeric"
                                            editable={!set.completed}
                                        />
                                        <TextInput
                                            style={styles.setInput}
                                            value={set.weight}
                                            onChangeText={(text) => handleUpdateSet(we.id, setIndex, 'weight', text)}
                                            placeholder="0"
                                            placeholderTextColor={colors.icon}
                                            keyboardType="numeric"
                                            editable={!set.completed}
                                        />
                                        <TouchableOpacity
                                            onPress={() => handleToggleSetComplete(we.id, setIndex)}
                                            style={[styles.checkButton, set.completed && styles.checkButtonComplete]}
                                        >
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color={set.completed ? '#FFF' : colors.icon}
                                                style={{ opacity: set.completed ? 1 : 0.5 }}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            {/* Add Set Button */}
                            <TouchableOpacity onPress={() => handleAddSet(we.id)} style={styles.addSetButton}>
                                <Ionicons name="add" size={16} color={colors.tint} />
                                <Text style={styles.addSetText}>Add new set</Text>
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
                        {/* Header Overlay */}
                        <View style={styles.modalHeaderOverlay}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>{selectedExercise?.name}</Text>
                                <View style={styles.modalBadges}>
                                    {selectedExercise?.targetMuscle && (
                                        <View style={styles.modalBadgePrimary}>
                                            <Text style={styles.modalBadgePrimaryText}>{selectedExercise.targetMuscle}</Text>
                                        </View>
                                    )}
                                    {(selectedExercise?.muscleGroups || []).map((mg: string) => (
                                        <View key={mg} style={styles.modalBadgeSecondary}>
                                            <Text style={styles.modalBadgeSecondaryText}>{mg}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Media */}
                        <View style={[styles.modalMedia, selectedExercise?.gifUrl && styles.modalMediaSquare]}>
                            {selectedExercise?.gifUrl ? (
                                <Image
                                    source={{ uri: selectedExercise.gifUrl }}
                                    style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                />
                            ) : selectedExercise?.videoUrl ? (
                                <WebView
                                    style={{ flex: 1 }}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    source={{ uri: `https://www.youtube.com/embed/${getYouTubeVideoId(selectedExercise.videoUrl)}?autoplay=1&rel=0` }}
                                />
                            ) : (
                                <View style={styles.modalNoMedia}>
                                    <Ionicons name="barbell" size={48} color="rgba(255,255,255,0.6)" />
                                    <Text style={styles.modalNoMediaText}>No video available</Text>
                                </View>
                            )}
                        </View>

                        {/* Instructions */}
                        {selectedExercise?.instructions && (
                            <View style={styles.modalInstructions}>
                                <Text style={styles.modalInstructionsTitle}>HOW TO PERFORM</Text>
                                <Text style={styles.modalInstructionsText}>{selectedExercise.instructions}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={successModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => { }}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successCard}>
                        {/* Header */}
                        <View style={styles.successHeader}>
                            <Ionicons name="trophy" size={48} color="#FFD700" />
                        </View>

                        <Text style={styles.successTitle}>Workout Completed!</Text>
                        <Text style={styles.successSubtitle}>Great session! Here is your summary:</Text>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{workoutStats.percentage}%</Text>
                                <Text style={styles.statLabel}>Completion</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{formatTime(workoutStats.time)}</Text>
                                <Text style={styles.statLabel}>Duration</Text>
                            </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={() => {
                                setSuccessModalVisible(false);
                                router.replace('/workouts-list');
                            }}
                        >
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
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
    headerContainer: {
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    totalTimerBar: {
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    totalTimerLabel: {
        fontSize: 10,
        color: colors.icon,
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    totalTimerValue: {
        fontSize: 30,
        fontWeight: 'bold',
        color: colors.tint,
        fontVariant: ['tabular-nums'],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 56,
    },
    headerButton: {
        padding: 8,
    },
    cancelText: {
        fontSize: 16,
        color: colors.text,
    },
    saveButton: {
        backgroundColor: colors.tint,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    workoutInfoCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    workoutInfoHeader: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    completionCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.icon,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completionCircleComplete: {
        backgroundColor: '#22C55E',
        borderColor: '#22C55E',
    },
    workoutTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    workoutMeta: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 14,
        color: colors.icon,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 4,
    },
    exerciseCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 4,
    },
    activeCard: {
        borderWidth: 2,
        borderColor: '#3B82F6',
    },
    completedCard: {
        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.05)' : '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    exerciseName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    exerciseMeta: {
        fontSize: 14,
        color: colors.icon,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    completeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    completeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
    mediaPreview: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        marginBottom: 16,
        position: 'relative',
    },
    mediaPreviewSquare: {
        aspectRatio: 1,
        maxWidth: 300,
        alignSelf: 'center',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    mediaOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButtonContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaLabel: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    mediaLabelText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    mediaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    gifBadge: {
        backgroundColor: '#059669',
    },
    videoBadge: {
        backgroundColor: '#DC2626',
    },
    mediaBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    timerControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
        marginBottom: 16,
    },
    timerControlActive: {
        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.1)' : '#EFF6FF',
        borderColor: '#93C5FD',
    },
    timerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timerLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.icon,
    },
    timerLabelActive: {
        color: '#2563EB',
    },
    timerValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        fontVariant: ['tabular-nums'],
    },
    timerValueActive: {
        color: '#2563EB',
    },
    timerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    startTimerButton: {
        backgroundColor: '#2563EB',
    },
    stopTimerButton: {
        backgroundColor: '#DC2626',
    },
    timerButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    restInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
        borderRadius: 8,
        marginBottom: 16,
    },
    restText: {
        fontSize: 14,
        color: colors.icon,
    },
    setsTable: {
        marginBottom: 12,
    },
    setsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    setsHeaderText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.icon,
        textTransform: 'uppercase',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    setRowCompleted: {
        opacity: 0.6,
    },
    setNumber: {
        width: 40,
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    previousText: {
        flex: 1,
        fontSize: 14,
        color: colors.icon,
    },
    setInput: {
        width: 80,
        height: 40,
        backgroundColor: isDark ? colors.background : '#FFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        textAlign: 'center',
        color: colors.text,
        fontSize: 16,
    },
    checkButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: isDark ? colors.background : '#E5E7EB',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkButtonComplete: {
        backgroundColor: '#22C55E',
        borderColor: '#22C55E',
        borderStyle: 'solid',
    },
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    addSetText: {
        color: colors.tint,
        fontSize: 14,
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    modalContent: {
        flex: 1,
    },
    modalHeaderOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        padding: 16,
        paddingTop: 50,
        backgroundColor: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    modalBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    modalBadgePrimary: {
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    modalBadgePrimaryText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    modalBadgeSecondary: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    modalBadgeSecondaryText: {
        color: '#FFF',
        fontSize: 12,
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalMedia: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
    },
    modalMediaSquare: {
        aspectRatio: 1,
        maxWidth: 600,
        alignSelf: 'center',
    },
    modalNoMedia: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalNoMediaText: {
        color: 'rgba(255,255,255,0.6)',
        marginTop: 8,
    },
    modalInstructions: {
        padding: 16,
        backgroundColor: '#18181B',
    },
    modalInstructionsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    modalInstructionsText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 22,
    },
    // Success Modal Styles
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    successHeader: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: isDark ? 'rgba(255, 215, 0, 0.1)' : '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 16,
        color: colors.icon,
        textAlign: 'center',
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.icon,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
        marginHorizontal: 16,
    },
    doneButton: {
        width: '100%',
        backgroundColor: colors.tint,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
});
