import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import LoginForm from '@/components/LoginForm';
import { DateListItem, fetchAttendeeStatus, fetchDates, getToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type ViewMode = 'created' | 'requested' | 'accepted' | 'past';

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

export default function MyDatesScreen() {
  const router = useRouter();
  const { setTokenValue } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [createdDates, setCreatedDates] = useState<DateListItem[]>([]);
  const [requestedDates, setRequestedDates] = useState<DateListItem[]>([]);
  const [acceptedDates, setAcceptedDates] = useState<DateListItem[]>([]);
  const [pastDates, setPastDates] = useState<DateListItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('created');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadingDatesRef = useRef(false);

  const loadDates = useCallback(async () => {
    if (loadingDatesRef.current) return;
    loadingDatesRef.current = true;
    setError('');
    setLoading(true);
    try {
      const [ownedAll, requestedAll] = await Promise.all([
        fetchDates('owned', { includePast: true }),
        fetchDates('requested', { includePast: true }),
      ]);

      const [ownedUpcoming, requestedUpcoming] = [
        ownedAll.filter((item) => !isPastDate(item.scheduledTime)),
        requestedAll.filter((item) => !isPastDate(item.scheduledTime)),
      ];

      const requestedStatuses = await Promise.all(
        requestedUpcoming.map(async (item) => {
          try {
            const statusResponse = await fetchAttendeeStatus(item.id);
            return { item, status: statusResponse.joinDateStatus as string | undefined };
          } catch {
            return { item, status: undefined };
          }
        }),
      );

      const acceptedOnly = requestedStatuses
        .filter((entry) => entry.status === 'ACCEPTED')
        .map((entry) => entry.item);
      const requestedOnly = requestedStatuses
        .filter((entry) => entry.status !== 'ACCEPTED')
        .map((entry) => entry.item);

      const combined = [...ownedAll, ...requestedAll];
      const byId = new Map<string, DateListItem>();
      combined
        .filter((item) => isPastDate(item.scheduledTime))
        .forEach((item) => byId.set(item.id, item));
      const sortedPast = Array.from(byId.values()).sort(
        (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime(),
      );

      setCreatedDates(ownedUpcoming);
      setRequestedDates(requestedOnly);
      setAcceptedDates(acceptedOnly);
      setPastDates(sortedPast);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        setToken(null);
        setTokenValue(null);
        setCreatedDates([]);
        setRequestedDates([]);
        setAcceptedDates([]);
        setPastDates([]);
        setError('');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load dates.');
    } finally {
      setLoading(false);
      loadingDatesRef.current = false;
    }
  }, [setTokenValue]);

  const refreshAuth = useCallback(() => {
    getToken().then((storedToken) => {
      setToken(storedToken);
      if (storedToken) {
        void loadDates();
      } else {
        setLoading(false);
      }
    });
  }, [loadDates]);

  useFocusEffect(
    useCallback(() => {
      refreshAuth();
    }, [refreshAuth]),
  );

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginWrapper}>
          <LoginForm
            onSuccess={() => {
              refreshAuth();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const modeSubtitle = (() => {
    switch (viewMode) {
      case 'requested':
        return 'Requests waiting for acceptance';
      case 'accepted':
        return 'Dates where your request was accepted';
      case 'past':
        return 'Previously scheduled dates';
      case 'created':
      default:
        return 'Your upcoming created dates';
    }
  })();

  const currentData = (() => {
    switch (viewMode) {
      case 'requested':
        return requestedDates;
      case 'accepted':
        return acceptedDates;
      case 'past':
        return pastDates;
      case 'created':
      default:
        return createdDates;
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>My Dates</Text>
          <Text style={styles.subtitle}>{modeSubtitle}</Text>
        </View>
        <View style={styles.optionsMenuWrap}>
          <Pressable
            style={({ pressed }) => [styles.optionsTrigger, pressed && styles.buttonPressed]}
            onPress={() => setShowOptionsMenu((prev) => !prev)}
          >
            <MaterialIcons name="more-vert" size={18} color="#fff" />
            <Text style={styles.optionsTriggerText}>Options</Text>
          </Pressable>
        </View>
      </View>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/date/${item.id}`)}
            style={({ pressed }) => [
              viewMode === 'past' ? styles.pastCard : styles.card,
              pressed && styles.cardPressed,
            ]}
          >
            <Text style={viewMode === 'past' ? styles.pastCardTitle : styles.cardTitle}>{item.title}</Text>
            <Text style={viewMode === 'past' ? styles.pastCardText : styles.cardLocation}>{item.location}</Text>
            <Text style={viewMode === 'past' ? styles.pastCardText : styles.cardTime}>
              {formatDisplayDateTime(item.scheduledTime)}
            </Text>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No dates in this view.</Text>
              <Text style={styles.emptyText}>Use Options to switch between created, requested, accepted, and past.</Text>
            </View>
          ) : null
        }
      />
      <Modal visible={showOptionsMenu} transparent animationType="fade">
        <View style={styles.menuModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowOptionsMenu(false)} />
          <View style={styles.menuModalAnchor}>
            <View style={styles.optionsMenu}>
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  viewMode === 'created' && styles.optionItemActive,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  setViewMode('created');
                  setShowOptionsMenu(false);
                }}
              >
                <MaterialIcons
                  name={viewMode === 'created' ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={viewMode === 'created' ? '#ff5c8a' : '#8a8a95'}
                />
                <Text style={styles.optionItemText}>Show created dates</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  viewMode === 'requested' && styles.optionItemActive,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  setViewMode('requested');
                  setShowOptionsMenu(false);
                }}
              >
                <MaterialIcons
                  name={viewMode === 'requested' ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={viewMode === 'requested' ? '#ff5c8a' : '#8a8a95'}
                />
                <Text style={styles.optionItemText}>Show requested dates</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  viewMode === 'accepted' && styles.optionItemActive,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  setViewMode('accepted');
                  setShowOptionsMenu(false);
                }}
              >
                <MaterialIcons
                  name={viewMode === 'accepted' ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={viewMode === 'accepted' ? '#ff5c8a' : '#8a8a95'}
                />
                <Text style={styles.optionItemText}>Show accepted dates</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  viewMode === 'past' && styles.optionItemActive,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  setViewMode('past');
                  setShowOptionsMenu(false);
                }}
              >
                <MaterialIcons
                  name={viewMode === 'past' ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={viewMode === 'past' ? '#ff5c8a' : '#8a8a95'}
                />
                <Text style={styles.optionItemText}>View past dates</Text>
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
    paddingTop: 12,
    backgroundColor: '#f7f7fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 4,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b1b1f',
  },
  subtitle: {
    color: '#6b6b73',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 92, 138, 0.18)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b1b1f',
  },
  cardLocation: {
    color: '#7a7a86',
    marginTop: 4,
  },
  cardTime: {
    color: '#6b6b73',
    marginTop: 6,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  pastCard: {
    backgroundColor: '#efeff4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  pastCardTitle: {
    color: '#7a7a86',
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  pastCardText: {
    color: '#90909b',
    marginTop: 4,
  },
  optionsMenuWrap: {
    alignItems: 'flex-end',
  },
  menuModalRoot: {
    flex: 1,
  },
  menuModalAnchor: {
    alignItems: 'flex-end',
    marginTop: 88,
    paddingHorizontal: 16,
  },
  optionsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ff5c8a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  optionsTriggerText: {
    color: '#fff',
    fontWeight: '600',
  },
  optionsMenu: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ececf2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionItemActive: {
    backgroundColor: '#fff4f8',
  },
  optionItemText: {
    color: '#1b1b1f',
    fontWeight: '500',
  },
  optionPressed: {
    backgroundColor: '#f7f7fb',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#1b1b1f',
  },
  emptyText: {
    color: '#7a7a86',
    textAlign: 'center',
  },
  loginWrapper: {
    marginTop: 24,
  },
});
