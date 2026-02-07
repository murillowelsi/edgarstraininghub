import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Calendar, Dumbbell, MessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import AthleteHeader from '@/components/AthleteHeader';

export default function AthleteLayout() {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Custom Header */}
            <AthleteHeader />

            {/* Tabs Navigation */}
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.tint,
                    tabBarInactiveTintColor: colors.icon,
                    tabBarStyle: {
                        borderTopWidth: 1,
                        borderTopColor: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(228, 228, 231, 0.5)',
                        paddingTop: 8,
                        height: 60 + insets.bottom,
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                        backgroundColor: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size }) => (
                            <Home size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="calendar"
                    options={{
                        title: 'Calendar',
                        tabBarIcon: ({ color, size }) => (
                            <Calendar size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="workouts-list"
                    options={{
                        title: 'Workouts',
                        tabBarIcon: ({ color, size }) => (
                            <Dumbbell size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="chat"
                    options={{
                        title: 'Chat',
                        tabBarIcon: ({ color, size }) => (
                            <MessageSquare size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="workout/[id]"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
                <Tabs.Screen
                    name="session/[id]"
                    options={{
                        href: null,
                        tabBarStyle: { display: 'none' },
                    }}
                />
            </Tabs>
        </View>
    );
}
