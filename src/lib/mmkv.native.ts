import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';

export const storage: MMKV = createMMKV({ id: 'thy-assistant-storage' });

// Convenience helpers
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

// Storage keys
export const STORAGE_KEYS = {
  ONBOARDING_DONE: 'onboarding_done',
  THEME: 'theme',
  LANGUAGE: 'language',
  SELECTED_MODEL: 'selected_model',
  SELECTED_AI_MODEL: 'selected_ai_model',
  CHAT_MESSAGES: 'chat_messages',
  REACT_QUERY_CACHE: 'rq_cache',
  STREAMING: 'streaming_enabled',
} as const;
