import { Platform } from 'react-native';
import Constants from 'expo-constants';

const resolveHost = (): string | null => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoConfig?.debuggerHost ??
    (Constants as { manifest?: { hostUri?: string; debuggerHost?: string } }).manifest?.hostUri ??
    (Constants as { manifest?: { hostUri?: string; debuggerHost?: string } }).manifest?.debuggerHost;
  if (!hostUri) return null;
  const cleaned = hostUri.replace(/^[^/]*\/\//, '');
  return cleaned.split(':')[0];
};

const defaultHost = resolveHost();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (defaultHost ? `http://${defaultHost}:8080` : 'http://10.0.2.2:8080');
