import React from 'react';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { devConfig } from '@/config/devConfig';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { getCurrentSession } from '@/services/authService';
import { AppSplashScreen } from '@/screens/AppSplashScreen';

SplashScreen.preventAutoHideAsync();

export default function SplashPage() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const navigate = async () => {
    if (devConfig.onboardingInitial) {
      router.replace('/(onboarding)');
      return;
    }

    const onboardingDone = mmkvStorage.getBoolean(STORAGE_KEYS.ONBOARDING_DONE);
    if (!onboardingDone) {
      router.replace('/(onboarding)');
      return;
    }
    const sessionResult = await getCurrentSession();
    if (sessionResult.ok && sessionResult.data) {
      router.push('/(tabs)');
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <AppSplashScreen fontsLoaded={fontsLoaded} onSplashFinished={navigate} />
  );
}
