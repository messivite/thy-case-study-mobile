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
  greeting: string;
  greetingReady: boolean;
  question: string;
  quickActions: WelcomeQuickAction[];
  onQuickActionPress: (action: WelcomeQuickAction) => void;
};

export const HomeWelcomePanel: React.FC<Props> = ({
  greeting,
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
      <Skeleton
        show={!greetingReady}
        colorMode={isDark ? 'dark' : 'light'}
        width={180}
        height={20}
        radius={6}
      >
        {greetingReady ? (
          <Text variant="h3" color={colors.text} style={styles.greeting}>
            {greeting}
          </Text>
        ) : null}
      </Skeleton>
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
