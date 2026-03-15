import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

function NotificationNavigationBridge() {
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      return;
    }

    const openNotificationTarget = (response: Notifications.NotificationResponse) => {
      const payload = response.notification.request.content.data as Record<string, unknown> | undefined;
      const dateId = typeof payload?.dateId === 'string' ? payload.dateId.trim() : '';
      const notificationType =
        typeof payload?.notificationType === 'string' ? payload.notificationType.trim() : '';
      if (!dateId) {
        return;
      }
      if (notificationType === 'CHAT_MESSAGE') {
        router.push(`/date/chat/${dateId}`);
        return;
      }
      router.push(`/date/${dateId}`);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationTarget);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          openNotificationTarget(response);
        }
      })
      .catch(() => {
        // Ignore stale/invalid cached response errors.
      });

    return () => {
      subscription.remove();
    };
  }, [token, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <NotificationNavigationBridge />
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
