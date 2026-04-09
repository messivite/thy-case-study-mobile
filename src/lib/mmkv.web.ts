/**
 * mmkv.web.ts — Web fallback for react-native-mmkv
 *
 * Metro web build'de mmkv.native.ts yerine bu dosyayı alır.
 * API'si mmkv.native.ts ile birebir aynı — tüketiciler fark etmez.
 * localStorage kullanır; SSR ortamı yoksa (Expo web) sorun çıkmaz.
 */

const PREFIX = 'thy:';

// MMKV type'ını taklit eden interface — native tip import etmeden
export interface StorageLike {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  getBoolean(key: string): boolean | undefined;
  getNumber(key: string): number | undefined;
  remove(key: string): void;
  contains(key: string): boolean;
  clearAll(): void;
}

const webStorage: StorageLike = {
  getString(key) {
    return localStorage.getItem(PREFIX + key) ?? undefined;
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, String(value));
  },
  getBoolean(key) {
    const v = localStorage.getItem(PREFIX + key);
    if (v === null) return undefined;
    return v === 'true';
  },
  getNumber(key) {
    const v = localStorage.getItem(PREFIX + key);
    if (v === null) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
  contains(key) {
    return localStorage.getItem(PREFIX + key) !== null;
  },
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};

export const storage = webStorage;

export const mmkvStorage = {
  getString: (key: string) => storage.getString(key),
  setString: (key: string, value: string) => storage.set(key, value),
  getBoolean: (key: string) => storage.getBoolean(key),
  setBoolean: (key: string, value: boolean) => storage.set(key, value),
  getNumber: (key: string) => storage.getNumber(key),
  setNumber: (key: string, value: number) => storage.set(key, value),
  delete: (key: string) => storage.remove(key),
  contains: (key: string) => storage.contains(key),
  clearAll: () => storage.clearAll(),
};

export const STORAGE_KEYS = {
  ONBOARDING_DONE: 'onboarding_done',
  THEME: 'theme',
  LANGUAGE: 'language',
  SELECTED_MODEL: 'selected_model',
  CHAT_MESSAGES: 'chat_messages',
  REACT_QUERY_CACHE: 'rq_cache',
} as const;
