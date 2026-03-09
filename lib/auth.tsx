import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, updatePushToken } from '@/lib/api';
import Constants from 'expo-constants';

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

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    const registerPush = async () => {
      const isExpoGo =
        Constants.appOwnership === 'expo' ||
        Constants.executionEnvironment === 'storeClient';
      if (__DEV__ || isExpoGo) {
        return;
      }
      try {
        const { registerForPushNotificationsAsync } = await import('@/lib/push-notifications');
        const pushToken = await registerForPushNotificationsAsync();
        if (!cancelled) {
          await updatePushToken(pushToken);
        }
      } catch {
        // Keep auth flow resilient even if push registration fails.
      }
    };
    registerPush();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
