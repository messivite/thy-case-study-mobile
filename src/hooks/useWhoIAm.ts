/**
 * useWhoIAm
 *
 * /api/me + auth store'dan ayiklanan kullanici kimlik bilgilerini tek hook'ta doner.
 * Tek useSelector + shallowEqual: fazladan re-render yok.
 *
 * Guest / anonymous kullanicilarda me.profile.displayName gelmeyebilir —
 * tum alanlar null-safe, displayName bossa '' doner (UI "Hosgeldin" fallback kullanir).
 *
 * Kullanim:
 *   const { displayName, email, isAnonymous, avatarUrl, profileReady } = useWhoIAm();
 */

import { useSelector, shallowEqual } from 'react-redux';
import type { RootState } from '@/store';

export type WhoIAm = {
  /** Bos string donerse UI'da fallback goster ("Hosgeldin" vb.) */
  displayName: string;
  email: string;
  /** profile.role — orn. "user" */
  role: string;
  /** appMetadata.roles — orn. ["editor"]; guest'te [] */
  appRoles: string[];
  isAnonymous: boolean;
  locale: string;
  onboardingCompleted: boolean;
  /** auth.user.avatarUrl — me'de yoksa auth store'dan gelir */
  avatarUrl: string | undefined;
  /** true = me API basarili dondu ve store doldu */
  profileReady: boolean;
};

const EMPTY: WhoIAm = {
  displayName: '',
  email: '',
  role: '',
  appRoles: [],
  isAnonymous: false,
  locale: 'tr',
  onboardingCompleted: false,
  avatarUrl: undefined,
  profileReady: false,
};

export function useWhoIAm(): WhoIAm {
  return useSelector((state: RootState) => {
    const { data, status } = state.profile;
    const authUser = state.auth.user;

    if (!data || status !== 'success') return EMPTY;

    return {
      displayName: data.profile.displayName ?? '',
      email: data.user.email ?? '',
      role: data.profile.role,
      appRoles: data.user.appMetadata?.roles ?? [],
      isAnonymous: data.profile.isAnonymous,
      locale: data.profile.locale,
      onboardingCompleted: data.profile.onboardingCompleted,
      // me API'de avatarUrl alani yok — auth store'daki Supabase user'dan al
      avatarUrl: authUser?.avatarUrl,
      profileReady: true,
    };
  }, shallowEqual);
}
