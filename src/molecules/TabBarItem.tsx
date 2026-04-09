import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { palette } from '@/constants/colors';

type Props = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconFocused: React.ComponentProps<typeof Ionicons>['name'];
  isFocused: boolean;
  onPress: () => void;
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const TabBarItem: React.FC<Props> = ({
  label,
  icon,
  iconFocused,
  isFocused,
  onPress,
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const activeColor = colors.primary;
  const inactiveColor = colors.textSecondary;

  return (
    <AnimatedTouchable
      style={[styles.tab, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <View style={styles.inner}>
        <Ionicons
          name={isFocused ? iconFocused : icon}
          size={24}
          color={isFocused ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.label,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontFamily: isFocused ? fontFamily.semiBold : fontFamily.regular,
            },
          ]}
        >
          {label}
        </Text>
        {isFocused && (
          <Animated.View style={[styles.indicator, { backgroundColor: activeColor }]} />
        )}
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: fontSize.xs,
  },
  indicator: {
    position: 'absolute',
    bottom: -spacing[2],
    width: 20,
    height: 2,
    borderRadius: 1,
  },
});
