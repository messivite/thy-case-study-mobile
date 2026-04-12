import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useHaptics } from '@/hooks/useHaptics';
import { radius } from '@/constants/spacing';
import type { HapticType } from '@/types/ui.types';

type Props = {
  onPress?: () => void;
  children: React.ReactNode;
  hapticFeedback?: boolean;
  hapticType?: HapticType;
  disabled?: boolean;
  style?: ViewStyle;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const IconButton: React.FC<Props> = ({
  onPress,
  children,
  hapticFeedback = true,
  hapticType = 'light',
  disabled = false,
  style,
  hitSlop,
}) => {
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (hapticFeedback) haptics[hapticType]?.();
    onPress?.();
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      hitSlop={hitSlop}
      style={[styles.base, style, animatedStyle]}
    >
      {children}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    padding: 4,
  },
});
