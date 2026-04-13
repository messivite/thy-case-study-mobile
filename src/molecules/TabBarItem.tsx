import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type Props = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconFocused: React.ComponentProps<typeof Ionicons>['name'];
  isFocused: boolean;
  onPress: () => void;
};

const RIPPLE_MS = 320;
const TAB_ICON_ANIM_MS = 220;
const TAB_ICON_ACTIVE_SCALE = 1;
const TAB_ICON_INACTIVE_SCALE = 0.88;

/** Ekran ref. — nötr gri ikon/etiket (#8E8E93 civarı) */
const INACTIVE_TINT = '#8E8E93';

export const TabBarItem: React.FC<Props> = ({
  label,
  icon,
  iconFocused,
  isFocused,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const iconScale = useSharedValue(
    isFocused ? TAB_ICON_ACTIVE_SCALE : TAB_ICON_INACTIVE_SCALE,
  );

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  useEffect(() => {
    iconScale.value = withTiming(
      isFocused ? TAB_ICON_ACTIVE_SCALE : TAB_ICON_INACTIVE_SCALE,
      {
        duration: TAB_ICON_ANIM_MS,
        easing: Easing.out(Easing.cubic),
      },
    );
  }, [isFocused, iconScale]);

  const triggerRipple = () => {
    rippleScale.value = 0;
    rippleOpacity.value = isDark ? 0.12 : 0.1;
    rippleScale.value = withTiming(1.55, {
      duration: RIPPLE_MS,
      easing: Easing.out(Easing.quad),
    });
    rippleOpacity.value = withTiming(0, {
      duration: RIPPLE_MS,
      easing: Easing.out(Easing.quad),
    });
  };

  const handlePress = () => {
    haptics.light();
    onPress();
  };

  const activeColor = colors.primary;
  const inactiveColor = isDark ? colors.textSecondary : INACTIVE_TINT;

  const rippleColor = isDark
    ? 'rgba(255,255,255,0.22)'
    : 'rgba(0,0,0,0.07)';

  return (
    <Pressable
      style={styles.pressable}
      onPress={handlePress}
      onPressIn={triggerRipple}
      android_ripple={
        Platform.OS === 'android'
          ? {
              color: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)',
              foreground: true,
              borderless: false,
            }
          : undefined
      }
    >
      <View style={styles.inner}>
        {Platform.OS === 'ios' && (
          <Animated.View
            style={[styles.ripple, { backgroundColor: rippleColor, pointerEvents: 'none' as const }, rippleStyle]}
          />
        )}
        <View style={styles.content}>
          <Animated.View style={iconAnimStyle}>
            <Ionicons
              name={isFocused ? iconFocused : icon}
              size={24}
              color={isFocused ? activeColor : inactiveColor}
            />
          </Animated.View>
          <Text
            style={[
              styles.label,
              {
                color: isFocused ? activeColor : inactiveColor,
                fontFamily: fontFamily.medium,
              },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[2] + 2,
    paddingBottom: spacing[2] - 2,
    minHeight: 52,
    position: 'relative',
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    left: '50%',
    marginLeft: -32,
    top: 4,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 1,
  },
  label: {
    fontSize: fontSize.xs - 1,
    letterSpacing: 0.15,
  },
});
