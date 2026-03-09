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
import { ActionPillButton } from '@/components/ui/ActionPillButton';
import { NotificationsModal } from '@/components/ui/NotificationsModal';
import { OptionsMenuItem } from '@/components/ui/OptionsMenuItem';
import { OptionsPopover } from '@/components/ui/OptionsPopover';
import {
  AppNotification,
  clearToken,
  deleteProfileImage,
  fetchNotifications,
  fetchProfile,
  fetchProfileImages,
  markAllNotificationsAsRead,
  updatePushToken,
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
  const [updatingDiscovery, setUpdatingDiscovery] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');

  const loadProfile = async () => {
    setError('');
    setLoading(true);
    try {
      const [data, profileImages, notificationsData] = await Promise.all([
        fetchProfile(),
        fetchProfileImages(),
        fetchNotifications(),
      ]);
      setProfile(data);
      setImages(profileImages);
      setNotifications(notificationsData.notifications ?? []);
      setUnreadNotifications(notificationsData.unreadCount ?? 0);
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
      const updated = await updateProfile({
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        username: formState.username.trim(),
      });
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

  const updateDiscoveryFilter = async (value: 'ALL' | 'MALE' | 'FEMALE') => {
    if (!profile) return;
    setUpdatingDiscovery(true);
    setError('');
    try {
      const updated = await updateProfile({ dateListGenderFilter: value });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update date filter preference.');
    } finally {
      setUpdatingDiscovery(false);
    }
  };

  const handleLogout = async () => {
    try {
      await updatePushToken(null);
    } catch {
      // Ignore push-token cleanup failures during logout.
    }
    await clearToken();
    setTokenValue(null);
    router.replace('/(tabs)');
  };

  const openNotifications = async () => {
    setShowSettingsMenu(false);
    setShowNotificationsModal(true);
    setLoadingNotifications(true);
    setNotificationsError('');
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications ?? []);
      setUnreadNotifications(data.unreadCount ?? 0);
      if ((data.unreadCount ?? 0) > 0) {
        await markAllNotificationsAsRead();
        setUnreadNotifications(0);
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      }
    } catch (err) {
      setNotificationsError(err instanceof Error ? err.message : 'Failed to load notifications.');
    } finally {
      setLoadingNotifications(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.optionsMenuWrap}>
            <ActionPillButton label="Settings" onPress={() => setShowSettingsMenu((prev) => !prev)} />
          </View>
        </View>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

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
        </View>

        {profile && !editing ? (
          <View style={styles.card}>
            <Text style={styles.rowLabel}>Full name</Text>
            <Text style={styles.value}>
              {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || '-'}
            </Text>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.value}>{profile.username}</Text>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.value}>{profile.email}</Text>
            <Text style={styles.rowLabel}>Birthday</Text>
            <Text style={styles.value}>{profile.birthday ?? '-'}</Text>
            <Text style={styles.rowLabel}>Gender</Text>
            <Text style={styles.value}>{profile.gender ?? '-'}</Text>
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
            <Text style={styles.rowLabel}>Birthday</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formState.birthday || '-'}
              editable={false}
              selectTextOnFocus={false}
            />
            <Text style={styles.rowLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {['Male', 'Female', 'Other'].map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.genderOption,
                    styles.genderOptionDisabled,
                    formState.gender === option ? styles.genderOptionSelected : undefined,
                  ]}
                  disabled
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
                style={({ pressed }) => [styles.primaryButton, styles.actionButton, pressed && styles.buttonPressed]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.outlineButton, styles.actionButton, pressed && styles.buttonPressed]}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

      </ScrollView>
      <OptionsPopover visible={showSettingsMenu} onClose={() => setShowSettingsMenu(false)} topOffset={88} width={210}>
        <OptionsMenuItem
          iconName="edit"
          label="Edit profile"
          onPress={() => {
            setEditing(true);
            setShowSettingsMenu(false);
          }}
        />
        <OptionsMenuItem
          iconName="add-photo-alternate"
          label="Upload photos"
          onPress={async () => {
            setShowSettingsMenu(false);
            await handlePickProfileImages();
          }}
        />
        <OptionsMenuItem
          iconName="tune"
          label="Date feed"
          onPress={() => {
            setShowDiscoveryModal(true);
            setShowSettingsMenu(false);
          }}
        />
        <OptionsMenuItem
          iconName="notifications"
          label={unreadNotifications > 0 ? `Notifications (${unreadNotifications})` : 'Notifications'}
          onPress={openNotifications}
        />
        <OptionsMenuItem
          iconName="logout"
          iconColor="#c1121f"
          label="Log out"
          destructive
          onPress={handleLogout}
        />
      </OptionsPopover>
      <Modal visible={showDiscoveryModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDiscoveryModal(false)} />
          <View style={styles.discoveryModalCard}>
            <Text style={styles.discoveryModalTitle}>Show dates from</Text>
            <View style={styles.genderRow}>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'MALE', label: 'Male' },
                { id: 'FEMALE', label: 'Female' },
              ].map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.genderOption,
                    profile?.dateListGenderFilter?.toUpperCase() === option.id ? styles.genderOptionSelected : undefined,
                  ]}
                  onPress={() => updateDiscoveryFilter(option.id as 'ALL' | 'MALE' | 'FEMALE')}
                  disabled={updatingDiscovery}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      profile?.dateListGenderFilter?.toUpperCase() === option.id
                        ? styles.genderOptionTextSelected
                        : undefined,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {updatingDiscovery ? <ActivityIndicator /> : null}
            <Pressable
              style={({ pressed }) => [styles.modalCloseAction, pressed && styles.buttonPressed]}
              onPress={() => setShowDiscoveryModal(false)}
            >
              <Text style={styles.modalCloseActionText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        loading={loadingNotifications}
        error={notificationsError}
        notifications={notifications}
      />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
  inputDisabled: {
    backgroundColor: '#f2f2f6',
    color: '#7a7a86',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  compactPrimaryButton: {
    alignSelf: 'center',
    width: 180,
    paddingHorizontal: 16,
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
  genderOptionDisabled: {
    opacity: 0.7,
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
  optionsMenuWrap: {
    alignItems: 'flex-end',
  },
  discoveryModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  discoveryModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1f',
  },
  modalCloseAction: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseActionText: {
    color: ACCENT,
    fontWeight: '600',
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
