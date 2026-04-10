import { createAsyncThunk } from '@reduxjs/toolkit';
import { signInAnonymously } from '@/services/authService';
import { setGuest, setLoading, setSession } from '@/store/slices/authSlice';

export const establishAnonymousSession = createAsyncThunk(
  'auth/establishAnonymousSession',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(setLoading(true));
    const result = await signInAnonymously();
    dispatch(setLoading(false));

    if (!result.ok) {
      dispatch(setGuest());
      return rejectWithValue(result.error);
    }

    dispatch(
      setSession({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        expiresAt: result.data.expiresAt,
      }),
    );

    return result.data;
  },
);
