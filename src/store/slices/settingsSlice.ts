import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import type { ThemeMode, AppLanguage } from '@/types/settings.types';

type SettingsState = {
  theme: ThemeMode;
  language: AppLanguage;
  streamingEnabled: boolean;
};

const savedTheme = (mmkvStorage.getString(STORAGE_KEYS.THEME) as ThemeMode | undefined) ?? 'system';
const savedLanguage = (mmkvStorage.getString(STORAGE_KEYS.LANGUAGE) as AppLanguage | undefined) ?? 'tr';
const savedStreaming = mmkvStorage.getString(STORAGE_KEYS.STREAMING);
const initialState: SettingsState = {
  theme: savedTheme,
  language: savedLanguage,
  streamingEnabled: savedStreaming === undefined ? true : savedStreaming === '1',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      mmkvStorage.setString(STORAGE_KEYS.THEME, action.payload);
    },
    setLanguage(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
      mmkvStorage.setString(STORAGE_KEYS.LANGUAGE, action.payload);
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.streamingEnabled = action.payload;
      mmkvStorage.setString(STORAGE_KEYS.STREAMING, action.payload ? '1' : '0');
    },
  },
});

export const { setTheme, setLanguage, setStreaming } = settingsSlice.actions;
export default settingsSlice.reducer;
