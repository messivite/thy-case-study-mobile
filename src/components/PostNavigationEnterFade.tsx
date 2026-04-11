import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = { children: React.ReactNode };

/**
 * Mount sonrasi tek rAF bekleyip kisa opacity girisi — layout flash'ini gizler.
 * InteractionManager beklenmez: (tabs) navigate'de ekstra gecikme yaratiyordu.
 */
export function PostNavigationEnterFade({ children }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      opacity.value = withTiming(1, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => cancelAnimationFrame(id);
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        fadeStyle,
        Platform.OS === 'web' && { minHeight: 0 },
      ]}
    >
      {children}
    </Animated.View>
  );
}
