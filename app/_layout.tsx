import { useEffect } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
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
    const executionEnvironment = (Constants as { executionEnvironment?: string }).executionEnvironment;
    if (Constants.appOwnership === 'expo' || executionEnvironment === 'storeClient') {
      return;
    }

    const openNotificationTarget = (response: unknown) => {
      const payload = (
        response as { notification?: { request?: { content?: { data?: Record<string, unknown> } } } }
      )?.notification?.request?.content?.data;
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

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    void import('expo-notifications')
      .then((Notifications) => {
        if (cancelled) {
          return;
        }
        subscription = Notifications.addNotificationResponseReceivedListener(openNotificationTarget);
        return Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response) {
            openNotificationTarget(response);
          }
        });
      })
      .catch(() => {
        // Ignore notification bridge setup errors in unsupported environments.
      });

    return () => {
      cancelled = true;
      subscription?.remove();
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
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
