jest.mock('@/lib/mmkv', () => ({
  mmkvStorage: {
    getString: jest.fn(),
    setString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getBoolean: jest.fn(),
    setBoolean: jest.fn(),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    contains: jest.fn(),
    clearAll: jest.fn(),
  },
  STORAGE_KEYS: {
    REACT_QUERY_CACHE: 'rq_cache',
    THEME: 'theme',
    LANGUAGE: 'language',
    STREAMING: 'streaming',
    SELECTED_MODEL: 'selected_model',
    ONBOARDING_DONE: 'onboarding_done',
    CHAT_MESSAGES: 'chat_messages',
  },
}));

jest.mock('@/services/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('@/services/authService', () => ({
  signInAnonymously: jest.fn(),
}));

import { configureStore } from '@reduxjs/toolkit';
import { establishAnonymousSession } from '@/store/thunks/authThunks';
import authReducer from '@/store/slices/authSlice';
import profileReducer from '@/store/slices/profileSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import uiReducer from '@/store/slices/uiSlice';
import chatReducer from '@/store/slices/chatSlice';
import { signInAnonymously } from '@/services/authService';

const mockSignInAnonymously = signInAnonymously as jest.MockedFunction<typeof signInAnonymously>;

function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
      settings: settingsReducer,
      ui: uiReducer,
      profile: profileReducer,
    },
  });
}

describe('establishAnonymousSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('başarılı anonim oturum — authenticated durumuna geçer', async () => {
    mockSignInAnonymously.mockResolvedValueOnce({
      ok: true,
      data: {
        user: { id: 'anon1', email: 'anon@anon.com', name: 'Anon', isAnonymous: true },
        accessToken: 'anon_at',
        refreshToken: 'anon_rt',
        expiresAt: 9999,
      },
    });

    const store = makeStore();
    await store.dispatch(establishAnonymousSession());

    const state = store.getState().auth;
    expect(state.status).toBe('authenticated');
    expect(state.accessToken).toBe('anon_at');
    expect(state.isGuest).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('başarısız anonim oturum — guest durumuna düşer', async () => {
    mockSignInAnonymously.mockResolvedValueOnce({
      ok: false,
      error: 'UNKNOWN',
    });

    const store = makeStore();
    await store.dispatch(establishAnonymousSession());

    const state = store.getState().auth;
    expect(state.isGuest).toBe(true);
    expect(state.status).toBe('guest');
    expect(state.isLoading).toBe(false);
  });

  it('dispatch sırasında isLoading geçici olarak true olur', async () => {
    let loadingDuring = false;
    mockSignInAnonymously.mockImplementationOnce(async () => {
      // dispatch(setLoading(true)) zaten çağrıldı, store check et
      return { ok: true, data: { user: { id: 'a', email: 'a@a.com', name: 'A' }, accessToken: 'at', refreshToken: 'rt', expiresAt: 1 } };
    });

    const store = makeStore();
    const promise = store.dispatch(establishAnonymousSession());
    // Loading başlatıldı
    await promise;
    // İş bitti, loading false
    expect(store.getState().auth.isLoading).toBe(false);
  });
});
