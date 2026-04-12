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

import { renderHook } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import profileReducer, { setProfile, setProfileError } from '@/store/slices/profileSlice';
import authReducer from '@/store/slices/authSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import uiReducer from '@/store/slices/uiSlice';
import chatReducer from '@/store/slices/chatSlice';
import type { MeResponse } from '@/types/user.api.types';

const mockMe: MeResponse = {
  user: {
    id: 'u1',
    email: 'test@example.com',
    appMetadata: { roles: ['editor'] },
  },
  profile: {
    displayName: 'Test User',
    role: 'user',
    isAnonymous: false,
    locale: 'tr',
    timezone: 'Europe/Istanbul',
    onboardingCompleted: true,
    avatarUrl: 'https://example.com/avatar.png',
    preferredProvider: 'openai',
    preferredModel: 'gpt-4o',
  },
};

function makeStore(preloadedProfile?: ReturnType<typeof profileReducer>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      chat: chatReducer,
      settings: settingsReducer,
      ui: uiReducer,
      profile: profileReducer,
    },
    preloadedState: preloadedProfile ? { profile: preloadedProfile } : undefined,
  });
}

function wrapper(store: ReturnType<typeof makeStore>) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);
}

describe('useWhoIAm', () => {
  it('data olmadan EMPTY döner', () => {
    const store = makeStore();
    const { result } = renderHook(() => useWhoIAm(), { wrapper: wrapper(store) });
    expect(result.current.displayName).toBe('');
    expect(result.current.profileReady).toBe(false);
    expect(result.current.isAnonymous).toBe(false);
  });

  it('setProfile sonrası doğru veri döner', () => {
    const store = makeStore();
    store.dispatch(setProfile(mockMe));

    const { result } = renderHook(() => useWhoIAm(), { wrapper: wrapper(store) });
    expect(result.current.profileReady).toBe(true);
    expect(result.current.displayName).toBe('Test User');
    expect(result.current.email).toBe('test@example.com');
    expect(result.current.role).toBe('user');
    expect(result.current.appRoles).toEqual(['editor']);
    expect(result.current.isAnonymous).toBe(false);
    expect(result.current.locale).toBe('tr');
    expect(result.current.onboardingCompleted).toBe(true);
    expect(result.current.avatarUrl).toBe('https://example.com/avatar.png');
    expect(result.current.preferredProvider).toBe('openai');
    expect(result.current.preferredModel).toBe('gpt-4o');
  });

  it('hata durumunda EMPTY döner', () => {
    const store = makeStore();
    store.dispatch(setProfileError());

    const { result } = renderHook(() => useWhoIAm(), { wrapper: wrapper(store) });
    expect(result.current.profileReady).toBe(false);
    expect(result.current.displayName).toBe('');
  });

  it('displayName null ise boş string döner', () => {
    const store = makeStore();
    store.dispatch(setProfile({
      ...mockMe,
      profile: { ...mockMe.profile, displayName: null as any },
    }));
    const { result } = renderHook(() => useWhoIAm(), { wrapper: wrapper(store) });
    expect(result.current.displayName).toBe('');
  });
});
