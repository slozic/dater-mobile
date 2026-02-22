import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { registerUser } from '@/lib/api';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

const ACCENT = '#ff5c8a';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    email: '',
    birthday: '',
    gender: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const formatBirthday = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const openBirthdayPicker = () => {
    const parsed = form.birthday ? new Date(form.birthday) : new Date();
    const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: safeDate,
        mode: 'date',
        is24Hour: true,
        onChange: (_, selected) => {
          if (!selected) return;
          setForm((prev) => ({ ...prev, birthday: formatBirthday(selected) }));
        },
      });
      return;
    }
    setShowBirthdayPicker(true);
  };

  const handleRegister = async () => {
    setSubmitted(true);
    const requiredMissing =
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.username.trim() ||
      !form.password.trim() ||
      !form.email.trim() ||
      !form.birthday.trim() ||
      !form.gender.trim();
    if (requiredMissing) {
      setError('Please fill all required fields, including gender.');
      return;
    }

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
          style={[styles.input, submitted && !form.firstName.trim() ? styles.inputError : undefined]}
          placeholder="First name"
          placeholderTextColor="#666"
          value={form.firstName}
          onChangeText={(value) => setForm({ ...form, firstName: value })}
        />
        <TextInput
          style={[styles.input, submitted && !form.lastName.trim() ? styles.inputError : undefined]}
          placeholder="Last name"
          placeholderTextColor="#666"
          value={form.lastName}
          onChangeText={(value) => setForm({ ...form, lastName: value })}
        />
        <TextInput
          style={[styles.input, submitted && !form.username.trim() ? styles.inputError : undefined]}
          placeholder="Username"
          placeholderTextColor="#666"
          value={form.username}
          onChangeText={(value) => setForm({ ...form, username: value })}
        />
        <TextInput
          style={[styles.input, submitted && !form.email.trim() ? styles.inputError : undefined]}
          placeholder="Email"
          placeholderTextColor="#666"
          value={form.email}
          onChangeText={(value) => setForm({ ...form, email: value })}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, submitted && !form.password.trim() ? styles.inputError : undefined]}
          placeholder="Password"
          placeholderTextColor="#666"
          value={form.password}
          onChangeText={(value) => setForm({ ...form, password: value })}
          secureTextEntry
        />
        <View style={styles.birthdayRow}>
          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              submitted && !form.birthday.trim() ? styles.inputError : undefined,
              pressed && styles.buttonPressed,
            ]}
            onPress={openBirthdayPicker}
          >
            <Text style={styles.outlineButtonText}>Pick birthday</Text>
          </Pressable>
          <Text style={styles.birthdayValue}>{form.birthday || 'Not set'}</Text>
        </View>
        {Platform.OS === 'ios' && showBirthdayPicker ? (
          <>
            <DateTimePicker
              value={form.birthday ? new Date(form.birthday) : new Date()}
              mode="date"
              display="inline"
              onChange={(_: unknown, selected?: Date) => {
                if (!selected) return;
                setForm((prev) => ({ ...prev, birthday: formatBirthday(selected) }));
              }}
            />
            <Pressable
              style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
              onPress={() => setShowBirthdayPicker(false)}
            >
              <Text style={styles.outlineButtonText}>Done</Text>
            </Pressable>
          </>
        ) : null}
        <View style={styles.genderRow}>
          {['Male', 'Female', 'Other'].map((option) => (
            <Pressable
              key={option}
              style={[
                styles.genderOption,
                  submitted && !form.gender.trim() ? styles.inputError : undefined,
                form.gender === option ? styles.genderOptionSelected : undefined,
              ]}
              onPress={() => setForm({ ...form, gender: option })}
            >
              <Text
                style={[
                  styles.genderOptionText,
                  form.gender === option ? styles.genderOptionTextSelected : undefined,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handleRegister}
          >
            <Text style={styles.primaryButtonText}>Register</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.outlineButtonText}>Back to login</Text>
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
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d8d8e0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderOptionSelected: {
    borderColor: ACCENT,
    backgroundColor: '#ffe9f0',
  },
  genderOptionText: {
    color: '#555562',
    fontWeight: '600',
    fontSize: 12,
  },
  genderOptionTextSelected: {
    color: ACCENT,
  },
  birthdayRow: {
    gap: 8,
  },
  birthdayValue: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#b00020',
  },
});
