import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type FloatingBubble = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
  x: number;
  y: number;
  delay: number;
  amplitude: number;
  duration: number;
};

const BUBBLES: FloatingBubble[] = [
  { icon: 'diamond-outline', color: palette.geminiBlue, size: 28, x: -80, y: -100, delay: 0, amplitude: 8, duration: 2800 },
  { icon: 'chatbubble-ellipses-outline', color: palette.gptGreen, size: 24, x: -110, y: -30, delay: 300, amplitude: 10, duration: 3200 },
  { icon: 'flash-outline', color: palette.claudeOrange, size: 26, x: 90, y: -80, delay: 600, amplitude: 7, duration: 2600 },
  { icon: 'construct-outline', color: palette.customPurple, size: 22, x: -60, y: 60, delay: 450, amplitude: 9, duration: 3000 },
  { icon: 'sparkles', color: palette.primary, size: 20, x: 100, y: 30, delay: 150, amplitude: 6, duration: 3400 },
  { icon: 'code-slash-outline', color: palette.info, size: 18, x: 50, y: -120, delay: 750, amplitude: 11, duration: 2400 },
];

const FloatingBubbleItem: React.FC<{ bubble: FloatingBubble }> = ({ bubble }) => {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      bubble.delay,
      withRepeat(
        withTiming(-bubble.amplitude, {
          duration: bubble.duration,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 0.85, scale: 1 }}
      transition={{ type: 'timing', duration: 600, delay: bubble.delay }}
      style={[
        styles.bubble,
        {
          left: SCREEN_WIDTH / 2 + bubble.x - bubble.size / 2,
          top: bubble.y,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.bubbleInner,
          {
            width: bubble.size * 2,
            height: bubble.size * 2,
            borderRadius: bubble.size,
            backgroundColor: bubble.color + '18',
            borderColor: bubble.color + '30',
          },
          animatedStyle,
        ]}
      >
        <Ionicons name={bubble.icon} size={bubble.size} color={bubble.color} />
      </Animated.View>
    </MotiView>
  );
};

export const AnimatedEmptyState: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {/* Floating bubbles area */}
      <View style={styles.bubblesArea}>
        {BUBBLES.map((bubble, idx) => (
          <FloatingBubbleItem key={idx} bubble={bubble} />
        ))}

        {/* Center icon */}
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, delay: 200 }}
          style={styles.centerIcon}
        >
          <View style={[styles.centerCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Ionicons name="sparkles" size={48} color={colors.primary} />
          </View>
        </MotiView>
      </View>

      {/* Text area */}
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 400 }}
        style={styles.textArea}
      >
        <Text
          variant="h3"
          align="center"
          color={colors.text}
          style={{ fontFamily: fontFamily.semiBold }}
        >
          {t('assistant.emptyTitle')}
        </Text>
        <Text
          variant="body"
          align="center"
          color={colors.textSecondary}
          style={styles.subtitle}
        >
          {t('assistant.emptySubtitle')}
        </Text>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  bubblesArea: {
    width: SCREEN_WIDTH * 0.8,
    height: 260,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  centerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  textArea: {
    alignItems: 'center',
    marginTop: spacing[6],
    gap: spacing[2],
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing[1],
  },
});
