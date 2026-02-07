import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { format, addDays, isSameDay, isToday, isTomorrow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

// Mock types
interface AssignmentWithWorkout {
    id: string;
    scheduledDate: Date;
    completedAt: Date | null;
    completionPercentage?: number;
    workout: {
        id: string;
        name: string;
        type: 'running' | 'cycling' | 'swimming' | 'strength';
        stages: any[];
        exercises?: any[];
    };
}

const workoutTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    running: 'walk',
    cycling: 'bicycle',
    swimming: 'water',
    strength: 'barbell',
};

const workoutTypeColors: Record<string, { bg: string; text: string }> = {
    running: { bg: '#DBEAFE', text: '#2563EB' },
    cycling: { bg: '#D1FAE5', text: '#059669' },
    swimming: { bg: '#CFFAFE', text: '#0891B2' },
    strength: { bg: '#FED7AA', text: '#EA580C' },
};

export default function AthleteCalendarView() {
    const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const todayRef = useRef<View>(null);

    // Generate 60 days (7 days back, 53 days forward)
    const today = new Date();
    const days = Array.from({ length: 60 }, (_, i) => addDays(today, i - 7));

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // TODO: Replace with actual API calls
            // const data = await getAssignmentsWithWorkoutsByAthlete(user.uid);
            setAssignments([]);
        } catch (error) {
            console.error('Error loading assignments:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getAssignmentsForDate = (date: Date) =>
        assignments.filter((a) => isSameDay(a.scheduledDate, date));

    const formatDateLabel = (date: Date) => {
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        return format(date, 'EEEE');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Calendar</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Sticky Sub-header */}
            <View style={styles.subHeader}>
                <Text style={styles.monthTitle}>{format(new Date(), 'MMMM yyyy')}</Text>
                <TouchableOpacity onPress={handleRefresh}>
                    <Ionicons
                        name="refresh"
                        size={20}
                        color={refreshing ? '#3B82F6' : '#6B7280'}
                    />
                </TouchableOpacity>
            </View>

            {/* Calendar List */}
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {days.map((day) => {
                    const dayAssignments = getAssignmentsForDate(day);
                    const isTodayDate = isToday(day);
                    const hasWorkouts = dayAssignments.length > 0;

                    return (
                        <View
                            key={day.toISOString()}
                            ref={isTodayDate ? todayRef : undefined}
                            style={[styles.dayContainer, isTodayDate && styles.todayContainer]}
                        >
                            {/* Date Header */}
                            <View style={styles.dateHeader}>
                                {isTodayDate && <View style={styles.todayIndicator} />}
                                <View style={styles.dateInfo}>
                                    <Text
                                        style={[
                                            styles.dayLabel,
                                            isTodayDate && styles.todayLabel,
                                        ]}
                                    >
                                        {formatDateLabel(day)}
                                    </Text>
                                    <Text style={styles.dateText}>{format(day, 'MMM d')}</Text>
                                </View>
                                {hasWorkouts && (
                                    <View style={styles.workoutCountBadge}>
                                        <Text style={styles.workoutCountText}>
                                            {dayAssignments.length} workout{dayAssignments.length > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Workouts for this day */}
                            {hasWorkouts && (
                                <View style={styles.workoutsContainer}>
                                    {dayAssignments.map((assignment) => {
                                        const workout = assignment.workout;
                                        const iconName = workoutTypeIcons[workout.type] || 'fitness';
                                        const colors = workoutTypeColors[workout.type] || workoutTypeColors.strength;
                                        const isCompleted = !!assignment.completedAt;

                                        return (
                                            <TouchableOpacity
                                                key={assignment.id}
                                                style={[
                                                    styles.workoutCard,
                                                    isCompleted && styles.workoutCardCompleted,
                                                ]}
                                                onPress={() => router.push(`/(athlete)/workout/${assignment.id}`)}
                                            >
                                                <View
                                                    style={[
                                                        styles.workoutIcon,
                                                        {
                                                            backgroundColor: isCompleted ? '#D1FAE5' : colors.bg,
                                                        },
                                                    ]}
                                                >
                                                    {isCompleted ? (
                                                        <Ionicons name="checkmark" size={20} color="#059669" />
                                                    ) : (
                                                        <Ionicons name={iconName} size={20} color={colors.text} />
                                                    )}
                                                </View>
                                                <View style={styles.workoutInfo}>
                                                    <Text
                                                        style={[
                                                            styles.workoutName,
                                                            isCompleted && styles.workoutNameCompleted,
                                                        ]}
                                                    >
                                                        {workout.name}
                                                    </Text>
                                                    <Text style={styles.workoutDetails}>
                                                        {workout.type === 'strength'
                                                            ? `${workout.exercises?.length || 0} exercises`
                                                            : `${workout.stages.length} stages`}{' '}
                                                        · <Text style={styles.workoutType}>{workout.type}</Text>
                                                    </Text>
                                                </View>
                                                {isCompleted ? (
                                                    <View style={styles.completedBadge}>
                                                        <Text style={styles.completedBadgeText}>
                                                            {assignment.completionPercentage !== undefined
                                                                ? `${assignment.completionPercentage}%`
                                                                : 'Done'}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
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
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    headerRight: {
        width: 32,
    },
    subHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    scrollView: {
        flex: 1,
    },
    dayContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    todayContainer: {
        backgroundColor: '#EFF6FF',
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    todayIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginRight: 12,
    },
    dateInfo: {
        flex: 1,
    },
    dayLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    todayLabel: {
        color: '#3B82F6',
    },
    dateText: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 8,
    },
    workoutCountBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    workoutCountText: {
        fontSize: 12,
        color: '#6B7280',
    },
    workoutsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    workoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    workoutCardCompleted: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    workoutIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    workoutInfo: {
        flex: 1,
    },
    workoutName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    workoutNameCompleted: {
        textDecorationLine: 'line-through',
        color: '#6B7280',
    },
    workoutDetails: {
        fontSize: 12,
        color: '#6B7280',
    },
    workoutType: {
        textTransform: 'capitalize',
    },
    completedBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    completedBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
});
