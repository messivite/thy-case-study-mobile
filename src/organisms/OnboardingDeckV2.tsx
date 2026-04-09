/**
 * OnboardingDeckV2
 * Referans: krem kartlı, kırmızı gradient üst, bubble kart animasyonu
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

// Kırmızı koyu tonlar — 6 stop ile smooth geçiş, üst %60 kırmızı yoğun, alta krem
const BG_GRADIENTS = [
  ['#CC0E22', '#C20D20', '#A8091A', '#7A061280', '#C8906840', '#EDE8E0'],
  ['#A80818', '#9C0716', '#870512', '#62040E88', '#B8846040', '#E8E2D8'],
  ['#D4101F', '#C80E1C', '#B00B18', '#830A1478', '#CC8E6840', '#EAE5DC'],
  ['#8F0614', '#840512', '#72040F', '#54030C88', '#AC7E5A40', '#E5DFD5'],
] as const;

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
// Animated background — çapraz fade iki LinearGradient katmanı
// ---------------------------------------------------------------------------

const AnimatedBg: React.FC<{ activeIndex: number }> = ({ activeIndex }) => {
  const prevIndexRef = useRef(activeIndex);
  const anim = useSharedValue(1);

  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      anim.value = 0;
      anim.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      prevIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  const prevGrad = BG_GRADIENTS[prevIndexRef.current] ?? BG_GRADIENTS[0];
  const nextGrad = BG_GRADIENTS[activeIndex] ?? BG_GRADIENTS[0];

  const prevStyle = useAnimatedStyle(() => ({ opacity: 1 - anim.value }));
  const nextStyle = useAnimatedStyle(() => ({ opacity: anim.value }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, prevStyle]}>
        <LinearGradient
          colors={prevGrad}
          locations={[0, 0.18, 0.36, 0.54, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, nextStyle]}>
        <LinearGradient
          colors={nextGrad}
          locations={[0, 0.18, 0.36, 0.54, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Dekoratif daireler — üst kırmızı bölgede pulse — görünür opacity
// ---------------------------------------------------------------------------

const BgCircle: React.FC<{
  size: number; top?: number; right?: number; left?: number; bottom?: number;
  opacity: number; duration: number; delay?: number;
}> = ({ size, top, right, left, bottom, opacity, duration, delay = 0 }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    const t = setTimeout(() => {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, false,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.13)',
        top, right, left, bottom,
      }, style]}
    />
  );
};

// ---------------------------------------------------------------------------
// Pagination — aktif: palette.primary pill, pasifler küçük beyaz daire
// ---------------------------------------------------------------------------

const Pagination: React.FC<{ total: number; activeIndex: number }> = ({ total, activeIndex }) => (
  <View style={paginStyles.row}>
    {Array.from({ length: total }).map((_, i) => {
      const isActive = i === activeIndex;
      return (
        <MotiView
          key={i}
          animate={{
            width: isActive ? scale(40) : scale(10),
            backgroundColor: isActive ? palette.onboardingActiveDot : palette.onboardingInactiveDot,
          }}
          transition={{ type: 'timing', duration: 220 }}
          style={[
            { height: scale(10), borderRadius: 999 },
            !isActive && paginStyles.inactiveBorder,
          ]}
        />
      );
    })}
  </View>
);

const paginStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(7),
  },
  inactiveBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
});

// ---------------------------------------------------------------------------
// Back circle button — kırmızı gradient daire, ok ikonu
// ---------------------------------------------------------------------------

const BackCircleButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const haptics = useHaptics();

  return (
    <TouchableOpacity
      onPress={() => { haptics.light(); onPress(); }}
      activeOpacity={0.85}
    >
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
};

const backBtnStyles = StyleSheet.create({
  circle: {
    width: scale(52),
    height: scale(52),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});

// ---------------------------------------------------------------------------
// Slide Card — statik, animasyon üst katmanda yönetilir
// ---------------------------------------------------------------------------

const SlideCardContent: React.FC<{ slide: V2Slide }> = ({ slide }) => {
  const { t } = useI18n();

  return (
    <ModelPickerCard
      title={t(slide.titleKey)}
      description={t(slide.descKey)}
      mainIcon={slide.mainIcon}
      overlayIcons={slide.overlayIcons}
      selectorLabel={t(slide.selectorLabelKey)}
      selectorDotColor={slide.selectorDotColor}
    />
  );
};

// ---------------------------------------------------------------------------
// Swipe threshold
// ---------------------------------------------------------------------------

const SWIPE_THRESHOLD = W * 0.25;
const SWIPE_VELOCITY_THRESHOLD = 500;

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
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const isLast = activeIndex === V2_SLIDES.length - 1;
  const isFirst = activeIndex === 0;

  // Shared value that tracks horizontal pan offset
  const translateX = useSharedValue(0);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    translateX.value = 0;
  }, []);

  const handleNext = useCallback(() => {
    if (isLast) onComplete();
    else goTo(activeIndex + 1);
  }, [isLast, activeIndex, onComplete, goTo]);

  const handleBack = useCallback(() => {
    if (!isFirst) goTo(activeIndex - 1);
  }, [isFirst, activeIndex, goTo]);

  // Snap back animation
  const snapBack = useCallback(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
  }, []);

  // Swipe gesture — parmak takipli
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      'worklet';
      // Sınırlama: ilk slide'da sağa, son slide'da sola fazla gitmesin
      const isFirstSlide = activeIndex === 0;
      const isLastSlide = activeIndex === V2_SLIDES.length - 1;

      if (isFirstSlide && e.translationX > 0) {
        // İlk slide'da sağa sürüklemeyi sınırla (rubber band efekti)
        translateX.value = e.translationX * 0.3;
      } else if (isLastSlide && e.translationX < 0) {
        // Son slide'da sola sürüklemeyi sınırla
        translateX.value = e.translationX * 0.3;
      } else {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      'worklet';
      const shouldGoNext =
        (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -SWIPE_VELOCITY_THRESHOLD) &&
        activeIndex < V2_SLIDES.length - 1;
      const shouldGoBack =
        (e.translationX > SWIPE_THRESHOLD || e.velocityX > SWIPE_VELOCITY_THRESHOLD) &&
        activeIndex > 0;

      if (shouldGoNext) {
        // Slide out animasyonu sonra index değiş
        translateX.value = withTiming(-W, { duration: 250, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(handleNext)();
        });
      } else if (shouldGoBack) {
        translateX.value = withTiming(W, { duration: 250, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(handleBack)();
        });
      } else {
        // Snap back
        runOnJS(snapBack)();
      }
    });

  // Kart: mevcut slide parmağı takip eder
  const currentCardStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, W * 0.5, W],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    );
    const scaleVal = interpolate(
      Math.abs(translateX.value),
      [0, W],
      [1, 0.85],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX: translateX.value }, { scale: scaleVal }],
      opacity,
    };
  });

  // Sonraki slide: sağdan gelen (sola swipe ederken)
  const nextCardStyle = useAnimatedStyle(() => {
    if (translateX.value >= 0) return { opacity: 0, transform: [{ translateX: W }] };
    const progress = Math.abs(translateX.value) / W;
    const tx = interpolate(progress, [0, 1], [W * 0.5, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress, [0, 0.3, 1], [0, 0.5, 1], Extrapolation.CLAMP);
    const scaleVal = interpolate(progress, [0, 1], [0.85, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateX: tx }, { scale: scaleVal }],
    };
  });

  // Önceki slide: soldan gelen (sağa swipe ederken)
  const prevCardStyle = useAnimatedStyle(() => {
    if (translateX.value <= 0) return { opacity: 0, transform: [{ translateX: -W }] };
    const progress = translateX.value / W;
    const tx = interpolate(progress, [0, 1], [-W * 0.5, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress, [0, 0.3, 1], [0, 0.5, 1], Extrapolation.CLAMP);
    const scaleVal = interpolate(progress, [0, 1], [0.85, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateX: tx }, { scale: scaleVal }],
    };
  });

  const prevSlide = activeIndex > 0 ? V2_SLIDES[activeIndex - 1] : null;
  const nextSlide = activeIndex < V2_SLIDES.length - 1 ? V2_SLIDES[activeIndex + 1] : null;

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={StyleSheet.absoluteFill}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Gradient arka plan animate */}
        <AnimatedBg activeIndex={activeIndex} />

        {/* Dekoratif pulse daireler — üstte görünür */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <BgCircle
            size={scale(260)}
            top={-scale(50)}
            right={-scale(50)}
            opacity={0.22}
            duration={3600}
            delay={0}
          />
          <BgCircle
            size={scale(160)}
            top={scale(30)}
            left={-scale(60)}
            opacity={0.14}
            duration={5000}
            delay={900}
          />
          <BgCircle
            size={scale(100)}
            top={scale(120)}
            right={scale(20)}
            opacity={0.10}
            duration={4200}
            delay={400}
          />
        </View>

        <SafeAreaView style={mainStyles.safe}>
          {/* Header: logo ortada absolute, sağda SKIP */}
          <View style={mainStyles.header}>
            {/* Logo — absolute ortalanmış */}
            <View style={mainStyles.logoAbsolute}>
              <View style={mainStyles.logoBox}>
                <Logo width={scale(100)} />
              </View>
            </View>

            {/* Sağ: SKIP */}
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

          {/* Kart — swipe ile kayan 3 katman */}
          <View style={mainStyles.cardArea}>
            {/* Önceki slide (sağa swipe ederken soldan gelir) */}
            {prevSlide && (
              <Animated.View style={[mainStyles.cardLayer, prevCardStyle]}>
                <SlideCardContent slide={prevSlide} />
              </Animated.View>
            )}

            {/* Aktif slide — parmağı takip eder */}
            <Animated.View style={[mainStyles.cardLayer, currentCardStyle]}>
              <SlideCardContent slide={V2_SLIDES[activeIndex]} />
            </Animated.View>

            {/* Sonraki slide (sola swipe ederken sağdan gelir) */}
            {nextSlide && (
              <Animated.View style={[mainStyles.cardLayer, nextCardStyle]}>
                <SlideCardContent slide={nextSlide} />
              </Animated.View>
            )}
          </View>

          {/* Alt: pagination + butonlar */}
          <View style={mainStyles.bottom}>
            <Pagination total={V2_SLIDES.length} activeIndex={activeIndex} />

            {/* Her slide: sağda Next | ilk slide haricindeki: solda geri icon */}
            <View style={mainStyles.buttonRow}>
              {/* BackCircleButton her zaman mount'ta — sadece opacity değişir, layout shift yok */}
              <View
                style={isFirst ? mainStyles.backHidden : undefined}
                pointerEvents={isFirst ? 'none' : 'auto'}
              >
                <BackCircleButton onPress={handleBack} />
              </View>
              <GradientButton
                title={isLast ? t('onboarding.getStarted') : t('onboarding.nextDestination')}
                onPress={handleNext}
                colors={[palette.primary, palette.primaryDark]}
                showArrow
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </GestureDetector>
  );
};

// ---------------------------------------------------------------------------
// Main Styles
// ---------------------------------------------------------------------------

const mainStyles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  logoBox: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  cardArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[5],
  },
  cardLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[5],
  },
  bottom: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[4],
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backHidden: {
    opacity: 0,
  },
  leftBtn: {
    alignSelf: 'center',
    paddingVertical: spacing[2],
  },
});
