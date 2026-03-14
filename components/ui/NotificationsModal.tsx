import { AppNotification } from '@/lib/api';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type NotificationsModalProps = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  error: string;
  notifications: AppNotification[];
  onSelectNotification?: (notification: AppNotification) => void;
};

const ACCENT = '#ff5c8a';

export function NotificationsModal({
  visible,
  onClose,
  loading,
  error,
  notifications,
  onSelectNotification,
}: NotificationsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.title}>Notifications</Text>
          {loading ? <ActivityIndicator /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !error && notifications.length === 0 ? <Text style={styles.value}>No notifications yet.</Text> : null}
          {!loading && !error ? (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {notifications.map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.item, !item.read && styles.itemUnread, pressed && styles.pressed]}
                  onPress={() => onSelectNotification?.(item)}
                >
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemBody}>{item.body}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <Pressable style={({ pressed }) => [styles.closeAction, pressed && styles.pressed]} onPress={onClose}>
            <Text style={styles.closeActionText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b1b1f',
  },
  error: {
    color: '#b00020',
  },
  value: {
    color: '#1b1b1f',
  },
  list: {
    maxHeight: 340,
  },
  listContent: {
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: '#ececf2',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: '#fff',
  },
  itemUnread: {
    backgroundColor: '#fff4f8',
    borderColor: '#ffd4e3',
  },
  itemTitle: {
    color: '#1b1b1f',
    fontWeight: '700',
  },
  itemBody: {
    color: '#555562',
  },
  closeAction: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeActionText: {
    color: ACCENT,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
