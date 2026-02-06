import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DateDetails, fetchDateById } from '@/lib/api';

export default function DateDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [date, setDate] = useState<DateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Missing date id.');
      setLoading(false);
      return;
    }
    fetchDateById(id)
      .then(setDate)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load date.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {date ? (
        <View style={styles.card}>
          <Text style={styles.title}>{date.title}</Text>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{date.location}</Text>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{date.description}</Text>
          <Text style={styles.label}>Scheduled</Text>
          <Text style={styles.value}>{date.scheduledTime}</Text>
          <Text style={styles.label}>Creator</Text>
          <Text style={styles.value}>{date.dateOwner}</Text>
        </View>
      ) : null}
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
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    color: '#1b1b1f',
  },
  label: {
    marginTop: 10,
    fontWeight: '600',
    color: '#6b6b73',
  },
  value: {
    color: '#1b1b1f',
  },
});
