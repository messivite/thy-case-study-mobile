import React, { useCallback } from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { palette } from '@/constants/colors';
import { shadow as shadowTokens } from '@/constants/spacing';
import { useHaptics } from '@/hooks/useHaptics';

export type SurfaceIconPressableShape = 'circle' | 'square';

export type SurfaceIconPressableProps = {
  onPress?: () => void;
  children: React.ReactNode;
  width: number;
  height: number;
  shape?: SurfaceIconPressableShape;
  /**
   * Square only: corner radius. When omitted, derived from min(width, height).
   * Circle mode always uses min(width, height) / 2.
   */
  borderRadius?: number;
  /** Surface fill. Use transparent to disable the white (or any) plate. */
  backgroundColor?: string;
  /** Light elevation shadow (iOS + Android). */
  shadow?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
};

function resolveBorderRadius(
  shape: SurfaceIconPressableShape,
  width: number,
  height: number,
  borderRadius?: number,
): number {
  const m = Math.min(width, height);
  if (shape === 'circle') {
    return m / 2;
  }
  if (borderRadius != null) {
    return borderRadius;
  }
  return Math.max(8, Math.round(m * 0.22));
}

export const SurfaceIconPressable: React.FC<SurfaceIconPressableProps> = ({
  onPress,
  children,
  width,
  height,
  shape = 'circle',
  borderRadius,
  backgroundColor = palette.white,
  shadow: shadowEnabled = true,
  disabled = false,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const haptics = useHaptics();
  const r = resolveBorderRadius(shape, width, height, borderRadius);

  const handlePress = useCallback(() => {
    haptics.light();
    onPress?.();
  }, [haptics, onPress]);

  const surfaceStyle: ViewStyle = {
    width,
    height,
    borderRadius: r,
    backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const elevationStyle: ViewStyle = shadowEnabled
    ? {
        shadowColor: '#000',
        ...shadowTokens.sm,
      }
    : {};

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      android_ripple={
        backgroundColor === 'transparent' ? undefined : { color: 'rgba(0,0,0,0.06)' }
      }
      style={({ pressed }) => [
        surfaceStyle,
        elevationStyle,
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
  },
});
