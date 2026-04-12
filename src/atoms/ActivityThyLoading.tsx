import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { THYIcon } from '@/atoms/thy-icon';

export type ActivityThyLoadingAnimation = 'pulse' | 'float';

export type ActivityThyLoadingProps = {
  /** pulse: ölçek (varsayılan); float: hafif dikey sinüs */
  mode?: ActivityThyLoadingAnimation;
  size?: number;
  fill?: string;
  fillSecondary?: string;
  style?: StyleProp<ViewStyle>;
};

const FLOAT_AMPLITUDE_PX = 5;
/** Bir tam salınım süresi; faz lineer → sinüs sabit frekans, ortada "takılma" olmaz */
const FLOAT_PERIOD_MS = 3600;

/**
 * thy-loading SVG + Reanimated.
 * Float: faz 0→1 **lineer** + sin(2π·faz) — bezier faz sinüsü ortada hızı bozup takılıyormuş gibi yapar; lineer yağ gibi akar.
 */
const ActivityThyLoadingInner: React.FC<ActivityThyLoadingProps> = ({
  mode = 'pulse',
  size = 32,
  fill,
  fillSecondary,
  style,
}) => {
  const scale = useSharedValue(1);
  /** Float: 0…1 lineer faz; translateY = sin(2π·phase)·genlik */
  const floatPhase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(floatPhase);

    if (mode === 'pulse') {
      floatPhase.value = 0;
      scale.value = 1;
      scale.value = withRepeat(
        withTiming(1.08, { duration: 750, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      scale.value = 1;
      floatPhase.value = 0;
      floatPhase.value = withRepeat(
        withTiming(1, { duration: FLOAT_PERIOD_MS, easing: Easing.linear }),
        -1,
        false,
      );
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(floatPhase);
    };
  }, [mode, scale, floatPhase]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const floatStyle = useAnimatedStyle(() => {
    const y = Math.sin(floatPhase.value * Math.PI * 2) * FLOAT_AMPLITUDE_PX;
    return {
      transform: [{ translateY: y }],
    };
  });

  return (
    <Animated.View
      collapsable={false}
      style={[
        styles.wrap,
        { minWidth: size, minHeight: size },
        mode === 'pulse' ? pulseStyle : floatStyle,
        style,
      ]}
      accessibilityRole="progressbar"
    >
      <THYIcon name="thy-loading" width={size} height={size} fill={fill} fillSecondary={fillSecondary} />
    </Animated.View>
  );
};

export const ActivityThyLoading = React.memo(ActivityThyLoadingInner);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
