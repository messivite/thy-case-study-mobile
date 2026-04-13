/**
 * useSupabaseAuth
 *
 * Supabase auth'u RTK store ile köprüleyen ana hook.
 *
 * Sorumlulukları:
 *  1. App açılışında mevcut session'ı restore et
 *  2. Supabase onAuthStateChange listener'ı → RTK dispatch
 *     (SIGNED_OUT: sadece Redux'ta gerçekten oturum varken reset/nav — açılış gürültüsünde atla)
 *  3. Token süresi dolduysa proaktif refresh (background interval)
 *  4. 401 interceptor sinyalini dinle → refresh → retry
 *  5. Login / register / logout / Google OAuth methodlarını dışa aç
 *
 * KULLANIM:
 *   Root layout'ta <SupabaseAuthProvider> içinde useSupabaseAuthState bir kez çalışır.
 *   Ekranlar useSupabaseAuth() ile context'ten aynı örneği okur (çift listener yok).
 */

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSession,
  refreshTokens,
  setGuest,
  setLoading,
  setUnauthenticated,
} from '@/store/slices/authSlice';
import { resetAfterLogout } from '@/store';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  getCurrentSession,
  refreshSession,
  resetPassword,
  updatePassword,
  isTokenExpired,
  mapSupabaseSession,
  AppSession,
} from '@/services/authService';
import { establishAnonymousSession } from '@/store/thunks/authThunks';
import { supabase } from '@/services/supabase';
import { clearSession, persistSession } from '@/services/authService';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { authEventEmitter, AUTH_EVENTS } from '@/services/api';
import { authMutex } from '@/lib/authMutex';
import { setErrorReportingUser } from '@/services/errorReporting';
import { toast } from '@/lib/toast';
import { realmService } from '@/services/realm';
import { queryClient } from '@/services/queryClient';
import { getMe, updateMe } from '@/api/user.api';
import { setProfile, setProfileError } from '@/store/slices/profileSlice';
import type { AuthStatus } from '@/types/auth.types';
import type { AuthResult } from '@/services/authService';

// Token'ı kaç saniye kala yenile (60s buffer)
const REFRESH_BUFFER_SECONDS = 60;
// Kaç ms'de bir token expiry kontrol et (her 4 dakika)
const REFRESH_CHECK_INTERVAL_MS = 4 * 60 * 1000;

// ---------------------------------------------------------------------------
// Context — tek onAuthStateChange / interval (ekran başına tekrar yok)
// ---------------------------------------------------------------------------

type SupabaseAuthApi = {
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthResult<AppSession>>;
  register: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<AuthResult<AppSession | null>>;
  loginWithGoogle: () => Promise<AuthResult<AppSession>>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<AuthResult<void>>;
  changePassword: (newPassword: string) => Promise<AuthResult<void>>;
  continueAsGuest: () => Promise<void>;
  skipWithAnonymousLogin: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthApi | null>(null);

/**
 * Tek seferlik listener'lar burada; children Redux Provider içinde olmalı.
 */
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const value = useSupabaseAuthState();
  return React.createElement(SupabaseAuthContext.Provider, { value }, children);
}

export const useSupabaseAuth = (): SupabaseAuthApi => {
  const ctx = useContext(SupabaseAuthContext);
  if (ctx == null) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return ctx;
};

// ---------------------------------------------------------------------------
// Internal — sadece SupabaseAuthProvider tarafından çağrılır
// ---------------------------------------------------------------------------

function useSupabaseAuthState(): SupabaseAuthApi {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken, expiresAt, status } = useAppSelector((s) => s.auth);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);
  /** Logout akisi bir kez baslatildiktan sonra tekrar tetiklenmesin (SIGNED_OUT + SESSION_EXPIRED yarisi) */
  const isLoggingOutRef = useRef(false);
  /** SIGNED_OUT anında güncel auth.status (idle iken gelen gürültüyü yok saymak için) */
  const authStatusRef = useRef(status);
  useEffect(() => {
    authStatusRef.current = status;
    // Yeni oturum acilinca logout flag'i sifirla
    if (status === 'authenticated' || status === 'guest') {
      isLoggingOutRef.current = false;
    }
  }, [status]);

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
      realmService.setUserId(session.user.id);
      setErrorReportingUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.name,
      });
    },
    [dispatch],
  );

  // /api/me → profileSlice — session kurulduktan hemen sonra arka planda çağrılır
  const fetchAndSetProfile = useCallback(() => {
    getMe()
      .then((data) => {
        dispatch(setProfile(data));
        // Onboarding sync: yerel onboarding tamamlandı ama backend henüz bilmiyor
        const localDone = mmkvStorage.getBoolean(STORAGE_KEYS.ONBOARDING_DONE) === true;
        if (!data.profile.onboardingCompleted && localDone) {
          updateMe({ onboardingCompleted: true })
            .then((updated) => dispatch(setProfile(updated)))
            .catch(() => {
              // Sessizce yoksay — bir sonraki girişte tekrar denenecek
            });
        }
      })
      .catch(() => {
        dispatch(setProfileError());
      });
  }, [dispatch]);

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
  // Background refresh interval — stop önce (tryRefreshToken buna bağlı)
  // -------------------------------------------------------------------------

  const stopRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Merkezi logout — tüm path'ler buradan geçer, tekrar tetiklenmeyi önler
  // -------------------------------------------------------------------------

  const doLogout = useCallback((showExpiredToast = false) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    stopRefreshInterval();
    authMutex.reset();
    void clearSession();
    // Başka kullanıcıya ait session/mesaj kalıntıları 403'e neden olmasın
    void realmService.clearAll();
    queryClient.clear();
    setErrorReportingUser(null);
    if (showExpiredToast) {
      toast.error('Oturumunuzun süresi doldu, tekrar giriş yapın.');
    }
    router.replace('/(auth)/welcome');
    dispatch(resetAfterLogout());
  }, [dispatch, stopRefreshInterval]);

  // -------------------------------------------------------------------------
  // Proactive token refresh
  // -------------------------------------------------------------------------

  const tryRefreshToken = useCallback(async () => {
    if (isRefreshingRef.current) return;
    if (!expiresAt || !isTokenExpired(expiresAt, REFRESH_BUFFER_SECONDS)) return;

    isRefreshingRef.current = true;
    try {
      const result = await refreshSession();
      if (result.ok) {
        dispatchRefreshedTokens(result.data);
      } else if (result.code === 'REFRESH_FAILED') {
        doLogout(true);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [expiresAt, dispatchRefreshedTokens, doLogout]);

  // Stable ref — AppState listener'ın her token refresh'te yeniden kayıt olmasını önler
  const tryRefreshTokenRef = useRef(tryRefreshToken);
  useEffect(() => {
    tryRefreshTokenRef.current = tryRefreshToken;
  }, [tryRefreshToken]);

  const startRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(tryRefreshToken, REFRESH_CHECK_INTERVAL_MS);
  }, [tryRefreshToken]);

  // -------------------------------------------------------------------------
  // SESSION_EXPIRED event (api.ts interceptor'dan gelir)
  // Refresh token da bitmişse → logout + login ekranına yönlendir
  // -------------------------------------------------------------------------

  useEffect(() => {
    const unsub = authEventEmitter.on(AUTH_EVENTS.SESSION_EXPIRED, () => {
      doLogout(true);
    });
    return () => { unsub(); };
  }, [doLogout]);

  // -------------------------------------------------------------------------
  // App state change → refresh when coming to foreground
  // -------------------------------------------------------------------------

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && status === 'authenticated') {
        tryRefreshTokenRef.current();
      }
    });
    return () => sub.remove();
  }, [status]);

  // -------------------------------------------------------------------------
  // Supabase onAuthStateChange listener
  // -------------------------------------------------------------------------

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          switch (event) {
            case 'SIGNED_IN':
              if (session) {
                const appSession = mapSupabaseSession(session);
                dispatchSession(appSession);
                void persistSession(appSession);
                startRefreshInterval();
                fetchAndSetProfile();
              }
              break;

            case 'TOKEN_REFRESHED':
            case 'USER_UPDATED':
              if (session) {
                const appSession = mapSupabaseSession(session);
                dispatchSession(appSession);
                void persistSession(appSession);
                fetchAndSetProfile();
              }
              break;

            case 'SIGNED_OUT': {
              // doLogout zaten isLoggingOutRef ile koruyor — harici SIGNED_OUT'ta da tetiklenebilir
              const hadUserSession =
                authStatusRef.current === 'authenticated' ||
                authStatusRef.current === 'guest';
              if (hadUserSession) {
                doLogout(false);
              }
              break;
            }

            case 'PASSWORD_RECOVERY':
              // Deep link ile şifre sıfırlama sayfasına yönlendirme
              // Navigation API entegrasyonunda handle edilecek
              break;

            default:
              break;
          }
        } catch (error) {
          console.error('[Auth] onAuthStateChange error:', event, error);
          dispatch(setUnauthenticated());
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [dispatch, dispatchSession, startRefreshInterval, doLogout, fetchAndSetProfile]);

  // -------------------------------------------------------------------------
  // App init — mevcut session'ı restore et
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (status !== 'idle') return;

    dispatch(setLoading(true));

    getCurrentSession()
      .then((result) => {
        if (result.ok && result.data) {
          dispatchSession(result.data);
          startRefreshInterval();
          fetchAndSetProfile();
        } else {
          dispatch(setUnauthenticated());
        }
      })
      .catch(() => dispatch(setUnauthenticated()));
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
    async (email: string, password: string, fullName?: string) => {
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
    [dispatch, dispatchSession, startRefreshInterval],
  );

  const loginWithGoogle = useCallback(async () => {
    dispatch(setLoading(true));
    const result = await signInWithGoogle();
    // Google OAuth browser açar, session onAuthStateChange ile gelir
    if (!result.ok) dispatch(setLoading(false));
    return result;
  }, [dispatch]);

  const logout = useCallback(() => {
    doLogout(false);
    void signOut();
  }, [doLogout]);

  const forgotPassword = useCallback(async (email: string) => {
    return resetPassword(email);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    return updatePassword(newPassword);
  }, []);

  const skipWithAnonymousLogin = useCallback(async (): Promise<void> => {
    try {
      const session = await dispatch(establishAnonymousSession()).unwrap();
      mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
      startRefreshInterval();
      setErrorReportingUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.name,
      });
    } catch {
      mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
      setErrorReportingUser(null);
    }
  }, [dispatch, startRefreshInterval]);

  const continueAsGuest = useCallback(async (): Promise<void> => {
    try {
      const session = await dispatch(establishAnonymousSession()).unwrap();
      startRefreshInterval();
      setErrorReportingUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.name,
      });
    } catch {
      toast.error('Misafir girişi şu an yapılamadı. Bağlantınızı kontrol edin.');
      setErrorReportingUser(null);
    }
  }, [dispatch, startRefreshInterval]);

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
}
