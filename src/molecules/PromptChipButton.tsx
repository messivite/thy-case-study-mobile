import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/atoms/Text';
import { spacing, radius } from '@/constants/spacing';
import { useTheme } from '@/hooks/useTheme';
import { fontFamily } from '@/constants/typography';

type Props = {
  label: string;
  onPress: () => void;
};

export const PromptChipButton: React.FC<Props> = ({ label, onPress }) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border + '88',
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.medium,
  },
});
