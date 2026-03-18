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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActionPillButton } from '@/components/ui/ActionPillButton';
import { OptionsMenuItem } from '@/components/ui/OptionsMenuItem';
import { OptionsPopover } from '@/components/ui/OptionsPopover';
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
  const [showRequests, setShowRequests] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showEditPicker, setShowEditPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
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
  }, [id, router]);

  useEffect(() => {
    if (!id) return;
    fetchDateImages(id)
      .then(setImages)
      .catch(() => {});
    fetchAttendeeStatus(id)
      .then((status) => setJoinStatus(status.joinDateStatus ?? 'NOT_REQUESTED'))
      .catch(() => {});
  }, [id]);

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

  const isPastDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return false;
    return parsed.getTime() <= Date.now() + 60_000;
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

  const handleOpenChat = async () => {
    if (!id || !date || !currentUserId) return;
    if (isPastDate(date.scheduledTime)) {
      setActionMessage('Chat is disabled for past dates.');
      return;
    }
    if (date.dateOwnerId === currentUserId) {
      try {
        const attendeeRequests = requestsLoaded ? requests : await fetchAttendeeRequests(id);
        const accepted = attendeeRequests.find((request) => request.status === 'ACCEPTED');
        if (!accepted) {
          setActionMessage('Chat becomes available after accepting one attendee.');
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check chat availability.');
        return;
      }
    } else if (joinStatus !== 'ACCEPTED') {
      setActionMessage('Chat becomes available once your request is accepted.');
      return;
    }
    router.push({ pathname: '/date/chat/[id]', params: { id } });
    setShowOptionsMenu(false);
  };

  const loadRequests = async () => {
    if (!id) return;
    setLoadingRequests(true);
    try {
      const updated = await fetchAttendeeRequests(id);
      setRequests(updated);
      setRequestsLoaded(true);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        router.replace('/(tabs)');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const toggleRequests = async () => {
    if (showRequests) {
      setShowRequests(false);
      return;
    }
    setShowRequests(true);
    if (!requestsLoaded) {
      await loadRequests();
    }
  };

  const handleAccept = async (userId: string) => {
    if (!id) return;
    try {
      await acceptAttendee(id, userId);
      const updated = await fetchAttendeeRequests(id);
      setRequests(updated);
      setRequestsLoaded(true);
      setActionMessage('Request accepted.');
      Alert.alert('Request accepted', 'You accepted this attendee.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request.');
    }
  };

  const handleReject = async (userId: string) => {
    if (!id) return;
    try {
      await rejectAttendee(id, userId);
      const updated = await fetchAttendeeRequests(id);
      setRequests(updated);
      setRequestsLoaded(true);
      setActionMessage('Request rejected.');
      Alert.alert('Request rejected', 'You rejected this attendee.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    }
  };

  const confirmAccept = (userId: string) => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof globalThis.confirm === 'function' ? globalThis.confirm('Accept request? This will accept this attendee.') : true;
      if (confirmed) {
        void handleAccept(userId);
      }
      return;
    }
    Alert.alert('Accept request?', 'This will accept this attendee.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => handleAccept(userId) },
    ]);
  };

  const confirmReject = (userId: string) => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof globalThis.confirm === 'function' ? globalThis.confirm('Reject request? This will reject this attendee.') : true;
      if (confirmed) {
        void handleReject(userId);
      }
      return;
    }
    Alert.alert('Reject request?', 'This will reject this attendee.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => handleReject(userId) },
    ]);
  };

  const attendeeRequests =
    currentUserId == null ? requests : requests.filter((request) => request.id !== currentUserId);
  const acceptedAttendee = attendeeRequests.find((request) => request.status === 'ACCEPTED');
  const waitlistAttendees = attendeeRequests.filter((request) => request.status === 'ON_WAITLIST');
  const visibleRequestsCount = waitlistAttendees.length + (acceptedAttendee ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {date ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.topMetaRow}>
            <View style={styles.inlineDateChip}>
              <Text style={styles.inlineDateChipText} numberOfLines={1}>
                {date.title}
              </Text>
            </View>
            {(() => {
              const isOwner = date.dateOwnerId === currentUserId;
              const pastDate = isPastDate(date.scheduledTime);
              const canEditDate = isOwner && !pastDate && !editing;
              const canDeleteDate = isOwner && !editing;
              const canUploadImages = isOwner && !pastDate;
              const hasMenuActions = canEditDate || canDeleteDate || canUploadImages;

              if (!hasMenuActions) return null;

              return (
                <View style={styles.optionsMenuInline}>
                  <ActionPillButton label="Options" onPress={() => setShowOptionsMenu((prev) => !prev)} />
                </View>
              );
            })()}
          </View>
          {isPastDate(date.scheduledTime) ? (
            <Text style={styles.pastInfo}>Past date: requests and new uploads are disabled.</Text>
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
                  <View style={styles.creatorRow}>
                    <Text style={styles.value}>{date.dateOwner}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.creatorProfileButton, pressed && styles.buttonPressed]}
                      onPress={() => router.push({ pathname: '/user/[id]', params: { id: date.dateOwnerId } })}
                    >
                      <Text style={styles.creatorProfileButtonText}>View profile</Text>
                    </Pressable>
                  </View>
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
          </View>

          {date.dateOwnerId !== currentUserId && !isPastDate(date.scheduledTime) ? (
            <View style={[styles.section, styles.joinStatusSection]}>
              {joinStatus !== 'ACCEPTED' ? <Text style={styles.sectionTitle}>Join status</Text> : null}
              {joinStatus !== 'ACCEPTED' ? (
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, badgeStyle(joinStatus)]}>
                    <Text style={styles.statusBadgeText}>{formatStatus(joinStatus)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.acceptedNoticeRow}>
                  <Text style={styles.acceptedNoticeText}>Your date request has been accepted!</Text>
                  <MaterialIcons name="favorite" size={16} color={ACCENT} />
                </View>
              )}
              {joinStatus === 'NOT_REQUESTED' ? (
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, styles.compactCtaButton, pressed && styles.buttonPressed]}
                  onPress={handleRequestJoin}
                >
                  <Text style={styles.primaryButtonText}>Request to join</Text>
                </Pressable>
              ) : null}
              {joinStatus === 'ON_WAITLIST' ? (
                <Pressable
                  style={({ pressed }) => [styles.outlineButton, styles.compactCtaButton, pressed && styles.buttonPressed]}
                  onPress={handleCancelJoin}
                >
                  <Text style={styles.outlineButtonText}>Cancel request</Text>
                </Pressable>
              ) : null}
              {joinStatus === 'ACCEPTED' ? (
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, styles.compactCtaButton, pressed && styles.buttonPressed]}
                  onPress={handleOpenChat}
                >
                  <Text style={styles.primaryButtonText}>Send message</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {date.dateOwnerId === currentUserId && !isPastDate(date.scheduledTime) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requests</Text>
              {!showRequests ? (
                <Pressable
                  style={styles.toggleButton}
                  onPress={toggleRequests}
                  disabled={loadingRequests}
                >
                  <Text style={styles.toggleButtonText}>
                    {loadingRequests
                      ? 'Loading requests...'
                      : requestsLoaded
                        ? `View requests (${visibleRequestsCount})`
                        : 'View requests'}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.requestSection}>
                  {loadingRequests ? <ActivityIndicator /> : null}
                  {!loadingRequests && visibleRequestsCount === 0 ? <Text style={styles.value}>No requests yet.</Text> : null}
                  {!loadingRequests ? (
                    <>
                      <Text style={styles.requestSubtitle}>Accepted attendee</Text>
                      {acceptedAttendee ? (
                        <View style={styles.requestCard}>
                          <Pressable
                            style={styles.requestInfo}
                            onPress={() =>
                              router.push({ pathname: '/user/[id]', params: { id: acceptedAttendee.id } })
                            }
                            hitSlop={8}
                          >
                            <View style={styles.avatarCircle}>
                              <MaterialIcons name="person" size={18} color="#6b6b73" />
                            </View>
                            <Text style={styles.requestName}>{acceptedAttendee.username}</Text>
                          </Pressable>
                          <View style={styles.requestActions}>
                            <Pressable
                              style={({ pressed }) => [styles.requestPrimaryAction, pressed && styles.buttonPressed]}
                              onPress={handleOpenChat}
                            >
                              <Text style={styles.requestPrimaryActionText}>Send message</Text>
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [styles.requestOutlineAction, pressed && styles.buttonPressed]}
                              onPress={() => confirmReject(acceptedAttendee.id)}
                            >
                              <Text style={styles.requestOutlineActionText}>Reject</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.inlineHintWrap}>
                          <Text style={styles.value}>No accepted attendee yet.</Text>
                          <Pressable style={[styles.requestPrimaryAction, styles.requestActionDisabled]} disabled>
                            <Text style={[styles.requestPrimaryActionText, styles.disabledText]}>Send message</Text>
                          </Pressable>
                        </View>
                      )}

                      <Text style={styles.requestSubtitle}>Waitlist ({waitlistAttendees.length})</Text>
                      {waitlistAttendees.length === 0 ? <Text style={styles.value}>No one on waitlist.</Text> : null}
                      {waitlistAttendees.map((req) => (
                        <View key={req.id} style={styles.requestCard}>
                          <Pressable
                            style={styles.requestInfo}
                            onPress={() => router.push({ pathname: '/user/[id]', params: { id: req.id } })}
                            hitSlop={8}
                          >
                            <View style={styles.avatarCircle}>
                              <MaterialIcons name="person" size={18} color="#6b6b73" />
                            </View>
                            <Text style={styles.requestName}>{req.username}</Text>
                          </Pressable>
                          <View style={styles.requestActions}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.requestPrimaryAction,
                                pressed && styles.buttonPressed,
                              ]}
                              onPress={() => confirmAccept(req.id)}
                              disabled={Boolean(acceptedAttendee && acceptedAttendee.id !== req.id)}
                            >
                              <Text
                                style={[
                                  styles.requestPrimaryActionText,
                                  acceptedAttendee && acceptedAttendee.id !== req.id ? styles.disabledText : undefined,
                                ]}
                              >
                                Accept
                              </Text>
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [styles.requestOutlineAction, pressed && styles.buttonPressed]}
                              onPress={() => confirmReject(req.id)}
                            >
                              <Text style={styles.requestOutlineActionText}>Reject</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </>
                  ) : null}
                  <Pressable style={styles.toggleButton} onPress={toggleRequests}>
                    <Text style={styles.toggleButtonText}>Hide requests</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : null}
        </View>
        </ScrollView>
      ) : null}
      {date ? (
        <OptionsPopover visible={showOptionsMenu} onClose={() => setShowOptionsMenu(false)} topOffset={130} width={210}>
          {date.dateOwnerId === currentUserId && !isPastDate(date.scheduledTime) && !editing ? (
            <OptionsMenuItem
              iconName="edit"
              label="Edit date"
              onPress={() => {
                setEditing(true);
                setShowOptionsMenu(false);
              }}
            />
          ) : null}
          {date.dateOwnerId === currentUserId && !editing ? (
            <OptionsMenuItem
              iconName="delete-outline"
              iconColor="#c1121f"
              label={deletingDate ? 'Deleting...' : 'Delete date'}
              destructive
              onPress={() => {
                setShowOptionsMenu(false);
                Alert.alert('Delete date?', 'This will permanently delete this date.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleDeleteDate },
                ]);
              }}
              disabled={deletingDate}
            />
          ) : null}
          {date.dateOwnerId === currentUserId && !isPastDate(date.scheduledTime) ? (
            <OptionsMenuItem
              iconName="add-photo-alternate"
              label="Upload images"
              onPress={async () => {
                setShowOptionsMenu(false);
                await handlePickImages();
              }}
            />
          ) : null}
        </OptionsPopover>
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
    paddingTop: 8,
    backgroundColor: '#f7f7fb',
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  inlineDateChip: {
    maxWidth: '68%',
    borderRadius: 12,
    backgroundColor: '#ffe5ef',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ffd0e0',
  },
  inlineDateChipText: {
    color: '#7a2044',
    fontSize: 12,
    fontWeight: '600',
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
  creatorRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  creatorProfileButton: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  creatorProfileButtonText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 12,
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
  optionsMenuInline: {},
  section: {
    marginTop: 16,
  },
  joinStatusSection: {
    marginTop: 22,
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
  pastInfo: {
    marginBottom: 8,
    color: '#7a7a86',
    fontStyle: 'italic',
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
  compactCtaButton: {
    alignSelf: 'center',
    width: 180,
    paddingHorizontal: 16,
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
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestName: {
    color: '#1b1b1f',
    fontWeight: '600',
    flexShrink: 1,
  },
  requestSection: {
    gap: 10,
  },
  acceptedNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  acceptedNoticeText: {
    color: '#1b1b1f',
    fontWeight: '700',
  },
  inlineHintWrap: {
    gap: 8,
    alignItems: 'flex-start',
  },
  requestSubtitle: {
    fontWeight: '600',
    color: '#6b6b73',
  },
  requestCard: {
    backgroundColor: '#f4f4f8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleButton: {
    marginTop: 8,
    backgroundColor: '#f0f0f4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disabledText: {
    color: '#b0b0b8',
  },
  requestPrimaryAction: {
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  requestActionDisabled: {
    opacity: 0.55,
  },
  requestPrimaryActionText: {
    color: '#fff',
    fontWeight: '600',
  },
  requestOutlineAction: {
    borderWidth: 1,
    borderColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  requestOutlineActionText: {
    color: ACCENT,
    fontWeight: '600',
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
