import { fontScale } from '@/lib/responsive';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const fontSize = {
  xs:   fontScale(11),
  sm:   fontScale(13),
  base: fontScale(15),
  md:   fontScale(17),
  lg:   fontScale(19),
  xl:   fontScale(22),
  '2xl': fontScale(26),
  '3xl': fontScale(30),
  '4xl': fontScale(36),
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export const textVariants = {
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: Math.round(fontSize['3xl'] * lineHeight.tight),
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: Math.round(fontSize['2xl'] * lineHeight.tight),
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeight.tight),
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: Math.round(fontSize.lg * lineHeight.normal),
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.normal),
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeight.normal),
  },
  micro: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeight.normal),
  },
} as const;
