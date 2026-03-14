import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getToken, updatePushToken } from '@/lib/api';
import { registerForPushNotificationsAsync } from '@/lib/push-notifications';

type AuthContextValue = {
  token: string | null;
  refreshToken: () => Promise<void>;
  setTokenValue: (value: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    const stored = await getToken();
    setToken(stored);
  }, []);

  const setTokenValue = useCallback((value: string | null) => {
    setToken(value);
  }, []);

  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  const tryRegisterPush = useCallback(async () => {
    const pushToken = await registerForPushNotificationsAsync();
    if (pushToken) {
      await updatePushToken(pushToken);
      return;
    }
    console.warn('Push token not available after registration.', 'Will retry on app foreground.');
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    const registerPush = async () => {
      try {
        if (!cancelled) {
          await tryRegisterPush();
        }
      } catch (error) {
        // Keep auth flow resilient even if push registration fails, but log for diagnosis.
        console.warn('Push registration/update failed:', error);
      }
    };
    registerPush();
    return () => {
      cancelled = true;
    };
  }, [token, tryRegisterPush]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }
      void tryRegisterPush().catch((error) => {
        console.warn('Push retry on foreground failed:', error);
      });
    });
    return () => subscription.remove();
  }, [token, tryRegisterPush]);

  const value = useMemo(
    () => ({
      token,
      refreshToken,
      setTokenValue,
    }),
    [token, refreshToken, setTokenValue],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
