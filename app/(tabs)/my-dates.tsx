import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import LoginForm from '@/components/LoginForm';
import { ActionPillButton } from '@/components/ui/ActionPillButton';
import { OptionsMenuItem } from '@/components/ui/OptionsMenuItem';
import { OptionsPopover } from '@/components/ui/OptionsPopover';
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
          <ActionPillButton label="Options" onPress={() => setShowOptionsMenu((prev) => !prev)} />
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
      <OptionsPopover visible={showOptionsMenu} onClose={() => setShowOptionsMenu(false)} topOffset={88} width={220}>
        <OptionsMenuItem
          active={viewMode === 'created'}
          iconName={viewMode === 'created' ? 'check-circle' : 'radio-button-unchecked'}
          iconColor={viewMode === 'created' ? '#ff5c8a' : '#8a8a95'}
          label="Show created dates"
          onPress={() => {
            setViewMode('created');
            setShowOptionsMenu(false);
          }}
        />
        <OptionsMenuItem
          active={viewMode === 'requested'}
          iconName={viewMode === 'requested' ? 'check-circle' : 'radio-button-unchecked'}
          iconColor={viewMode === 'requested' ? '#ff5c8a' : '#8a8a95'}
          label="Show requested dates"
          onPress={() => {
            setViewMode('requested');
            setShowOptionsMenu(false);
          }}
        />
        <OptionsMenuItem
          active={viewMode === 'accepted'}
          iconName={viewMode === 'accepted' ? 'check-circle' : 'radio-button-unchecked'}
          iconColor={viewMode === 'accepted' ? '#ff5c8a' : '#8a8a95'}
          label="Show accepted dates"
          onPress={() => {
            setViewMode('accepted');
            setShowOptionsMenu(false);
          }}
        />
        <OptionsMenuItem
          active={viewMode === 'past'}
          iconName={viewMode === 'past' ? 'check-circle' : 'radio-button-unchecked'}
          iconColor={viewMode === 'past' ? '#ff5c8a' : '#8a8a95'}
          label="View past dates"
          onPress={() => {
            setViewMode('past');
            setShowOptionsMenu(false);
          }}
        />
      </OptionsPopover>
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
