/**
 * api.ts — Axios instance
 *
 * Token akışı:
 *   REQUEST  → supabase.auth.getSession() ile her zaman fresh token alır
 *              (Supabase autoRefreshToken zaten handle ediyorsa güncel gelir)
 *
 *   401      → authMutex.refresh() çağrılır (mutex: tek refresh, concurrent korumalı)
 *              → Başarılı: RTK store güncellenir (event ile), istek retry edilir
 *              → Başarısız: SESSION_EXPIRED event yayınlanır → useSupabaseAuth dinler
 *                           → resetAfterLogout + router.replace('/(auth)/welcome')
 *
 * _retry flag: Sonsuz döngüyü önler. Bir istek en fazla 1 kez retry edilir.
 */

import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { authMutex } from '@/lib/authMutex';
import { captureApiError } from '@/services/errorReporting';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com';

// Uygulama genelinde dinlenebilecek event — useSupabaseAuth hook'u bunu alır
export const AUTH_EVENTS = {
  SESSION_EXPIRED: 'auth:session_expired',
} as const;

// Basit event emitter (React Native'de EventEmitter yerine)
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export const authEventEmitter = {
  emit(event: string) {
    listeners.get(event)?.forEach((fn) => fn());
  },
  on(event: string, fn: Listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
    return () => listeners.get(event)?.delete(fn);
  },
};

// _retry flag için tip genişletme
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ---------------------------------------------------------------------------

// ngrok free plan'da tarayıcıya "warning page" döner ve CORS header koymaz.
// Bu header ile ngrok o sayfayı atlar, direkt API response döner.
// Sadece web'de gerekli — mobil native HTTP client'ı warning page'e düşmüyor.
const ngrokHeaders = Platform.OS === 'web' && BASE_URL.includes('ngrok')
  ? { 'ngrok-skip-browser-warning': '1' }
  : {};

// Auth gerektiren istekler için (interceptor'lı)
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    ...ngrokHeaders,
  },
});

// Auth gerektirmeyen public istekler için (interceptor'sız)
export const publicApi = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    ...ngrokHeaders,
  },
});

// Alias — auth'lu instance'ı açık isimle import etmek isteyenler için
export const privateApi = api;

// ---------------------------------------------------------------------------
// REQUEST interceptor — her istekte Supabase'den güncel token al
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Supabase'in kendi autoRefreshToken'ı çalışıyorsa getSession() güncel token döner
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// RESPONSE interceptor — 401 → mutex refresh → retry
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryableConfig | undefined;

    // 401 değilse veya zaten retry edilmişse → raporla + reddet
    if (error.response?.status !== 401 || !originalConfig || originalConfig._retry) {
      captureApiError(error);
      return Promise.reject(error);
    }

    // Bu isteği retry edildi olarak işaretle (sonsuz döngü önlemi)
    originalConfig._retry = true;

    // --- Mutex refresh ---
    const result = await authMutex.refresh();

    if (!result.ok) {
      authEventEmitter.emit(AUTH_EVENTS.SESSION_EXPIRED);
      return Promise.reject(error);
    }

    // Yeni token ile header'ı güncelle ve isteği tekrar gönder
    originalConfig.headers.Authorization = `Bearer ${result.accessToken}`;
    return api(originalConfig as AxiosRequestConfig);
  },
);

export default api;
