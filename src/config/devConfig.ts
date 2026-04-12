import type { OnboardingBackgroundVariant, NetworkPreview } from '@/types/ui.types';

export const devConfig = {
  onboardingV2BackgroundVariant: 'red' as OnboardingBackgroundVariant,
  /** Sheet UI önizlemesi: null = gerçek NetInfo, 'offline' | 'online' = zorla göster */
  networkSheetPreview: null as NetworkPreview,
};
