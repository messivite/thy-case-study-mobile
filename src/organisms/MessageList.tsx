import React, { useRef, useCallback, useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { StreamingBubble } from '@/molecules/StreamingBubble';
import { Text } from '@/atoms/Text';
import { HomeWelcomePanel, WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { stripTextForSpeech, speechLocaleForAppLang } from '@/lib/chatSpeech';
import i18n from '@/i18n';
import { toast } from '@/lib/toast';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';

const AT_TOP_THRESHOLD = 80;


type Props = {
  chatId?: string | null;
  messages: Message[];
  optimisticUserMsg?: Message | null;
  isStreamingActive?: boolean;
  streamingMessageId?: string | null;
  optimisticUserMsgId?: string | null;
  // UI thread streaming — SharedValue ile
  pendingStreamSV?: SharedValue<string> | null;
  isStreamingDoneSV?: SharedValue<boolean> | null;
  streamResetCountSV?: SharedValue<number> | null;
  onStreamingComplete?: (text: string) => void;
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
  onScrollStateChange?: (scrolledUp: boolean, unreadCount: number) => void;
  onScrollToLatestRef?: React.RefObject<(() => void) | null>;
};

export const MessageList: React.FC<Props> = ({
  chatId,
  messages,
  optimisticUserMsg,
  isStreamingActive = false,
  streamingMessageId,
  optimisticUserMsgId,
  pendingStreamSV,
  isStreamingDoneSV,
  streamResetCountSV,
  onStreamingComplete,
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
  onScrollStateChange,
  onScrollToLatestRef,
}) => {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<Message>>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const isAtLatestRef = useRef(true);
  const prevCountRef = useRef(0);
  const unreadCountRef = useRef(0);
  // Son streaming ID'yi bir render daha tut — StreamingBubble→MessageBubble
  // geçişinde MotiView entry animation'ı skip etmek için
  const lastStreamingMsgIdRef = useRef<string | null>(null);
  const prevChatIdRef = useRef<string | null | undefined>(undefined);
  // Kullanıcı scroll etmeden (mount anında) onEndReached tetiklenmesin
  const userHasScrolledRef = useRef(false);

  const hasContent = messages.length > 0 || !!optimisticUserMsg || !!streamingMessageId || isTyping;
  const welcomeReady = quickActions.length > 0 && !!welcomeGreeting && !!welcomeQuestion && !!onQuickActionPress;
  const canShowWelcome = !hasContent && welcomeReady;

  // welcomeShownRef: welcome bir kez gösterildi mi
  const welcomeShownRef = useRef(false);
  // isWelcomeExiting: exit animasyonu devam ediyor mu — state olarak tut ki panel re-render alsın
  const [isWelcomeExiting, setIsWelcomeExiting] = useState(false);
  const isWelcomeExitingRef = useRef(false);

  if (canShowWelcome) welcomeShownRef.current = true;

  // showWelcome: panel gösterilmişse ve exit tamamlanmadıysa mount'ta tut
  const showWelcome = canShowWelcome || isWelcomeExitingRef.current;

  // canShowWelcome false olunca exit animasyonunu başlat
  // (render fonksiyonu içinde setState yasak — useEffect zorunlu)
  useEffect(() => {
    if (!canShowWelcome && welcomeShownRef.current && !isWelcomeExitingRef.current) {
      isWelcomeExitingRef.current = true;
      setIsWelcomeExiting(true);
    }
  }, [canShowWelcome]);

  const handleWelcomeExitComplete = useCallback(() => {
    welcomeShownRef.current = false;
    isWelcomeExitingRef.current = false;
    setIsWelcomeExiting(false);
  }, []);

  useEffect(() => () => { void Speech.stop(); }, []);

  useLayoutEffect(() => {
    const prev = prevChatIdRef.current;
    prevChatIdRef.current = chatId ?? null;

    // First mount — nothing to reset
    if (prev === undefined) return;

    // New chat creation (null → id) during active stream — skip reset
    // so lastStreamingMsgIdRef / prevCountRef stay intact mid-stream.
    // Reset only happens for real session switches (id → differentId).
    if (prev === null && chatId != null && isStreamingActive) return;

    prevCountRef.current = 0;
    unreadCountRef.current = 0;
    isAtLatestRef.current = true;
    userHasScrolledRef.current = false;
    lastStreamingMsgIdRef.current = null;
    welcomeShownRef.current = false;
    isWelcomeExitingRef.current = false;
    setIsWelcomeExiting(false);
    onScrollStateChange?.(false, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const total = messages.length + (optimisticUserMsg ? 1 : 0) + (streamingMessageId ? 1 : 0);
    const prev = prevCountRef.current;
    if (total === prev || total === 0) return;
    const added = total - prev;
    prevCountRef.current = total;

    if (!isAtLatestRef.current && added > 0) {
      unreadCountRef.current += added;
      onScrollStateChange?.(true, unreadCountRef.current);
    }
  }, [messages.length, optimisticUserMsg, streamingMessageId]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    userHasScrolledRef.current = true;
    const offsetY = e.nativeEvent.contentOffset.y;
    const atLatest = offsetY < AT_TOP_THRESHOLD;
    isAtLatestRef.current = atLatest;
    if (atLatest) {
      unreadCountRef.current = 0;
      onScrollStateChange?.(false, 0);
    }
  }, [onScrollStateChange]);

  const handleEndReached = useCallback(() => {
    if (!userHasScrolledRef.current) return;
    if (hasMore && !isLoadingMore && onLoadMore) onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleScrollToLatest = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    unreadCountRef.current = 0;
    onScrollStateChange?.(false, 0);
  }, [onScrollStateChange]);

  useEffect(() => {
    if (onScrollToLatestRef) {
      onScrollToLatestRef.current = handleScrollToLatest;
    }
  }, [onScrollToLatestRef, handleScrollToLatest]);

  const handleSpeakToggle = useCallback((messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      void Speech.stop();
      setSpeakingMessageId(null);
      return;
    }
    void Speech.stop();
    const plain = stripTextForSpeech(text);
    if (!plain.trim()) return;
    const locale = speechLocaleForAppLang(i18n.language);
    setSpeakingMessageId(messageId);
    Speech.speak(plain, {
      language: locale,
      rate: 0.96,
      onDone: () => setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
      onStopped: () => setSpeakingMessageId((cur) => (cur === messageId ? null : cur)),
      onError: () => {
        setSpeakingMessageId((cur) => (cur === messageId ? null : cur));
        toast.error('Ses çalınamadı');
      },
    });
  }, [speakingMessageId]);

  // lastStreamingMsgIdRef'i renderItem dışında güncelle — render sırasında side-effect yasak
  useEffect(() => {
    if (streamingMessageId) {
      lastStreamingMsgIdRef.current = streamingMessageId;
    }
  }, [streamingMessageId]);

  // speakingMessageId'yi ref'te tut — renderItem dep array'inden çıkar
  const speakingMessageIdRef = useRef(speakingMessageId);
  useEffect(() => { speakingMessageIdRef.current = speakingMessageId; }, [speakingMessageId]);
  const handleSpeakToggleRef = useRef(handleSpeakToggle);
  useEffect(() => { handleSpeakToggleRef.current = handleSpeakToggle; }, [handleSpeakToggle]);

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isStreamingItem = !!streamingMessageId && item.id === streamingMessageId;
    const isOptimisticUserItem = !!optimisticUserMsgId && item.id === optimisticUserMsgId;
    const wasStreamingItem = item.id === lastStreamingMsgIdRef.current;

    // Streaming item → StreamingBubble (UI thread animasyonu)
    if (isStreamingItem && isStreamingActive && pendingStreamSV && isStreamingDoneSV && streamResetCountSV && onStreamingComplete) {
      return (
        <StreamingBubble
          pendingSV={pendingStreamSV}
          isStreamingDoneSV={isStreamingDoneSV}
          streamResetCountSV={streamResetCountSV}
          onComplete={onStreamingComplete}
        />
      );
    }

    // FlatList inverted — index 0 en son mesaj
    const isLastMessage = index === 0;

    return (
      <MessageBubble
        message={item}
        onLike={onLike}
        onRegenerate={onRegenerate}
        isSpeaking={speakingMessageIdRef.current === item.id}
        skipEntryAnimation={isStreamingItem || isOptimisticUserItem || wasStreamingItem}
        hideFooter={isStreamingItem}
        hideModelLabel={isLastMessage || wasStreamingItem}
        onSpeakToggle={
          item.role === 'assistant' && item.content.trim().length > 0
            ? () => handleSpeakToggleRef.current(item.id, item.content)
            : undefined
        }
      />
    );
  }, [
    streamingMessageId,
    isStreamingActive,
    optimisticUserMsgId,
    pendingStreamSV,
    isStreamingDoneSV,
    streamResetCountSV,
    onStreamingComplete,
    onLike,
    onRegenerate,
  ]);

  if (isSessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityThyLoading mode="float" size={48} />
      </View>
    );
  }

  // Streaming item: gerçek mesaj cache'e girince gösterme.
  // streamingMessageId artık gerçek assistant ID'si olabilir (ya da henüz meta gelmemişse 'streaming').
  // Her iki durumda da ID eşleşince placeholder'ı gizle.
  const streamingAlreadyInMessages = !!streamingMessageId &&
    streamingMessageId !== 'streaming' &&
    messages.some((m) => m.id === streamingMessageId);

  // Streaming item için placeholder — StreamingBubble kendi içeriğini yönetiyor
  const streamingPlaceholder: Message | null = (!streamingAlreadyInMessages && streamingMessageId && isStreamingActive)
    ? { id: streamingMessageId, role: 'assistant', content: '', timestamp: Date.now() }
    : null;

  const displayMessages: Message[] = [
    ...(streamingPlaceholder ? [streamingPlaceholder] : []),
    ...(optimisticUserMsg ? [optimisticUserMsg] : []),
    ...messages.slice().reverse(),
  ];

  // WelcomePanel overlay için greeting'i parçala
  const welcomeOverlay = showWelcome && welcomeGreeting && welcomeQuestion && onQuickActionPress
    ? (() => {
        const spaceIdx = welcomeGreeting.indexOf(' ');
        const greetingPrefix = spaceIdx !== -1 ? welcomeGreeting.slice(0, spaceIdx) : welcomeGreeting;
        const greetingName = spaceIdx !== -1 ? welcomeGreeting.slice(spaceIdx + 1) : '';
        return { greetingPrefix, greetingName };
      })()
    : null;

  return (
    <View style={styles.fill}>
      {/* FlatList always mounted — pre-warmed behind welcome overlay */}
      <FlatList
        ref={listRef}
        data={displayMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={null}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={10}
      />

      {/* Empty state overlay */}
      {!hasContent && !showWelcome && !isSessionLoading && !isWelcomeExiting && (
        <View style={[styles.center, styles.welcomeOverlay]} pointerEvents="none">
          <Text variant="h4" align="center" color={colors.text}>Nasıl yardımcı olabilirim?</Text>
          <Text variant="body" align="center" color={colors.textSecondary} style={styles.emptySubtitle}>
            Bir şeyler sormaya başlayın
          </Text>
        </View>
      )}

      {/* WelcomePanel: absolute overlay — FlatList pre-warmed behind it */}
      {welcomeOverlay && (
        <View style={styles.welcomeOverlay}>
          <HomeWelcomePanel
            greetingPrefix={welcomeOverlay.greetingPrefix}
            greetingName={welcomeOverlay.greetingName}
            greetingReady={welcomeGreetingReady}
            question={welcomeQuestion!}
            quickActions={quickActions}
            onQuickActionPress={onQuickActionPress!}
            isExiting={isWelcomeExiting}
            onExitComplete={handleWelcomeExitComplete}
          />
        </View>
      )}
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
  welcomeOverlay: {
    ...StyleSheet.absoluteFillObject,
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
