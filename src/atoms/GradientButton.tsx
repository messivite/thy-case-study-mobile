import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useHaptics } from '@/hooks/useHaptics';
import { fontFamily, fontSize } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  hapticFeedback?: boolean;
  showArrow?: boolean;
  colors?: [string, string, ...string[]];
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GradientButton: React.FC<Props> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  hapticFeedback = true,
  showArrow = true,
  colors: gradientColors = [palette.primary, palette.primaryDark],
}) => {
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

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      style={[(disabled || loading) && styles.disabled, animatedStyle]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={palette.white} size="small" />
        ) : (
          <>
            <Text style={styles.label}>{title}</Text>
            {showArrow && (
              <Ionicons
                name="arrow-forward"
                size={18}
                color={palette.white}
                style={styles.icon}
              />
            )}
          </>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 999,
    minHeight: 52,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: palette.white,
    letterSpacing: 0.2,
  },
  icon: {
    marginLeft: spacing[2],
  },
  disabled: {
    opacity: 0.5,
  },
});
