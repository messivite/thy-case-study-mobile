import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ColorSchemeName } from 'react-native';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';

type ThemeMode = 'light' | 'dark' | 'system';

type SettingsState = {
  theme: ThemeMode;
  language: 'tr' | 'en';
  notificationsEnabled: boolean;
};

const savedTheme = (mmkvStorage.getString(STORAGE_KEYS.THEME) as ThemeMode | undefined) ?? 'system';
const savedLanguage = (mmkvStorage.getString(STORAGE_KEYS.LANGUAGE) as 'tr' | 'en' | undefined) ?? 'tr';

const initialState: SettingsState = {
  theme: savedTheme,
  language: savedLanguage,
  notificationsEnabled: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      mmkvStorage.setString(STORAGE_KEYS.THEME, action.payload);
    },
    setLanguage(state, action: PayloadAction<'tr' | 'en'>) {
      state.language = action.payload;
      mmkvStorage.setString(STORAGE_KEYS.LANGUAGE, action.payload);
    },
    setNotifications(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
  },
});

export const { setTheme, setLanguage, setNotifications } = settingsSlice.actions;
export default settingsSlice.reducer;

export type { ThemeMode };
