import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    Dimensions,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, addDays, isSameDay, isToday, isTomorrow, startOfDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { getAthleteAssignments } from '@/services/athleteService';
import type { AssignmentWithWorkout } from '@/types/workout';

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
    const { user } = useAuth();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

    const [assignments, setAssignments] = useState<AssignmentWithWorkout[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Generate 30 days (7 days back, 23 days forward)
    const today = startOfDay(new Date());
    const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 7));

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        try {
            const fetchedAssignments = await getAthleteAssignments(user.uid);
            setAssignments(fetchedAssignments);
        } catch (error) {
            console.error('Error loading calendar data:', error);
            Alert.alert('Error', 'Failed to load calendar');
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
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Schedule</Text>
                <Text style={styles.headerSubtitle}>{format(new Date(), 'MMMM yyyy')}</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
                }
                showsVerticalScrollIndicator={false}
            >
                {days.map((date, index) => {
                    const dateAssignments = getAssignmentsForDate(date);
                    const isDateToday = isToday(date);
                    const isPast = date < today && !isDateToday;

                    return (
                        <View key={date.toISOString()} style={[
                            styles.dayRow,
                            isPast && styles.pastDayRow
                        ]}>
                            {/* Date Column */}
                            <View style={styles.dateColumn}>
                                <Text style={[
                                    styles.dayName,
                                    isDateToday && styles.todayText
                                ]}>
                                    {format(date, 'EEE')}
                                </Text>
                                <View style={[
                                    styles.dayNumberContainer,
                                    isDateToday && styles.todayNumberContainer
                                ]}>
                                    <Text style={[
                                        styles.dayNumber,
                                        isDateToday && styles.todayNumberText
                                    ]}>
                                        {format(date, 'd')}
                                    </Text>
                                </View>
                            </View>

                            {/* Timeline Line */}
                            <View style={styles.timelineColumn}>
                                <View style={[styles.timelineLine, isPast && styles.pastTimelineLine]} />
                                <View style={[
                                    styles.timelineDot,
                                    isDateToday && styles.timelineDotToday,
                                    dateAssignments.length > 0 && styles.timelineDotActive
                                ]} />
                            </View>

                            {/* Assignments Column */}
                            <View style={styles.assignmentsColumn}>
                                {dateAssignments.length === 0 ? (
                                    <View style={styles.emptyDayPlaceholder} />
                                ) : (
                                    dateAssignments.map(assignment => {
                                        const isCompleted = !!assignment.completedAt;
                                        const typeStyle = workoutTypeColors[assignment.workout.type] || { bg: colors.muted, text: colors.text };
                                        const Icon = workoutTypeIcons[assignment.workout.type] || 'fitness';

                                        return (
                                            <TouchableOpacity
                                                key={assignment.id}
                                                style={[
                                                    styles.assignmentCard,
                                                    isCompleted && styles.assignmentCardCompleted
                                                ]}
                                                onPress={() => router.push(`/workout/${assignment.id}`)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.iconContainer, { backgroundColor: isDark ? typeStyle.bg + '40' : typeStyle.bg }]}>
                                                    <Ionicons name={Icon} size={18} color={typeStyle.text} />
                                                </View>
                                                <View style={styles.assignmentDetails}>
                                                    <Text style={[
                                                        styles.assignmentTitle,
                                                        isCompleted && styles.completedText
                                                    ]} numberOfLines={1}>
                                                        {assignment.workout.name}
                                                    </Text>
                                                    {assignment.workout.type === 'strength' && (
                                                        <Text style={styles.assignmentSubtitle}>
                                                            {assignment.workout.exercises?.length || 0} exercises
                                                        </Text>
                                                    )}
                                                </View>
                                                {isCompleted && (
                                                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        </View>
                    );
                })}
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
        paddingVertical: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.icon,
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingVertical: 20,
    },
    dayRow: {
        flexDirection: 'row',
        minHeight: 80,
    },
    pastDayRow: {
        opacity: 0.6,
    },
    dateColumn: {
        width: 60,
        alignItems: 'center',
        paddingTop: 4,
    },
    dayName: {
        fontSize: 12,
        color: colors.icon,
        fontWeight: '500',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    todayText: {
        color: colors.tint,
        fontWeight: '700',
    },
    dayNumberContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayNumberContainer: {
        backgroundColor: colors.tint,
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    todayNumberText: {
        color: '#ffffff',
    },
    timelineColumn: {
        width: 20,
        alignItems: 'center',
    },
    timelineLine: {
        width: 2,
        height: '100%',
        backgroundColor: colors.border,
        position: 'absolute',
        top: 0,
    },
    pastTimelineLine: {
        backgroundColor: colors.border,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.border,
        marginTop: 18,
        borderWidth: 2,
        borderColor: colors.background,
        zIndex: 1,
    },
    timelineDotToday: {
        backgroundColor: colors.tint,
        width: 12,
        height: 12,
        borderRadius: 6,
        marginTop: 17,
    },
    timelineDotActive: {
        backgroundColor: colors.tint,
    },
    assignmentsColumn: {
        flex: 1,
        paddingRight: 20,
        paddingLeft: 12,
        paddingBottom: 16,
    },
    emptyDayPlaceholder: {
        height: 40,
    },
    assignmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    assignmentCardCompleted: {
        backgroundColor: isDark ? '#05966910' : '#F0FDF4',
        borderColor: isDark ? '#05966930' : '#BBF7D0',
        opacity: 0.8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    assignmentDetails: {
        flex: 1,
    },
    assignmentTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: colors.icon,
    },
    assignmentSubtitle: {
        fontSize: 12,
        color: colors.icon,
        marginTop: 2,
    },
});
