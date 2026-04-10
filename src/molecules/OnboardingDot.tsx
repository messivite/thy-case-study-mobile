/**
 * OnboardingDot / OnboardingProgress
 *
 * İki export:
 *   - OnboardingProgress  → tüm barları tek component'te render eder (önerilen)
 *   - OnboardingDot       → geriye dönük uyumluluk için tek bar (deprecated)
 */

import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '@/constants/colors';
import { scale, verticalScale } from '@/lib/responsive';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingProgressProps {
  activeIndex: number;
  total: number;
  activeColor?: string;
  inactiveColor?: string;
}

interface OnboardingDotProps {
  index: number;
  activeIndex: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_HEIGHT = verticalScale(4);
const BAR_GAP = scale(6);
const BAR_INACTIVE_FLEX = 1;
const BAR_ACTIVE_FLEX = 2.8;

const SPRING = { damping: 20, stiffness: 180, mass: 0.7 } as const;

// ---------------------------------------------------------------------------
// Single segment bar
// ---------------------------------------------------------------------------

interface SegmentBarProps {
  isActive: boolean;
  isPast: boolean;
  fillColor?: string;
  trackColor?: string;
}

const SegmentBar = memo<SegmentBarProps>(function SegmentBar({
  isActive,
  isPast,
  fillColor,
  trackColor,
}) {
  const fillWidth = useSharedValue(isPast || isActive ? 1 : 0);
  const opacity = useSharedValue(isActive || isPast ? 1 : 0.3);

  useEffect(() => {
    if (isActive) {
      fillWidth.value = withSpring(1, SPRING);
      opacity.value = withTiming(1, { duration: 250 });
    } else if (isPast) {
      fillWidth.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.65, { duration: 200 });
    } else {
      fillWidth.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [isActive, isPast]);

  const trackStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  return (
    <Animated.View style={[styles.track, trackColor ? { backgroundColor: trackColor } : undefined, trackStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.fill, fillColor ? { backgroundColor: fillColor } : undefined, fillStyle]} />
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// OnboardingProgress — tüm barlar (önerilen kullanım)
// ---------------------------------------------------------------------------

export const OnboardingProgress = memo<OnboardingProgressProps>(function OnboardingProgress({
  activeIndex,
  total,
  activeColor,
  inactiveColor,
}) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.barWrapper,
            inactiveColor ? { backgroundColor: inactiveColor + '40' } : undefined,
            { flex: i === activeIndex ? BAR_ACTIVE_FLEX : BAR_INACTIVE_FLEX },
            i < total - 1 && { marginRight: BAR_GAP },
          ]}
        >
          <SegmentBar
            isActive={i === activeIndex}
            isPast={i < activeIndex}
            fillColor={activeColor}
            trackColor={inactiveColor ? 'transparent' : undefined}
          />
        </View>
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// OnboardingDot — geriye dönük uyumluluk
// ---------------------------------------------------------------------------

export const OnboardingDot = memo<OnboardingDotProps>(function OnboardingDot({
  index,
  activeIndex,
}) {
  const isActive = index === activeIndex;
  const isPast = index < activeIndex;

  const width = useSharedValue(isActive ? scale(32) : scale(6));
  const opacity = useSharedValue(isActive ? 1 : 0.4);

  useEffect(() => {
    width.value = withSpring(isActive ? scale(32) : scale(6), SPRING);
    opacity.value = withTiming(isActive ? 1 : 0.4, { duration: 200 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.legacyDot,
        { backgroundColor: isActive || isPast ? palette.primary : palette.gray300 },
        animStyle,
      ]}
    />
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  barWrapper: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    backgroundColor: palette.gray200,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: palette.primary,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  legacyDot: {
    height: scale(6),
    borderRadius: scale(3),
    marginHorizontal: scale(4),
  },
});
