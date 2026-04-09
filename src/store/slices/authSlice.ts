import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '@/types/auth.types';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  isGuest: false,
  status: 'idle',
  // aliases
  isLoading: false,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Tam oturum bilgisini set et (login / token refresh sonrası) */
    setSession(
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      }>,
    ) {
      const { user, accessToken, refreshToken, expiresAt } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.expiresAt = expiresAt;
      state.isGuest = false;
      state.status = 'authenticated';
      // aliases
      state.token = accessToken;
      state.isLoading = false;
    },

    /** Sadece token'ları güncelle (refresh sonrası kullanıcı değişmez) */
    refreshTokens(
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      }>,
    ) {
      const { accessToken, refreshToken, expiresAt } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.expiresAt = expiresAt;
      state.token = accessToken;
      state.status = 'authenticated';
    },

    /** Misafir modu */
    setGuest(state) {
      Object.assign(state, initialState);
      state.isGuest = true;
      state.status = 'guest';
    },

    /** Yükleniyor durumu */
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      state.status = action.payload ? 'loading' : state.status;
    },

    /** Session kontrol edildi, kimse yok */
    setUnauthenticated(state) {
      Object.assign(state, initialState);
      state.status = 'unauthenticated';
    },

    /** Logout / session temizle */
    logout(state) {
      Object.assign(state, initialState);
      state.status = 'unauthenticated';
    },

    // --- Geriye dönük uyumluluk ---
    /** Eski setUser çağrıları için */
    setUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.token;
      state.token = action.payload.token;
      state.isGuest = false;
      state.status = 'authenticated';
      state.isLoading = false;
    },
  },
});

export const {
  setSession,
  refreshTokens,
  setGuest,
  setLoading,
  setUnauthenticated,
  logout,
  setUser,
} = authSlice.actions;

export default authSlice.reducer;
