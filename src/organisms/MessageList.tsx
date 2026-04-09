import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { TypingIndicator } from '@/molecules/TypingIndicator';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing, radius, shadow } from '@/constants/spacing';
import { useI18n } from '@/hooks/useI18n';

type Props = {
  messages: Message[];
  isTyping: boolean;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
};

export const MessageList: React.FC<Props> = ({
  messages,
  isTyping,
  onLike,
  onRegenerate,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const listRef = useRef<FlatList<Message>>(null);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble
        message={item}
        onLike={onLike}
        onRegenerate={onRegenerate}
        index={index}
      />
    ),
    [onLike, onRegenerate],
  );

  if (messages.length === 0 && !isTyping) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={styles.empty}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={56} color={colors.textDisabled} />
        <Text variant="h4" align="center" color={colors.textSecondary} style={styles.emptyTitle}>
          {t('assistant.emptyTitle')}
        </Text>
        <Text variant="body" align="center" color={colors.textDisabled} style={styles.emptySubtitle}>
          {t('assistant.emptySubtitle')}
        </Text>
      </MotiView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: spacing[4] }}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        onContentSizeChange={() => {
          listRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  emptyTitle: {
    marginTop: spacing[2],
  },
  emptySubtitle: {
    textAlign: 'center',
  },
});
