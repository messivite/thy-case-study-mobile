export const devConfig = {
  onboardingInitial: true,
  onboardingV2Enabled: true,
  onboardingV2BackgroundVariant: 'red' as 'red' | 'navy' | 'gradient',
  /** Onboarding’de ağ sheet UI önizlemesi: null = gerçek NetInfo */
  networkSheetPreview: null as null | 'offline' | 'online',
} as const;
