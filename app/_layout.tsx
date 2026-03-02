import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/lib/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#ffffff' },
            headerTitleStyle: { color: '#1b1b1f', fontWeight: '700' },
            headerTintColor: '#1b1b1f',
            headerShadowVisible: false,
            headerBackTitleVisible: false,
            contentStyle: { backgroundColor: '#f7f7fb' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="date/[id]" options={{ title: 'Date details' }} />
          <Stack.Screen name="date/new" options={{ title: 'Create date' }} />
          <Stack.Screen name="date/chat/[id]" options={{ title: 'Date chat' }} />
          <Stack.Screen name="user/[id]" options={{ title: 'Profile' }} />
          <Stack.Screen name="auth/register" options={{ title: 'Register' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
