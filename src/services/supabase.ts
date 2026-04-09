import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { storage } from '@/lib/mmkv';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Platform-aware storage adapter
// Native: MMKV (mmkv.native.ts) | Web: localStorage wrapper (mmkv.web.ts)
const storageAdapter = {
  getItem: (key: string) => {
    const value = storage.getString(key);
    return value ?? null;
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // Web'de OAuth redirect URL'inden session parse etmek için true
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export default supabase;
