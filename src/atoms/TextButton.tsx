import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/atoms/Text';
import { useHaptics } from '@/hooks/useHaptics';

type TextVariant = 'body' | 'bodyMedium' | 'label' | 'caption' | 'h4';
type HapticType = 'light' | 'medium' | 'selection' | 'error' | 'success' | 'warning';

type Props = {
  title: string;
  onPress?: () => void;
  color?: string;
  variant?: TextVariant;
  hapticFeedback?: boolean;
  hapticType?: HapticType;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const TextButton: React.FC<Props> = ({
  title,
  onPress,
  color,
  variant = 'bodyMedium',
  hapticFeedback = true,
  hapticType = 'selection',
  disabled = false,
  style,
  textStyle,
  hitSlop,
}) => {
  const haptics = useHaptics();
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    opacity.value = withTiming(0.55, { duration: 80 });
  };

  const handlePressOut = () => {
    opacity.value = withTiming(1, { duration: 150 });
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
      hitSlop={hitSlop ?? { top: 8, bottom: 8, left: 12, right: 12 }}
      style={[styles.base, style, animatedStyle]}
    >
      <Text variant={variant} color={color} style={textStyle}>
        {title}
      </Text>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
});
