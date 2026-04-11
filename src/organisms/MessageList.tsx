import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';
import { FlashList } from '@shopify/flash-list';
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
  const listRef = useRef<FlashList<Message>>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    return () => { void Speech.stop(); };
  }, []);

  // Yeni mesaj gelince veya ilk yüklemede en alta scroll
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: messages.length > 1 });
      }, 100);
    }
  }, [messages.length]);

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

  // messages: newest→oldest — ters çevir → oldest→newest, useMemo ile stabil referans
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);


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
      <FlashList
        ref={listRef}
        data={orderedMessages}
        renderItem={({ item, index }) => (
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
        )}
        keyExtractor={(item) => item.id}
        estimatedItemSize={120}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
        onStartReached={() => {
          if (hasMore && !isLoadingMore && onLoadMore) onLoadMore();
        }}
        onStartReachedThreshold={0.3}
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
