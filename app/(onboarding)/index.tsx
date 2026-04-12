import React, { useCallback, useMemo, useState, Suspense, lazy } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PostNavigationEnterFade } from '@/components/PostNavigationEnterFade';
import { NetworkConnectivitySheets } from '@/organisms/NetworkConnectivitySheets';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { useTheme } from '@/hooks/useTheme';

const OnboardingDeckV2Lazy = lazy(() =>
  import('@/organisms/OnboardingDeckV2').then((m) => ({ default: m.OnboardingDeckV2 })),
);

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [v2ActiveIndex, setV2ActiveIndex] = useState(0);

  const safeAreaStyle = useMemo(
    () => ({ flex: 1, backgroundColor: colors.background }),
    [colors.background],
  );

  const v2Fallback = useMemo(
    () => <SafeAreaView style={safeAreaStyle} />,
    [safeAreaStyle],
  );

  const handleComplete = useCallback(() => {
    mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
    router.replace('/(auth)/welcome');
  }, []);

  const handleSkip = useCallback(async () => {
    mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
    router.replace('/(auth)/welcome');
  }, []);

  return (
    <>
      <Suspense fallback={v2Fallback}>
        <PostNavigationEnterFade>
          <OnboardingDeckV2Lazy
            onComplete={handleComplete}
            onSkip={handleSkip}
            onActiveIndexChange={setV2ActiveIndex}
          />
        </PostNavigationEnterFade>
      </Suspense>
      <NetworkConnectivitySheets enabled={v2ActiveIndex === 0} />
    </>
  );
}
