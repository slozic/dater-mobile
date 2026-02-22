import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  acceptAttendee,
  AttendeeRequest,
  DateDetails,
  DateImage,
  deleteDateImage,
  deleteDate,
  fetchAttendeeRequests,
  fetchAttendeeStatus,
  fetchDateById,
  fetchDateImages,
  fetchProfile,
  requestToJoinDate,
  cancelJoinRequest,
  rejectAttendee,
  updateDate,
  uploadDateImages,
} from '@/lib/api';

const ACCENT = '#ff5c8a';

export default function DateDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [date, setDate] = useState<DateDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [images, setImages] = useState<DateImage[]>([]);
  const [requests, setRequests] = useState<AttendeeRequest[]>([]);
  const [joinStatus, setJoinStatus] = useState<string>('NOT_REQUESTED');
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showEditPicker, setShowEditPicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingDate, setDeletingDate] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    location: '',
    description: '',
    scheduledTime: '',
  });
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
        setEditForm({
          title: dateData.title ?? '',
          location: dateData.location ?? '',
          description: dateData.description ?? '',
          scheduledTime: dateData.scheduledTime?.slice(0, 16) ?? '',
        });
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

  const handleSaveEdit = async () => {
    if (!id) return;
    setError('');
    setSavingEdit(true);
    try {
      const updated = await updateDate(id, {
        title: editForm.title,
        location: editForm.location,
        description: editForm.description,
        scheduledTime: editForm.scheduledTime,
      });
      setDate(updated);
      setEditing(false);
      setActionMessage('Date updated.');
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        router.replace('/(tabs)');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to update date.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDate = async () => {
    if (!id) return;
    setDeletingDate(true);
    try {
      await deleteDate(id);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        router.replace('/(tabs)');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to delete date.');
    } finally {
      setDeletingDate(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!id) return;
    try {
      await requestToJoinDate(id);
      const status = await fetchAttendeeStatus(id);
      setJoinStatus(status.joinDateStatus ?? 'ON_WAITLIST');
      setActionMessage('Join request sent.');
      Alert.alert('Request sent', 'You are now on the waitlist.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request.');
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, ' ').toLowerCase();

  const formatDisplayDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  };

  const formatDateTimeForInput = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  };

  const openEditAndroidPicker = () => {
    const current = editForm.scheduledTime ? new Date(editForm.scheduledTime) : new Date();
    const safeCurrent = Number.isNaN(current.getTime()) ? new Date() : current;

    DateTimePickerAndroid.open({
      value: safeCurrent,
      mode: 'date',
      is24Hour: true,
      onChange: (_, date) => {
        if (!date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: true,
          onChange: (_, time) => {
            if (!time) return;
            const combined = new Date(date);
            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
            setEditForm((prev) => ({ ...prev, scheduledTime: formatDateTimeForInput(combined) }));
          },
        });
      },
    });
  };

  const badgeStyle = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { backgroundColor: '#e8f5e9' };
      case 'REJECTED':
        return { backgroundColor: '#ffebee' };
      case 'ON_WAITLIST':
        return { backgroundColor: '#fff3e0' };
      default:
        return { backgroundColor: '#e9e9ef' };
    }
  };

  const handleCancelJoin = async () => {
    if (!id) return;
    try {
      await cancelJoinRequest(id);
      const status = await fetchAttendeeStatus(id);
      setJoinStatus(status.joinDateStatus ?? 'NOT_REQUESTED');
      setActionMessage('Request canceled.');
      Alert.alert('Request canceled', 'Your request has been removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request.');
    }
  };

  const handleAccept = async (userId: string) => {
    if (!id) return;
    await acceptAttendee(id, userId);
    const updated = await fetchAttendeeRequests(id);
    setRequests(updated);
    setActionMessage('Request accepted.');
    Alert.alert('Request accepted', 'You accepted this attendee.');
  };

  const handleReject = async (userId: string) => {
    if (!id) return;
    await rejectAttendee(id, userId);
    const updated = await fetchAttendeeRequests(id);
    setRequests(updated);
    setActionMessage('Request rejected.');
    Alert.alert('Request rejected', 'You rejected this attendee.');
  };

  const confirmAccept = (userId: string) => {
    Alert.alert('Accept request?', 'This will accept this attendee.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => handleAccept(userId) },
    ]);
  };

  const confirmReject = (userId: string) => {
    Alert.alert('Reject request?', 'This will reject this attendee.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => handleReject(userId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {date ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>{date.title}</Text>
          {date.dateOwnerId === currentUserId ? (
            <View style={styles.ownerActionRow}>
              {!editing ? (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, styles.flexButton, pressed && styles.buttonPressed]}
                    onPress={() => setEditing(true)}
                  >
                    <Text style={styles.primaryButtonText}>Edit date</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.dangerOutlineButton,
                      styles.flexButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() =>
                      Alert.alert('Delete date?', 'This will permanently delete this date.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: handleDeleteDate },
                      ])
                    }
                    disabled={deletingDate}
                  >
                    <Text style={styles.dangerOutlineText}>{deletingDate ? 'Deleting...' : 'Delete date'}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor="#666"
                value={editForm.title}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, title: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Location"
                placeholderTextColor="#666"
                value={editForm.location}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, location: value }))}
              />
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Description"
                placeholderTextColor="#666"
                value={editForm.description}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, description: value }))}
                multiline
              />
              <View style={styles.pickerRow}>
                <Pressable
                  style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      openEditAndroidPicker();
                    } else {
                      setShowEditPicker(true);
                    }
                  }}
                >
                  <Text style={styles.outlineButtonText}>Pick date & time</Text>
                </Pressable>
                <Text style={styles.value}>
                  {editForm.scheduledTime ? formatDisplayDateTime(editForm.scheduledTime) : 'Not set'}
                </Text>
              </View>
              {Platform.OS === 'ios' && showEditPicker ? (
                <>
                  <DateTimePicker
                    value={
                      Number.isNaN(new Date(editForm.scheduledTime).getTime())
                        ? new Date()
                        : new Date(editForm.scheduledTime)
                    }
                    mode="datetime"
                    display="inline"
                    onChange={(_: unknown, selected?: Date) => {
                      if (selected) {
                        setEditForm((prev) => ({
                          ...prev,
                          scheduledTime: formatDateTimeForInput(selected),
                        }));
                      }
                    }}
                  />
                  <Pressable
                    style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
                    onPress={() => setShowEditPicker(false)}
                  >
                    <Text style={styles.outlineButtonText}>Done</Text>
                  </Pressable>
                </>
              ) : null}
              <View style={styles.ownerActionRow}>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, styles.flexButton, pressed && styles.buttonPressed]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  <Text style={styles.primaryButtonText}>{savingEdit ? 'Saving...' : 'Save changes'}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.outlineButton, styles.flexButton, pressed && styles.buttonPressed]}
                  onPress={() => {
                    setEditing(false);
                    setShowEditPicker(false);
                    setEditForm({
                      title: date.title ?? '',
                      location: date.location ?? '',
                      description: date.description ?? '',
                      scheduledTime: date.scheduledTime?.slice(0, 16) ?? '',
                    });
                  }}
                >
                  <Text style={styles.outlineButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{date.location}</Text>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{date.description}</Text>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>{formatDisplayDateTime(date.scheduledTime)}</Text>
              {date.dateOwnerId !== currentUserId ? (
                <>
                  <Text style={styles.label}>Creator</Text>
                  <Text style={styles.value}>{date.dateOwner}</Text>
                </>
              ) : null}
            </>
          )}

          {actionMessage ? <Text style={styles.notice}>{actionMessage}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>
            <View style={styles.imageRow}>
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
                  {date.dateOwnerId === currentUserId ? (
                    <Pressable onPress={() => handleDeleteImage(img.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
            {date.dateOwnerId === currentUserId ? (
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={handlePickImages}
              >
                <Text style={styles.primaryButtonText}>Upload images</Text>
              </Pressable>
            ) : null}
          </View>

          {date.dateOwnerId !== currentUserId ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Join status</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, badgeStyle(joinStatus)]}>
                  <Text style={styles.statusBadgeText}>{formatStatus(joinStatus)}</Text>
                </View>
              </View>
              {joinStatus === 'NOT_REQUESTED' ? (
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                  onPress={handleRequestJoin}
                >
                  <Text style={styles.primaryButtonText}>Request to join</Text>
                </Pressable>
              ) : null}
              {joinStatus === 'ON_WAITLIST' ? (
                <Pressable
                  style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
                  onPress={handleCancelJoin}
                >
                  <Text style={styles.outlineButtonText}>Cancel request</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {date.dateOwnerId === currentUserId ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requests</Text>
              {requests.length === 0 ? <Text style={styles.value}>No requests yet.</Text> : null}
              {(() => {
                const accepted = requests.find((req) => req.status === 'ACCEPTED');
                const waitlist = requests.filter((req) => req.status === 'ON_WAITLIST');
                return (
                  <View style={styles.requestSection}>
                    <Text style={styles.requestSubtitle}>Accepted</Text>
                    {accepted ? (
                      <View style={styles.requestRow}>
                        <View style={styles.requestInfo}>
                          <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>{accepted.username?.[0]?.toUpperCase() ?? '?'}</Text>
                          </View>
                          <Text style={styles.requestName}>{accepted.username}</Text>
                        </View>
                        <View style={styles.requestActions}>
                          <Text style={styles.acceptedBadge}>Accepted</Text>
                          <Pressable
                            style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}
                            onPress={() => confirmReject(accepted.id)}
                          >
                            <Text style={styles.outlineButtonText}>Reject</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.value}>No accepted attendee yet.</Text>
                    )}

                    <Pressable style={styles.toggleButton} onPress={() => setShowWaitlist((prev) => !prev)}>
                      <Text style={styles.toggleButtonText}>
                        {showWaitlist ? 'Hide waitlist' : `Show waitlist (${waitlist.length})`}
                      </Text>
                    </Pressable>
                    {showWaitlist
                      ? waitlist.map((req) => (
                          <View key={req.id} style={styles.requestRow}>
                                <Pressable
                                  style={styles.requestInfo}
                                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: req.id } })}
                                  hitSlop={8}
                                >
                                  <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{req.username?.[0]?.toUpperCase() ?? '?'}</Text>
                                  </View>
                                  <Text style={styles.requestName}>{req.username}</Text>
                                </Pressable>
                            <View style={styles.requestActions}>
                              <Pressable
                                    style={({ pressed }) => [
                                      styles.primaryButton,
                                      styles.acceptButton,
                                      pressed && styles.buttonPressed,
                                    ]}
                                    onPress={() => confirmAccept(req.id)}
                                disabled={Boolean(accepted && accepted.id !== req.id)}
                              >
                                <Text
                                  style={[
                                        styles.primaryButtonText,
                                    accepted && accepted.id !== req.id ? styles.disabledText : undefined,
                                  ]}
                                >
                                  Accept
                                </Text>
                              </Pressable>
                                  <Pressable
                                    style={({ pressed }) => [
                                      styles.outlineButton,
                                      pressed && styles.buttonPressed,
                                    ]}
                                    onPress={() => confirmReject(req.id)}
                                  >
                                    <Text style={styles.outlineButtonText}>Reject</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))
                      : null}
                  </View>
                );
              })()}
            </View>
          ) : null}
        </View>
        </ScrollView>
      ) : null}
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
    paddingTop: 12,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#e9e9ef',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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
  notice: {
    marginTop: 8,
    color: '#2e7d32',
    fontWeight: '600',
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
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  flexButton: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ownerActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  editForm: {
    gap: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerRow: {
    gap: 8,
  },
  deleteText: {
    color: '#c1121f',
    marginTop: 6,
    fontSize: 12,
  },
  outlineButton: {
    marginTop: 8,
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
  dangerOutlineButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#c1121f',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerOutlineText: {
    color: '#c1121f',
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
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: '#1b1b1f',
  },
  requestName: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  acceptButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  disabledText: {
    color: '#b0b0b8',
  },
  requestSection: {
    gap: 8,
  },
  requestSubtitle: {
    fontWeight: '600',
    color: '#6b6b73',
  },
  acceptedBadge: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  toggleButtonText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
