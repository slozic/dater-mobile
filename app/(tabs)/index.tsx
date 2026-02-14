import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import LoginForm from '@/components/LoginForm';
import { DateListItem, fetchDates, getToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const ACCENT = '#ff5c8a';

export default function DatesScreen() {
  const router = useRouter();
  const { setTokenValue } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [dates, setDates] = useState<DateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState('10');
  const [locationStatus, setLocationStatus] = useState('');

  const loadDates = async () => {
    setError('');
    setLoading(true);
    try {
      const [allDates, ownedDates, requestedDates] = await Promise.all([
        fetchDates('all', {
          latitude,
          longitude,
          radiusKm: radiusKm ? Number(radiusKm) : null,
        }),
        fetchDates('owned'),
        fetchDates('requested'),
      ]);
      const excludedIds = new Set([
        ...ownedDates.map((item) => item.id),
        ...requestedDates.map((item) => item.id),
      ]);
      setDates(allDates.filter((item) => !excludedIds.has(item.id)));
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        setToken(null);
        setTokenValue(null);
        setDates([]);
        setError('');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load dates.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = async () => {
    setLocationStatus('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationStatus('Location permission is required.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setLocationStatus('Location saved. Tap Apply to filter.');
    } catch (err) {
      setLocationStatus(err instanceof Error ? err.message : 'Could not retrieve location.');
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
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/date/new')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </Pressable>
      </View>
      <View style={styles.filterCard}>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>Radius (km)</Text>
            <TextInput
              style={styles.filterInput}
              value={radiusKm}
              onChangeText={setRadiusKm}
              placeholder="10"
              placeholderTextColor="#9a9aa3"
              keyboardType="numeric"
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.filterButton, pressed && styles.buttonPressed]}
            onPress={handleUseMyLocation}
          >
            <Text style={styles.filterButtonText}>Use my location</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.filterButton, pressed && styles.buttonPressed]}
            onPress={loadDates}
          >
            <Text style={styles.filterButtonText}>Apply</Text>
          </Pressable>
        </View>
        {locationStatus ? <Text style={styles.filterNote}>{locationStatus}</Text> : null}
        {latitude != null && longitude != null ? (
          <Text style={styles.filterNote}>
            Using {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.filterNote}>Set your location to enable radius filtering.</Text>
        )}
      </View>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={dates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/date/${item.id}`)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardLocation}>{item.location}</Text>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dates.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No dates available.</Text>
              <Text style={styles.emptyText}>Try increasing your radius or check back later.</Text>
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
    backgroundColor: ACCENT,
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
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  filterField: {
    width: 96,
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    color: '#6b6b73',
    fontWeight: '600',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 36,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: '#1b1b1f',
    backgroundColor: '#fafafe',
    minWidth: 72,
  },
  filterButton: {
    backgroundColor: ACCENT,
    height: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  filterNote: {
    color: '#7a7a86',
    fontSize: 12,
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
  emptyList: {
    paddingTop: 24,
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
