import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import LoginForm from '@/components/LoginForm';
import { DateListItem, fetchDates, getToken } from '@/lib/api';

type SectionData = {
  title: string;
  data: DateListItem[];
};

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

export default function MyDatesScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDates = async () => {
    setError('');
    setLoading(true);
    try {
      const [owned, requested] = await Promise.all([fetchDates('owned'), fetchDates('requested')]);
      setSections([
        { title: 'Created by me', data: owned },
        { title: 'Requested / joined', data: requested },
      ]);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        setToken(null);
        setSections([]);
        setError('');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load dates.');
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = useCallback(() => {
    getToken().then((storedToken) => {
      setToken(storedToken);
      if (storedToken) {
        loadDates();
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

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
              getToken().then((storedToken) => {
                setToken(storedToken);
                loadDates();
              });
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Dates</Text>
        <Text style={styles.subtitle}>Created and requested dates</Text>
      </View>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.length === 0 ? (
              <Text style={styles.sectionEmpty}>No dates yet.</Text>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/date/${item.id}`)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardLocation}>{item.location}</Text>
              <Text style={styles.cardTime}>{formatDisplayDateTime(item.scheduledTime)}</Text>
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No dates yet.</Text>
              <Text style={styles.emptyText}>Create a date or request to join one.</Text>
            </View>
          ) : null
        }
      />
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
    marginBottom: 16,
    gap: 4,
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
  sectionHeader: {
    marginTop: 12,
    marginBottom: 6,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1f',
  },
  sectionEmpty: {
    color: '#7a7a86',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
