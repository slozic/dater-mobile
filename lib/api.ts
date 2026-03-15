import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

const ACCESS_TOKEN_KEY = 'dater_token';
const REFRESH_TOKEN_KEY = 'dater_refresh_token';
let refreshInFlight: Promise<string> | null = null;

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('AUTH_EXPIRED');
  }
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    throw new Error('AUTH_EXPIRED');
  }
  const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) {
    throw new Error('AUTH_EXPIRED');
  }
  await setToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  return data.accessToken;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('AUTH_LOGIN_FAILED');
  }

  const token = response.headers.get('Authorization');
  const refreshToken = response.headers.get('Refresh-Token');
  if (!token || !refreshToken) {
    throw new Error('Missing auth token.');
  }

  await setToken(token);
  await setRefreshToken(refreshToken);
  return token;
}

async function withAuthFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const buildHeaders = (currentToken: string | null, originalHeaders?: HeadersInit): HeadersInit => ({
    Authorization: currentToken ?? '',
    ...(originalHeaders ?? {}),
  });

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers),
  });

  if (response.status === 401 || response.status === 403) {
    try {
      const newAccessToken = await refreshAccessToken();
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: buildHeaders(newAccessToken, options.headers),
      });
    } catch {
      await clearToken();
      throw new Error('AUTH_EXPIRED');
    }
    if (response.status === 401 || response.status === 403) {
      await clearToken();
      throw new Error('AUTH_EXPIRED');
    }
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
  gender?: string;
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

export async function fetchDates(
  filter = 'all',
  options?: {
    latitude?: number | null;
    longitude?: number | null;
    radiusKm?: number | null;
    includePast?: boolean;
  },
): Promise<DateListItem[]> {
  const params = new URLSearchParams({ filter });
  if (options?.latitude != null && options?.longitude != null) {
    params.append('latitude', String(options.latitude));
    params.append('longitude', String(options.longitude));
    if (options.radiusKm != null) {
      params.append('radiusKm', String(options.radiusKm));
    }
  }
  if (options?.includePast) {
    params.append('includePast', 'true');
  }
  const response = await withAuthFetch(`/dates?${params.toString()}`);

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

export async function updateDate(
  dateId: string,
  payload: {
    title?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    description?: string;
    scheduledTime?: string;
  },
): Promise<DateDetails> {
  const response = await withAuthFetch(`/dates/${dateId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update date.');
  }

  return response.json();
}

export async function deleteDate(dateId: string): Promise<void> {
  const response = await withAuthFetch(`/dates/${dateId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete date.');
  }
}

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  birthday: string | null;
  gender?: string | null;
  dateListGenderFilter?: 'ALL' | 'MALE' | 'FEMALE' | 'OTHER' | string | null;
  attendeeAcceptedNotificationsEnabled?: boolean;
  dateRequestNotificationsEnabled?: boolean;
  chatMessageNotificationsEnabled?: boolean;
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
  gender?: string;
  dateListGenderFilter?: string;
  attendeeAcceptedNotificationsEnabled?: boolean;
  dateRequestNotificationsEnabled?: boolean;
  chatMessageNotificationsEnabled?: boolean;
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

export async function updatePushToken(pushToken: string | null): Promise<void> {
  const response = await withAuthFetch('/users/push-token', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pushToken }),
  });
  if (!response.ok) {
    throw new Error('Failed to update push token.');
  }
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
  userId?: string;
  username: string;
  fullName?: string | null;
  gender?: string | null;
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

export type DateChatMessage = {
  id: string;
  dateId: string;
  senderId: string;
  recipientId: string;
  message: string;
  createdAt: string;
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

export async function fetchDateChatMessages(dateId: string): Promise<DateChatMessage[]> {
  const response = await withAuthFetch(`/dates/${dateId}/chat/messages`);
  if (!response.ok) {
    throw new Error('Failed to load chat messages.');
  }
  const data = (await response.json()) as { messages?: DateChatMessage[] };
  return data.messages ?? [];
}

export async function sendDateChatMessage(dateId: string, message: string): Promise<DateChatMessage> {
  const response = await withAuthFetch(`/dates/${dateId}/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error('Failed to send message.');
  }
  return response.json();
}

