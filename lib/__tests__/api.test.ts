const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: (...args: unknown[]) => mockSecureStore.getItemAsync(...args),
  setItemAsync: (...args: unknown[]) => mockSecureStore.setItemAsync(...args),
  deleteItemAsync: (...args: unknown[]) => mockSecureStore.deleteItemAsync(...args),
}));
jest.mock('../config', () => ({
  API_BASE_URL: 'http://api.test',
}));

import { fetchDateById, fetchProfile } from '../api';

type MockResponseOptions = {
  status: number;
  jsonBody?: unknown;
  textBody?: string;
  contentType?: string;
};

function createMockResponse({
  status,
  jsonBody,
  textBody,
  contentType = 'application/json',
}: MockResponseOptions): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return contentType;
        }
        return null;
      },
    } as Headers,
    json: async () => jsonBody,
    text: async () => (textBody == null ? '' : textBody),
  } as Response;
}

describe('lib/api auth + error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) =>
      key === 'dater_refresh_token' ? 'refresh-token' : 'access-token',
    );
    (global.fetch as unknown as jest.Mock) = jest.fn();
  });

  test('does not clear auth state on 403 and returns backend detail', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce(
      createMockResponse({
        status: 403,
        jsonBody: { detail: 'You do not have permission.' },
      }),
    );

    await expect(fetchProfile()).rejects.toThrow('You do not have permission.');
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('refreshes token on 401 and retries request once', async () => {
    const profilePayload = { id: 'u1', username: 'alex' };

    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce(createMockResponse({ status: 401, jsonBody: {} }))
      .mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          jsonBody: { accessToken: 'new-access', refreshToken: 'new-refresh' },
        }),
      )
      .mockResolvedValueOnce(createMockResponse({ status: 200, jsonBody: profilePayload }));

    await expect(fetchProfile()).resolves.toEqual(profilePayload);

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect((global.fetch as unknown as jest.Mock).mock.calls[1][0]).toBe('http://api.test/auth/refresh');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('dater_token', 'new-access');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('dater_refresh_token', 'new-refresh');
  });

  test('clears auth state when refresh flow fails', async () => {
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce(createMockResponse({ status: 401, jsonBody: {} }))
      .mockResolvedValueOnce(createMockResponse({ status: 401, jsonBody: {} }));

    await expect(fetchProfile()).rejects.toThrow('AUTH_EXPIRED');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('dater_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('dater_refresh_token');
  });

  test('falls back to plain text response when json detail is absent', async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce(
      createMockResponse({
        status: 400,
        textBody: 'Plain text backend validation error',
        contentType: 'text/plain',
      }),
    );

    await expect(fetchDateById('date-1')).rejects.toThrow('Plain text backend validation error');
  });
});
