import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@/atoms/Text';
import { spacing } from '@/constants/spacing';
import { PromptChipButton } from '@/molecules/PromptChipButton';
import { fontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

export type WelcomeQuickAction = {
  id: string;
  label: string;
  prompt: string;
};

type Props = {
  greetingPrefix: string;
  greetingName: string;
  greetingReady: boolean;
  question: string;
  quickActions: WelcomeQuickAction[];
  onQuickActionPress: (action: WelcomeQuickAction) => void;
  isExiting?: boolean;
  onExitComplete?: () => void;
};

// Entry stagger — her öğe bu kadar gecikmeli girer
const ENTRY_STAGGER = 60;
const ENTRY_DURATION = 400;

// Exit: çok hızlı, mesaj gönderilince anında kaybolsun
const EXIT_DURATION = 120;
const EXIT_STAGGER = 20;

// Toplam item sayısı: greeting + question + chips
const TOTAL_STATIC = 2;

type AnimatedItemProps = {
  index: number;
  isExiting: boolean;
  onLastExitDone?: () => void;
  isLast?: boolean;
  children: React.ReactNode;
};

const AnimatedItem: React.FC<AnimatedItemProps> = ({ index, isExiting, onLastExitDone, isLast, children }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  const scale = useSharedValue(1);

  // Entry
  useEffect(() => {
    const delay = index * ENTRY_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: ENTRY_DURATION, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 28, stiffness: 200, overshootClamping: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exit
  useEffect(() => {
    if (!isExiting) return;
    const delay = index * EXIT_STAGGER;
    opacity.value = withDelay(delay, withTiming(0, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) }));
    scale.value = withDelay(delay, withTiming(0.88, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) }));
    translateY.value = withDelay(
      delay,
      withTiming(50, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) }, (finished) => {
        'worklet';
        if (finished && isLast && onLastExitDone) {
          runOnJS(onLastExitDone)();
        }
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExiting]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return <Reanimated.View style={animStyle}>{children}</Reanimated.View>;
};

export const HomeWelcomePanel: React.FC<Props> = ({
  greetingPrefix,
  greetingName,
  greetingReady,
  question,
  quickActions,
  onQuickActionPress,
  isExiting = false,
  onExitComplete,
}) => {
  const { colors, isDark } = useTheme();

  const totalItems = TOTAL_STATIC + quickActions.length;
  const lastIndex = totalItems - 1;

  const handleQuickActionPress = useCallback(
    (action: WelcomeQuickAction) => () => onQuickActionPress(action),
    [onQuickActionPress],
  );

  const chips = useMemo(
    () =>
      quickActions.map((action, idx) => (
        <AnimatedItem
          key={action.id}
          index={TOTAL_STATIC + idx}
          isExiting={isExiting}
          isLast={TOTAL_STATIC + idx === lastIndex}
          onLastExitDone={onExitComplete}
        >
          <PromptChipButton
            label={action.label}
            onPress={handleQuickActionPress(action)}
          />
        </AnimatedItem>
      )),
    [quickActions, handleQuickActionPress, isExiting, lastIndex, onExitComplete],
  );

  return (
    <View style={styles.root}>
      {/* Greeting — index 0 */}
      <AnimatedItem
        index={0}
        isExiting={isExiting}
        isLast={lastIndex === 0}
        onLastExitDone={onExitComplete}
      >
        <View style={styles.greetingRow}>
          <Text variant="h3" color={colors.text} style={styles.greeting}>
            {greetingPrefix}{' '}
          </Text>
          <Skeleton
            show={!greetingReady}
            colorMode={isDark ? 'dark' : 'light'}
            width={90}
            height={20}
            radius={6}
          >
            {greetingReady ? (
              <Text variant="h3" color={colors.text} style={styles.greeting}>
                {greetingName}
              </Text>
            ) : null}
          </Skeleton>
        </View>
      </AnimatedItem>

      {/* Question — index 1 */}
      <AnimatedItem
        index={1}
        isExiting={isExiting}
        isLast={lastIndex === 1}
        onLastExitDone={onExitComplete}
      >
        <Text variant="h1" color={colors.text} style={styles.question}>
          {question}
        </Text>
      </AnimatedItem>

      {/* Chips — index 2+ */}
      <View style={styles.chipsWrap}>{chips}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[8],
    gap: spacing[2],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: fontFamily.medium,
  },
  question: {
    fontFamily: fontFamily.semiBold,
    maxWidth: '92%',
    marginBottom: spacing[3],
  },
  chipsWrap: {
    gap: spacing[2],
  },
});
