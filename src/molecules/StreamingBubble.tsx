import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/spacing';

type Props = {
  content: string;
};

/**
 * Stream sırasında kullanılan bubble.
 * MessageBubble ile aynı görsel yapı (Text, aynı stiller).
 * content prop her rAF frame'inde güncellenir (useChatSession'da throttle edilmiş).
 * Stream bitince parent unmount eder — geçişte FlatList'teki gerçek mesaj zaten cache'de.
 */
export const StreamingBubble: React.FC<Props> = React.memo(({ content }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={styles.bubbleRow}>
        <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="body" color={colors.text} style={styles.content}>
            {content}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing[1],
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
    marginHorizontal: spacing[4],
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  bubble: {
    padding: spacing[3],
    borderWidth: 1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
  },
  content: {
    lineHeight: 22,
    minWidth: 40,
  },
});
