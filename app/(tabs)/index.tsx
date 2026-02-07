import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import LoginForm from '@/components/LoginForm';
import { DateListItem, fetchDates, getToken } from '@/lib/api';

export default function DatesScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [dates, setDates] = useState<DateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDates = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await fetchDates('all');
      setDates(data);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        setToken(null);
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
        <View>
          <Text style={styles.title}>Dates</Text>
          <Text style={styles.subtitle}>Find something nearby</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/date/new')}>
          <Text style={styles.addButtonText}>+ New</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={dates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/date/${item.id}`)}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardLocation}>{item.location}</Text>
            </View>
          </Pressable>
        )}
        contentContainerStyle={dates.length === 0 ? styles.emptyList : undefined}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b1b1f',
  },
  subtitle: {
    color: '#6b6b73',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#ff5c8a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 12,
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
  emptyList: {
    paddingTop: 24,
  },
  loginWrapper: {
    marginTop: 24,
  },
});
