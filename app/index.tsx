import React, { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { getCurrentSession } from '@/services/authService';
import { AppSplashScreen } from '@/screens/AppSplashScreen';
import { devConfig } from '@/config/devConfig';

SplashScreen.preventAutoHideAsync();

/**
 * Splash fade-out animasyonu bitince (Reanimated worklet callback'inden) çağrılır.
 * Animasyon tamamlandıktan sonra tek bir rAF — navigator'ın o frame'e yerleşmesi için.
 */
function schedulePostSplashNavigation(action: () => void) {
  requestAnimationFrame(action);
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
    const onboardingDone = !devConfig.forceOnboarding && mmkvStorage.getBoolean(STORAGE_KEYS.ONBOARDING_DONE);
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
