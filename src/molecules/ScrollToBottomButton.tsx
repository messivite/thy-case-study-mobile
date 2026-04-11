import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { palette } from '@/constants/colors';
import { radius } from '@/constants/spacing';

type Props = {
  visible: boolean;
  unreadCount: number;
  onPress: () => void;
};

/**
 * Aşağı in butonu — WhatsApp stili.
 * visible=true olunca scale+opacity ile aşağıdan fırlar.
 * unreadCount>0 ise üstünde kırmızı badge gösterir.
 */
export const ScrollToBottomButton: React.FC<Props> = ({ visible, unreadCount, onPress }) => {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 18, stiffness: 300, mass: 0.6 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value = withSpring(0, { damping: 20, stiffness: 350 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, animStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.btn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: isDark ? '#000' : '#555',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="En alta git"
      >
        <Ionicons name="chevron-down" size={22} color={colors.text} />

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : String(unreadCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
});
