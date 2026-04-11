import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { Text } from '@/atoms/Text';
import { spacing } from '@/constants/spacing';
import { PromptChipButton } from '@/molecules/PromptChipButton';
import { fontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { MotiView } from '@/lib/motiView';

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
  /** true geçince cascade exit animasyonu başlar */
  isExiting?: boolean;
  /** tüm exit animasyonları bitince çağrılır */
  onExitComplete?: () => void;
};

// Her öğenin exit animasyonu bu süre kadar sürer (ms)
const EXIT_DURATION = 300;
// Öğeler arası gecikme (ms) — stagger etkisi
const EXIT_STAGGER = 60;

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

  // Toplam animasyon süresi — greeting(0) + question(1) + chips(2..N)
  const totalItems = 2 + quickActions.length;
  const totalDuration = EXIT_STAGGER * (totalItems - 1) + EXIT_DURATION;

  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isExiting) return;
    exitTimerRef.current = setTimeout(() => {
      onExitComplete?.();
    }, totalDuration + 20); // küçük buffer
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [isExiting, totalDuration, onExitComplete]);

  const handleQuickActionPress = useCallback(
    (action: WelcomeQuickAction) => () => onQuickActionPress(action),
    [onQuickActionPress],
  );

  const exitAnimate = isExiting
    ? { opacity: 0, translateY: 40 }
    : { opacity: 1, translateY: 0 };

  const exitTransition = (itemIndex: number) => ({
    type: 'timing' as const,
    duration: EXIT_DURATION,
    delay: isExiting ? itemIndex * EXIT_STAGGER : 0,
  });

  const chips = useMemo(
    () =>
      quickActions.map((action, idx) => (
        <MotiView
          key={action.id}
          animate={isExiting ? { opacity: 0, translateY: 40 } : { opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: EXIT_DURATION,
            delay: isExiting ? (2 + idx) * EXIT_STAGGER : 0,
          }}
        >
          <PromptChipButton
            label={action.label}
            onPress={handleQuickActionPress(action)}
          />
        </MotiView>
      )),
    // isExiting değişince chips yeniden render edilmeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quickActions, handleQuickActionPress, isExiting],
  );

  return (
    <View style={styles.root}>
      {/* Greeting satırı — index 0 */}
      <MotiView
        animate={exitAnimate}
        transition={exitTransition(0)}
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
      </MotiView>

      {/* Soru metni — index 1 */}
      <MotiView
        animate={exitAnimate}
        transition={exitTransition(1)}
      >
        <Text variant="h1" color={colors.text} style={styles.question}>
          {question}
        </Text>
      </MotiView>

      {/* Chip'ler — index 2, 3, 4, 5 */}
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
