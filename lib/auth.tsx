import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken } from '@/lib/api';

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
