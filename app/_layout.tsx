import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'sonner-native';
import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { store } from '@/store';
import { queryClient } from '@/services/queryClient';
import i18n from '@/i18n';
import '@/i18n'; // init side effect
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { initErrorReporting, Sentry } from '@/services/errorReporting';

// Sentry'yi app yuklenirken baslat
initErrorReporting();

function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
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
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

/**
 * Store'a erişmek için Provider'ın içine alınmış ayrı component.
 * useSupabaseAuth bir kez mount edilir, tüm uygulama boyunca yaşar.
 */
function AuthProvider() {
  // Auth state listener + token refresh — side effects burada
  useSupabaseAuth();

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toaster
        position="top-center"
        offset={60}
        visibleToasts={3}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
