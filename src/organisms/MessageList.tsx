import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { TypingIndicator } from '@/molecules/TypingIndicator';
import { AnimatedEmptyState } from '@/molecules/AnimatedEmptyState';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { useI18n } from '@/hooks/useI18n';

type Props = {
  messages: Message[];
  isTyping: boolean;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

export const MessageList: React.FC<Props> = ({
  messages,
  isTyping,
  onLike,
  onRegenerate,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const listRef = useRef<FlashListRef<Message>>(null);

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

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const renderFooter = useCallback(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="caption" color={colors.textSecondary} style={styles.loadingText}>
            {t('assistant.loadingMore')}
          </Text>
        </View>
      );
    }
    return null;
  }, [isLoadingMore, colors, t]);

  if (messages.length === 0 && !isTyping) {
    return <AnimatedEmptyState />;
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: spacing[4] }}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        ListHeaderComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 100,
          startRenderingFromBottom: true,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  loadingText: {
    marginLeft: spacing[2],
  },
});
