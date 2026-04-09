import * as SecureStore from 'expo-secure-store';

export const SECURE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
} as const;

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },

  async getToken(): Promise<string | null> {
    return secureStorage.get(SECURE_KEYS.ACCESS_TOKEN);
  },

  async setToken(token: string): Promise<void> {
    return secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, token);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.USER_ID),
    ]);
  },
};
