import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createDate, uploadDateImages } from '@/lib/api';

export default function CreateDateScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [images, setImages] = useState<Array<{ uri: string; type: string; name: string }>>([]);
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const formatDateTime = (date: Date) => {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  };

  const formatDisplayDateTime = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);

  const handlePickImages = async () => {
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
      name: asset.fileName ?? `date-${Date.now()}.jpg`,
    }));
    setImages((prev) => [...prev, ...files]);
  };

  const handleToggleDeviceLocation = async (value: boolean) => {
    setUseDeviceLocation(value);
    setLocationStatus('');
    if (!value) {
      setLatitude(null);
      setLongitude(null);
      return;
    }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationStatus('Location permission is required for distance filtering.');
        setUseDeviceLocation(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setLocationStatus('Device location saved for filtering.');
    } catch (err) {
      setLocationStatus(err instanceof Error ? err.message : 'Could not retrieve location.');
      setUseDeviceLocation(false);
    }
  };

  const openAndroidPicker = () => {
    const current = selectedDate ?? new Date();
    DateTimePickerAndroid.open({
      value: current,
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
            setSelectedDate(combined);
            setScheduledTime(formatDateTime(combined));
          },
        });
      },
    });
  };

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      const id = await createDate({
        title,
        location,
        latitude,
        longitude,
        description,
        scheduledTime,
      });

      if (images.length > 0) {
        setUploadingImages(true);
        try {
          await uploadDateImages(id, images);
        } catch {
          Alert.alert('Date created', 'Images failed to upload. You can add them later.');
        } finally {
          setUploadingImages(false);
        }
      }

      router.replace(`/date/${id}`);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        router.replace('/(tabs)');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to create date.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>New Date</Text>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            placeholderTextColor="#666"
            value={location}
            onChangeText={setLocation}
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Use device location for filtering</Text>
              <Text style={styles.helperText}>
                This stores your coordinates so nearby dates can be shown later.
              </Text>
            </View>
            <Switch value={useDeviceLocation} onValueChange={handleToggleDeviceLocation} />
          </View>
          {locationStatus ? <Text style={styles.helperText}>{locationStatus}</Text> : null}
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Description"
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.pickerRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                if (Platform.OS === 'android') {
                  openAndroidPicker();
                } else {
                  setShowPicker(true);
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Pick date & time</Text>
            </Pressable>
            <Text style={styles.pickerValue}>
              {selectedDate ? formatDisplayDateTime(selectedDate) : 'Not set'}
            </Text>
          </View>
          {Platform.OS === 'ios' && showPicker ? (
            <>
              <DateTimePicker
                value={selectedDate ?? new Date()}
                mode="datetime"
                display="inline"
                onChange={(_: unknown, date?: Date) => {
                  if (date) {
                    setSelectedDate(date);
                    setScheduledTime(formatDateTime(date));
                  }
                }}
              />
              <Pressable style={styles.secondaryButton} onPress={() => setShowPicker(false)}>
                <Text style={styles.secondaryButtonText}>Done</Text>
              </Pressable>
            </>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Images</Text>
            <View style={styles.imageRow}>
              {images.length === 0 ? <Text style={styles.helperText}>No images selected.</Text> : null}
              {images.map((img, index) => (
                <Image key={`${img.uri}-${index}`} source={{ uri: img.uri }} style={styles.imagePreview} />
              ))}
            </View>
            <Pressable style={styles.secondaryButton} onPress={handlePickImages}>
              <Text style={styles.secondaryButtonText}>Add images</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saving || uploadingImages ? (
            <ActivityIndicator />
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={handleCreate}
              disabled={!title || !location || !scheduledTime}
            >
              <Text style={styles.primaryButtonText}>Create Date</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1b1b1f',
  },
  form: {
    gap: 12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b1b1f',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#fff',
    color: '#111',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#b00020',
  },
  helperText: {
    color: '#6b6b73',
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleText: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1f',
  },
  pickerRow: {
    gap: 8,
  },
  pickerValue: {
    color: '#1b1b1f',
  },
  primaryButton: {
    backgroundColor: '#ff5c8a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f4',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1b1b1f',
    fontWeight: '600',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#eee',
  },
});
