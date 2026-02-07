import React, { useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createDate } from '@/lib/api';

export default function CreateDateScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      const id = await createDate({ title, location, description, scheduledTime });
      router.replace(`/date/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create date.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>New Date</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Location"
          placeholderTextColor="#666"
          value={location}
          onChangeText={setLocation}
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Description"
          placeholderTextColor="#666"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Scheduled time (YYYY-MM-DDTHH:mm)"
          placeholderTextColor="#666"
          value={scheduledTime}
          onChangeText={setScheduledTime}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Button title="Create Date" onPress={handleCreate} disabled={!title || !location} />
        )}
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
    marginBottom: 12,
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#b00020',
  },
});
