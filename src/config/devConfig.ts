export const devConfig = {
  /** false = klasik FlatList onboarding; true = V2 deck (prod). */
  onboardingV2Enabled: true,
  onboardingV2BackgroundVariant: 'red' as 'red' | 'navy' | 'gradient',
  /** Sheet UI önizlemesi: null = gerçek NetInfo, 'offline' | 'online' = zorla göster */
  networkSheetPreview: null as null | 'offline' | 'online',
};
