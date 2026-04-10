import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Text } from './Text';
import { palette } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'google';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  icon?: React.ReactNode;
  hapticFeedback?: boolean;
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Button: React.FC<Props> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  titleStyle,
  icon,
  hapticFeedback = true,
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback) haptics.light();
    onPress?.();
  };

  const variantStyles = getVariantStyles(variant, colors.primary);

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            variant="bodyMedium"
            color={variantStyles.textColor}
            style={[styles.label, icon ? { marginLeft: spacing[2] } : undefined, titleStyle]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchable>
  );
};

const getVariantStyles = (variant: ButtonVariant, primary: string) => {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: primary },
        textColor: palette.white,
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: primary,
        },
        textColor: primary,
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent' },
        textColor: primary,
      };
    case 'danger':
      return {
        container: { backgroundColor: palette.error },
        textColor: palette.white,
      };
    case 'google':
      return {
        container: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.gray200 },
        textColor: palette.gray700,
      };
    default:
      return {
        container: { backgroundColor: primary },
        textColor: palette.white,
      };
  }
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: radius.xl,
    minHeight: 52,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    letterSpacing: 0.2,
  },
});
