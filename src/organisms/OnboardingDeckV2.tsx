/**
 * OnboardingDeckV2
 *
 * Reanimated scroll-driven animasyon:
 * - Scroll offset shared value olarak okunur (UI thread, JS bridge yok)
 * - Her kart kendi scale/opacity/translateY'ını offset'e göre sürekli hesaplar
 * - Parmak hareketi ile tamamen senkron, gecikme sıfır
 * - Button ile geçişte spring easing (daha canlı)
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/atoms/Logo';
import { GradientButton } from '@/atoms/GradientButton';
import { TextButton } from '@/atoms/TextButton';
import { ModelPickerCard } from '@/molecules/ModelPickerCard';
import { useI18n } from '@/hooks/useI18n';
import { useHaptics } from '@/hooks/useHaptics';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { scale } from '@/lib/responsive';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: W } = Dimensions.get('window');
/** JS thread'de hesaplanır — useAnimatedStyle worklet içinde scale() çağrılamaz (native crash). */
const SLIDE_INACTIVE_TRANSLATE_Y = scale(20);
const PAGINATION_DOT_NARROW = scale(10);
const PAGINATION_DOT_WIDE = scale(40);
const TOTAL_SLIDES = 4;

// ---------------------------------------------------------------------------
// Slide Data
// ---------------------------------------------------------------------------

type IconDef = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bgColor: string;
  size?: number;
};

type V2Slide = {
  titleKey: string;
  descKey: string;
  mainIcon: IconDef;
  overlayIcons: [IconDef, IconDef];
  selectorLabelKey: string;
  selectorDotColor: string;
};

const V2_SLIDES: V2Slide[] = [
  {
    titleKey: 'onboarding.v2Slide1Title',
    descKey: 'onboarding.v2Slide1Desc',
    mainIcon: { name: 'airplane', color: palette.white, bgColor: '#C0102A', size: 28 },
    overlayIcons: [
      { name: 'flash', color: '#1A73E8', bgColor: '#DBEAFE', size: 16 },
      { name: 'sparkles', color: '#D946EF', bgColor: '#FAE8FF', size: 16 },
    ],
    selectorLabelKey: 'onboarding.v2Label1',
    selectorDotColor: palette.primary,
  },
  {
    titleKey: 'onboarding.v2Slide2Title',
    descKey: 'onboarding.v2Slide2Desc',
    mainIcon: { name: 'layers', color: palette.white, bgColor: '#1E293B', size: 28 },
    overlayIcons: [
      { name: 'flash', color: '#1A73E8', bgColor: '#DBEAFE', size: 16 },
      { name: 'sparkles', color: '#D946EF', bgColor: '#FAE8FF', size: 16 },
    ],
    selectorLabelKey: 'onboarding.v2Label2',
    selectorDotColor: palette.primary,
  },
  {
    titleKey: 'onboarding.v2Slide3Title',
    descKey: 'onboarding.v2Slide3Desc',
    mainIcon: { name: 'wifi', color: palette.white, bgColor: '#0891B2', size: 28 },
    overlayIcons: [
      { name: 'cloud', color: '#10A37F', bgColor: '#D1FAE5', size: 16 },
      { name: 'phone-portrait-outline', color: '#7C3AED', bgColor: '#EDE9FE', size: 16 },
    ],
    selectorLabelKey: 'onboarding.v2Label3',
    selectorDotColor: '#10A37F',
  },
  {
    titleKey: 'onboarding.v2Slide4Title',
    descKey: 'onboarding.v2Slide4Desc',
    mainIcon: { name: 'sparkles', color: palette.white, bgColor: '#7C3AED', size: 28 },
    overlayIcons: [
      { name: 'bulb-outline', color: '#D97706', bgColor: '#FEF3C7', size: 16 },
      { name: 'rocket-outline', color: '#1A73E8', bgColor: '#EBF3FD', size: 16 },
    ],
    selectorLabelKey: 'onboarding.v2Label4',
    selectorDotColor: '#7C3AED',
  },
];

// ---------------------------------------------------------------------------
// SlideCard — scroll offset'e göre real-time UI thread animasyonu
// ---------------------------------------------------------------------------

const SlideCard = memo<{
  slide: V2Slide;
  index: number;
  scrollX: ReturnType<typeof useSharedValue<number>>;
}>(({ slide, index, scrollX }) => {
  const { t } = useI18n();

  const animStyle = useAnimatedStyle(() => {
    // Bu kartın merkezi ile scroll pozisyonu arasındaki fark (-1 .. 0 .. 1)
    const offset = (scrollX.value / W) - index;

    // Scale: aktifken 1.0, uzaklaştıkça 0.88
    const sc = interpolate(
      offset,
      [-1, 0, 1],
      [0.88, 1.0, 0.88],
      Extrapolation.CLAMP,
    );

    // Opacity: aktifken 1, uzaklaştıkça 0.45
    const op = interpolate(
      offset,
      [-1, 0, 1],
      [0.45, 1.0, 0.45],
      Extrapolation.CLAMP,
    );

    // translateY: aktifken 0, uzaklaştıkça hafif aşağı (bubble efekti)
    const ty = interpolate(
      offset,
      [-1, 0, 1],
      [SLIDE_INACTIVE_TRANSLATE_Y, 0, SLIDE_INACTIVE_TRANSLATE_Y],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale: sc }, { translateY: ty }],
      opacity: op,
    };
  });

  return (
    <Animated.View style={[mainStyles.slideWrapper, animStyle]}>
      <ModelPickerCard
        title={t(slide.titleKey)}
        description={t(slide.descKey)}
        mainIcon={slide.mainIcon}
        overlayIcons={slide.overlayIcons}
        selectorLabel={t(slide.selectorLabelKey)}
        selectorDotColor={slide.selectorDotColor}
        showSelectorChevrons={index === 1}
        selectorLeading={index === 1 ? 'ai' : 'pulse'}
      />
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// BgCircles — sabit, sadece ilk mount'ta oluşur
// ---------------------------------------------------------------------------

const BgCircles = memo(() => {
  const p1 = useSharedValue(1);
  const p2 = useSharedValue(1);
  const p3 = useSharedValue(1);

  useEffect(() => {
    const t1 = setTimeout(() => {
      p1.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      );
    }, 50);
    const t2 = setTimeout(() => {
      p2.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      );
    }, 950);
    const t3 = setTimeout(() => {
      p3.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      );
    }, 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      cancelAnimation(p1);
      cancelAnimation(p2);
      cancelAnimation(p3);
    };
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ scale: p1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ scale: p2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ scale: p3.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[circleStyles.base, circleStyles.c1, s1]} />
      <Animated.View style={[circleStyles.base, circleStyles.c2, s2]} />
      <Animated.View style={[circleStyles.base, circleStyles.c3, s3]} />
    </View>
  );
});

const circleStyles = StyleSheet.create({
  base: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  c1: { width: scale(260), height: scale(260), top: -scale(50), right: -scale(50), opacity: 0.35 },
  c2: { width: scale(160), height: scale(160), top: scale(30), left: -scale(60), opacity: 0.28 },
  c3: { width: scale(100), height: scale(100), top: scale(120), right: scale(20), opacity: 0.22 },
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGINATION_TIMING = {
  duration: 320,
  easing: Easing.inOut(Easing.cubic),
} as const;

const PaginationDot = memo<{ isActive: boolean }>(({ isActive }) => {
  const progress = useSharedValue(isActive ? 1 : 0);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    progress.value = withTiming(isActive ? 1 : 0, PAGINATION_TIMING);
    return () => {
      cancelAnimation(progress);
    };
  }, [isActive]);

  const dotAnim = useAnimatedStyle(() => {
    const w = interpolate(
      progress.value,
      [0, 1],
      [PAGINATION_DOT_NARROW, PAGINATION_DOT_WIDE],
    );
    const bg = interpolateColor(
      progress.value,
      [0, 1],
      [palette.onboardingDotInactive, palette.onboardingActiveDot],
    );
    return { width: w, backgroundColor: bg };
  });

  return <Animated.View style={[paginStyles.dot, dotAnim]} />;
});

const Pagination = memo<{ total: number; activeIndex: number }>(({ total, activeIndex }) => (
  <View style={paginStyles.row}>
    {Array.from({ length: total }).map((_, i) => (
      <PaginationDot key={i} isActive={i === activeIndex} />
    ))}
  </View>
));

const paginStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dot: {
    height: scale(10),
    borderRadius: 999,
  },
});

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------

const BackCircleButton = memo<{ onPress: () => void }>(({ onPress }) => {
  const haptics = useHaptics();
  return (
    <TouchableOpacity onPress={() => { haptics.light(); onPress(); }} activeOpacity={0.85}>
      <LinearGradient
        colors={[palette.primary, palette.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={backBtnStyles.circle}
      >
        <Ionicons name="arrow-back" size={scale(22)} color={palette.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
});

const backBtnStyles = StyleSheet.create({
  circle: {
    width: scale(52),
    height: scale(52),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const BackButtonFade = memo<{ isFirst: boolean; onBack: () => void }>(({ isFirst, onBack }) => {
  const opacity = useSharedValue(isFirst ? 0 : 1);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return; }
    opacity.value = withTiming(isFirst ? 0 : 1, { duration: 200 });
    return () => { cancelAnimation(opacity); };
  }, [isFirst]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[fadeStyle, isFirst ? bottomStyles.backDisabled : undefined]}>
      <BackCircleButton onPress={onBack} />
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// BottomSection
// ---------------------------------------------------------------------------

const BottomSection = memo<{
  activeIndex: number;
  onNext: () => void;
  onBack: () => void;
}>(({ activeIndex, onNext, onBack }) => {
  const { t } = useI18n();
  const isLast = activeIndex === TOTAL_SLIDES - 1;
  const isFirst = activeIndex === 0;

  return (
    <View style={bottomStyles.container}>
      <View style={bottomStyles.buttonRow}>
        <BackButtonFade isFirst={isFirst} onBack={onBack} />
        <GradientButton
          title={isLast ? t('onboarding.getStarted') : t('onboarding.nextDestination')}
          onPress={onNext}
          colors={[palette.primary, palette.primaryDark]}
          showArrow
        />
      </View>
    </View>
  );
});

const bottomStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    alignItems: 'stretch',
    backgroundColor: 'transparent',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backDisabled: {
    pointerEvents: 'none',
  },
});

// ---------------------------------------------------------------------------
// Props & Main
// ---------------------------------------------------------------------------

export interface OnboardingDeckV2Props {
  onComplete: () => void;
  onSkip: () => Promise<void>;
  variant?: 'red' | 'navy' | 'gradient';
}

export const OnboardingDeckV2: React.FC<OnboardingDeckV2Props> = ({
  onComplete,
  onSkip,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  // Scroll offset — UI thread'de canlı, JS bridge yok
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  // Momentum bitti — JS tarafı sadece activeIndex'i günceller (pagination/buton için)
  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / W);
      setActiveIndex(newIndex);
    },
    [],
  );

  const scrollToIndex = useCallback((index: number) => {
    // Button ile geçişte programatik scroll — paging zaten smooth yapar
    scrollRef.current?.scrollTo({ x: index * W, animated: true });
  }, []);

  const handleNext = useCallback(() => {
    if (activeIndex >= TOTAL_SLIDES - 1) {
      onComplete();
    } else {
      scrollToIndex(activeIndex + 1);
    }
  }, [activeIndex, onComplete, scrollToIndex]);

  const handleBack = useCallback(() => {
    if (activeIndex > 0) {
      scrollToIndex(activeIndex - 1);
    }
  }, [activeIndex, scrollToIndex]);

  return (
    <View style={mainStyles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={[...palette.onboardingGradient]}
        locations={[...palette.onboardingGradientLocations]}
        style={mainStyles.gradient}
      />

      <BgCircles />

      <SafeAreaView style={mainStyles.safe}>
        {/* Header */}
        <View style={mainStyles.header}>
          <View style={mainStyles.logoAbsolute}>
            <View style={mainStyles.logoBox}>
              <Logo width={scale(100)} />
            </View>
          </View>
          <View style={mainStyles.headerRight}>
            <TextButton
              title="SKIP"
              color="rgba(255,255,255,0.95)"
              onPress={onSkip}
              hapticType="selection"
              textStyle={mainStyles.skipText}
            />
          </View>
        </View>

        {/* Kart + pagination — altta 20px ile butonlardan ayrılır */}
        <View style={mainStyles.deckWithDots}>
          <View style={mainStyles.cardArea}>
            <Animated.ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              scrollEventThrottle={1}
              onScroll={scrollHandler}
              onMomentumScrollEnd={handleMomentumEnd}
              style={mainStyles.scrollView}
              contentContainerStyle={mainStyles.scrollContent}
            >
              {V2_SLIDES.map((slide, i) => (
                <SlideCard
                  key={i}
                  slide={slide}
                  index={i}
                  scrollX={scrollX}
                />
              ))}
            </Animated.ScrollView>
          </View>
          <View style={mainStyles.paginationStrip}>
            <Pagination total={TOTAL_SLIDES} activeIndex={activeIndex} />
          </View>
        </View>

        <BottomSection
          activeIndex={activeIndex}
          onNext={handleNext}
          onBack={handleBack}
        />
      </SafeAreaView>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const mainStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.onboardingBg,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '92%',
  },
  safe: {
    flex: 1,
  },
  logoBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  deckWithDots: {
    flex: 1,
  },
  cardArea: {
    flex: 1,
  },
  paginationStrip: {
    paddingTop: 10,
    paddingBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'flex-end',
  },
  // Tam yükseklik + alta hizalı — kart 2 satır başlıkta yukarı doğru büyür
  slideWrapper: {
    width: W,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  logoAbsolute: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    zIndex: 1,
  },
  skipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: 1.4,
  },
});
