/**
 * useAuth — ekranların kullandığı lightweight selector hook.
 *
 * State okuma + dispatch için. Supabase çağrıları yapmaz,
 * onlar useSupabaseAuth içinde veya doğrudan authService'te.
 */

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout, setGuest } from '@/store/slices/authSlice';
import { signOut } from '@/services/authService';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((s) => s.auth);

  const isAuthenticated = auth.status === 'authenticated';
  const isGuest = auth.status === 'guest';
  const isLoading = auth.status === 'loading' || auth.status === 'idle';

  const handleLogout = async () => {
    await signOut();
    dispatch(logout());
  };

  const loginAsGuest = () => {
    dispatch(setGuest());
  };

  return {
    user: auth.user,
    token: auth.accessToken,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: auth.expiresAt,
    isAuthenticated,
    isGuest,
    isLoading,
    status: auth.status,
    logout: handleLogout,
    loginAsGuest,
  };
};
