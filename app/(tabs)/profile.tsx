import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { clearToken, fetchProfile, updateProfile, UserProfile } from '@/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    username: '',
    birthday: '',
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await fetchProfile();
      setProfile(data);
      setFormState({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        username: data.username ?? '',
        birthday: data.birthday ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await updateProfile(formState);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {profile && !editing ? (
          <View style={styles.card}>
            <Text style={styles.rowLabel}>First name</Text>
            <Text style={styles.value}>{profile.firstName}</Text>
            <Text style={styles.rowLabel}>Last name</Text>
            <Text style={styles.value}>{profile.lastName}</Text>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.value}>{profile.username}</Text>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.value}>{profile.email}</Text>
            <Text style={styles.rowLabel}>Birthday</Text>
            <Text style={styles.value}>{profile.birthday ?? '-'}</Text>
            <View style={styles.sectionActions}>
              <Pressable style={styles.primaryButton} onPress={() => setEditing(true)}>
                <Text style={styles.primaryButtonText}>Edit Profile</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {profile && editing ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor="#666"
              value={formState.firstName}
              onChangeText={(value) => setFormState({ ...formState, firstName: value })}
            />
            <TextInput
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor="#666"
              value={formState.lastName}
              onChangeText={(value) => setFormState({ ...formState, lastName: value })}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666"
              value={formState.username}
              onChangeText={(value) => setFormState({ ...formState, username: value })}
            />
            <TextInput
              style={styles.input}
              placeholder="Birthday (YYYY-MM-DD)"
              placeholderTextColor="#666"
              value={formState.birthday}
              onChangeText={(value) => setFormState({ ...formState, birthday: value })}
            />
            {saving ? <ActivityIndicator /> : null}
            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => setEditing(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <Pressable
            style={styles.logoutButton}
            onPress={async () => {
              await clearToken();
              router.replace('/(tabs)');
            }}>
            <Text style={styles.logoutButtonText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f7f7fb',
  },
  scroll: {
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1b1b1f',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowLabel: {
    marginTop: 8,
    fontWeight: '600',
    color: '#6b6b73',
  },
  value: {
    color: '#1b1b1f',
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionActions: {
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#ff5c8a',
    paddingVertical: 10,
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
    flex: 1,
  },
  secondaryButtonText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  settingsCard: {
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
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b1b1f',
  },
  logoutButton: {
    backgroundColor: '#ffe5ec',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#c1121f',
    fontWeight: '600',
  },
});
