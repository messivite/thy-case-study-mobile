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

import { store } from '@/store';
import { queryClient } from '@/services/queryClient';
import i18n from '@/i18n';
import '@/i18n'; // init side effect
import { SupabaseAuthProvider } from '@/hooks/useSupabaseAuth';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { initErrorReporting } from '@/services/errorReporting';

// Sentry native köprüsü her build'de bir kez init (DSN yok / dev'de enabled:false)
initErrorReporting();

function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider
        statusBarTranslucent={Platform.OS === 'android'}
        navigationBarTranslucent={Platform.OS === 'android'}
        preserveEdgeToEdge={Platform.OS === 'android'}
      >
      <AppErrorBoundary>
        <SafeAreaProvider>
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <I18nextProvider i18n={i18n}>
                {/* AuthProvider: Supabase listener + token refresh burada başlar */}
                <AuthProvider />
              </I18nextProvider>
            </QueryClientProvider>
          </Provider>
        </SafeAreaProvider>
      </AppErrorBoundary>
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
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
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
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="(tabs)"
          options={{
            // Tam ekran kök uygulama — welcome/auth sonrası modal sheet değil kart geçişi
            presentation: 'card',
            animation: 'default',
            gestureEnabled: true,
            contentStyle: { backgroundColor: '#FFFFFF' },
          }}
        />
        <Stack.Screen
          name="webview-modal"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.92],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
            gestureEnabled: true,
            // Opaque + flex: sheet içinde WebView / loader alanı doğru yükseklik alsın (transparent layout çökertiyordu)
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
});
