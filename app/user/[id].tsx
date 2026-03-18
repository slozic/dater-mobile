import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchPublicProfile, PublicProfile } from '@/lib/api';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {profile ? (
          <View style={styles.card}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{profile.fullName ?? '-'}</Text>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{profile.username}</Text>
            <Text style={styles.label}>Gender</Text>
            <Text style={styles.value}>{profile.gender ?? '-'}</Text>
            <Text style={styles.label}>Photos</Text>
            <View style={styles.imageRow}>
              {profile.profileImageData?.length ? (
                profile.profileImageData.map((img) => (
                  <Pressable key={img.id} onPress={() => setPreviewImage(img.imageUrl ?? null)}>
                    <Image source={{ uri: img.imageUrl ?? '' }} style={styles.image} />
                  </Pressable>
                ))
              ) : (
                <Text style={styles.note}>No photos available.</Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <Modal visible={Boolean(previewImage)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewImage(null)} />
          {previewImage ? <Image source={{ uri: previewImage }} style={styles.modalImage} /> : null}
          <Pressable style={styles.modalClose} onPress={() => setPreviewImage(null)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#f7f7fb',
  },
  scroll: {
    paddingBottom: 24,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: '70%',
    borderRadius: 14,
    resizeMode: 'contain',
  },
  modalClose: {
    marginTop: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalCloseText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
});
