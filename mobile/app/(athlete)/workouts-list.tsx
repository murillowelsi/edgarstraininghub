import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
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

const workoutTypeColors: Record<string, { bg: string; text: string }> = {
    running: { bg: '#DBEAFE', text: '#2563EB' },
    cycling: { bg: '#D1FAE5', text: '#059669' },
    swimming: { bg: '#CFFAFE', text: '#0891B2' },
    strength: { bg: '#FED7AA', text: '#EA580C' },
};

type FilterType = 'all' | 'pending' | 'completed';

export default function AthleteWorkoutsList() {
    const { user } = useAuth();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

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
            const [profile, fetchedAssignments] = await Promise.all([
                getAthleteProfile(user.uid),
                getAthleteAssignments(user.uid),
            ]);

            if (profile) {
                setDisplayName(profile.displayName || 'Athlete');
            }
            // Sort by Date Descending
            setAssignments(fetchedAssignments.sort((a, b) =>
                (b.scheduledDate?.getTime() || 0) - (a.scheduledDate?.getTime() || 0)
            ));
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load workouts');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async (assignmentId: string, currentStatus: boolean, e: any) => {
        e.stopPropagation();
        try {
            await toggleAssignmentComplete(assignmentId, !currentStatus);
            // Refresh local state
            setAssignments(assignments.map(a =>
                a.id === assignmentId
                    ? { ...a, completedAt: !currentStatus ? new Date() : null }
                    : a
            ));
        } catch (error) {
            console.error('Error toggling complete:', error);
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const filteredAssignments = assignments.filter(assignment => {
        if (filter === 'all') return true;
        const isCompleted = !!assignment.completedAt;
        return filter === 'completed' ? isCompleted : !isCompleted;
    });

    const pendingCount = assignments.filter(a => !a.completedAt).length;
    const completedCount = assignments.filter(a => a.completedAt).length;

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={styles.title}>Your Workouts</Text>
                <Text style={styles.subtitle}>
                    {pendingCount} pending · {completedCount} completed
                </Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {(['all', 'pending', 'completed'] as FilterType[]).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterButton,
                            filter === f && styles.filterButtonActive
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[
                            styles.filterText,
                            filter === f && styles.filterTextActive
                        ]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {filteredAssignments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={48} color={colors.icon} />
                        <Text style={styles.emptyStateText}>No workouts found</Text>
                    </View>
                ) : (
                    filteredAssignments.map((assignment) => {
                        const isCompleted = !!assignment.completedAt;
                        const typeStyle = workoutTypeColors[assignment.workout.type] || { bg: colors.muted, text: colors.text };
                        const Icon = workoutTypeIcons[assignment.workout.type] || 'fitness';

                        return (
                            <TouchableOpacity
                                key={assignment.id}
                                style={[
                                    styles.card,
                                    isCompleted && styles.cardCompleted
                                ]}
                                onPress={() => router.push(`/workout/${assignment.id}`)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.typeContainer}>
                                        <View style={[styles.iconContainer, { backgroundColor: isDark ? typeStyle.bg + '40' : typeStyle.bg }]}>
                                            <Ionicons name={Icon} size={20} color={typeStyle.text} />
                                        </View>
                                        <View>
                                            <Text style={[
                                                styles.workoutName,
                                                isCompleted && styles.textCompleted
                                            ]}>
                                                {assignment.workout.name}
                                            </Text>
                                            <Text style={styles.workoutDate}>
                                                {format(assignment.scheduledDate, 'MMM d, yyyy')}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={(e) => handleToggleComplete(assignment.id, isCompleted, e)}
                                        style={styles.checkButton}
                                    >
                                        {isCompleted ? (
                                            <Ionicons name="checkmark-circle" size={28} color="#059669" />
                                        ) : (
                                            <Ionicons name="ellipse-outline" size={28} color={colors.icon} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.cardFooter}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{assignment.workout.type}</Text>
                                    </View>
                                    {assignment.workout.type === 'strength' && (
                                        <Text style={styles.detailsText}>
                                            {assignment.workout.exercises?.length || 0} exercises
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.icon,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 8,
        gap: 12,
    },
    filterButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterButtonActive: {
        backgroundColor: colors.tint,
        borderColor: colors.tint,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    filterTextActive: {
        color: '#09090B', // Always dark on valid active button
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 16,
        color: colors.icon,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardCompleted: {
        backgroundColor: isDark ? '#05966910' : '#F0FDF4',
        borderColor: isDark ? '#05966930' : '#BBF7D0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    textCompleted: {
        textDecorationLine: 'line-through',
        color: colors.icon,
    },
    workoutDate: {
        fontSize: 12,
        color: colors.icon,
    },
    checkButton: {
        padding: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: colors.muted,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
        textTransform: 'capitalize',
    },
    detailsText: {
        fontSize: 12,
        color: colors.icon,
    },
});
