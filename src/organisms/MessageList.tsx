import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import * as Speech from 'expo-speech';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { ScrollToBottomButton } from '@/molecules/ScrollToBottomButton';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { radius } from '@/constants/spacing';
import { Text } from '@/atoms/Text';
import { HomeWelcomePanel, WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { useI18n } from '@/hooks/useI18n';
import { stripTextForSpeech, speechLocaleForAppLang } from '@/lib/chatSpeech';
import { toast } from '@/lib/toast';

// inverted FlatList'te "aşağı" aslında offset=0 (en üst görsel = en yeni mesaj)
// Kullanıcı "yukarı" kaydırınca eski mesajlara gider
const AT_TOP_THRESHOLD = 80; // inverted'da "bottom" aslında offset=0 yani top

const WaitingBubble: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[waitingStyles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ActivityThyLoading mode="pulse" size={20} />
      <Text variant="caption" color={colors.textSecondary}>{t('assistant.awaitingResponse')}</Text>
    </View>
  );
};

const waitingStyles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: spacing[4],
    marginVertical: spacing[1],
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
});

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
  // inverted modda offset=0 = en yeni mesaj (görsel olarak en altta)
  // Kullanıcı eski mesajlara kaydırınca offset artar
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtLatestRef = useRef(true); // offset=0 → en yeni mesajda mı?
  const prevCountRef = useRef(0);

  useEffect(() => () => { void Speech.stop(); }, []);

  // Session değişince sıfırla
  useEffect(() => {
    prevCountRef.current = 0;
    isAtLatestRef.current = true;
    setShowScrollBtn(false);
    setUnreadCount(0);
  }, [chatId]);

  // Yeni mesaj gelince: en yenideyse badge yok (zaten görüyor), değilse badge göster
  useEffect(() => {
    const total = messages.length + (optimisticUserMsg ? 1 : 0) + (streamingMessage ? 1 : 0);
    const prev = prevCountRef.current;
    if (total === prev || total === 0) return;
    const added = total - prev;
    prevCountRef.current = total;

    if (!isAtLatestRef.current && added > 0) {
      setUnreadCount((c) => c + added);
      setShowScrollBtn(true);
    }
  }, [messages.length, optimisticUserMsg, streamingMessage]);

  // inverted modda scroll event: contentOffset.y=0 → en yeni mesajda
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const atLatest = offsetY < AT_TOP_THRESHOLD;
    isAtLatestRef.current = atLatest;
    if (atLatest) {
      setShowScrollBtn(false);
      setUnreadCount(0);
    }
  }, []);

  const handleScrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => (
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
  ), [onLike, onRegenerate, speakingMessageId, handleSpeakToggle]);

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

  // inverted=true → FlatList veriyi ters render eder.
  // En yeni mesajın en üstte (görsel olarak en altta) olması için newest→oldest sırası gerekir.
  // messages şu an oldest→newest → ters çevir.
  // Geçici mesajlar (optimistic, streaming) en yeni → dizinin başına.
  const displayMessages: Message[] = [
    ...(streamingMessage ? [streamingMessage] : []),
    ...(optimisticUserMsg ? [optimisticUserMsg] : []),
    ...messages.slice().reverse(),
  ];

  return (
    <View style={styles.fill}>
      <FlatList
        ref={listRef}
        data={displayMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        // inverted'da header aşağıda (en eski mesajların üstünde = görsel olarak üst)
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        // inverted'da header görsel olarak en altta (en yeni mesajın altı = input üstü)
        ListHeaderComponent={
          isTyping && !streamingMessage ? <WaitingBubble /> : null
        }
        // inverted'da "end" aslında en eski mesajlar — pagination için onEndReached
        onEndReached={() => {
          if (hasMore && !isLoadingMore && onLoadMore) onLoadMore();
        }}
        onEndReachedThreshold={0.3}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      <ScrollToBottomButton
        visible={showScrollBtn}
        unreadCount={unreadCount}
        onPress={handleScrollToLatest}
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
