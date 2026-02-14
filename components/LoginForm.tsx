import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const ACCENT = '#ff5c8a';

type Props = {
  onSuccess: () => void;
};

export default function LoginForm({ onSuccess }: Props) {
  const router = useRouter();
  const { refreshToken } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setIsLoggingIn(true);
    try {
      await login(username, password);
      await refreshToken();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Welcome back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email or username"
        placeholderTextColor="#666"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isLoggingIn ? (
        <ActivityIndicator />
      ) : (
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          onPress={handleLogin}
          disabled={!username || !password}
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
        onPress={() => router.push('/auth/register')}
      >
        <Text style={styles.outlineButtonText}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1b1b1f',
  },
  subtitle: {
    color: '#7a7a86',
    marginTop: -6,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: ACCENT,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
  error: {
    color: '#b00020',
  },
});
