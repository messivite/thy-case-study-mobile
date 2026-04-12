import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/atoms/Text';
import { spacing, radius } from '@/constants/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { fontFamily } from '@/constants/typography';

type Props = {
  label: string;
  onPress: () => void;
};

const PromptChipButtonInner: React.FC<Props> = ({ label, onPress }) => {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const handlePress = useCallback(() => {
    haptics.light();
    onPress();
  }, [haptics, onPress]);

  // Pressable style fn her render'da yeniden üretilmesin
  const chipStyle = useMemo(() => ({
    backgroundColor: colors.surface,
    borderColor: colors.border + '88',
  }), [colors.surface, colors.border]);

  const getPressableStyle = useCallback(({ pressed }: { pressed: boolean }) => [
    styles.base,
    chipStyle,
    pressed && styles.pressed,
  ], [chipStyle]);

  return (
    <Pressable onPress={handlePress} style={getPressableStyle}>
      <Text variant="body" color={colors.text} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
};

export const PromptChipButton = React.memo(PromptChipButtonInner);

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
  pressed: {
    opacity: 0.88,
  },
  label: {
    fontFamily: fontFamily.medium,
  },
});
