import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { AuthProvider, useAuth } from '../auth';
import { getToken, updatePushToken } from '../api';
import { registerForPushNotificationsAsync } from '../push-notifications';

jest.mock('../api', () => ({
  getToken: jest.fn(),
  updatePushToken: jest.fn(),
}));

jest.mock('../push-notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(),
}));

function TokenProbe() {
  const { token } = useAuth();
  return <Text testID="token-value">{token ?? 'none'}</Text>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads token from storage on mount', async () => {
    (getToken as jest.Mock).mockResolvedValue('stored-token');
    (registerForPushNotificationsAsync as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TokenProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('token-value').props.children).toBe('stored-token');
    });
  });

  test('registers and syncs push token when auth token is present', async () => {
    (getToken as jest.Mock).mockResolvedValue('stored-token');
    (registerForPushNotificationsAsync as jest.Mock).mockResolvedValue('ExpoPushToken[test]');

    render(
      <AuthProvider>
        <TokenProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(registerForPushNotificationsAsync).toHaveBeenCalled();
      expect(updatePushToken).toHaveBeenCalledWith('ExpoPushToken[test]');
    });
  });
});
