import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { registerUser } from '@/lib/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    email: '',
    birthday: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await registerUser(form);
      setSuccess('Registration successful. You can login now.');
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#666"
          value={form.firstName}
          onChangeText={(value) => setForm({ ...form, firstName: value })}
        />
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor="#666"
          value={form.lastName}
          onChangeText={(value) => setForm({ ...form, lastName: value })}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#666"
          value={form.username}
          onChangeText={(value) => setForm({ ...form, username: value })}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={form.email}
          onChangeText={(value) => setForm({ ...form, email: value })}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={form.password}
          onChangeText={(value) => setForm({ ...form, password: value })}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Birthday (YYYY-MM-DD)"
          placeholderTextColor="#666"
          value={form.birthday}
          onChangeText={(value) => setForm({ ...form, birthday: value })}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Pressable style={styles.primaryButton} onPress={handleRegister}>
            <Text style={styles.primaryButtonText}>Register</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#f7f7fb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b1b1f',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  success: {
    color: '#2e7d32',
  },
  primaryButton: {
    backgroundColor: '#ff5c8a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f4',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
});
