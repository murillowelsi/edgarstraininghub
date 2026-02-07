import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';

export default function AthleteLayout() {
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="workout/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="session/[id]" options={{ headerShown: false, gestureEnabled: true }} />
        </Stack>
    );
}
