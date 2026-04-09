import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/spacing';

export const TypingIndicator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <MotiView
            key={i}
            from={{ translateY: 0 }}
            animate={{ translateY: -4 }}
            transition={{
              loop: true,
              type: 'timing',
              duration: 400,
              delay: i * 130,
              repeatReverse: true,
            }}
            style={[styles.dot, { backgroundColor: colors.textSecondary }]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    marginHorizontal: spacing[4],
    marginVertical: spacing[1],
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    padding: spacing[3],
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    height: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
