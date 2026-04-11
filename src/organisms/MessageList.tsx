import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import * as Speech from 'expo-speech';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { TypingIndicator } from '@/molecules/TypingIndicator';
import { ScrollToBottomButton } from '@/molecules/ScrollToBottomButton';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { Text } from '@/atoms/Text';
import { HomeWelcomePanel, WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { useI18n } from '@/hooks/useI18n';
import { stripTextForSpeech, speechLocaleForAppLang } from '@/lib/chatSpeech';
import { toast } from '@/lib/toast';

const AT_BOTTOM_THRESHOLD = 80;

type Props = {
  chatId?: string | null;
  messages: Message[];
  optimisticUserMsg?: Message | null;
  streamingMessage?: Message | null;
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
  chatId,
  messages,
  optimisticUserMsg,
  streamingMessage,
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const prevCountRef = useRef(0);

  useEffect(() => () => { void Speech.stop(); }, []);

  // Session değişince sıfırla
  useEffect(() => {
    prevCountRef.current = 0;
    isAtBottomRef.current = true;
    setShowScrollBtn(false);
    setUnreadCount(0);
  }, [chatId]);

  // Yeni mesaj: alttaysa scroll et, değilse badge
  useEffect(() => {
    const total = messages.length + (optimisticUserMsg ? 1 : 0) + (streamingMessage ? 1 : 0);
    const prev = prevCountRef.current;
    if (total === prev || total === 0) return;
    const added = total - prev;
    prevCountRef.current = total;

    if (isAtBottomRef.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: prev > 0 }), 60);
    } else if (added > 0) {
      setUnreadCount((c) => c + added);
      setShowScrollBtn(true);
    }
  }, [messages.length, optimisticUserMsg, streamingMessage]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const atBottom = distanceFromBottom < AT_BOTTOM_THRESHOLD;
    isAtBottomRef.current = atBottom;
    if (atBottom) {
      setShowScrollBtn(false);
      setUnreadCount(0);
    } else {
      setShowScrollBtn(true);
    }
  }, []);

  const handleScrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
    setShowScrollBtn(false);
    setUnreadCount(0);
  }, []);

  const handleSpeakToggle = useCallback((messageId: string, text: string) => {
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
  }, [speakingMessageId, currentLanguage, t]);

  if (isSessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityThyLoading mode="float" size={48} />
      </View>
    );
  }

  const hasContent = messages.length > 0 || !!optimisticUserMsg || !!streamingMessage || isTyping;

  if (!hasContent) {
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

  // API newest→oldest döndürüyor → reverse ile oldest→newest yapıyoruz
  // Geçici mesajlar en sona (en yeni)
  const displayMessages: Message[] = [
    ...messages.slice().reverse(),
    ...(optimisticUserMsg ? [optimisticUserMsg] : []),
    ...(streamingMessage ? [streamingMessage] : []),
  ];

  return (
    <View style={styles.fill}>
      <FlatList
        ref={listRef}
        data={displayMessages}
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
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListFooterComponent={
          isTyping && !streamingMessage ? <TypingIndicator /> : null
        }
        onStartReached={() => {
          if (hasMore && !isLoadingMore && onLoadMore) onLoadMore();
        }}
        onStartReachedThreshold={0.3}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      <ScrollToBottomButton
        visible={showScrollBtn}
        unreadCount={unreadCount}
        onPress={handleScrollToBottom}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
