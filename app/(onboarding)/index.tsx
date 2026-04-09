import React, { useRef, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { View, StyleSheet, FlatList, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Button } from '@/atoms/Button';
import { TextButton } from '@/atoms/TextButton';
import { Logo } from '@/atoms/Logo';
import { OnboardingSlide, ONBOARDING_SLIDES } from '@/organisms/OnboardingSlide';
import { OnboardingProgress } from '@/molecules/OnboardingDot';
import { devConfig } from '@/config/devConfig';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { palette } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { scale, verticalScale } from '@/lib/responsive';
import { fontSize, fontFamily } from '@/constants/typography';

/** V2 ayrı async chunk — kapalıyken Moti/Deck native bundle'a hiç girmez (SIGABRT riski). */
const OnboardingDeckV2Lazy = lazy(() =>
  import('@/organisms/OnboardingDeckV2').then((m) => ({ default: m.OnboardingDeckV2 })),
);

// ---------------------------------------------------------------------------
// Animated background circle
// ---------------------------------------------------------------------------

interface BgCircleProps {
  size: number;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  opacity: number;
  duration: number;
  delay?: number;
}

const BgCircle: React.FC<BgCircleProps> = ({
  size, top, bottom, left, right, opacity, duration, delay = 0,
}) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(pulse);
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bgCircle,
        { width: size, height: size, borderRadius: size / 2, top, bottom, left, right } as ViewStyle,
        animStyle,
      ]}
    />
  );
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { skipWithAnonymousLogin } = useSupabaseAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const isLast = activeIndex === ONBOARDING_SLIDES.length - 1;

  const handleComplete = useCallback(() => {
    mmkvStorage.setBoolean(STORAGE_KEYS.ONBOARDING_DONE, true);
    router.replace('/(auth)/welcome');
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleComplete();
    } else {
      const next = activeIndex + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  }, [activeIndex, isLast, handleComplete]);

  const isNavigatingRef = useRef(false);
  const handleSkip = useCallback(async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    try {
      await skipWithAnonymousLogin();
      router.push('/(tabs)');
    } catch {
      isNavigatingRef.current = false;
    }
  }, [skipWithAnonymousLogin]);

  if (devConfig.onboardingV2Enabled) {
    return (
      <Suspense
        fallback={
          <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} />
        }
      >
        <OnboardingDeckV2Lazy onComplete={handleComplete} onSkip={handleSkip} />
      </Suspense>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* Animated background circles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BgCircle
          size={scale(200)}
          top={-scale(40)}
          right={-scale(50)}
          opacity={0.045}
          duration={3600}
          delay={0}
        />
        <BgCircle
          size={scale(140)}
          bottom={verticalScale(100)}
          left={-scale(30)}
          opacity={0.035}
          duration={4200}
          delay={800}
        />
      </View>

      {/* Logo — ortada, üstte */}
      <View style={styles.logoWrap}>
        <Logo width={150} />
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <OnboardingSlide slide={item} index={index} isActive={index === activeIndex} />
        )}
        style={{ flex: 1 }}
      />

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Segment progress */}
        <View style={styles.progressWrap}>
          <OnboardingProgress
            activeIndex={activeIndex}
            total={ONBOARDING_SLIDES.length}
          />
        </View>

        {/* Next / Get Started */}
        <Button
          title={isLast ? t('onboarding.getStarted') : t('common.next')}
          onPress={handleNext}
          fullWidth
        />

        {/* Skip — Next'in altında, text olarak */}
        <TextButton
          title={t('onboarding.skipAndContinue')}
          color={colors.textSecondary}
          onPress={handleSkip}
          hapticType="selection"
          style={styles.skipBtn}
          textStyle={styles.skipText}
          hitSlop={{ top: 8, bottom: 8, left: 24, right: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  bottom: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[3],
    alignItems: 'center',
  },
  progressWrap: {
    width: '100%',
    paddingHorizontal: spacing[1],
    marginBottom: spacing[1],
  },
  skipBtn: {
    marginTop: spacing[1],  // Next butonuna 10px boşluk
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    letterSpacing: 0.1,
  },
  bgCircle: {
    position: 'absolute',
    backgroundColor: palette.primary,
  },
});
