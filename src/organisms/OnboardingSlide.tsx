import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { scale, verticalScale, screen } from '@/lib/responsive';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlideData = {
  titleKey: string;
  descKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

interface OnboardingSlideProps {
  slide: SlideData;
  index: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------

export const ONBOARDING_SLIDES: SlideData[] = [
  {
    titleKey: 'onboarding.slide1Title',
    descKey: 'onboarding.slide1Desc',
    icon: 'chatbubbles-outline',
    color: palette.primary,
  },
  {
    titleKey: 'onboarding.slide2Title',
    descKey: 'onboarding.slide2Desc',
    icon: 'layers-outline',
    color: palette.geminiBlue,
  },
  {
    titleKey: 'onboarding.slide3Title',
    descKey: 'onboarding.slide3Desc',
    icon: 'wifi-outline',
    color: palette.gptGreen,
  },
];

// ---------------------------------------------------------------------------
// Responsive constants
// ---------------------------------------------------------------------------

const ICON_WRAP_SIZE = scale(148);
const ICON_SIZE = scale(68);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ slide, isActive }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.slide}>
      <MotiView
        from={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1 : 0.9 }}
        transition={{ type: 'spring', damping: 18 }}
        style={[
          styles.iconWrap,
          {
            width: ICON_WRAP_SIZE,
            height: ICON_WRAP_SIZE,
          },
        ]}
      >
        <View style={[styles.iconInner, { backgroundColor: slide.color + '14' }]}>
          <Ionicons name={slide.icon} size={ICON_SIZE} color={slide.color} />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 350, delay: 100 }}
        style={styles.textWrap}
      >
        <Text variant="h2" align="center" style={styles.title}>
          {t(slide.titleKey)}
        </Text>
        <Text variant="body" align="center" color={colors.textSecondary} style={styles.desc}>
          {t(slide.descKey)}
        </Text>
      </MotiView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  slide: {
    width: screen.width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: verticalScale(32),
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: '100%',
    height: '100%',
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    marginBottom: verticalScale(10),
  },
  desc: {
    lineHeight: verticalScale(24),
    paddingHorizontal: spacing[2],
  },
});
