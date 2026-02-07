import React, { useState, useEffect } from 'react';
import { Tabs, useSegments } from 'expo-router';
import { View } from 'react-native';
import { Home, Calendar, Dumbbell, MessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';
import AthleteHeader from '@/components/AthleteHeader';
import { ChatService, type Chat } from '@/services/chatService';

export default function AthleteLayout() {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const [unreadCount, setUnreadCount] = useState(0);
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = ChatService.subscribeToUserChats(user.uid, (chats) => {
            const count = chats.reduce((total, chat) => {
                return total + (chat.unreadCount?.[user.uid] || 0);
            }, 0);
            setUnreadCount(count);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Custom Header - Only show on main tabs */}
            <AthleteHeader />

            {/* Tabs Navigation */}
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.tint,
                    tabBarInactiveTintColor: colors.icon,
                    tabBarStyle: {
                        borderTopWidth: 1,
                        borderTopColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(228, 228, 231, 0.5)',
                        paddingTop: 8,
                        height: 60 + insets.bottom,
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
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
                        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                        tabBarBadgeStyle: { backgroundColor: colors.tint, color: '#FFFFFF' },
                        tabBarIcon: ({ color, size }) => (
                            <MessageSquare size={size} color={color} />
                        ),
                    }}
                />

            </Tabs>
        </View>
    );
}
