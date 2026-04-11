import React, { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { getCurrentSession } from '@/services/authService';
import { AppSplashScreen } from '@/screens/AppSplashScreen';

SplashScreen.preventAutoHideAsync();

/**
 * Splash cikisi ile router.replace ayni frame'de olunca onboarding bazen bir kez "zipliyor".
 * runAfterInteractions + cift rAF: native layout / navigator birkaç frame otursun diye.
 */
function schedulePostSplashNavigation(action: () => void) {
  InteractionManager.runAfterInteractions(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(action);
    });
  });
}

export default function SplashPage() {
  // Session sorgusunu splash animasyonu baslarken paralel baslat - animasyon bitince sonuc hazir
  const sessionResultRef = useRef<ReturnType<typeof getCurrentSession> | null>(null);

  useEffect(() => {
    const onboardingDone = mmkvStorage.getBoolean(STORAGE_KEYS.ONBOARDING_DONE);
    if (onboardingDone) {
      sessionResultRef.current = getCurrentSession();
    }
  }, []);

  const navigate = async () => {
    const onboardingDone = mmkvStorage.getBoolean(STORAGE_KEYS.ONBOARDING_DONE);
    if (!onboardingDone) {
      schedulePostSplashNavigation(() => router.replace('/(onboarding)'));
      return;
    }
    // Sorgu zaten baslamis, sadece await et (cogu zaman aninda doner)
    const sessionResult = await (sessionResultRef.current ?? getCurrentSession());
    if (sessionResult.ok && sessionResult.data) {
      schedulePostSplashNavigation(() => router.replace('/(tabs)'));
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <AppSplashScreen fontsLoaded onSplashFinished={navigate} />
  );
}
