/**
 * useSupabaseAuth
 *
 * Supabase auth'u RTK store ile köprüleyen ana hook.
 *
 * Sorumlulukları:
 *  1. App açılışında mevcut session'ı restore et
 *  2. Supabase onAuthStateChange listener'ı → RTK dispatch
 *  3. Token süresi dolduysa proaktif refresh (background interval)
 *  4. 401 interceptor sinyalini dinle → refresh → retry
 *  5. Login / register / logout / Google OAuth methodlarını dışa aç
 *
 * KULLANIM:
 *   Root layout'ta tek seferlik <AuthProvider> içinde çağrılır.
 *   Ekranlar useAuth() ile sadece state'i okur.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSession,
  refreshTokens,
  setGuest,
  setLoading,
  setUnauthenticated,
  logout as logoutAction,
} from '@/store/slices/authSlice';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInAnonymously,
  signOut,
  getCurrentSession,
  refreshSession,
  resetPassword,
  updatePassword,
  isTokenExpired,
  AppSession,
} from '@/services/authService';
import { supabase } from '@/services/supabase';
import { clearSession } from '@/services/authService';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { authEventEmitter, AUTH_EVENTS } from '@/services/api';
import { authMutex } from '@/lib/authMutex';
import { toast } from 'sonner-native';

// Token'ı kaç saniye kala yenile (60s buffer)
const REFRESH_BUFFER_SECONDS = 60;
// Kaç ms'de bir token expiry kontrol et (her 4 dakika)
const REFRESH_CHECK_INTERVAL_MS = 4 * 60 * 1000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useSupabaseAuth = () => {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken, expiresAt, status } = useAppSelector((s) => s.auth);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const dispatchSession = useCallback(
    (session: AppSession) => {
      dispatch(
        setSession({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        }),
      );
    },
    [dispatch],
  );

  const dispatchRefreshedTokens = useCallback(
    (session: AppSession) => {
      dispatch(
        refreshTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        }),
      );
    },
    [dispatch],
  );

  // -------------------------------------------------------------------------
  // Proactive token refresh
  // -------------------------------------------------------------------------

  const tryRefreshToken = useCallback(async () => {
    if (isRefreshingRef.current) return;
    if (!expiresAt || !isTokenExpired(expiresAt, REFRESH_BUFFER_SECONDS)) return;

    isRefreshingRef.current = true;
    const result = await refreshSession();
    isRefreshingRef.current = false;

    if (result.ok) {
      dispatchRefreshedTokens(result.data);
    } else if (result.code === 'REFRESH_FAILED') {
      // Refresh token da geçersiz → oturumu kapat
      dispatch(logoutAction());
      toast.error('Oturumunuzun süresi doldu, tekrar giriş yapın.');
    }
  }, [expiresAt, dispatch, dispatchRefreshedTokens]);

  // -------------------------------------------------------------------------
  // Background refresh interval — app açıkken periyodik kontrol
  // -------------------------------------------------------------------------

  const startRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(tryRefreshToken, REFRESH_CHECK_INTERVAL_MS);
  }, [tryRefreshToken]);

  const stopRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // SESSION_EXPIRED event (api.ts interceptor'dan gelir)
  // Refresh token da bitmişse → logout + login ekranına yönlendir
  // -------------------------------------------------------------------------

  useEffect(() => {
    const unsub = authEventEmitter.on(AUTH_EVENTS.SESSION_EXPIRED, () => {
      stopRefreshInterval();
      authMutex.reset();
      dispatch(logoutAction());
      toast.error('Oturumunuzun süresi doldu, tekrar giriş yapın.');
      router.replace('/(auth)/welcome');
    });
    return unsub;
  }, [dispatch, stopRefreshInterval]);

  // -------------------------------------------------------------------------
  // App state change → refresh when coming to foreground
  // -------------------------------------------------------------------------

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && status === 'authenticated') {
        tryRefreshToken();
      }
    });
    return () => sub.remove();
  }, [status, tryRefreshToken]);

  // -------------------------------------------------------------------------
  // Supabase onAuthStateChange listener
  // -------------------------------------------------------------------------

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            if (session) {
              dispatchSession({
                user: {
                  id: session.user.id,
                  email: session.user.email ?? '',
                  name:
                    (session.user.user_metadata?.full_name as string) ??
                    session.user.email?.split('@')[0] ??
                    '',
                  avatarUrl: session.user.user_metadata?.avatar_url as string | undefined,
                },
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
                expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
              });
              startRefreshInterval();
            }
            break;

          case 'SIGNED_OUT':
            stopRefreshInterval();
            await clearSession();
            dispatch(logoutAction());
            break;

          case 'PASSWORD_RECOVERY':
            // Deep link ile şifre sıfırlama sayfasına yönlendirme
            // Navigation API entegrasyonunda handle edilecek
            break;

          default:
            break;
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [dispatch, dispatchSession, startRefreshInterval, stopRefreshInterval]);

  // -------------------------------------------------------------------------
  // App init — mevcut session'ı restore et
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (status !== 'idle') return;

    dispatch(setLoading(true));

    getCurrentSession().then((result) => {
      if (result.ok && result.data) {
        dispatchSession(result.data);
        startRefreshInterval();
      } else {
        dispatch(setUnauthenticated());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on mount

  // -------------------------------------------------------------------------
  // Public methods
  // -------------------------------------------------------------------------

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(setLoading(true));
      const result = await signInWithEmail(email, password);
      if (result.ok) {
        dispatchSession(result.data);
        startRefreshInterval();
      } else {
        dispatch(setLoading(false));
      }
      return result;
    },
    [dispatch, dispatchSession, startRefreshInterval],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      dispatch(setLoading(true));
      const result = await signUpWithEmail(email, password, fullName);
      if (result.ok) {
        if (result.data) {
          // E-posta doğrulama yok, direkt session geldi
          dispatchSession(result.data);
          startRefreshInterval();
        } else {
          // Doğrulama e-postası gönderildi
          dispatch(setUnauthenticated());
        }
      } else {
        dispatch(setLoading(false));
      }
      return result;
    },
    [dispatch, dispatchSession, startRefreshInterval, setUnauthenticated],
  );

  const loginWithGoogle = useCallback(async () => {
    dispatch(setLoading(true));
    const result = await signInWithGoogle();
    // Google OAuth browser açar, session onAuthStateChange ile gelir
    if (!result.ok) dispatch(setLoading(false));
    return result;
  }, [dispatch]);

  const logout = useCallback(async () => {
    stopRefreshInterval();
    await signOut();
    dispatch(logoutAction());
  }, [dispatch, stopRefreshInterval]);

  const forgotPassword = useCallback(async (email: string) => {
    return resetPassword(email);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    return updatePassword(newPassword);
  }, []);

  const skipWithAnonymousLogin = useCallback(async (): Promise<void> => {
    dispatch(setLoading(true));
    const result = await signInAnonymously();
    if (result.ok) {
      mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
      dispatchSession(result.data);
      startRefreshInterval();
    } else {
      // Network yok veya anon disabled → local guest fallback
      mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
      dispatch(setGuest());
    }
  }, [dispatch, dispatchSession, startRefreshInterval]);

  const continueAsGuest = useCallback(() => {
    dispatch(setGuest());
  }, [dispatch]);

  return {
    // State
    status,
    // Methods
    login,
    register,
    loginWithGoogle,
    logout,
    forgotPassword,
    changePassword,
    continueAsGuest,
    skipWithAnonymousLogin,
  };
};
