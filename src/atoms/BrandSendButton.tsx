import React from 'react';
import { Image, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native';
import { useHaptics } from '@/hooks/useHaptics';

const LOGO_SOURCE = require('../../assets/button-logo.png');

type Props = {
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const BrandSendButton: React.FC<Props> = ({
  size = 40,
  onPress,
  disabled = false,
  style,
}) => {
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 12, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handlePress = () => {
    if (disabled) return;
    haptics.medium();
    onPress?.();
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          opacity: disabled ? 0.4 : 1,
        },
        animatedStyle,
        style,
      ]}
    >
      <Image
        source={LOGO_SOURCE}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        resizeMode="cover"
      />
    </AnimatedTouchable>
  );
};
