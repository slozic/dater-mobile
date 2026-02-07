import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  acceptAttendee,
  AttendeeRequest,
  DateDetails,
  DateImage,
  deleteDateImage,
  fetchAttendeeRequests,
  fetchAttendeeStatus,
  fetchDateById,
  fetchDateImages,
  fetchProfile,
  requestToJoinDate,
  cancelJoinRequest,
  rejectAttendee,
  uploadDateImages,
} from '@/lib/api';

export default function DateDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [date, setDate] = useState<DateDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [images, setImages] = useState<DateImage[]>([]);
  const [requests, setRequests] = useState<AttendeeRequest[]>([]);
  const [joinStatus, setJoinStatus] = useState<string>('NOT_REQUESTED');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Missing date id.');
      setLoading(false);
      return;
    }
    Promise.all([fetchDateById(id), fetchProfile()])
      .then(([dateData, profile]) => {
        setDate(dateData);
        setCurrentUserId(profile.id);
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
          router.replace('/(tabs)');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load date.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchDateImages(id)
      .then(setImages)
      .catch(() => {});
    fetchAttendeeStatus(id)
      .then((status) => setJoinStatus(status.joinDateStatus ?? 'NOT_REQUESTED'))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || !date || !currentUserId) return;
    if (date.dateOwnerId === currentUserId) {
      fetchAttendeeRequests(id).then(setRequests).catch(() => {});
    }
  }, [id, date, currentUserId]);

  const handlePickImages = async () => {
    if (!id) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Media library permission is required to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      ...(ImagePicker.MediaType?.Images ? { mediaTypes: [ImagePicker.MediaType.Images] } : {}),
      quality: 0.8,
    });
    if (result.canceled) return;
    const files = result.assets.map((asset) => ({
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
    }));
    try {
      await uploadDateImages(id, files);
      const updated = await fetchDateImages(id);
      setImages(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images.');
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!id) return;
    try {
      await deleteDateImage(id, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image.');
    }
  };

  const handleRequestJoin = async () => {
    if (!id) return;
    try {
      await requestToJoinDate(id);
      const status = await fetchAttendeeStatus(id);
      setJoinStatus(status.joinDateStatus ?? 'ON_WAITLIST');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request.');
    }
  };

  const handleCancelJoin = async () => {
    if (!id) return;
    try {
      await cancelJoinRequest(id);
      const status = await fetchAttendeeStatus(id);
      setJoinStatus(status.joinDateStatus ?? 'NOT_REQUESTED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request.');
    }
  };

  const handleAccept = async (userId: string) => {
    if (!id) return;
    await acceptAttendee(id, userId);
    const updated = await fetchAttendeeRequests(id);
    setRequests(updated);
  };

  const handleReject = async (userId: string) => {
    if (!id) return;
    await rejectAttendee(id, userId);
    const updated = await fetchAttendeeRequests(id);
    setRequests(updated);
  };

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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>
            <View style={styles.imageRow}>
              {images.map((img) => (
                <View key={img.id} style={styles.imageWrap}>
                  {img.imageUrl ? (
                    <Image source={{ uri: img.imageUrl }} style={styles.image} />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Text style={styles.imageFallbackText}>No image</Text>
                    </View>
                  )}
                  {date.dateOwnerId === currentUserId ? (
                    <Pressable onPress={() => handleDeleteImage(img.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
            {date.dateOwnerId === currentUserId ? (
              <Pressable style={styles.primaryButton} onPress={handlePickImages}>
                <Text style={styles.primaryButtonText}>Upload images</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join status</Text>
            <Text style={styles.value}>{joinStatus}</Text>
            {joinStatus === 'NOT_REQUESTED' ? (
              <Pressable style={styles.primaryButton} onPress={handleRequestJoin}>
                <Text style={styles.primaryButtonText}>Request to join</Text>
              </Pressable>
            ) : null}
            {joinStatus === 'ON_WAITLIST' ? (
              <Pressable style={styles.secondaryButton} onPress={handleCancelJoin}>
                <Text style={styles.secondaryButtonText}>Cancel request</Text>
              </Pressable>
            ) : null}
          </View>

          {date.dateOwnerId === currentUserId ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requests</Text>
              {requests.length === 0 ? <Text style={styles.value}>No requests yet.</Text> : null}
              {requests.map((req) => (
                <View key={req.id} style={styles.requestRow}>
                  <Text style={styles.value}>{req.username}</Text>
                  <View style={styles.requestActions}>
                    <Pressable onPress={() => handleAccept(req.id)}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </Pressable>
                    <Pressable onPress={() => handleReject(req.id)}>
                      <Text style={styles.rejectText}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
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
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1b1b1f',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageWrap: {
    width: 90,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  imageFallback: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    color: '#6b6b73',
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#ff5c8a',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteText: {
    color: '#c1121f',
    marginTop: 6,
    fontSize: 12,
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: '#f0f0f4',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  requestRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptText: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  rejectText: {
    color: '#c1121f',
    fontWeight: '600',
  },
});
