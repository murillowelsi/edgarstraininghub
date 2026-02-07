import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { format, addDays, isSameDay, isToday, startOfWeek, isAfter, isBefore, startOfDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getAthleteProfile, getAthleteAssignments } from '@/services/athleteService';
import type { AssignmentWithWorkout } from '@/types/workout';

const { width } = Dimensions.get('window');

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

export default function AthleteHome() {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState('Athlete');
    const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const weekScrollRef = useRef<ScrollView>(null);

    // Generate 2 weeks of days
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // Parallel fetch for better performance
            const [profile, assignmentsData] = await Promise.all([
                getAthleteProfile(user.uid),
                getAthleteAssignments(user.uid)
            ]);

            if (profile) {
                setDisplayName(profile.displayName || profile.firstName || 'Athlete');
            }

            setAssignments(assignmentsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const totalWorkouts = assignments.length;
    const completedWorkouts = assignments.filter((a) => a.completedAt).length;
    const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

    // Get upcoming workouts
    const upcomingWorkouts = assignments
        .filter(
            (a) =>
                !a.completedAt &&
                isAfter(a.scheduledDate, startOfDay(new Date())) &&
                isBefore(a.scheduledDate, addDays(new Date(), 7))
        )
        .slice(0, 3);

    // Get today's workouts
    const todaysWorkouts = assignments.filter((a) => isSameDay(a.scheduledDate, new Date()));
    const todaysCompleted = todaysWorkouts.filter((a) => a.completedAt).length;

    // Get workouts for selected date
    const selectedDateAssignments = assignments.filter((a) => isSameDay(a.scheduledDate, selectedDate));

    // Check if a date has workouts
    const hasWorkouts = (date: Date) => assignments.some((a) => isSameDay(a.scheduledDate, date));
    const hasIncompleteWorkouts = (date: Date) =>
        assignments.some((a) => isSameDay(a.scheduledDate, date) && !a.completedAt);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['top']}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Welcome Section */}
                    <View style={styles.welcomeSection}>
                        <Text style={styles.welcomeText}>Welcome back,</Text>
                        <Text style={styles.displayName}>{displayName}</Text>
                    </View>

                    {/* Stats Cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, styles.primaryCard]}>
                            <View style={styles.statIconContainer}>
                                <Ionicons name="radio-button-on" size={20} color="#3B82F6" />
                            </View>
                            <Text style={styles.statValue}>{completionRate}%</Text>
                            <Text style={styles.statLabel}>Completion</Text>
                        </View>

                        <View style={[styles.statCard, styles.orangeCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#FED7AA' }]}>
                                <Ionicons name="flame" size={20} color="#EA580C" />
                            </View>
                            <Text style={styles.statValue}>{completedWorkouts}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>

                        <View style={[styles.statCard, styles.blueCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                            </View>
                            <Text style={styles.statValue}>{totalWorkouts}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>

                        <View style={[styles.statCard, styles.greenCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                                <Ionicons name="trending-up" size={20} color="#059669" />
                            </View>
                            <Text style={styles.statValue}>
                                {todaysCompleted}/{todaysWorkouts.length}
                            </Text>
                            <Text style={styles.statLabel}>Today</Text>
                        </View>
                    </View>

                    {/* Progress Card */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardTitleRow}>
                                <Ionicons name="trophy" size={20} color="#3B82F6" />
                                <Text style={styles.cardTitle}>Your Progress</Text>
                            </View>
                            <Text style={styles.cardSubtitle}>
                                {completedWorkouts} of {totalWorkouts}
                            </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${completionRate}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{totalWorkouts - completedWorkouts} workouts remaining</Text>
                    </View>

                    {/* Week Calendar */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{format(selectedDate, 'MMMM yyyy')}</Text>
                            <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
                                <Text style={styles.todayButton}>Today</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Horizontal Week Calendar */}
                        <ScrollView
                            ref={weekScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.weekScroll}
                            contentContainerStyle={styles.weekScrollContent}
                        >
                            {weekDays.map((day) => {
                                const isSelected = isSameDay(day, selectedDate);
                                const isTodayDate = isToday(day);
                                const hasWorkout = hasWorkouts(day);
                                const hasIncomplete = hasIncompleteWorkouts(day);

                                return (
                                    <TouchableOpacity
                                        key={day.toISOString()}
                                        onPress={() => setSelectedDate(day)}
                                        style={[
                                            styles.dayButton,
                                            isSelected && styles.dayButtonSelected,
                                            isTodayDate && !isSelected && styles.dayButtonToday,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayLabel,
                                                isSelected && styles.dayLabelSelected,
                                            ]}
                                        >
                                            {format(day, 'EEE')}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.dayNumber,
                                                isSelected && styles.dayNumberSelected,
                                            ]}
                                        >
                                            {format(day, 'd')}
                                        </Text>
                                        {hasWorkout && (
                                            <View
                                                style={[
                                                    styles.dayDot,
                                                    isSelected
                                                        ? styles.dayDotSelected
                                                        : hasIncomplete
                                                            ? styles.dayDotPrimary
                                                            : styles.dayDotGreen,
                                                ]}
                                            />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Selected Date Workouts */}
                        <View style={styles.selectedDateSection}>
                            <Text style={styles.selectedDateTitle}>
                                {isToday(selectedDate) ? "Today's Workouts" : format(selectedDate, 'EEEE, MMM d')}
                            </Text>

                            {selectedDateAssignments.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>No workouts scheduled</Text>
                                </View>
                            ) : (
                                selectedDateAssignments.map((assignment) => {
                                    const workout = assignment.workout;
                                    const iconName = workoutTypeIcons[workout.type] || 'fitness';
                                    const colors = workoutTypeColors[workout.type] || workoutTypeColors.strength;
                                    const isCompleted = !!assignment.completedAt;

                                    return (
                                        <TouchableOpacity
                                            key={assignment.id}
                                            style={[
                                                styles.workoutItem,
                                                isCompleted && styles.workoutItemCompleted,
                                            ]}
                                            onPress={() => router.push(`/(athlete)/workout/${assignment.id}`)}
                                        >
                                            <View style={[styles.workoutIcon, { backgroundColor: colors.bg }]}>
                                                <Ionicons name={iconName} size={20} color={colors.text} />
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
                                                        : `${workout.stages?.length || 0} stages`}
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
                                })
                            )}
                        </View>
                    </View>

                    {/* Upcoming Workouts */}
                    {upcomingWorkouts.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Upcoming</Text>
                                <TouchableOpacity onPress={() => router.push('/(athlete)/calendar')}>
                                    <View style={styles.seeAllButton}>
                                        <Text style={styles.seeAllText}>See all</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {upcomingWorkouts.map((assignment) => {
                                const workout = assignment.workout;
                                const iconName = workoutTypeIcons[workout.type] || 'fitness';
                                const colors = workoutTypeColors[workout.type] || workoutTypeColors.strength;

                                return (
                                    <TouchableOpacity
                                        key={assignment.id}
                                        style={styles.workoutItem}
                                        onPress={() => router.push(`/(athlete)/workout/${assignment.id}`)}
                                    >
                                        <View style={[styles.workoutIcon, { backgroundColor: colors.bg }]}>
                                            <Ionicons name={iconName} size={20} color={colors.text} />
                                        </View>
                                        <View style={styles.workoutInfo}>
                                            <Text style={styles.workoutName}>{workout.name}</Text>
                                            <Text style={styles.workoutDetails}>
                                                {format(assignment.scheduledDate, 'EEE, MMM d')}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
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
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    welcomeSection: {
        paddingTop: 8,
        marginBottom: 16,
    },
    welcomeText: {
        fontSize: 14,
        color: '#6B7280',
    },
    displayName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        width: (width - 44) / 2,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    primaryCard: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    orangeCard: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FDBA74',
    },
    blueCard: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    greenCard: {
        backgroundColor: '#F0FDF4',
        borderColor: '#A7F3D0',
    },
    statIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 6,
    },
    progressText: {
        fontSize: 12,
        color: '#6B7280',
    },
    todayButton: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
    },
    weekScroll: {
        marginHorizontal: -16,
        marginBottom: 16,
    },
    weekScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    dayButton: {
        width: 48,
        height: 64,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonSelected: {
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
    },
    dayButtonToday: {
        backgroundColor: '#F3F4F6',
        borderColor: '#BFDBFE',
    },
    dayLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 4,
    },
    dayLabelSelected: {
        color: '#FFFFFF',
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    dayNumberSelected: {
        color: '#FFFFFF',
    },
    dayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 4,
    },
    dayDotSelected: {
        backgroundColor: '#FFFFFF',
    },
    dayDotPrimary: {
        backgroundColor: '#3B82F6',
    },
    dayDotGreen: {
        backgroundColor: '#10B981',
    },
    selectedDateSection: {
        marginTop: 16,
    },
    selectedDateTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 12,
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
    },
    workoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    workoutItemCompleted: {
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
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
    },
});
