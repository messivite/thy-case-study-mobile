/**
 * authService.ts
 *
 * Supabase'in tüm auth methodlarını wrap eden saf servis katmanı.
 * React / Redux bağımlılığı yoktur — sadece Supabase client kullanır.
 * RTK dispatch'i useSupabaseAuth hook'u üstlenir.
 */

import { supabase } from './supabase';
import { secureStorage, SECURE_KEYS } from '@/lib/secureStore';
import type { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Result type — her method başarı ya da hata döner, exception fırlatmaz
// ---------------------------------------------------------------------------

export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

// ---------------------------------------------------------------------------
// Mapper: Supabase User → uygulama User
// ---------------------------------------------------------------------------

export type AppUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export type AppSession = {
  user: AppUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp (s)
};

function mapUser(supaUser: SupabaseUser): AppUser {
  return {
    id: supaUser.id,
    email: supaUser.email ?? '',
    name:
      (supaUser.user_metadata?.full_name as string | undefined) ??
      (supaUser.user_metadata?.name as string | undefined) ??
      supaUser.email?.split('@')[0] ??
      'Kullanıcı',
    avatarUrl:
      (supaUser.user_metadata?.avatar_url as string | undefined) ??
      (supaUser.user_metadata?.picture as string | undefined),
  };
}

function mapSession(session: Session): AppSession {
  return {
    user: mapUser(session.user),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };
}

// ---------------------------------------------------------------------------
// Token helpers — SecureStore'a yaz/oku
// ---------------------------------------------------------------------------

export async function persistSession(session: AppSession): Promise<void> {
  await Promise.all([
    secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, session.accessToken),
    secureStorage.set(SECURE_KEYS.REFRESH_TOKEN, session.refreshToken),
    secureStorage.set(SECURE_KEYS.USER_ID, session.user.id),
  ]);
}

export async function clearSession(): Promise<void> {
  await secureStorage.clearTokens();
}

// ---------------------------------------------------------------------------
// Email / Password
// ---------------------------------------------------------------------------

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult<AppSession>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, error: mapAuthError(error), code: error?.status?.toString() };
  }
  const session = mapSession(data.session);
  await persistSession(session);
  return { ok: true, data: session };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult<AppSession | null>> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    return { ok: false, error: mapAuthError(error), code: error?.status?.toString() };
  }
  // E-posta doğrulama aktifse session gelmeyebilir
  if (data.session) {
    const session = mapSession(data.session);
    await persistSession(session);
    return { ok: true, data: session };
  }
  // Doğrulama e-postası gönderildi, session yok
  return { ok: true, data: null };
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'thyassistant://reset-password',
  });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true, data: undefined };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// OAuth — Google
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<AuthResult<AppSession>> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'thyassistant://auth/callback',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) return { ok: false, error: mapAuthError(error) };
  // OAuth flow browser'da devam eder, session onAuthStateChange ile gelir
  return { ok: true, data: null as any };
}

// ---------------------------------------------------------------------------
// Anonymous sign-in (onboarding skip)
// ---------------------------------------------------------------------------

export async function signInAnonymously(): Promise<AuthResult<AppSession>> {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      return { ok: false, error: mapAuthError(error), code: error?.status?.toString() };
    }
    const session = mapSession(data.session);
    await persistSession(session);
    return { ok: true, data: session };
  } catch {
    return { ok: false, error: 'Giriş yapılamadı', code: 'UNKNOWN' };
  }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  await clearSession();
  if (error) return { ok: false, error: mapAuthError(error) };
  return { ok: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Session restore & refresh
// ---------------------------------------------------------------------------

/**
 * Uygulama açılışında mevcut session'ı kontrol eder.
 * Supabase MMKV'den session'ı okur (autoRefreshToken: true ile).
 */
export async function getCurrentSession(): Promise<AuthResult<AppSession | null>> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { ok: false, error: mapAuthError(error) };
  if (!data.session) return { ok: true, data: null };
  return { ok: true, data: mapSession(data.session) };
}

/**
 * Manual refresh — token süresi dolmadan önce veya 401 aldığında çağrılır.
 * Supabase autoRefreshToken bunu otomatik yapar ama manuel kontrol noktası olarak durur.
 */
export async function refreshSession(): Promise<AuthResult<AppSession>> {
  const storedRefreshToken = await secureStorage.get(SECURE_KEYS.REFRESH_TOKEN);
  if (!storedRefreshToken) {
    return { ok: false, error: 'Refresh token bulunamadı' };
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: storedRefreshToken,
  });

  if (error || !data.session) {
    await clearSession();
    return { ok: false, error: mapAuthError(error), code: 'REFRESH_FAILED' };
  }

  const session = mapSession(data.session);
  await persistSession(session);
  return { ok: true, data: session };
}

/**
 * Token'ın süresi dolmuş mu kontrolü.
 * expiresAt'ten 60s önce yenilemeye başla (buffer).
 */
export function isTokenExpired(expiresAt: number, bufferSeconds = 60): boolean {
  return Date.now() / 1000 >= expiresAt - bufferSeconds;
}

// ---------------------------------------------------------------------------
// Error mapper
// ---------------------------------------------------------------------------

function mapAuthError(error: AuthError | null | undefined): string {
  if (!error) return 'Bilinmeyen bir hata oluştu';
  switch (error.message) {
    case 'Invalid login credentials':
      return 'E-posta veya şifre hatalı';
    case 'Email not confirmed':
      return 'E-posta adresinizi doğrulayın';
    case 'User already registered':
      return 'Bu e-posta adresi zaten kayıtlı';
    case 'Password should be at least 6 characters':
      return 'Şifre en az 6 karakter olmalıdır';
    case 'For security purposes, you can only request this after 60 seconds':
      return 'Lütfen 60 saniye bekleyin';
    default:
      return error.message ?? 'Bir hata oluştu';
  }
}
