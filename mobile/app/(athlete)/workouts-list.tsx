import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
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

const workoutTypeColors: Record<string, { bg: string; text: string }> = {
    running: { bg: '#DBEAFE', text: '#2563EB' },
    cycling: { bg: '#D1FAE5', text: '#059669' },
    swimming: { bg: '#CFFAFE', text: '#0891B2' },
    strength: { bg: '#FED7AA', text: '#EA580C' },
};

type FilterType = 'all' | 'pending' | 'completed';

export default function AthleteWorkoutsList() {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState('Athlete');
    const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;

        try {
            setLoading(true);
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

    // Filter assignments
    const filteredAssignments = assignments.filter((a) => {
        if (filter === 'pending') return !a.completedAt;
        if (filter === 'completed') return !!a.completedAt;
        return true;
    });

    // Stats
    const totalWorkouts = assignments.length;
    const completedWorkouts = assignments.filter((a) => a.completedAt).length;
    const pendingWorkouts = totalWorkouts - completedWorkouts;
    const completionRate =
        totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer} edges={['top']}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Workouts</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Program Header */}
                    <View style={styles.programCard}>
                        <View style={styles.programHeader}>
                            <View style={styles.programIconContainer}>
                                <Ionicons name="barbell" size={24} color="#3B82F6" />
                            </View>
                            <View>
                                <Text style={styles.programTitle}>{displayName}'s Program</Text>
                                <Text style={styles.programSubtitle}>Your training schedule</Text>
                            </View>
                        </View>

                        <View style={styles.progressSection}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressLabel}>Progress</Text>
                                <Text style={styles.progressValue}>
                                    {completedWorkouts} / {totalWorkouts} completed
                                </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, { width: `${completionRate}%` }]} />
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{totalWorkouts}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: '#059669' }]}>
                                    {completedWorkouts}
                                </Text>
                                <Text style={styles.statLabel}>Done</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                                    {pendingWorkouts}
                                </Text>
                                <Text style={styles.statLabel}>Pending</Text>
                            </View>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.filterTabs}>
                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
                            onPress={() => setFilter('all')}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    filter === 'all' && styles.filterTabTextActive,
                                ]}
                            >
                                All ({totalWorkouts})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
                            onPress={() => setFilter('pending')}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    filter === 'pending' && styles.filterTabTextActive,
                                ]}
                            >
                                Pending ({pendingWorkouts})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
                            onPress={() => setFilter('completed')}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    filter === 'completed' && styles.filterTabTextActive,
                                ]}
                            >
                                Done ({completedWorkouts})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Workouts List */}
                    {filteredAssignments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="barbell" size={48} color="#9CA3AF" />
                            <Text style={styles.emptyStateText}>
                                {filter === 'pending'
                                    ? 'No pending workouts'
                                    : filter === 'completed'
                                        ? 'No completed workouts yet'
                                        : 'No workouts assigned'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.workoutsList}>
                            {filteredAssignments.map((assignment) => {
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
                                                <Ionicons name="checkmark" size={24} color="#059669" />
                                            ) : (
                                                <Ionicons name={iconName} size={24} color={colors.text} />
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
                                            <View style={styles.workoutMeta}>
                                                <View style={styles.workoutTypeBadge}>
                                                    <Text style={styles.workoutTypeBadgeText}>{workout.type}</Text>
                                                </View>
                                                <Text style={styles.workoutDate}>
                                                    {format(assignment.scheduledDate, 'MMM d')}
                                                </Text>
                                                <Text style={styles.workoutDetails}>
                                                    ·{' '}
                                                    {workout.type === 'strength'
                                                        ? `${workout.exercises?.length || 0} exercises`
                                                        : `${workout.stages?.length || 0} stages`}
                                                </Text>
                                            </View>
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
            </ScrollView>
        </SafeAreaView>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    programCard: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    programHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    programIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    programTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    programSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    progressSection: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    progressValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
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
    filterTabs: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 4,
        marginBottom: 16,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    filterTabActive: {
        backgroundColor: '#3B82F6',
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    emptyState: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    emptyStateText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 12,
    },
    workoutsList: {
        gap: 12,
    },
    workoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    workoutCardCompleted: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    workoutIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    workoutInfo: {
        flex: 1,
    },
    workoutName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    workoutNameCompleted: {
        textDecorationLine: 'line-through',
        color: '#6B7280',
    },
    workoutMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    workoutTypeBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    workoutTypeBadgeText: {
        fontSize: 12,
        color: '#6B7280',
        textTransform: 'capitalize',
    },
    workoutDate: {
        fontSize: 12,
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
});
