jest.mock('@/lib/mmkv', () => ({
  storage: { getString: jest.fn(), set: jest.fn(), delete: jest.fn() },
  STORAGE_KEYS: { REACT_QUERY_CACHE: 'rq_cache', THEME: 'theme', LANGUAGE: 'language', SELECTED_MODEL: 'selected_model', ONBOARDING_DONE: 'onboarding_done' },
}));

import profileReducer, {
  setProfile,
  patchProfile,
  setProfileLoading,
  setProfileError,
  clearServerUnavailable,
} from '@/store/slices/profileSlice';
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
    avatarUrl: null,
    preferredProvider: 'openai',
    preferredModel: 'gpt-4o',
  },
};

describe('profileSlice', () => {
  it('initial state', () => {
    const state = profileReducer(undefined, { type: '@@INIT' });
    expect(state.data).toBeNull();
    expect(state.status).toBe('idle');
    expect(state.serverUnavailable).toBe(false);
  });

  it('setProfile — data ve status güncellenir', () => {
    const state = profileReducer(undefined, setProfile(mockMe));
    expect(state.data).toEqual(mockMe);
    expect(state.status).toBe('success');
  });

  it('setProfileLoading — status loading', () => {
    const state = profileReducer(undefined, setProfileLoading());
    expect(state.status).toBe('loading');
  });

  it('setProfileError — status error + serverUnavailable', () => {
    const state = profileReducer(undefined, setProfileError());
    expect(state.status).toBe('error');
    expect(state.serverUnavailable).toBe(true);
  });

  it('clearServerUnavailable — flag sıfırlanır', () => {
    const withError = profileReducer(undefined, setProfileError());
    const cleared = profileReducer(withError, clearServerUnavailable());
    expect(cleared.serverUnavailable).toBe(false);
  });

  it('patchProfile — displayName güncellenir', () => {
    const withProfile = profileReducer(undefined, setProfile(mockMe));
    const patched = profileReducer(withProfile, patchProfile({ displayName: 'Yeni İsim' }));
    expect(patched.data?.profile.displayName).toBe('Yeni İsim');
  });

  it('patchProfile — preferredModel güncellenir', () => {
    const withProfile = profileReducer(undefined, setProfile(mockMe));
    const patched = profileReducer(withProfile, patchProfile({ preferredModel: 'claude-3' }));
    expect(patched.data?.profile.preferredModel).toBe('claude-3');
  });

  it('patchProfile — data yoksa sessizce geçer', () => {
    const state = profileReducer(undefined, patchProfile({ displayName: 'Test' }));
    expect(state.data).toBeNull();
  });

  it('patchProfile — onboardingCompleted güncellenir', () => {
    const withProfile = profileReducer(undefined, setProfile(mockMe));
    const patched = profileReducer(withProfile, patchProfile({ onboardingCompleted: false }));
    expect(patched.data?.profile.onboardingCompleted).toBe(false);
  });
});
