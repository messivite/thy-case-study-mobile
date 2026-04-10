import React, { useEffect, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { ColorValue } from 'react-native';
import { palette } from '@/constants/colors';

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];
const DEFAULT_THY_COLORS: GradientColors = [
  palette.white,
  palette.primary,
  '#F0354A',
  palette.primary,
  palette.primaryLight,
  palette.white,
];

type Props = {
  children: React.ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  durationMs?: number;
  colors?: GradientColors;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Gemini benzeri "orbit" border efekti.
 * Performans için rotation animasyonu tamamen UI thread'de çalışır.
 */
const AnimatedOrbitBorderImpl: React.FC<Props> = ({
  children,
  borderRadius = 18,
  borderWidth = 2,
  durationMs = 5600,
  // Varsayılan: THY uyumlu palette (yalnızca kırmızı tonları + beyaz)
  colors = DEFAULT_THY_COLORS,
  backgroundColor = '#FFFFFF',
  style,
  contentStyle,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [durationMs, progress]);

  const baseColors = useMemo(
    () => [colors[0], colors[1], colors[2], colors[3] ?? colors[0]] as GradientColors,
    [colors],
  );
  const secondaryColors = useMemo(
    () => [colors[2], colors[0], colors[1], colors[3] ?? colors[0]] as GradientColors,
    [colors],
  );

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${progress.value * 360}deg` }, { scale: 1.3 }],
    opacity: interpolate(progress.value, [0, 0.25, 0.5, 0.75, 1], [0.96, 0.86, 0.98, 0.88, 0.96]),
  }));

  const orbitStyleSecondary = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${110 - progress.value * 400}deg` }, { scale: 1.45 }],
    opacity: interpolate(progress.value, [0, 0.33, 0.66, 1], [0.72, 0.88, 0.7, 0.72]),
  }));

  return (
    <View
      style={[
        styles.outer,
        { borderRadius, padding: borderWidth },
        style,
      ]}
    >
      {/* Base katman: hiçbir frame'de border çıplak kalmasın */}
      <LinearGradient
        colors={baseColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.orbitLayer, orbitStyle]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
      <Animated.View style={[styles.orbitLayer, orbitStyleSecondary]}>
        <LinearGradient
          colors={secondaryColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      <View
        style={[
          styles.inner,
          { borderRadius: Math.max(0, borderRadius - borderWidth), backgroundColor },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const areEqual = (prev: Props, next: Props) =>
  prev.borderRadius === next.borderRadius &&
  prev.borderWidth === next.borderWidth &&
  prev.durationMs === next.durationMs &&
  prev.backgroundColor === next.backgroundColor &&
  prev.style === next.style &&
  prev.contentStyle === next.contentStyle &&
  prev.children === next.children &&
  prev.colors === next.colors;

export const AnimatedOrbitBorder = React.memo(AnimatedOrbitBorderImpl, areEqual);

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    overflow: 'hidden',
    shadowColor: palette.primary,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  orbitLayer: {
    position: 'absolute',
    top: '-120%',
    left: '-120%',
    width: '340%',
    height: '340%',
  },
  gradient: {
    flex: 1,
  },
  inner: {
    zIndex: 1,
  },
});

