import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'sonner-native';
import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { OfflineProvider } from '@mustafaaksoy41/react-native-offline-queue';
// getRealmAdapter: web'de Realm yok — runtime'da Platform check ile lazy yükle
const getRealmAdapter = Platform.OS !== 'web'
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ? () => require('@mustafaaksoy41/react-native-offline-queue').getRealmAdapter()
  : () => null;

import { store } from '@/store';
import { queryClient } from '@/services/queryClient';
import i18n from '@/i18n';
import '@/i18n'; // init side effect
import { SupabaseAuthProvider } from '@/hooks/useSupabaseAuth';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { initErrorReporting } from '@/services/errorReporting';
import { ensureWebViewportRootStyle } from '@/lib/webViewport';
import { realmService } from '@/services/realm';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Sentry native köprüsü her build'de bir kez init (DSN yok / dev'de enabled:false)
initErrorReporting();
ensureWebViewportRootStyle();
// Realm'i splash sırasında arka planda aç — ilk getSessions() geldiğinde hazır olur
realmService.prefetch();

function RootLayout() {
  // Global font load: direct web route refresh (e.g. /auth/welcome) also gets Inter.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });


  return (
    <GestureHandlerRootView
      style={[styles.root, Platform.OS === 'web' && styles.rootWeb]}
    >
      <KeyboardProvider
        statusBarTranslucent={Platform.OS === 'android'}
        navigationBarTranslucent={Platform.OS === 'android'}
        preserveEdgeToEdge={Platform.OS === 'android'}
      >
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={i18n}>
                {Platform.OS !== 'web' ? (
                  <OfflineProvider config={{
                    storageType: 'realm',
                    storage: getRealmAdapter(),
                    syncMode: 'manual',
                  }}>
                    <AppErrorBoundary>
                      {fontsLoaded ? <AuthProvider /> : null}
                    </AppErrorBoundary>
                  </OfflineProvider>
                ) : (
                  <AppErrorBoundary>
                    {fontsLoaded ? <AuthProvider /> : null}
                  </AppErrorBoundary>
                )}
              </I18nextProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

// Kökte Sentry.wrap kullanmıyoruz: Expo Router ile giriş çökmesi / AppRegistry uyarısı riski.
// Hatalar AppErrorBoundary + captureAppError ile gider.
export default RootLayout;

/**
 * Store'a erişmek için Provider'ın içine alınmış ayrı component.
 * SupabaseAuthProvider: listener'lar tek kez; ekranlar useSupabaseAuth() ile context okur.
 */
function AuthProvider() {
  return (
    <SupabaseAuthProvider>
      <StatusBar
        style="auto"
        translucent
        backgroundColor="transparent"
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: [
            { backgroundColor: 'transparent' },
            Platform.OS === 'web' && styles.stackContentWeb,
          ],
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen
          name="(onboarding)"
          options={{
            animation: 'none',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen
          name="(tabs)"
          options={{
            presentation: 'card',
            animation: 'none',
            gestureEnabled: false,
            // Welcome gradient alt rengiyle eslestirildi — beyaz flash yok
            contentStyle: { backgroundColor: '#F0F7F9' },
          }}
        />
        <Stack.Screen
          name="webview-modal"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            gestureEnabled: true,
            // Opaque + flex: sheet içinde WebView / loader alanı doğru yükseklik alsın (transparent layout çökertiyordu)
            contentStyle: { flex: 1, backgroundColor: '#FFFFFF' },
          }}
        />
        <Stack.Screen
          name="settings-sheet"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            gestureEnabled: true,
            contentStyle: { flex: 1, backgroundColor: '#FFFFFF' },
          }}
        />
      </Stack>
      <Toaster
        position="top-center"
        offset={60}
        visibleToasts={3}
      />
    </SupabaseAuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  /** Web: kök yükseklik zinciri — ensureWebViewportRootStyle ile birlikte */
  rootWeb: {
    height: '100%',
    width: '100%',
  },
  stackContentWeb: {
    flex: 1,
    minHeight: '100%',
    height: '100%',
    width: '100%',
  },
});
