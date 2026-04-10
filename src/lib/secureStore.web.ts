/**
 * Web: Expo SecureStore’un Keychain/Keystore karşılığı yok.
 * Bu katman `sessionStorage` kullanır (sekme kapanınca silinir; localStorage’dan biraz daha dar yüzey).
 * XSS’e karşı native kadar güvenli değildir. Üretim web’de ideal çözüm: refresh token’ı
 * httpOnly + Secure cookie ile backend’in yönetmesi (BFF / session proxy).
 */
import { SECURE_KEYS } from '@/lib/secureStore.keys';

export { SECURE_KEYS };

const PREFIX = 'thy.sec.v1:';

const canUseSession =
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

function storageKey(key: string): string {
  return PREFIX + key;
}

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (!canUseSession) return null;
    try {
      return window.sessionStorage.getItem(storageKey(key));
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (!canUseSession) return;
    try {
      window.sessionStorage.setItem(storageKey(key), value);
    } catch {
      // kota / private mode
    }
  },

  async delete(key: string): Promise<void> {
    if (!canUseSession) return;
    try {
      window.sessionStorage.removeItem(storageKey(key));
    } catch {
      /* ignore */
    }
  },

  async getToken(): Promise<string | null> {
    return secureStorage.get(SECURE_KEYS.ACCESS_TOKEN);
  },

  async setToken(token: string): Promise<void> {
    return secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, token);
  },

  async clearTokens(): Promise<void> {
    await Promise.all(
      (Object.values(SECURE_KEYS) as string[]).map((k) => secureStorage.delete(k)),
    );
  },
};
