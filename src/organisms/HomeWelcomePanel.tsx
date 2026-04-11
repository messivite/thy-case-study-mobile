import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
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
};

export const HomeWelcomePanel: React.FC<Props> = ({
  greetingPrefix,
  greetingName,
  greetingReady,
  question,
  quickActions,
  onQuickActionPress,
}) => {
  const { colors, isDark } = useTheme();

  const handleQuickActionPress = useCallback(
    (action: WelcomeQuickAction) => () => onQuickActionPress(action),
    [onQuickActionPress],
  );

  const chips = useMemo(
    () =>
      quickActions.map((action) => (
        <PromptChipButton
          key={action.id}
          label={action.label}
          onPress={handleQuickActionPress(action)}
        />
      )),
    [quickActions, handleQuickActionPress],
  );

  return (
    <View style={styles.root}>
      <View style={styles.greetingRow}>
        {/* "Merhaba" kısmı her zaman sabit durur */}
        <Text variant="h3" color={colors.text} style={styles.greeting}>
          {greetingPrefix}{' '}
        </Text>
        {/* Sadece isim shimmer gösterir */}
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
      <Text variant="h1" color={colors.text} style={styles.question}>
        {question}
      </Text>
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
