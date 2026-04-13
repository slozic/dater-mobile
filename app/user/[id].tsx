import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  blockUser,
  fetchPublicProfile,
  PublicProfile,
  REPORT_USER_NOTE_MAX_LENGTH,
  reportAndBlockUser,
  reportUser,
  ReportUserReason,
} from '@/lib/api';

const REPORT_REASON_OPTIONS: { value: ReportUserReason; label: string }[] = [
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
];

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState('');
  const [moderationSuccess, setModerationSuccess] = useState('');
  const [moderationLoading, setModerationLoading] = useState<'report' | 'block' | 'reportAndBlock' | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [pendingReportAction, setPendingReportAction] = useState<'report' | 'reportAndBlock' | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReportUserReason>('HARASSMENT');
  const [reportNote, setReportNote] = useState('');

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

  const handleBlockUser = () => {
    if (!id || moderationLoading) {
      return;
    }
    Alert.alert(
      'Block user',
      'You will no longer be able to interact with this user.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setModerationError('');
            setModerationSuccess('');
            setModerationLoading('block');
            try {
              await blockUser(id);
              setModerationSuccess('User blocked successfully.');
            } catch (err) {
              setModerationError(err instanceof Error ? err.message : 'Failed to block user.');
            } finally {
              setModerationLoading(null);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const openReportModal = (action: 'report' | 'reportAndBlock') => {
    if (!id || moderationLoading) {
      return;
    }
    setModerationError('');
    setModerationSuccess('');
    setPendingReportAction(action);
    setReportModalVisible(true);
  };

  const submitReportAction = async () => {
    if (!id || !pendingReportAction || moderationLoading) {
      return;
    }
    const note = reportNote.trim();
    setModerationError('');
    setModerationSuccess('');
    setModerationLoading(pendingReportAction);
    try {
      if (pendingReportAction === 'report') {
        await reportUser(id, { reason: selectedReason, note: note.length > 0 ? note : undefined });
        setModerationSuccess('User reported successfully.');
      } else {
        await reportAndBlockUser(id, { reason: selectedReason, note: note.length > 0 ? note : undefined });
        setModerationSuccess('User reported and blocked successfully.');
      }
      setReportModalVisible(false);
      setPendingReportAction(null);
      setReportNote('');
      setSelectedReason('HARASSMENT');
    } catch (err) {
      setModerationError(err instanceof Error ? err.message : 'Failed to submit moderation action.');
    } finally {
      setModerationLoading(null);
    }
  };

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
            <Text style={styles.label}>Safety</Text>
            <View style={styles.moderationRow}>
              <Pressable
                style={[styles.moderationTile, styles.reportTile, moderationLoading ? styles.disabledTile : null]}
                onPress={() => openReportModal('report')}
                disabled={Boolean(moderationLoading)}
                accessibilityRole="button"
                accessibilityLabel="Report this user"
                accessibilityHint="Open report options without blocking"
              >
                <Text style={styles.moderationTileText}>Report user</Text>
              </Pressable>
              <Pressable
                style={[styles.moderationTile, styles.blockTile, moderationLoading ? styles.disabledTile : null]}
                onPress={handleBlockUser}
                disabled={Boolean(moderationLoading)}
                accessibilityRole="button"
                accessibilityLabel="Block this user"
                accessibilityHint="Prevent future interactions with this user"
              >
                <Text style={styles.moderationTileText}>
                  {moderationLoading === 'block' ? 'Blocking...' : 'Block user'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.moderationTile, styles.reportBlockTile, moderationLoading ? styles.disabledTile : null]}
                onPress={() => openReportModal('reportAndBlock')}
                disabled={Boolean(moderationLoading)}
                accessibilityRole="button"
                accessibilityLabel="Report and block this user"
                accessibilityHint="Report this user and prevent future interactions"
              >
                <Text style={styles.moderationTileText}>Report + block</Text>
              </Pressable>
            </View>
            {moderationError ? <Text style={styles.error}>{moderationError}</Text> : null}
            {moderationSuccess ? <Text style={styles.success}>{moderationSuccess}</Text> : null}
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
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!moderationLoading) {
            setReportModalVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!moderationLoading) {
                setReportModalVisible(false);
              }
            }}
          />
          <View style={styles.reportModalCard}>
            <Text style={styles.reportModalTitle}>
              {pendingReportAction === 'reportAndBlock' ? 'Report and block user' : 'Report user'}
            </Text>
            <Text style={styles.reportModalSubtitle}>Choose a reason:</Text>
            <View style={styles.reasonGrid}>
              {REPORT_REASON_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.reasonChip,
                    selectedReason === option.value ? styles.reasonChipSelected : null,
                  ]}
                  onPress={() => setSelectedReason(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Report reason: ${option.label}`}
                  accessibilityHint="Select report reason"
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      selectedReason === option.value ? styles.reasonChipTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.reportNoteInput}
              value={reportNote}
              onChangeText={setReportNote}
              placeholder="Optional details"
              placeholderTextColor="#888"
              maxLength={REPORT_USER_NOTE_MAX_LENGTH}
              multiline
              accessibilityLabel="Report note"
              accessibilityHint="Optional additional details for the report"
            />
            <View style={styles.reportModalActions}>
              <Pressable
                style={[styles.modalActionButton, styles.modalCancelButton]}
                onPress={() => setReportModalVisible(false)}
                disabled={Boolean(moderationLoading)}
                accessibilityRole="button"
                accessibilityLabel="Cancel report action"
                accessibilityHint="Close this report dialog without submitting"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionButton, styles.modalSubmitButton, moderationLoading ? styles.disabledTile : null]}
                onPress={submitReportAction}
                disabled={Boolean(moderationLoading)}
                accessibilityRole="button"
                accessibilityLabel="Submit report action"
                accessibilityHint="Send selected moderation action"
              >
                <Text style={styles.modalSubmitText}>
                  {moderationLoading === 'report' || moderationLoading === 'reportAndBlock' ? 'Submitting...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </View>
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
  success: {
    color: '#0a7f42',
    marginTop: 4,
  },
  moderationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moderationTile: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reportTile: {
    backgroundColor: '#fff2cc',
  },
  blockTile: {
    backgroundColor: '#fddede',
  },
  reportBlockTile: {
    backgroundColor: '#ffe5ef',
  },
  moderationTileText: {
    color: '#1b1b1f',
    fontWeight: '600',
    fontSize: 12,
  },
  disabledTile: {
    opacity: 0.6,
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
  reportModalCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  reportModalTitle: {
    color: '#1b1b1f',
    fontWeight: '700',
    fontSize: 16,
  },
  reportModalSubtitle: {
    color: '#6b6b73',
    fontSize: 13,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f1f1f5',
  },
  reasonChipSelected: {
    backgroundColor: '#ffd8e8',
  },
  reasonChipText: {
    color: '#333',
    fontWeight: '500',
  },
  reasonChipTextSelected: {
    color: '#7a2044',
    fontWeight: '700',
  },
  reportNoteInput: {
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d7d7e0',
    backgroundColor: '#fff',
    color: '#111',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  reportModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalActionButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelButton: {
    backgroundColor: '#f1f1f5',
  },
  modalSubmitButton: {
    backgroundColor: '#7a2044',
  },
  modalCancelText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: '600',
  },
});
