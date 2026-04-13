import type { OnboardingBackgroundVariant, NetworkPreview } from '@/types/ui.types';

export const devConfig = {
  onboardingV2BackgroundVariant: 'red' as OnboardingBackgroundVariant,
  /** Sheet UI önizlemesi: null = gerçek NetInfo, 'offline' | 'online' = zorla göster */
  networkSheetPreview: null as NetworkPreview,
  /**
   * App açılışında queue'ya bak ve pending item varsa sync sheet'i göster.
   * Network detection'ın tamamlanması için gereken bekleme süresi (ms).
   */
  promptOnMountDelayMs: 800,
  /** true: ONBOARDING_DONE flag'ini yok say → her açılışta onboarding'e git (test için) */
  forceOnboarding: false,
};
