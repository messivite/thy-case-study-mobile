import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { BlurView, BlurViewProps } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/constants/spacing';

type GlassTint = 'light' | 'dark' | 'auto';
type GlassVariant = 'sheet' | 'card' | 'overlay' | 'subtle';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: GlassTint;
  variant?: GlassVariant;
  intensity?: number;
  borderRadius?: number;
};

/**
 * Platform-aware glassmorphism container.
 *
 * iOS / Web  → expo-blur BlurView (real backdrop blur)
 * Android    → high-opacity rgba overlay that mimics glass
 *
 * Usage:
 *   <GlassView variant="sheet">...</GlassView>
 *   <GlassView variant="card" intensity={50}>...</GlassView>
 */
export const GlassView: React.FC<Props> = ({
  children,
  style,
  tint = 'auto',
  variant = 'card',
  intensity = 55,
  borderRadius,
}) => {
  const { isDark } = useTheme();

  const resolvedTint: BlurViewProps['tint'] =
    tint === 'auto' ? (isDark ? 'dark' : 'light') : tint;

  const variantStyle = VARIANT_STYLES[variant];
  const br = borderRadius ?? variantStyle.borderRadius;

  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.base,
          variantStyle,
          { borderRadius: br },
          getAndroidGlassStyle(isDark, variant),
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // iOS + Web: real blur
  return (
    <BlurView
      intensity={intensity}
      tint={resolvedTint}
      style={[styles.base, variantStyle, { borderRadius: br }, style]}
    >
      {/* Tint overlay for color depth */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: br },
          getBlurOverlayStyle(isDark, variant),
        ]}
        pointerEvents="none"
      />
      {children}
    </BlurView>
  );
};

// --- Variant base styles ---

const VARIANT_STYLES: Record<GlassVariant, ViewStyle> = {
  sheet: {
    borderRadius: radius['2xl'],
    borderWidth: 0,
    overflow: 'hidden',
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  overlay: {
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  subtle: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
};

// Tint overlay on top of blur (gives color cast + depth)
function getBlurOverlayStyle(isDark: boolean, variant: GlassVariant): ViewStyle {
  const lightOverlay = variant === 'sheet' ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.30)';
  const darkOverlay = variant === 'sheet' ? 'rgba(15,15,30,0.55)' : 'rgba(15,15,30,0.40)';

  const borderColor = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0)';

  return {
    backgroundColor: isDark ? darkOverlay : lightOverlay,
    borderColor,
  };
}

// Android fallback — no real blur, high opacity rgba + border
function getAndroidGlassStyle(isDark: boolean, variant: GlassVariant): ViewStyle {
  const lightBg = 'rgba(255,255,255,0.90)';
  const darkBg  = 'rgba(18,18,38,0.92)';
  const lightBorder = 'rgba(200,200,220,0.6)';
  const darkBorder  = 'rgba(255,255,255,0.12)';

  return {
    backgroundColor: isDark ? darkBg : lightBg,
    borderColor: isDark ? darkBorder : lightBorder,
    // Elevation for depth perception on Android
    elevation: variant === 'overlay' ? 0 : variant === 'sheet' ? 24 : 8,
    shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.15)',
  };
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
