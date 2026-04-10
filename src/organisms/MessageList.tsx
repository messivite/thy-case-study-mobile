import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { TypingIndicator } from '@/molecules/TypingIndicator';
import { Text } from '@/atoms/Text';
import { HomeWelcomePanel, WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { useI18n } from '@/hooks/useI18n';
import { stripTextForSpeech, speechLocaleForAppLang } from '@/lib/chatSpeech';
import { toast } from 'sonner-native';

type Props = {
  messages: Message[];
  isTyping: boolean;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  welcomeGreeting?: string;
  welcomeQuestion?: string;
  quickActions?: WelcomeQuickAction[];
  onQuickActionPress?: (action: WelcomeQuickAction) => void;
};

export const MessageList: React.FC<Props> = ({
  messages,
  isTyping,
  onLike,
  onRegenerate,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  welcomeGreeting,
  welcomeQuestion,
  quickActions = [],
  onQuickActionPress,
}) => {
  const { colors } = useTheme();
  const { t, currentLanguage } = useI18n();
  const listRef = useRef<FlashListRef<Message>>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const handleSpeakToggle = useCallback(
    (messageId: string, text: string) => {
      if (speakingMessageId === messageId) {
        void Speech.stop();
        setSpeakingMessageId(null);
        return;
      }
      void Speech.stop();
      const plain = stripTextForSpeech(text);
      if (!plain.trim()) return;

      const locale = speechLocaleForAppLang(currentLanguage);
      setSpeakingMessageId(messageId);
      Speech.speak(plain, {
        language: locale,
        rate: 0.96,
        onDone: () => {
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur));
        },
        onStopped: () => {
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur));
        },
        onError: () => {
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur));
          toast.error(t('toast.speechError'));
        },
      });
    },
    [speakingMessageId, currentLanguage, t],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble
        message={item}
        onLike={onLike}
        onRegenerate={onRegenerate}
        index={index}
        isSpeaking={speakingMessageId === item.id}
        onSpeakToggle={
          item.role === 'assistant' && item.content.trim().length > 0
            ? () => handleSpeakToggle(item.id, item.content)
            : undefined
        }
      />
    ),
    [onLike, onRegenerate, speakingMessageId, handleSpeakToggle],
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
    if (quickActions.length > 0 && welcomeGreeting && welcomeQuestion && onQuickActionPress) {
      return (
        <HomeWelcomePanel
          greeting={welcomeGreeting}
          question={welcomeQuestion}
          quickActions={quickActions}
          onQuickActionPress={onQuickActionPress}
        />
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text variant="h4" align="center" color={colors.text}>
          {t('assistant.emptyTitle')}
        </Text>
        <Text variant="body" align="center" color={colors.textSecondary} style={styles.emptySubtitle}>
          {t('assistant.emptySubtitle')}
        </Text>
      </View>
    );
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  emptySubtitle: {
    marginTop: spacing[1],
  },
});
