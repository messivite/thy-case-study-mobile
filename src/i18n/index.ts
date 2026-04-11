import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';

import tr from '@/i18n/tr.json';
import en from '@/i18n/en.json';

// MMKV init sırasında erişilemeyebilir — güvenli okuma
let savedLanguage: string | undefined;
try {
  const { mmkvStorage, STORAGE_KEYS } = require('@/lib/mmkv');
  savedLanguage = mmkvStorage.getString(STORAGE_KEYS.LANGUAGE);
} catch {
  // MMKV henüz hazır değil, device locale kullanılacak
}

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'tr';
const initialLanguage = savedLanguage ?? (deviceLocale === 'tr' ? 'tr' : 'en');

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'tr',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
