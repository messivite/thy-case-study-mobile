import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  memo,
  Suspense,
  lazy,
} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  useWindowDimensions,
  type ListRenderItemInfo,
  type ViewStyle,
} from 'react-native';
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
import { PostNavigationEnterFade } from '@/components/PostNavigationEnterFade';
import { NetworkConnectivitySheets } from '@/organisms/NetworkConnectivitySheets';
import { Button } from '@/atoms/Button';
import { TextButton } from '@/atoms/TextButton';
import { Logo } from '@/atoms/Logo';
import {
  OnboardingSlide,
  ONBOARDING_SLIDES,
  type SlideData,
} from '@/organisms/OnboardingSlide';
import { OnboardingProgress } from '@/molecules/OnboardingDot';
import { devConfig } from '@/config/devConfig';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { palette } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { scale, verticalScale, DESIGN_BASE_WIDTH } from '@/lib/responsive';
import { fontSize, fontFamily } from '@/constants/typography';

/** V2 ayrı async chunk — kapalıyken Moti/Deck native bundle'a hiç girmez (SIGABRT riski). */
const OnboardingDeckV2Lazy = lazy(() =>
  import('@/organisms/OnboardingDeckV2').then((m) => ({ default: m.OnboardingDeckV2 })),
);

const SKIP_HIT_SLOP = { top: 8, bottom: 8, left: 24, right: 24 } as const;

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

const BgCircle = memo<BgCircleProps>(function BgCircle({
  size, top, bottom, left, right, opacity, duration, delay = 0,
}) {
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
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OnboardingScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const slidePageWidth =
    Platform.OS === 'web' ? Math.min(windowWidth, DESIGN_BASE_WIDTH) : windowWidth;

  const { colors } = useTheme();
  const { t } = useI18n();
  const { skipWithAnonymousLogin } = useSupabaseAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [v2ActiveIndex, setV2ActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const isLast = activeIndex === ONBOARDING_SLIDES.length - 1;

  const safeAreaStyle = useMemo(
    () => [styles.safe, { backgroundColor: colors.background }],
    [colors.background],
  );

  const flatListStyle = useMemo(
    () => [styles.flatListBase, Platform.OS === 'web' && styles.flatListWeb],
    [],
  );

  const nextButtonTitle = useMemo(
    () => (isLast ? t('onboarding.getStarted') : t('common.next')),
    [isLast, t],
  );

  const keyExtractor = useCallback((_: SlideData, i: number) => String(i), []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<SlideData> | null | undefined, index: number) => ({
      length: slidePageWidth,
      offset: slidePageWidth * index,
      index,
    }),
    [slidePageWidth],
  );

  const renderSlide = useCallback(
    ({ item, index }: ListRenderItemInfo<SlideData>) => (
      <OnboardingSlide
        slide={item}
        index={index}
        isActive={index === activeIndex}
        slideWidth={slidePageWidth}
      />
    ),
    [activeIndex, slidePageWidth],
  );

  const v2Fallback = useMemo(
    () => <SafeAreaView style={safeAreaStyle} />,
    [safeAreaStyle],
  );

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
      <>
        <Suspense fallback={v2Fallback}>
          <PostNavigationEnterFade>
            <OnboardingDeckV2Lazy
              onComplete={handleComplete}
              onSkip={handleSkip}
              onActiveIndexChange={setV2ActiveIndex}
            />
          </PostNavigationEnterFade>
        </Suspense>
        <NetworkConnectivitySheets enabled={v2ActiveIndex === 0} />
      </>
    );
  }

  return (
    <>
    <SafeAreaView
      style={[safeAreaStyle, Platform.OS === 'web' && styles.safeWeb]}
    >
      <PostNavigationEnterFade>
      <View style={[styles.screenFill, Platform.OS === 'web' && styles.screenFillWeb]}>
      {/* Animated background circles — tam genişlik */}
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

      <View style={[styles.deckOuter, Platform.OS === 'web' && styles.deckOuterWeb]}>
        <View style={[styles.deckInner, Platform.OS === 'web' && styles.deckInnerWeb]}>
          <FlatList
            ref={listRef}
            data={ONBOARDING_SLIDES}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            renderItem={renderSlide}
            style={flatListStyle}
            removeClippedSubviews={false}
          />

          <View style={styles.bottom}>
            <View style={styles.progressWrap}>
              <OnboardingProgress
                activeIndex={activeIndex}
                total={ONBOARDING_SLIDES.length}
              />
            </View>

            <Button title={nextButtonTitle} onPress={handleNext} fullWidth />

            <TextButton
              title={t('onboarding.skipAndContinue')}
              color={colors.textSecondary}
              onPress={handleSkip}
              hapticType="selection"
              style={styles.skipBtn}
              textStyle={styles.skipText}
              hitSlop={SKIP_HIT_SLOP}
            />
          </View>
        </View>
      </View>
      </View>
      </PostNavigationEnterFade>
    </SafeAreaView>
    <NetworkConnectivitySheets enabled={activeIndex === 0} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    width: '100%',
  },
  screenFill: {
    flex: 1,
    width: '100%',
  },
  screenFillWeb: {
    minHeight: 0,
  },
  safeWeb: {
    minHeight: 0,
  },
  deckOuter: {
    flex: 1,
    width: '100%',
  },
  deckOuterWeb: {
    minHeight: 0,
  },
  deckInner: {
    flex: 1,
    width: '100%',
  },
  deckInnerWeb: {
    maxWidth: DESIGN_BASE_WIDTH,
    alignSelf: 'center',
    minHeight: 0,
  },
  flatListBase: {
    flex: 1,
  },
  flatListWeb: {
    minHeight: 0,
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
