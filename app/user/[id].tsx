import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchPublicProfile, PublicProfile } from '@/lib/api';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Missing user id.');
      setLoading(false);
      return;
    }
    fetchPublicProfile(id)
      .then((data) => setProfile(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Public Profile</Text>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {profile ? (
          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{profile.username}</Text>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>
              {`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || '-'}
            </Text>
            <Text style={styles.label}>Photos</Text>
            <View style={styles.imageRow}>
              {profile.profileImageData?.length ? (
                profile.profileImageData.map((img) => (
                  <Image key={img.id} source={{ uri: img.imageUrl ?? '' }} style={styles.image} />
                ))
              ) : (
                <Text style={styles.note}>No photos available.</Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
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
  scroll: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1b1f',
    marginBottom: 8,
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    color: '#6b6b73',
    fontWeight: '600',
  },
  value: {
    color: '#1b1b1f',
  },
  note: {
    marginTop: 8,
    color: '#6b6b73',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
});
