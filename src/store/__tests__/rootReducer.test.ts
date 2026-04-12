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

import { rootReducer, resetAfterLogout } from '@/store';
import { setSession } from '@/store/slices/authSlice';
import type { User } from '@/types/auth.types';

const mockUser: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test',
};

describe('rootReducer', () => {
  it('initial state oluşur', () => {
    const state = rootReducer(undefined, { type: '@@INIT' });
    expect(state.auth).toBeDefined();
    expect(state.profile).toBeDefined();
    expect(state.settings).toBeDefined();
    expect(state.ui).toBeDefined();
    expect(state.chat).toBeDefined();
  });

  it('resetAfterLogout — tüm state sıfırlanır, status unauthenticated', () => {
    // Önce oturum aç
    let state = rootReducer(
      undefined,
      setSession({ user: mockUser, accessToken: 'at', refreshToken: 'rt', expiresAt: 9999 }),
    );
    expect(state.auth.status).toBe('authenticated');

    // Logout
    state = rootReducer(state, resetAfterLogout());
    expect(state.auth.user).toBeNull();
    expect(state.auth.accessToken).toBeNull();
    expect(state.auth.status).toBe('unauthenticated');
  });

  it('resetAfterLogout — auth status unauthenticated olarak override edilir', () => {
    const state = rootReducer(undefined, resetAfterLogout());
    expect(state.auth.status).toBe('unauthenticated');
  });
});

describe('resetAfterLogout action', () => {
  it('doğru type ile oluşur', () => {
    const action = resetAfterLogout();
    expect(action.type).toBe('app/resetAfterLogout');
  });

  it('resetAfterLogout.match — doğru action', () => {
    expect(resetAfterLogout.match(resetAfterLogout())).toBe(true);
  });

  it('resetAfterLogout.match — yanlış action', () => {
    expect(resetAfterLogout.match({ type: 'other' })).toBe(false);
  });
});
