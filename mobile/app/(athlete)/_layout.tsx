import { Stack } from 'expo-router';

export default function AthleteLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="home" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="workouts-list" />
            <Stack.Screen name="workout/[id]" />
            <Stack.Screen name="workout-session/[id]" />
        </Stack>
    );
}
