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
const BG_GRADIENTS: readonly [string, string, string, string, string, string][] = [
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
          colors={prevGrad as unknown as string[]}
          locations={[0, 0.18, 0.36, 0.54, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, nextStyle]}>
        <LinearGradient
          colors={nextGrad as unknown as string[]}
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
// Slide Card
// ---------------------------------------------------------------------------

const SlideCard: React.FC<{ slide: V2Slide; index: number }> = ({ slide, index }) => {
  const { t } = useI18n();

  return (
    <MotiView
      key={`card-${index}`}
      from={{ translateX: W * 0.72, scale: 0.84, opacity: 0 }}
      animate={{ translateX: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 19, stiffness: 185, mass: 0.8 }}
    >
      <ModelPickerCard
        title={t(slide.titleKey)}
        description={t(slide.descKey)}
        mainIcon={slide.mainIcon}
        overlayIcons={slide.overlayIcons}
        selectorLabel={t(slide.selectorLabelKey)}
        selectorDotColor={slide.selectorDotColor}
      />
    </MotiView>
  );
};

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
  const slide = V2_SLIDES[activeIndex];

  const handleNext = useCallback(() => {
    if (isLast) onComplete();
    else setActiveIndex((i) => i + 1);
  }, [isLast, onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirst) setActiveIndex((i) => i - 1);
  }, [isFirst]);

  // Swipe gesture — pan yatay threshold 60px
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      'worklet';
      if (e.translationX < -60 && e.velocityX < 0) {
        // sola swipe → next
        runOnJS(handleNext)();
      } else if (e.translationX > 60 && e.velocityX > 0) {
        // sağa swipe → back
        runOnJS(handleBack)();
      }
    });

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

          {/* Kart */}
          <View style={mainStyles.cardArea}>
            <SlideCard slide={slide} index={activeIndex} />
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
