/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  // Preset override: Redux Toolkit pulls in immer ESM; allow transpiling those packages.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|immer|@reduxjs|react-redux))',
    '/node_modules/react-native-reanimated/plugin/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    // UI bileşenleri — native modül bağımlılıkları test ortamında izole edilemez
    '!src/atoms/**',
    '!src/molecules/**',
    '!src/organisms/**',
    '!src/screens/**',
    '!src/templates/**',
    '!src/components/**',
    // Native/streaming hook'lar — Reanimated, AbortController, Supabase zinciri
    '!src/hooks/useChatSession.ts',
    '!src/hooks/useSupabaseAuth.ts',
    '!src/hooks/usePushNotifications.ts',
    '!src/hooks/useNotificationPermission.ts',
    '!src/hooks/useChatHistory.ts',
    '!src/hooks/useChat.ts',
    '!src/hooks/useAuth.ts',
    // Native servis katmanı — Realm native, SecureStore native
    '!src/services/authService.ts',
    '!src/services/realm.native.ts',
    '!src/lib/secureStore.native.ts',
    '!src/lib/notificationPermission.ts',
    '!src/lib/authMutex.ts',
    '!src/lib/openExternalLink.ts',
    '!src/lib/webViewport.ts',
    '!src/lib/motiView.ts',
    '!src/lib/realmWebStub.js',
    '!src/contexts/**',
    // Expo Router sayfa dosyaları
    '!app/**',
    // Axios/Supabase/SDK integrasyon katmanı — unit test ortamında izole edilemez
    '!src/services/api.ts',
    '!src/services/supabase.ts',
    '!src/services/queryClient.ts',
    '!src/services/errorReporting.ts',
    '!src/api/chat.api.ts',
    // Platform platform stub'ları
    '!src/lib/batchedUpdates.native.ts',
    '!src/lib/batchedUpdates.ts',
    '!src/lib/mmkv.native.ts',
    '!src/lib/mmkv.ts',
    '!src/lib/secureStore.ts',
    // i18n runtime konfigürasyonu
    '!src/i18n/index.ts',
    // Context re-export'ları
    '!src/hooks/useTheme.ts',
    // API hook'ları — React Query + Axios zinciri
    '!src/hooks/api/useChats.ts',
    '!src/hooks/api/useUpdateMe.ts',
    '!src/hooks/api/useUploadAvatar.ts',
    '!src/hooks/api/useNotifications.ts',
    '!src/hooks/api/useUsage.ts',
    // TypeScript tip dosyaları — saf tip tanımları, çalışabilir satır yok
    '!src/types/**',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'coverage',
};
