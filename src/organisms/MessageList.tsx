import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import * as Speech from 'expo-speech';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { TypingIndicator } from '@/molecules/TypingIndicator';
import { Text } from '@/atoms/Text';
import { HomeWelcomePanel, WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { useI18n } from '@/hooks/useI18n';
import { stripTextForSpeech, speechLocaleForAppLang } from '@/lib/chatSpeech';
import { toast } from '@/lib/toast';

type Props = {
  messages: Message[];
  isTyping: boolean;
  isSessionLoading?: boolean;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  welcomeGreeting?: string;
  welcomeGreetingReady?: boolean;
  welcomeQuestion?: string;
  quickActions?: WelcomeQuickAction[];
  onQuickActionPress?: (action: WelcomeQuickAction) => void;
};

export const MessageList: React.FC<Props> = ({
  messages,
  isTyping,
  isSessionLoading = false,
  onLike,
  onRegenerate,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  welcomeGreeting,
  welcomeGreetingReady = false,
  welcomeQuestion,
  quickActions = [],
  onQuickActionPress,
}) => {
  const { colors } = useTheme();
  const { t, currentLanguage } = useI18n();
  const listRef = useRef<FlatList<Message>>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  useEffect(() => {
    return () => { void Speech.stop(); };
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
        onDone: () => setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
        onStopped: () => setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
        onError: () => {
          setSpeakingMessageId((cur) => (cur === messageId ? null : cur));
          toast.error(t('toast.speechError'));
        },
      });
    },
    [speakingMessageId, currentLanguage, t],
  );

  console.log('[MessageList] messages.length:', messages.length, 'isSessionLoading:', isSessionLoading, 'isTyping:', isTyping);

  // inverted FlashList renders item[0] at the visual bottom.
  // messages is newest→oldest (direction: 'older'), so item[0]=newest = visual bottom. No reverse needed.
  const invertedMessages = messages;

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
    if (hasMore && !isLoadingMore && onLoadMore) onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (isSessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.textSecondary} />
      </View>
    );
  }

  if (messages.length === 0 && !isTyping) {
    if (quickActions.length > 0 && welcomeGreeting && welcomeQuestion && onQuickActionPress) {
      const spaceIdx = welcomeGreeting.indexOf(' ');
      const greetingPrefix = spaceIdx !== -1 ? welcomeGreeting.slice(0, spaceIdx) : welcomeGreeting;
      const greetingName = spaceIdx !== -1 ? welcomeGreeting.slice(spaceIdx + 1) : '';
      return (
        <HomeWelcomePanel
          greetingPrefix={greetingPrefix}
          greetingName={greetingName}
          greetingReady={welcomeGreetingReady}
          question={welcomeQuestion}
          quickActions={quickActions}
          onQuickActionPress={onQuickActionPress}
        />
      );
    }
    return (
      <View style={styles.center}>
        <Text variant="h4" align="center" color={colors.text}>{t('assistant.emptyTitle')}</Text>
        <Text variant="body" align="center" color={colors.textSecondary} style={styles.emptySubtitle}>
          {t('assistant.emptySubtitle')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <FlatList
        ref={listRef}
        data={invertedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: spacing[3],
  },
  loadingMore: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  emptySubtitle: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[8],
  },
});
