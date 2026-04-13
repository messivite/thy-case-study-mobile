import React, { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { NetworkConnectivitySheets } from '@/organisms/NetworkConnectivitySheets';
import { OnboardingDeckV2 } from '@/organisms/OnboardingDeckV2';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  usePageTitle(`${t('meta.onboarding')} | ${t('meta.suffix')}`);
  const [v2ActiveIndex, setV2ActiveIndex] = useState(0);

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
      <OnboardingDeckV2
        onComplete={handleComplete}
        onSkip={handleSkip}
        onActiveIndexChange={setV2ActiveIndex}
      />
      <NetworkConnectivitySheets enabled={v2ActiveIndex === 0} />
    </>
  );
}
