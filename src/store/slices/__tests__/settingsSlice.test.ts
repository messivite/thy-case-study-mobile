jest.mock('@/lib/mmkv', () => ({
  mmkvStorage: {
    getString: jest.fn(),
    setString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
  STORAGE_KEYS: {
    REACT_QUERY_CACHE: 'rq_cache',
    THEME: 'theme',
    LANGUAGE: 'language',
    STREAMING: 'streaming',
    SELECTED_MODEL: 'selected_model',
    ONBOARDING_DONE: 'onboarding_done',
  },
}));

import settingsReducer, {
  setTheme,
  setLanguage,
  setStreaming,
} from '@/store/slices/settingsSlice';

describe('settingsSlice', () => {
  it('initial state', () => {
    const state = settingsReducer(undefined, { type: '@@INIT' });
    expect(state.theme).toBeDefined();
    expect(state.language).toBeDefined();
  });

  it('setTheme — light', () => {
    const state = settingsReducer(undefined, setTheme('light'));
    expect(state.theme).toBe('light');
  });

  it('setTheme — dark', () => {
    const state = settingsReducer(undefined, setTheme('dark'));
    expect(state.theme).toBe('dark');
  });

  it('setTheme — system', () => {
    const state = settingsReducer(undefined, setTheme('system'));
    expect(state.theme).toBe('system');
  });

  it('setLanguage — tr', () => {
    const state = settingsReducer(undefined, setLanguage('tr'));
    expect(state.language).toBe('tr');
  });

  it('setLanguage — en', () => {
    const state = settingsReducer(undefined, setLanguage('en'));
    expect(state.language).toBe('en');
  });

  it('setStreaming — true', () => {
    const state = settingsReducer(undefined, setStreaming(true));
    expect(state.streamingEnabled).toBe(true);
  });

  it('setStreaming — false', () => {
    const state = settingsReducer(undefined, setStreaming(false));
    expect(state.streamingEnabled).toBe(false);
  });
});
