export const palette = {
  // THY Brand
  primary: '#E81932',
  primaryDark: '#C0102A',
  primaryLight: '#FF4D5E',

  // Navy
  navy: '#1A1A2E',
  navyLight: '#16213E',
  navyMid: '#0F3460',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F8F8F8',
  gray50: '#F5F5F5',
  gray100: '#EBEBEB',
  gray200: '#D6D6D6',
  gray300: '#BDBDBD',
  gray400: '#9E9E9E',
  gray500: '#757575',
  gray600: '#616161',
  gray700: '#424242',
  gray800: '#2E2E2E',
  gray900: '#1C1C1C',
  dark: '#121212',

  // Dark mode surfaces
  darkBg: '#0D0D1A',
  darkCard: '#1A1A2E',
  darkCardAlt: '#1E1E32',
  darkBorder: '#2A2A40',
  darkInput: '#16162A',

  // AI Model Colors
  geminiBlue: '#1A73E8',
  gptGreen: '#10A37F',
  claudeOrange: '#D97706',
  customPurple: '#7C3AED',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Onboarding V2
  onboardingActiveDot: '#E81932',       // always THY red — dark & light
  onboardingInactiveDot: 'rgba(255,255,255,0.75)',
  onboardingCardBg: '#F7F3EA',
  onboardingCardBorder: '#EAE6DA',

  // Onboarding V2 — Gradient
  onboardingGradient: [
    '#CC0E22',  // ust — THY kirmizi
    '#C20D20',  // kirmizi devam
    '#B8091A',  // koyu kirmizi (orta ust)
    '#D4546A',  // soft pembe-kirmizi gecis
    '#E8A0A8',  // pastel pembe
    '#F2D4D6',  // cok acik pembe
    '#FFFFFF',  // beyaz alt
  ] as readonly [string, string, string, string, string, string, string],
  onboardingGradientLocations: [0, 0.18, 0.42, 0.63, 0.78, 0.90, 1] as readonly [number, number, number, number, number, number, number],
  onboardingGradientHeight: '92%' as const,
  onboardingBg: '#FFFFFF',
  onboardingDotBorder: '#D1D5DB',
} as const;

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  inputBg: string;
  navBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  headerBg: string;
  card: string;
  shadow: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  background: palette.white,
  surface: palette.offWhite,
  surfaceAlt: palette.gray50,
  border: palette.gray200,
  text: palette.gray900,
  textSecondary: palette.gray500,
  textDisabled: palette.gray300,
  inputBg: palette.white,
  navBg: palette.white,
  tabBarBg: palette.white,
  tabBarBorder: palette.gray100,
  headerBg: palette.navy,
  card: palette.white,
  shadow: 'rgba(0,0,0,0.08)',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkColors: ThemeColors = {
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  background: palette.darkBg,
  surface: palette.darkCard,
  surfaceAlt: palette.darkCardAlt,
  border: palette.darkBorder,
  text: palette.white,
  textSecondary: palette.gray400,
  textDisabled: palette.gray600,
  inputBg: palette.darkInput,
  navBg: palette.darkCard,
  tabBarBg: palette.darkCard,
  tabBarBorder: palette.darkBorder,
  headerBg: palette.navy,
  card: palette.darkCard,
  shadow: 'rgba(0,0,0,0.3)',
  overlay: 'rgba(0,0,0,0.7)',
};
