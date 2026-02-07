# Athlete Portal - React Native Migration

This directory contains the React Native version of the athlete portal pages, migrated from the web application with the same UI/UX features and design.

## 📱 Migrated Screens

All screens are located in `/mobile/app/(athlete)/`:

1. **Home** (`home.tsx`) - Dashboard with stats, calendar, and upcoming workouts
2. **Calendar** (`calendar.tsx`) - 60-day calendar view with workout scheduling
3. **Workouts List** (`workouts-list.tsx`) - Filterable list of all workouts
4. **Chat** (`chat.tsx`) - Real-time messaging with coaches
5. **Workout Details** (`workout/[id]/index.tsx`) - Detailed view of a workout
6. **Workout Session** (`workout/[id]/session.tsx`) - Active workout tracking screen

## 🚀 Getting Started

### Prerequisites
```bash
# Make sure you're in the mobile directory
cd mobile

# Install dependencies (if not already done)
npm install
```

### Running the App

```bash
# Start the development server
npm start

# Or run on specific platform
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

## 🔧 Integration Steps

### 1. Connect to Backend Services

The screens currently use mock data. To connect to your backend:

#### Update Home Screen (`home.tsx`)
```typescript
// Replace the loadData function with:
const loadData = async () => {
  try {
    const userData = await getUserById(user.uid);
    const assignmentsData = await getAssignmentsWithWorkoutsByAthlete(user.uid);
    
    if (userData) {
      setDisplayName(userData.displayName || user.email?.split('@')[0] || 'Athlete');
    }
    setAssignments(assignmentsData);
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    setLoading(false);
  }
};
```

#### Update Calendar View (`calendar.tsx`)
```typescript
// Replace the loadData function with:
const loadData = async () => {
  try {
    const data = await getAssignmentsWithWorkoutsByAthlete(user.uid);
    setAssignments(data);
  } catch (error) {
    console.error('Error loading assignments:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
```

#### Update Chat (`chat.tsx`)
```typescript
// Add real-time listeners:
useEffect(() => {
  if (!user) return;

  const unsubscribe = ChatService.subscribeToAthleteChats(user.uid, (updatedChats) => {
    setChats(updatedChats);
    setLoading(false);
  });

  return () => unsubscribe();
}, [user]);
```

### 2. Add Authentication Context

Create an AuthContext provider:

```typescript
// mobile/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth listener
    // const unsubscribe = onAuthStateChanged((user) => {
    //   setUser(user);
    //   setLoading(false);
    // });
    // return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### 3. Import Services

Copy or create service files in `/mobile/services/`:

```typescript
// mobile/services/workoutAssignmentsService.ts
// mobile/services/usersService.ts
// mobile/services/chatService.ts
// mobile/services/exercisesService.ts
```

Or use API calls directly:

```typescript
// mobile/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'YOUR_API_URL',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAssignments = async (userId: string) => {
  const response = await api.get(`/assignments/${userId}`);
  return response.data;
};
```

### 4. Setup Navigation

The athlete screens use Expo Router. Make sure your main layout includes the athlete routes:

```typescript
// mobile/app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(athlete)" options={{ headerShown: false }} />
      {/* Other routes */}
    </Stack>
  );
}
```

## 🎨 Customization

### Colors
All colors are defined inline in StyleSheet. To customize:

```typescript
// Create a theme file
// mobile/constants/Colors.ts
export const Colors = {
  primary: '#3B82F6',
  success: '#059669',
  warning: '#EA580C',
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};
```

### Icons
The app uses `@expo/vector-icons` (Ionicons). Icon mappings:

```typescript
const workoutTypeIcons = {
  running: 'walk',        // or 'footsteps'
  cycling: 'bicycle',
  swimming: 'water',
  strength: 'barbell',    // or 'fitness'
};
```

## 📦 Required Dependencies

Already included in `package.json`:

```json
{
  "@expo/vector-icons": "^15.0.3",
  "date-fns": "^2.x.x",  // Add if not present
  "expo-router": "~6.0.23",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1"
}
```

If you need to add date-fns:
```bash
npm install date-fns
```

## 🔍 Testing

### Test with Mock Data

Each screen has mock data structures. You can test by:

1. Adding sample data to the state:
```typescript
// In home.tsx
setAssignments([
  {
    id: '1',
    scheduledDate: new Date(),
    completedAt: null,
    workout: {
      id: 'w1',
      name: 'Morning Run',
      type: 'running',
      stages: [],
    },
  },
]);
```

2. Running the app:
```bash
npm start
# Press 'i' for iOS or 'a' for Android
```

### Navigation Testing

Test navigation between screens:
```typescript
// Navigate to workout detail
router.push('/(athlete)/workout/123');

// Navigate to calendar
router.push('/(athlete)/calendar');

// Go back
router.back();
```

## 📱 Platform-Specific Notes

### iOS
- Uses `KeyboardAvoidingView` with `behavior="padding"`
- Safe area handling is automatic with Expo
- Haptic feedback available via `expo-haptics`

### Android
- Uses `KeyboardAvoidingView` with `behavior="height"`
- Back button handled automatically by Expo Router
- Material Design ripple effects on TouchableOpacity

## 🐛 Common Issues

### Issue: "Cannot find module 'date-fns'"
**Solution:**
```bash
npm install date-fns
```

### Issue: Icons not showing
**Solution:** Make sure `@expo/vector-icons` is installed:
```bash
npm install @expo/vector-icons
```

### Issue: Navigation not working
**Solution:** Ensure Expo Router is properly configured:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
```

## 📚 Next Steps

1. **Completed:**
   - All core athlete screens are now migrated and functional (Home, Calendar, Workouts, Chat, Workout Details, Workout Session).
 
2. **Add Features:**
   - Pull-to-refresh on all list screens
   - Offline support with AsyncStorage
   - Push notifications for workout reminders
   - Deep linking for workout sharing

3. **Optimize:**
   - Add image caching for workout media
   - Implement pagination for large lists
   - Add loading skeletons
   - Optimize re-renders with React.memo

4. **Test:**
   - Test on physical devices
   - Test with real data
   - Test offline scenarios
   - Test different screen sizes

## 📖 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/)
- [Ionicons](https://ionic.io/ionicons)
- [date-fns](https://date-fns.org/)

## 🤝 Contributing

When adding new features:
1. Follow the existing code structure
2. Use TypeScript for type safety
3. Match the web app's UI/UX
4. Add comments for complex logic
5. Test on both iOS and Android

## 📄 License

Same as the main project.
