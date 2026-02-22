import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  clearToken,
  deleteProfileImage,
  fetchProfile,
  fetchProfileImages,
  updateProfile,
  uploadProfileImages,
  UserProfile,
} from '@/lib/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth';

const ACCENT = '#ff5c8a';

export default function ProfileScreen() {
  const router = useRouter();
  const { setTokenValue } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    username: '',
    birthday: '',
    gender: '',
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<Array<{ id: string; imageUrl: string | null }>>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadProfile = async () => {
    setError('');
    setLoading(true);
    try {
      const [data, profileImages] = await Promise.all([fetchProfile(), fetchProfileImages()]);
      setProfile(data);
      setImages(profileImages);
      setFormState({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        username: data.username ?? '',
        birthday: data.birthday ?? '',
        gender: data.gender ?? '',
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        router.replace('/(tabs)');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

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

  const handlePickProfileImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      setError('Media library permission is required to upload images.');
      return;
    }
    const picker = ImagePicker as unknown as { MediaType?: { Images?: unknown } };
    const options: Record<string, unknown> = {
      allowsMultipleSelection: true,
      quality: 0.8,
    };
    if (picker.MediaType?.Images) {
      options.mediaTypes = [picker.MediaType.Images];
    }
    const result = await ImagePicker.launchImageLibraryAsync(options as any);
    if (result.canceled) return;
    const files = result.assets.map((asset) => ({
      uri: asset.uri,
      type: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? `profile-${Date.now()}.jpg`,
    }));
    try {
      await uploadProfileImages(files);
      const updated = await fetchProfileImages();
      setImages(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload profile images.');
    }
  };

  const handleDeleteProfileImage = async (imageId: string) => {
    try {
      await deleteProfileImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.rowLabel}>Gender</Text>
            <Text style={styles.value}>{profile.gender ?? '-'}</Text>
            <View style={styles.sectionActions}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.primaryButtonText}>Edit Profile</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile photos</Text>
          <View style={styles.imageRow}>
            {images.length === 0 ? <Text style={styles.value}>No photos yet.</Text> : null}
            {images.map((img) => (
              <View key={img.id} style={styles.imageWrap}>
                {img.imageUrl ? (
                  <Pressable onPress={() => setPreviewImage(img.imageUrl)}>
                    <Image source={{ uri: img.imageUrl }} style={styles.image} />
                  </Pressable>
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>No image</Text>
                  </View>
                )}
                <Pressable onPress={() => handleDeleteProfileImage(img.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={handlePickProfileImages}
          >
            <Text style={styles.primaryButtonText}>Upload photos</Text>
          </Pressable>
        </View>

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
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.genderOption,
                    formState.gender === option ? styles.genderOptionSelected : undefined,
                  ]}
                  onPress={() => setFormState({ ...formState, gender: option })}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      formState.gender === option ? styles.genderOptionTextSelected : undefined,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            {saving ? <ActivityIndicator /> : null}
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Settings</Text>
          <Pressable
            style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
            onPress={async () => {
              await clearToken();
              setTokenValue(null);
              router.replace('/(tabs)');
            }}>
            <Text style={styles.outlineButtonText}>Log out</Text>
          </Pressable>
        </View>
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
  deleteText: {
    color: '#c1121f',
    marginTop: 6,
    fontSize: 12,
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
    backgroundColor: ACCENT,
    paddingVertical: 10,
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
    flex: 1,
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
