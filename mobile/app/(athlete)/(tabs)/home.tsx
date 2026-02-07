import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useFocusEffect } from 'expo-router';
import { format, addDays, isSameDay, isToday, startOfWeek, isAfter, isBefore, startOfDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { getAthleteProfile, getAthleteAssignments, toggleAssignmentComplete } from '@/services/athleteService';
import type { AssignmentWithWorkout } from '@/types/workout';

const { width } = Dimensions.get('window');

const workoutTypeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    running: 'walk',
    cycling: 'bicycle',
    swimming: 'water',
    strength: 'barbell',
};

const workoutTypeColors = {
    running: {
        light: { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE' },
        dark: { bg: 'rgba(37, 99, 235, 0.2)', text: '#60A5FA', border: 'rgba(37, 99, 235, 0.3)' }
    },
    cycling: {
        light: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
        dark: { bg: 'rgba(5, 150, 105, 0.2)', text: '#34D399', border: 'rgba(5, 150, 105, 0.3)' }
    },
    swimming: {
        light: { bg: '#CFFAFE', text: '#0891B2', border: '#A5F3FC' },
        dark: { bg: 'rgba(8, 145, 178, 0.2)', text: '#22D3EE', border: 'rgba(8, 145, 178, 0.3)' }
    },
    strength: {
        light: { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA' },
        dark: { bg: 'rgba(234, 88, 12, 0.2)', text: '#FB923C', border: 'rgba(234, 88, 12, 0.3)' }
    },
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: colors.background,
    },
    welcomeText: {
        fontSize: 14,
        color: colors.icon,
    },
    displayName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
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
        borderRadius: 16,
        borderWidth: 1,
    },
    primaryCard: { // Completion (Blue)
        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
        borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#BFDBFE',
    },
    orangeCard: { // Completed (Orange)
        backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : '#FFF7ED',
        borderColor: isDark ? 'rgba(249, 115, 22, 0.2)' : '#FED7AA',
    },
    blueCard: { // Total (Indigo/Blue)
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF',
        borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#C7D2FE',
    },
    greenCard: { // Today (Emerald)
        backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
        borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#A7F3D0',
    },
    statIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 13,
        color: colors.icon,
        fontWeight: '500',
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    cardSubtitle: {
        fontSize: 14,
        color: colors.icon,
        fontWeight: '500',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: colors.muted,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.tint,
        borderRadius: 6,
    },
    progressText: {
        fontSize: 12,
        color: colors.icon,
    },
    todayButton: {
        fontSize: 14,
        color: colors.tint,
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
        borderColor: colors.border,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayButtonSelected: {
        backgroundColor: colors.tint,
        borderColor: colors.tint,
    },
    dayButtonToday: {
        backgroundColor: colors.muted,
        borderColor: isDark ? '#1E3A8A40' : '#BFDBFE',
    },
    dayLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.icon,
        marginBottom: 4,
    },
    dayLabelSelected: {
        color: '#09090B',
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    dayNumberSelected: {
        color: '#09090B',
    },
    dayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 4,
    },
    dayDotSelected: {
        backgroundColor: '#09090B',
    },
    dayDotPrimary: {
        backgroundColor: colors.tint,
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
        color: colors.icon,
        marginBottom: 12,
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.icon,
    },
    workoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        marginBottom: 8,
    },
    workoutItemCompleted: {
        backgroundColor: isDark ? '#05966920' : '#F0FDF4',
        borderColor: isDark ? '#05966940' : '#BBF7D0',
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
        color: colors.text,
        marginBottom: 2,
    },
    workoutNameCompleted: {
        textDecorationLine: 'line-through',
        color: colors.icon,
    },
    workoutDetails: {
        fontSize: 12,
        color: colors.icon,
    },
    completedBadge: {
        backgroundColor: isDark ? '#05966930' : '#D1FAE5',
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
        color: colors.tint,
        fontWeight: '500',
    },
});


export default function AthleteHome() {
    const { user } = useAuth();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);
    const [displayName, setDisplayName] = useState('Athlete');
    const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const weekScrollRef = useRef<ScrollView>(null);

    // Generate 2 weeks of days
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i));

    useFocusEffect(
        useCallback(() => {
            if (user) {
                loadData();
            }
        }, [user])
    );

    const loadData = async () => {
        if (!user) return;

        try {
            // Removed setLoading(true)
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

    const handleToggleComplete = async (assignment: AssignmentWithWorkout) => {
        const newStatus = !assignment.completedAt;

        try {
            // Update local state immediately for responsiveness
            setAssignments(prev => prev.map(a =>
                a.id === assignment.id
                    ? { ...a, completedAt: newStatus ? new Date() : null }
                    : a
            ));

            await toggleAssignmentComplete(assignment.id, newStatus);
        } catch (error) {
            // Revert on error
            console.error('Error toggling status:', error);
            setAssignments(prev => prev.map(a =>
                a.id === assignment.id
                    ? { ...a, completedAt: assignment.completedAt }
                    : a
            ));
            Alert.alert('Error', 'Failed to update workout status');
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
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.welcomeText, { color: colors.icon }]}>Welcome back,</Text>
                <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Stats Cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, styles.primaryCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE' }]}>
                                <Ionicons name="radio-button-on" size={20} color={isDark ? '#60A5FA' : '#2563EB'} />
                            </View>
                            <Text style={styles.statValue}>{completionRate}%</Text>
                            <Text style={styles.statLabel}>Completion</Text>
                        </View>

                        <View style={[styles.statCard, styles.orangeCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5' }]}>
                                <Ionicons name="flame" size={20} color={isDark ? '#FB923C' : '#EA580C'} />
                            </View>
                            <Text style={styles.statValue}>{completedWorkouts}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>

                        <View style={[styles.statCard, styles.blueCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF' }]}>
                                <Ionicons name="calendar-outline" size={20} color={isDark ? '#818CF8' : '#4F46E5'} />
                            </View>
                            <Text style={styles.statValue}>{totalWorkouts}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>

                        <View style={[styles.statCard, styles.greenCard]}>
                            <View style={[styles.statIconContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' }]}>
                                <Ionicons name="trending-up" size={20} color={isDark ? '#34D399' : '#059669'} />
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
                                <Ionicons name="trophy" size={20} color={colors.tint} />
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
                                    const colorSet = workoutTypeColors[workout.type as keyof typeof workoutTypeColors] || workoutTypeColors.strength;
                                    const colors = isDark ? colorSet.dark : colorSet.light;
                                    const isCompleted = !!assignment.completedAt;

                                    return (
                                        <TouchableOpacity
                                            key={assignment.id}
                                            style={[
                                                styles.workoutItem,
                                                isCompleted && styles.workoutItemCompleted,
                                            ]}
                                            onPress={() => router.push(`/workout/${assignment.id}`)}
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
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleComplete(assignment);
                                                }}
                                                style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                                            >
                                                {isCompleted ? (
                                                    <View style={styles.completedBadge}>
                                                        <Text style={styles.completedBadgeText}>
                                                            {assignment.completionPercentage !== undefined
                                                                ? `${assignment.completionPercentage}%`
                                                                : 'Done'}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
                                                )}
                                            </TouchableOpacity>
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
                                <TouchableOpacity onPress={() => router.push('/calendar')}>
                                    <View style={styles.seeAllButton}>
                                        <Text style={styles.seeAllText}>See all</Text>
                                        <Ionicons name="chevron-forward" size={16} color={colors.tint} />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {upcomingWorkouts.map((assignment) => {
                                const workout = assignment.workout;
                                const iconName = workoutTypeIcons[workout.type] || 'fitness';
                                const colorSet = workoutTypeColors[workout.type as keyof typeof workoutTypeColors] || workoutTypeColors.strength;
                                const colors = isDark ? colorSet.dark : colorSet.light;

                                return (
                                    <TouchableOpacity
                                        key={assignment.id}
                                        style={styles.workoutItem}
                                        onPress={() => router.push(`/workout/${assignment.id}`)}
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
