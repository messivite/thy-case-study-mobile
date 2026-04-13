import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  SharedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { palette } from '@/constants/colors';
import { nativeShadow } from '@/constants/spacing';

type Props = {
  visible: boolean;
  unreadCountSV: SharedValue<number>;
  onPress: () => void;
};

/**
 * Aşağı in butonu — WhatsApp stili.
 * visible=true olunca scale+opacity ile aşağıdan fırlar.
 * unreadCountSV SharedValue — badge text'i useAnimatedReaction ile JS'e taşır,
 * böylece HomeScreen re-render olmadan badge güncellenir.
 */
export const ScrollToBottomButton: React.FC<Props> = ({ visible, unreadCountSV, onPress }) => {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const [badgeText, setBadgeText] = useState('');

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 18, stiffness: 300, mass: 0.6 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value = withSpring(0, { damping: 20, stiffness: 350 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, scale, opacity]);

  // unreadCountSV değişince sadece bu component'i güncelle — HomeScreen re-render olmaz
  useAnimatedReaction(
    () => unreadCountSV.value,
    (count) => {
      const text = count <= 0 ? '' : count > 99 ? '99+' : String(count);
      runOnJS(setBadgeText)(text);
    },
  );

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const btnStyle = useMemo(() => ([
    styles.btn,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    nativeShadow({ color: isDark ? '#000' : '#555', offsetY: 2, opacity: 0.18, radius: 6, elevation: 4 }),
  ]), [colors.surface, colors.border, isDark]);

  return (
    <Animated.View style={[styles.wrapper, animStyle, { pointerEvents: visible ? 'auto' : 'none' as const }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={btnStyle}
        accessibilityRole="button"
        accessibilityLabel="En alta git"
      >
        <Ionicons name="chevron-down" size={22} color={colors.text} />

        {badgeText.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
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
