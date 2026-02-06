import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'dater_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
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

export type DateListItem = {
  id: string;
  title: string;
  location: string;
  description: string;
  scheduledTime: string;
};

export async function fetchDates(filter = 'all'): Promise<DateListItem[]> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/dates?filter=${filter}`, {
    headers: { Authorization: token ?? '' },
  });

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
};

export async function fetchDateById(id: string): Promise<DateDetails> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/dates/${id}`, {
    headers: { Authorization: token ?? '' },
  });

  if (!response.ok) {
    throw new Error('Failed to load date.');
  }

  return response.json();
}

export async function createDate(payload: {
  title: string;
  location: string;
  description: string;
  scheduledTime: string;
}): Promise<string> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/dates`, {
    method: 'POST',
    headers: {
      Authorization: token ?? '',
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
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/users`, {
    headers: { Authorization: token ?? '' },
  });

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
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PUT',
    headers: {
      Authorization: token ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile.');
  }

  return response.json();
}
