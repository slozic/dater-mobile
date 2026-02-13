import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'dater_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials.');
  }

  const token = response.headers.get('Authorization');
  if (!token) {
    throw new Error('Missing auth token.');
  }

  await setToken(token);
  return token;
}

async function withAuthFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: token ?? '',
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    await clearToken();
    throw new Error('AUTH_EXPIRED');
  }

  return response;
}

export async function registerUser(payload: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  birthday?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to register.');
  }
}

export type DateListItem = {
  id: string;
  title: string;
  location: string;
  description: string;
  scheduledTime: string;
};

export async function fetchDates(filter = 'all'): Promise<DateListItem[]> {
  const response = await withAuthFetch(`/dates?filter=${filter}`);

  if (!response.ok) {
    throw new Error('Failed to load dates.');
  }

  const data = await response.json();
  return data.dateEventData ?? [];
}

export type DateDetails = {
  id: string;
  title: string;
  location: string;
  description: string;
  scheduledTime: string;
  dateOwner: string;
  dateOwnerId: string;
};

export async function fetchDateById(id: string): Promise<DateDetails> {
  const response = await withAuthFetch(`/dates/${id}`);

  if (!response.ok) {
    throw new Error('Failed to load date.');
  }

  return response.json();
}

export async function createDate(payload: {
  title: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  scheduledTime: string;
}): Promise<string> {
  const response = await withAuthFetch('/dates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create date.');
  }

  const data = await response.json();
  return data.dateEventId;
}

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  birthday: string | null;
};

export async function fetchProfile(): Promise<UserProfile> {
  const response = await withAuthFetch('/users');

  if (!response.ok) {
    throw new Error('Failed to load profile.');
  }

  return response.json();
}

export async function updateProfile(payload: {
  firstName?: string;
  lastName?: string;
  username?: string;
  birthday?: string;
}): Promise<UserProfile> {
  const response = await withAuthFetch('/users/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile.');
  }

  return response.json();
}

export type DateImage = {
  id: string;
  imageUrl: string | null;
  errorMessage?: string | null;
};

export async function fetchDateImages(dateId: string): Promise<DateImage[]> {
  const response = await withAuthFetch(`/dates/${dateId}/images`);

  if (!response.ok) {
    throw new Error('Failed to load date images.');
  }

  const data = await response.json();
  return data.dateImageData ?? [];
}

export async function uploadDateImages(dateId: string, images: Array<{ uri: string; type: string; name: string }>) {
  const formData = new FormData();
  images.forEach((img) => {
    formData.append('files', {
      uri: img.uri,
      type: img.type,
      name: img.name,
    } as unknown as Blob);
  });

  const response = await withAuthFetch(`/dates/${dateId}/images`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload date images.');
  }
}

export async function deleteDateImage(dateId: string, imageId: string) {
  const response = await withAuthFetch(`/dates/${dateId}/images/${imageId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete date image.');
  }
}

export type ProfileImage = {
  id: string;
  imageUrl: string | null;
  errorMessage?: string | null;
};

export type PublicProfile = {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageData?: ProfileImage[];
};

export async function fetchProfileImages(): Promise<ProfileImage[]> {
  const response = await withAuthFetch('/users/images');

  if (!response.ok) {
    throw new Error('Failed to load profile images.');
  }

  const data = await response.json();
  return data.profileImageData ?? [];
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const response = await withAuthFetch(`/users/${userId}/public-profile`);

  if (!response.ok) {
    throw new Error('Failed to load public profile.');
  }

  return response.json();
}

export async function uploadProfileImages(images: Array<{ uri: string; type: string; name: string }>) {
  const formData = new FormData();
  images.forEach((img) => {
    formData.append('files', {
      uri: img.uri,
      type: img.type,
      name: img.name,
    } as unknown as Blob);
  });

  const response = await withAuthFetch('/users/images', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload profile images.');
  }
}

export async function deleteProfileImage(imageId: string) {
  const response = await withAuthFetch(`/users/images/${imageId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete profile image.');
  }
}

export type AttendeeRequest = {
  id: string;
  username: string;
  status: 'ON_WAITLIST' | 'ACCEPTED' | 'REJECTED' | 'NOT_REQUESTED';
};

export async function fetchAttendeeStatus(dateId: string) {
  const response = await withAuthFetch(`/dates/${dateId}/attendees/status`);

  if (!response.ok) {
    throw new Error('Failed to load attendee status.');
  }

  return response.json();
}

export async function requestToJoinDate(dateId: string) {
  const response = await withAuthFetch(`/dates/${dateId}/attendees`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to request to join.');
  }
}

export async function cancelJoinRequest(dateId: string) {
  const response = await withAuthFetch(`/dates/${dateId}/attendees/me`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to cancel request.');
  }
}

export async function fetchAttendeeRequests(dateId: string): Promise<AttendeeRequest[]> {
  const response = await withAuthFetch(`/dates/${dateId}/attendees`);

  if (!response.ok) {
    throw new Error('Failed to load attendee requests.');
  }

  const data = await response.json();
  return data.dateAttendees ?? [];
}

export async function acceptAttendee(dateId: string, userId: string) {
  const response = await withAuthFetch(`/dates/${dateId}/attendees/${userId}`, {
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error('Failed to accept attendee.');
  }
}

export async function rejectAttendee(dateId: string, userId: string) {
  const response = await withAuthFetch(`/dates/${dateId}/attendees/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to reject attendee.');
  }
}
