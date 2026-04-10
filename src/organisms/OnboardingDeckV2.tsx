/**
 * OnboardingDeckV2
 *
 * Reanimated scroll-driven animasyon:
 * - Scroll offset shared value olarak okunur (UI thread, JS bridge yok)
 * - Her kart kendi scale/opacity/translateY'ını offset'e göre sürekli hesaplar
 * - Parmak hareketi ile tamamen senkron, gecikme sıfır
 * - Button ile geçişte spring easing (daha canlı)
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { DESIGN_BASE_WIDTH } from '@/lib/responsive';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
  slideWidth: number;
  inactiveTranslateY: number;
}>(({ slide, index, scrollX, slideWidth, inactiveTranslateY }) => {
  const { t } = useI18n();

  /** Web: ilk layout’ta slideWidth 0 → scrollX/0 NaN, kart görünmez/bozuk */
  const slideW = useSharedValue(Math.max(slideWidth, 1));
  useEffect(() => {
    slideW.value = Math.max(slideWidth, 1);
  }, [slideWidth, slideW]);

  const animStyle = useAnimatedStyle(() => {
    const w = slideW.value;
    // Bu kartın merkezi ile scroll pozisyonu arasındaki fark (-1 .. 0 .. 1)
    const offset = (scrollX.value / w) - index;

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
      [inactiveTranslateY, 0, inactiveTranslateY],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale: sc }, { translateY: ty }],
      opacity: op,
    };
  });

  return (
    <Animated.View
      style={[
        mainStyles.slideWrapper,
        Platform.OS === 'web' && mainStyles.slideWrapperWeb,
        { width: slideWidth },
        animStyle,
      ]}
    >
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

const BgCircles = memo<{ deckScale: (n: number) => number }>(({ deckScale }) => {
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

  const c1 = useMemo(
    () => ({
      width: deckScale(260),
      height: deckScale(260),
      top: -deckScale(50),
      right: -deckScale(50),
      opacity: 0.35,
    }),
    [deckScale],
  );
  const c2 = useMemo(
    () => ({
      width: deckScale(160),
      height: deckScale(160),
      top: deckScale(30),
      left: -deckScale(60),
      opacity: 0.28,
    }),
    [deckScale],
  );
  const c3 = useMemo(
    () => ({
      width: deckScale(100),
      height: deckScale(100),
      top: deckScale(120),
      right: deckScale(20),
      opacity: 0.22,
    }),
    [deckScale],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[circleStyles.base, c1, s1]} />
      <Animated.View style={[circleStyles.base, c2, s2]} />
      <Animated.View style={[circleStyles.base, c3, s3]} />
    </View>
  );
});

const circleStyles = StyleSheet.create({
  base: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGINATION_TIMING = {
  duration: 320,
  easing: Easing.inOut(Easing.cubic),
} as const;

const PaginationDot = memo<{
  isActive: boolean;
  dotNarrow: number;
  dotWide: number;
  dotHeight: number;
}>(({ isActive, dotNarrow, dotWide, dotHeight }) => {
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
      [dotNarrow, dotWide],
    );
    const bg = interpolateColor(
      progress.value,
      [0, 1],
      [palette.onboardingDotInactive, palette.onboardingActiveDot],
    );
    return { width: w, backgroundColor: bg };
  });

  return (
    <Animated.View style={[paginStyles.dot, { height: dotHeight }, dotAnim]} />
  );
});

const Pagination = memo<{
  total: number;
  activeIndex: number;
  dotNarrow: number;
  dotWide: number;
  dotHeight: number;
}>(({ total, activeIndex, dotNarrow, dotWide, dotHeight }) => (
  <View style={paginStyles.row}>
    {Array.from({ length: total }).map((_, i) => (
      <PaginationDot
        key={i}
        isActive={i === activeIndex}
        dotNarrow={dotNarrow}
        dotWide={dotWide}
        dotHeight={dotHeight}
      />
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
    borderRadius: 999,
  },
});

// ---------------------------------------------------------------------------
// Back button
// ---------------------------------------------------------------------------

const BackCircleButton = memo<{ onPress: () => void; deckScale: (n: number) => number }>(
  ({ onPress, deckScale }) => {
    const haptics = useHaptics();
    const handlePress = useCallback(() => {
      haptics.light();
      onPress();
    }, [haptics, onPress]);
    const size = deckScale(52);
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <LinearGradient
          colors={[palette.primary, palette.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[backBtnStyles.circle, { width: size, height: size }]}
        >
          <Ionicons name="arrow-back" size={deckScale(22)} color={palette.white} />
        </LinearGradient>
      </TouchableOpacity>
    );
  },
);

const backBtnStyles = StyleSheet.create({
  circle: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const BackButtonFade = memo<{
  isFirst: boolean;
  onBack: () => void;
  deckScale: (n: number) => number;
}>(({ isFirst, onBack, deckScale }) => {
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
      <BackCircleButton onPress={onBack} deckScale={deckScale} />
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
  deckScale: (n: number) => number;
}>(({ activeIndex, onNext, onBack, deckScale }) => {
  const { t } = useI18n();
  const isLast = activeIndex === TOTAL_SLIDES - 1;
  const isFirst = activeIndex === 0;

  const primaryCtaTitle = useMemo(
    () => (isLast ? t('onboarding.getStarted') : t('onboarding.nextDestination')),
    [isLast, t],
  );

  return (
    <View style={bottomStyles.container}>
      <View style={bottomStyles.buttonRow}>
        <BackButtonFade isFirst={isFirst} onBack={onBack} deckScale={deckScale} />
        <GradientButton
          title={primaryCtaTitle}
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
  /** Slayt değişince (ör. ağ sheet’i sadece 1. slaytta) */
  onActiveIndexChange?: (index: number) => void;
}

export const OnboardingDeckV2: React.FC<OnboardingDeckV2Props> = ({
  onComplete,
  onSkip,
  onActiveIndexChange,
}) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const effectiveWinW = windowWidth > 0 ? windowWidth : DESIGN_BASE_WIDTH;
  const slideWidth =
    Platform.OS === 'web'
      ? Math.max(1, Math.min(effectiveWinW, DESIGN_BASE_WIDTH))
      : Math.max(windowWidth, 1);

  /** Web’de ilk frame’de 0 olabiliyor */
  const viewportH = windowHeight > 0 ? windowHeight : 800;

  const webCardAreaMinHeight = useMemo(
    () =>
      Platform.OS === 'web'
        ? Math.max(viewportH * 0.38, 280)
        : undefined,
    [viewportH],
  );

  const deckScale = useMemo(
    () => (n: number) => Math.round((slideWidth / DESIGN_BASE_WIDTH) * n),
    [slideWidth],
  );

  const inactiveTranslateY = useMemo(() => deckScale(20), [deckScale]);
  const dotNarrow = useMemo(() => deckScale(10), [deckScale]);
  const dotWide = useMemo(() => deckScale(40), [deckScale]);
  const dotHeight = useMemo(() => deckScale(10), [deckScale]);

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

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
      const sw = Math.max(slideWidth, 1);
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / sw);
      setActiveIndex(newIndex);
    },
    [slideWidth],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const sw = Math.max(slideWidth, 1);
      const x = index * sw;
      /**
       * Web: `animated: true` + programatik scroll sonrası çoğu zaman
       * `onMomentumScrollEnd` tetiklenmez → activeIndex sadece oradan güncellenince akış kitlenir.
       * Ayrıca Reanimated onScroll bazen eksik kalır; scrollX aynı tick’te senkronlanır.
       */
      scrollRef.current?.scrollTo({
        x,
        animated: Platform.OS !== 'web',
      });
      if (Platform.OS === 'web') {
        scrollX.value = x;
      }
    },
    [slideWidth, scrollX],
  );

  const handleNext = useCallback(() => {
    if (activeIndex >= TOTAL_SLIDES - 1) {
      onComplete();
      return;
    }
    const next = activeIndex + 1;
    scrollToIndex(next);
    setActiveIndex(next);
  }, [activeIndex, onComplete, scrollToIndex]);

  const handleBack = useCallback(() => {
    if (activeIndex <= 0) return;
    const prev = activeIndex - 1;
    scrollToIndex(prev);
    setActiveIndex(prev);
  }, [activeIndex, scrollToIndex]);

  const rootWebLayout: ViewStyle | undefined =
    Platform.OS === 'web'
      ? ({
          minHeight: viewportH,
          height: viewportH,
        } as ViewStyle)
      : undefined;

  const safeAreaStyle: StyleProp<ViewStyle> = useMemo(() => {
    if (Platform.OS === 'web') {
      return [
        mainStyles.safe,
        mainStyles.safeWeb,
        {
          paddingTop: insets.top + spacing[4],
          flex: 1,
          minHeight: 0,
          height: '100%',
        },
      ];
    }
    return mainStyles.safe;
  }, [insets.top]);

  const MainColumn = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <View style={[mainStyles.root, rootWebLayout]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={palette.onboardingGradient}
        locations={palette.onboardingGradientLocations}
        style={mainStyles.gradient}
      />

      <BgCircles deckScale={deckScale} />

      <MainColumn style={safeAreaStyle}>
        {/* Header tam genişlik — web’de gradient / arka plan yanlara yayılır */}
        <View style={mainStyles.header}>
          <View style={mainStyles.logoAbsolute}>
            <View style={mainStyles.logoBox}>
              <Logo width={deckScale(100)} />
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

        {/* Sadece deck + alt CTA dar sütunda (mobil genişliği); native’de %100 */}
        <View style={[mainStyles.deckOuter, Platform.OS === 'web' && mainStyles.deckOuterWeb]}>
          <View style={[mainStyles.deckInner, Platform.OS === 'web' && mainStyles.deckInnerWeb]}>
            <View
              style={[
                mainStyles.deckWithDots,
                Platform.OS === 'web' && mainStyles.deckWithDotsWeb,
              ]}
            >
              <View
                style={[
                  mainStyles.cardArea,
                  Platform.OS === 'web' && mainStyles.cardAreaWeb,
                  Platform.OS === 'web' &&
                    webCardAreaMinHeight != null && { minHeight: webCardAreaMinHeight },
                ]}
              >
                <Animated.ScrollView
                  ref={scrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  bounces={false}
                  scrollEventThrottle={1}
                  onScroll={scrollHandler}
                  onMomentumScrollEnd={handleMomentumEnd}
                  style={[mainStyles.scrollView, Platform.OS === 'web' && mainStyles.scrollViewWeb]}
                  contentContainerStyle={[
                    mainStyles.scrollContent,
                    Platform.OS === 'web' && mainStyles.scrollContentWeb,
                  ]}
                >
                  {V2_SLIDES.map((slide, i) => (
                    <SlideCard
                      key={i}
                      slide={slide}
                      index={i}
                      scrollX={scrollX}
                      slideWidth={slideWidth}
                      inactiveTranslateY={inactiveTranslateY}
                    />
                  ))}
                </Animated.ScrollView>
              </View>
              <View style={mainStyles.paginationStrip}>
                <Pagination
                  total={TOTAL_SLIDES}
                  activeIndex={activeIndex}
                  dotNarrow={dotNarrow}
                  dotWide={dotWide}
                  dotHeight={dotHeight}
                />
              </View>
            </View>

            <BottomSection
              activeIndex={activeIndex}
              onNext={handleNext}
              onBack={handleBack}
              deckScale={deckScale}
            />
          </View>
        </View>
      </MainColumn>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const mainStyles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
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
    width: '100%',
  },
  safeWeb: {
    // Web flex: alt zincirde ScrollView yüksekliği için (min-height:auto tuzakları)
    minHeight: 0,
  },
  deckOuter: {
    flex: 1,
    width: '100%',
  },
  /** alignItems:center kullanma — web’de çocuklar shrink-to-fit olup flex zinciri kırılıyor */
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
  deckWithDotsWeb: {
    minHeight: 0,
  },
  cardAreaWeb: {
    minHeight: 0,
  },
  scrollViewWeb: {
    minHeight: 0,
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
  /** Web: yatay ScrollView + flex-end kombinasyonu kartı/overlay’ı bozabiliyor */
  slideWrapperWeb: {
    justifyContent: 'center',
  },
  scrollContentWeb: {
    alignItems: 'stretch',
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
