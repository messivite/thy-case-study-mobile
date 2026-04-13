import React, { useRef, useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, ScrollView, Platform, AppState, AppStateStatus, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { Message } from '@/types/chat.types';
import { MessageBubble } from '@/molecules/MessageBubble';
import { StreamingBubble } from '@/molecules/StreamingBubble';
import { Text } from '@/atoms/Text';
import { HomeWelcomePanel, WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { stripTextForSpeech } from '@/lib/chatSpeech';
import { toast } from '@/lib/toast';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';

const AT_TOP_THRESHOLD = 80;
const STREAMING_KEY = '__streaming__';


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
  lastStreamTextRef?: React.RefObject<string>;
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
  onQueuedPress?: () => void;
};

const MessageListInner: React.FC<Props> = ({
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
  lastStreamTextRef,
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
  onQueuedPress,
}) => {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<Message>>(null);
  // Web uses a ScrollView — separate ref to avoid FlatList type conflicts
  const webScrollRef = useRef<ScrollView>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  // Son streaming'in gerçek mesaj ID'si — streaming bittikten sonra placeholder için tutulur
  const [lastStreamingMsgId, setLastStreamingMsgId] = useState<string | null>(null);
  const isAtLatestRef = useRef(true);
  const prevCountRef = useRef(0);
  const unreadCountRef = useRef(0);
  // Streaming başında var olan mesaj ID'leri — placeholder aktifken eski mesajları filtrele
  const preStreamMsgIdsRef = useRef<Set<string>>(new Set());
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

  // canShowWelcome false olunca paneli hemen kaldır — exit animasyonu optimistic UI ile çakışıyor
  useEffect(() => {
    if (!canShowWelcome && welcomeShownRef.current && !isWelcomeExitingRef.current) {
      welcomeShownRef.current = false;
      isWelcomeExitingRef.current = false;
      setIsWelcomeExiting(false);
    }
  }, [canShowWelcome]);

  const handleWelcomeExitComplete = useCallback(() => {
    welcomeShownRef.current = false;
    isWelcomeExitingRef.current = false;
    setIsWelcomeExiting(false);
  }, []);

  // Unmount'ta sesi durdur
  useEffect(() => () => {
    void Speech.stop();
    speakingMessageIdStateRef.current = null;
  }, []);

  // Background'a gidince sesi durdur — sadece native (web'de tarayıcı zaten yönetiyor)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') {
        void Speech.stop();
        speakingMessageIdStateRef.current = null;
        setSpeakingMessageId(null);
      }
    });
    return () => sub.remove();
  }, []);

  useLayoutEffect(() => {
    const prev = prevChatIdRef.current;
    prevChatIdRef.current = chatId ?? null;

    // First mount — nothing to reset
    if (prev === undefined) return;

    // New chat creation (null → id) during active stream — skip reset
    // so prevCountRef stays intact mid-stream.
    // Reset only happens for real session switches (id → differentId).
    if (prev === null && chatId != null && isStreamingActive) return;

    // Chat değişince sesi durdur — önceki sohbetin sesi yeni sohbette devam etmesin
    void Speech.stop();
    speakingMessageIdStateRef.current = null;
    setSpeakingMessageId(null);

    prevCountRef.current = 0;
    unreadCountRef.current = 0;
    isAtLatestRef.current = true;
    userHasScrolledRef.current = false;
    setLastStreamingMsgId(null);
    preStreamMsgIdsRef.current = new Set();
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
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    let atLatest: boolean;
    if (Platform.OS === 'web') {
      // Web: normal scroll — "at latest" means scrolled to the bottom
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      atLatest = distanceFromBottom < AT_TOP_THRESHOLD;
    } else {
      // Native: inverted list — "at latest" means offsetY near 0 (top of inverted = newest)
      atLatest = contentOffset.y < AT_TOP_THRESHOLD;
    }
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
    if (Platform.OS === 'web') {
      webScrollRef.current?.scrollToEnd({ animated: true });
    } else {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    unreadCountRef.current = 0;
    onScrollStateChange?.(false, 0);
  }, [onScrollStateChange]);

  useEffect(() => {
    if (onScrollToLatestRef) {
      onScrollToLatestRef.current = handleScrollToLatest;
    }
  }, [onScrollToLatestRef, handleScrollToLatest]);

  // Aktif konuşma ID'sini ref'te tut — Speech callback'lerinde stale closure sorunu yaşanmasın
  const speakingMessageIdStateRef = useRef<string | null>(null);

  const handleSpeakToggle = useCallback((messageId: string, text: string) => {
    // Aynı mesaja tekrar basıldıysa durdur
    if (speakingMessageIdStateRef.current === messageId) {
      void Speech.stop();
      speakingMessageIdStateRef.current = null;
      setSpeakingMessageId(null);
      return;
    }

    const plain = stripTextForSpeech(text);
    if (!plain.trim()) return;

    // Önce yeni ID'yi kaydet — stop() onStopped callback'i gelince yeni ID'yi sıfırlamasın
    speakingMessageIdStateRef.current = messageId;
    setSpeakingMessageId(messageId);

    void Speech.stop();
    Speech.speak(plain, {
      language: 'tr-TR',
      rate: 0.96,
      onDone: () => {
        if (speakingMessageIdStateRef.current === messageId) {
          speakingMessageIdStateRef.current = null;
          setSpeakingMessageId(null);
        }
      },
      onStopped: () => {
        if (speakingMessageIdStateRef.current === messageId) {
          speakingMessageIdStateRef.current = null;
          setSpeakingMessageId(null);
        }
      },
      onError: (err) => {
        // Programatik stop (chat değişimi, background) onError tetikleyebilir — toast atma
        const isIntentional = speakingMessageIdStateRef.current !== messageId;
        if (speakingMessageIdStateRef.current === messageId) {
          speakingMessageIdStateRef.current = null;
          setSpeakingMessageId(null);
        }
        if (!isIntentional) {
          toast.error('Ses çalınamadı');
        }
      },
    });
  }, []);

  // Streaming biterken gerçek ID'yi state'e kaydet — placeholder için kullanılır
  // streamingMessageId 'streaming' sentinel ise ID bilinmiyor (stop/cancel) — kaydetme
  useEffect(() => {
    if (streamingMessageId && streamingMessageId !== 'streaming') {
      setLastStreamingMsgId(streamingMessageId);
    }
  }, [streamingMessageId]);

  // Streaming bitince en üste scroll et — yeni mesaj her zaman görünür
  // animated:false → native scroll momentum ile çakışmaz, anında konumlanır (native his).
  // Stop/cancel durumunda streamingMessageId 'streaming' sentinel'e döner —
  // lastStreamingMsgId'yi temizle ki boş placeholder kalmasın
  const prevIsStreamingRef = useRef(isStreamingActive);
  useEffect(() => {
    if (prevIsStreamingRef.current && !isStreamingActive) {
      if (Platform.OS === 'web') {
        webScrollRef.current?.scrollToEnd({ animated: false });
      } else {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      }
      // Stop ile iptal edildiyse (ID hiç set edilmedi veya sentinel'e döndü)
      if (!streamingMessageId || streamingMessageId === 'streaming') {
        setLastStreamingMsgId(null);
        preStreamMsgIdsRef.current = new Set();
      }
    }
    prevIsStreamingRef.current = isStreamingActive;
  }, [isStreamingActive, streamingMessageId]);

  // speakingMessageId'yi ref'te tut — renderItem dep array'inden çıkar
  const speakingMessageIdRef = useRef(speakingMessageId);
  useEffect(() => { speakingMessageIdRef.current = speakingMessageId; }, [speakingMessageId]);
  const handleSpeakToggleRef = useRef(handleSpeakToggle);
  useEffect(() => { handleSpeakToggleRef.current = handleSpeakToggle; }, [handleSpeakToggle]);

  // renderItem'ın dep array'ini minimumda tutmak için tüm callback/prop'ları ref'e al.
  // Bu sayede streaming, like, renk değişimi gibi dış güncellemeler tüm listeyi reconcile etmez.
  const onLikeRef = useRef(onLike);
  useEffect(() => { onLikeRef.current = onLike; }, [onLike]);
  const onRegenerateRef = useRef(onRegenerate);
  useEffect(() => { onRegenerateRef.current = onRegenerate; }, [onRegenerate]);
  const onQueuedPressRef = useRef(onQueuedPress);
  useEffect(() => { onQueuedPressRef.current = onQueuedPress; }, [onQueuedPress]);
  const colorsRef = useRef(colors);
  useEffect(() => { colorsRef.current = colors; }, [colors]);
  const isStreamingActiveRef = useRef(isStreamingActive);
  // Render sırasında da güncelle — useEffect async olduğu için STREAMING_KEY item render'ına yetişemez.
  // Ref render-time'da da okunduğu için synchronous güncelleme şart.
  isStreamingActiveRef.current = isStreamingActive;
  useEffect(() => { isStreamingActiveRef.current = isStreamingActive; }, [isStreamingActive]);
  const pendingStreamSVRef = useRef(pendingStreamSV);
  useEffect(() => { pendingStreamSVRef.current = pendingStreamSV; }, [pendingStreamSV]);
  const isStreamingDoneSVRef = useRef(isStreamingDoneSV);
  useEffect(() => { isStreamingDoneSVRef.current = isStreamingDoneSV; }, [isStreamingDoneSV]);
  const streamResetCountSVRef = useRef(streamResetCountSV);
  useEffect(() => { streamResetCountSVRef.current = streamResetCountSV; }, [streamResetCountSV]);
  const onStreamingCompleteRef = useRef(onStreamingComplete);
  useEffect(() => { onStreamingCompleteRef.current = onStreamingComplete; }, [onStreamingComplete]);

  // displayMessages'ın en üstündeki (index 0) assistant mesajının ID'si —
  // model label sadece bu mesajda gizlenir. Ref üzerinden geçilir, renderItem dep'e girmez.
  const lastAssistantIdRef = useRef<string | null>(null);

  // Dep array kasıtlı boş — tüm değerler ref üzerinden okunur.
  // Bu sayede streaming/like/renk değişimleri tüm listeyi reconcile ettirmez;
  // FlatList sadece data/extraData değişince ilgili item'ları günceller.
  const renderItem = useCallback(({ item }: { item: Message }) => {
    const isStreamingItem = item.id === STREAMING_KEY;

    const pSV = pendingStreamSVRef.current;
    const dSV = isStreamingDoneSVRef.current;
    const rSV = streamResetCountSVRef.current;
    const onComplete = onStreamingCompleteRef.current;
    if (isStreamingItem && isStreamingActiveRef.current && pSV && dSV && rSV && onComplete) {
      return (
        <StreamingBubble
          pendingSV={pSV}
          isStreamingDoneSV={dSV}
          streamResetCountSV={rSV}
          onComplete={onComplete}
        />
      );
    }

    const hideModelLabel = item.id === lastAssistantIdRef.current;

    const bubble = (
      <MessageBubble
        message={item}
        colors={colorsRef.current}
        onLike={onLikeRef.current}
        onRegenerate={onRegenerateRef.current}
        isSpeaking={speakingMessageIdRef.current === item.id}
        hideFooter={isStreamingItem}
        hideModelLabel={hideModelLabel}
        onQueuedPress={item.queued ? onQueuedPressRef.current : undefined}
        onSpeakToggle={
          item.role === 'assistant' && item.content.trim().length > 0
            ? () => handleSpeakToggleRef.current(item.id, item.content)
            : undefined
        }
      />
    );

    if (item.role === 'assistant' && !isStreamingItem) {
      return <Animated.View entering={FadeIn.duration(180)}>{bubble}</Animated.View>;
    }
    return bubble;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Streaming bittikten sonra gerçek mesaj cache'e girene kadar placeholder'ı göstermeye devam et.
  // Kullanılan ID: aktif streamingMessageId (gerçek ID) VEYA son streaming'in ID'si (lastStreamingMsgId state).
  // 'streaming' sentinel: onMeta henüz gelmedi — gerçek ID bilinmiyor, placeholder gösterme.
  const activeOrLastId = (streamingMessageId && streamingMessageId !== 'streaming')
    ? streamingMessageId
    : lastStreamingMsgId;
  const hasRealId = !!activeOrLastId;

  // Streaming başlayınca mevcut mesaj ID'lerini snapshot'la
  if (isStreamingActive && preStreamMsgIdsRef.current.size === 0 && messages.length > 0) {
    preStreamMsgIdsRef.current = new Set(messages.map((m) => m.id));
  }

  // Mesaj zaten cache'de mi? Gerçek ID varsa messages içinde ara.
  const streamingAlreadyInMessages = hasRealId && messages.some((m) => m.id === activeOrLastId);

  // Placeholder sadece streaming BİTTİKTEN SONRA göster — API gelene kadar boşluğu doldur.
  // Streaming aktifken StreamingBubble zaten displayMessages'a renderItem üzerinden giriyor,
  // ayrıca placeholder eklersek çift kart olur.
  // lastStreamTextRef boşsa stop/cancel edildi — placeholder gösterme.
  const shouldShowPlaceholder = !isStreamingActive &&
    hasRealId &&
    !streamingAlreadyInMessages &&
    !!lastStreamingMsgId &&
    !!lastStreamTextRef?.current;

  // Streaming aktifken content boş (StreamingBubble kendi yönetiyor),
  // bittikten sonra lastStreamTextRef'ten son metni al — API gelene kadar flash olmaz.
  const placeholderContent = isStreamingActive ? '' : (lastStreamTextRef?.current ?? '');



  // Streaming aktifken StreamingBubble için displayMessages'a dummy item ekle.
  // İçerik boş — renderItem içinde StreamingBubble döndürür, içeriği SV'den okur.
  // Streaming item ID'si sabit sentinel — onMeta gelince streamingMessageId değişse de
  // FlatList key değişmez, StreamingBubble unmount/remount olmaz → flash yok.
  const streamingItem: Message | null = isStreamingActive
    ? { id: STREAMING_KEY, role: 'assistant', content: '', timestamp: 0 }
    : null;

  // Streaming bittikten sonra API gelene kadar son metni gösteren placeholder.
  const streamingPlaceholder: Message | null = shouldShowPlaceholder
    ? { id: activeOrLastId!, role: 'assistant', content: placeholderContent, timestamp: Date.now() }
    : null;

  // Placeholder kalktıktan sonra state'i temizle — bir sonraki streaming için sıfırla.
  useEffect(() => {
    if (!shouldShowPlaceholder && !isStreamingActive) {
      setLastStreamingMsgId(null);
      preStreamMsgIdsRef.current = new Set();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowPlaceholder, isStreamingActive]);

  // displayMessages useMemo ile sabit referans — her render'da yeni array yaratmak FlatList'i
  // gereksiz reconcile döngüsüne sokar. Bağımlılıklar minimumda tutuldu.
  const displayMessages: Message[] = useMemo(() => {
    // Placeholder aktifken activeOrLastId'yi messages'dan çıkar — çift kart önle.
    const cachedMessages = streamingPlaceholder
      ? messages.filter((m) => m.id !== activeOrLastId)
      : messages;

    const list = [
      ...(streamingItem ? [streamingItem] : []),
      ...(streamingPlaceholder ? [streamingPlaceholder] : []),
      ...(optimisticUserMsg ? [optimisticUserMsg] : []),
      ...cachedMessages.slice().reverse(),
    ];

    // En üstteki (index 0) gerçek assistant mesajının ID'sini hesapla — model label için
    const topAssistant = list.find((m) => m.id !== STREAMING_KEY && m.role === 'assistant');
    lastAssistantIdRef.current = topAssistant?.id ?? null;

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, optimisticUserMsg, isStreamingActive, shouldShowPlaceholder, activeOrLastId]);





  // WelcomePanel overlay için greeting'i parçala
  const welcomeOverlay = showWelcome && welcomeGreeting && welcomeQuestion && onQuickActionPress
    ? (() => {
        const spaceIdx = welcomeGreeting.indexOf(' ');
        const greetingPrefix = spaceIdx !== -1 ? welcomeGreeting.slice(0, spaceIdx) : welcomeGreeting;
        const greetingName = spaceIdx !== -1 ? welcomeGreeting.slice(spaceIdx + 1) : '';
        return { greetingPrefix, greetingName };
      })()
    : null;

  if (isSessionLoading) {
    return (
      <View style={styles.center}>
        <ActivityThyLoading mode="float" size={48} />
      </View>
    );
  }

  // Web: use a regular ScrollView with oldest-first order to avoid react-native-web
  // inverted FlatList clipping/transform issues.
  if (Platform.OS === 'web') {
    // displayMessages is newest-first; reverse for top-to-bottom display
    const webMessages = [...displayMessages].reverse();
    return (
      <View style={styles.fill}>
        <ScrollView
          ref={webScrollRef}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            // Markdown gibi içerikler ilk paint'te küçük, sonra expand oluyor.
            // İki rAF bekle: ilk rAF layout commit'i, ikinci rAF markdown'ın gerçek height'ını yakalar.
            if (isAtLatestRef.current) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (isAtLatestRef.current) {
                    webScrollRef.current?.scrollToEnd({ animated: false });
                  }
                });
              });
            }
          }}
        >
          {isLoadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
          {webMessages.map((item) => (
            <React.Fragment key={item.id}>
              {renderItem({ item })}
            </React.Fragment>
          ))}
          {(isTyping && !isStreamingActive) && (
            <View style={styles.typingIndicator}>
              <ActivityThyLoading mode="pulse" size={20} />
              <Text variant="caption" color={colors.textSecondary}>Yanıt bekleniyor...</Text>
            </View>
          )}
        </ScrollView>

        {!hasContent && !showWelcome && !isSessionLoading && !isWelcomeExiting && (
          <View style={[styles.center, styles.welcomeOverlay, { pointerEvents: 'none' as const }]}>
            <Text variant="h4" align="center" color={colors.text}>Nasıl yardımcı olabilirim?</Text>
            <Text variant="body" align="center" color={colors.textSecondary} style={styles.emptySubtitle}>
              Bir şeyler sormaya başlayın
            </Text>
          </View>
        )}

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
  }

  return (
    <View style={styles.fill}>
      {/* FlatList always mounted — pre-warmed behind welcome overlay */}
      <FlatList
        ref={listRef}
        data={displayMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        // speakingMessageId değişince FlatList sadece ilgili item'ı yeniden render eder.
        // isStreamingActive: STREAMING_KEY item'ı renderItem'a doğru ref değeriyle geçmesi için.
        // renderItem callback'i yeniden oluşmaz — tüm liste reconcile'dan kurtulur.
        extraData={[speakingMessageId, isStreamingActive]}
        inverted
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          (isTyping && !isStreamingActive) ? (
            <View style={styles.typingIndicator}>
              <ActivityThyLoading mode="pulse" size={20} />
              <Text variant="caption" color={colors.textSecondary}>Yanıt bekleniyor...</Text>
            </View>
          ) : null
        }
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
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        initialNumToRender={10}
      />

      {/* Empty state overlay */}
      {!hasContent && !showWelcome && !isSessionLoading && !isWelcomeExiting && (
        <View style={[styles.center, styles.welcomeOverlay, { pointerEvents: 'none' as const }]}>
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

export const MessageList = React.memo(MessageListInner);

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
    // Web: content container'ın genişliği scroll alanına sabitlenmeli —
    // yoksa maxWidth:'75%' viewport yerine içerik genişliğini baz alıp taşıyor.
    ...(Platform.OS === 'web' && { flexGrow: 1, width: '100%' }),
  },
  loadingMore: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    marginVertical: spacing[1],
    marginHorizontal: spacing[4],
  },
  emptySubtitle: {
    marginTop: spacing[1],
    paddingHorizontal: spacing[8],
  },
});
