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
const devFallbackApiUrl = defaultHost ? `http://${defaultHost}:8080` : 'http://10.0.2.2:8080';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const normalizedConfiguredApiUrl = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, '')
  : null;

if (!normalizedConfiguredApiUrl && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL must be set for non-development builds.');
}

export const API_BASE_URL = normalizedConfiguredApiUrl ?? devFallbackApiUrl;
