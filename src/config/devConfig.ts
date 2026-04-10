export const devConfig = {
  onboardingInitial: false,
  welcomeInitial: true,
  onboardingV2Enabled: true,
  onboardingV2BackgroundVariant: 'red' as 'red' | 'navy' | 'gradient',
  /** Onboarding'de ag sheet UI onizlemesi: null = gercek NetInfo */
  networkSheetPreview: null as null | 'offline' | 'online',
} as const;
