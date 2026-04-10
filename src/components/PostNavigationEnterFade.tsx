import React, { useEffect } from 'react';
import { InteractionManager, Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = { children: React.ReactNode };

/**
 * Splash / deferred replace sonrası ilk mount’ta layout bazen bir frame kayıyor.
 * runAfterInteractions + rAF sonrası kısa opacity girişi ile yumuşatır (onboarding, tabs vb.).
 */
export function PostNavigationEnterFade({ children }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        opacity.value = withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
        });
      });
    });
    return () => task.cancel();
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        fadeStyle,
        // Web flex: iç içe flex + ScrollView yüksekliği için (min-height:auto)
        Platform.OS === 'web' && { minHeight: 0 },
      ]}
    >
      {children}
    </Animated.View>
  );
}
