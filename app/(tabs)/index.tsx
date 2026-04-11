import React, { useState, useCallback, useMemo, useRef } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue } from 'react-native-reanimated';
import { ChatLayout } from '@/templates/ChatLayout';
import { MessageList } from '@/organisms/MessageList';
import { ChatInput } from '@/organisms/ChatInput';
import { AppHeader } from '@/organisms/AppHeader';
import { Avatar } from '@/atoms/Avatar';
import { useChatSession } from '@/hooks/useChatSession';
import { useAuth } from '@/hooks/useAuth';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { ChatHistoryDrawer } from '@/organisms/ChatHistoryDrawer';
import { ModelPickerSheet } from '@/organisms/ModelPickerSheet';
import { WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';
import { ScrollToBottomButton } from '@/molecules/ScrollToBottomButton';

export default function HomeScreen() {
  const { user, isGuest } = useAuth();
  const { displayName: profileDisplayName, profileReady } = useWhoIAm();
  const { t } = useI18n();
  const {
    messages,
    optimisticUserMsg,
    isStreamingActive,
    streamingMessageId,
    optimisticUserMsgId,
    pendingStreamSV,
    isStreamingDoneSV,
    streamResetCountSV,
    handleStreamingComplete,
    lastStreamTextRef,
    selectedAIModel,
    isTyping,
    isSessionLoading,
    chatId,
    sessionTitle,
    sendMessage,
    onStop,
    likeMessage,
    startNewChat,
    loadSession,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatSession();

  const [scrolledUp, setScrolledUp] = useState(false);
  // unreadCount state yerine SharedValue — sayı değişince HomeScreen re-render olmaz,
  // ScrollToBottomButton UI thread'de badge'i direkt günceller.
  const unreadCountSV = useSharedValue(0);
  const scrollToLatestRef = useRef<(() => void) | null>(null);

  const handleScrollStateChange = useCallback((isScrolledUp: boolean, count: number) => {
    unreadCountSV.value = count;
    setScrolledUp(isScrolledUp);
  }, [unreadCountSV]);

  const handleScrollToLatest = useCallback(() => {
    scrollToLatestRef.current?.();
  }, []);

  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerEverOpened, setDrawerEverOpened] = useState(false);
  const closeModelPicker = useCallback(() => setModelPickerVisible(false), []);
  const openModelPicker = useCallback(() => setModelPickerVisible(true), []);

  // Stable strings — dil değişmediği sürece yeni referans üretme
  const chatPlaceholder = useMemo(() => t('assistant.placeholder'), [t]);
  const aiModelName = useMemo(() => selectedAIModel?.displayName, [selectedAIModel?.displayName]);

  const openDrawer = useCallback(() => { setDrawerEverOpened(true); setDrawerVisible(true); }, []);
  const closeDrawer = useCallback(() => setDrawerVisible(false), []);
  const handleDrawerHidden = useCallback(() => {}, []);
  const handleSelectChat = useCallback((chat: import('@/types/chat.api.types').ChatListItem) => {
    loadSession(chat.id);
    setDrawerVisible(false);
  }, [loadSession]);

  const handleSend = useCallback(
    (text: string, attachments: import('@/types/chat.types').Attachment[]) => {
      sendMessage(text, attachments);
    },
    [sendMessage],
  );

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const quickActions = useMemo<WelcomeQuickAction[]>(
    () => [
      {
        id: 'image',
        label: `🖼️ ${t('assistant.quickActionImage')}`,
        prompt: t('assistant.quickActionImagePrompt'),
      },
      {
        id: 'music',
        label: `🎸 ${t('assistant.quickActionMusic')}`,
        prompt: t('assistant.quickActionMusicPrompt'),
      },
      {
        id: 'energy',
        label: `✨ ${t('assistant.quickActionEnergy')}`,
        prompt: t('assistant.quickActionEnergyPrompt'),
      },
      {
        id: 'video',
        label: `🎥 ${t('assistant.quickActionVideo')}`,
        prompt: t('assistant.quickActionVideoPrompt'),
      },
    ],
    [t],
  );

  const displayName = useMemo(() => {
    if (isGuest) return t('settings.guest');
    // me API'den gelen displayName once gelir, yoksa auth user.name'e fall back
    if (profileReady && profileDisplayName) return profileDisplayName;
    const raw = user?.name?.trim();
    if (!raw) return t('settings.guest');
    return raw.split(' ')[0];
  }, [isGuest, profileReady, profileDisplayName, user?.name, t]);

  const handleQuickActionPress = useCallback(
    (action: WelcomeQuickAction) => {
      handleSend(action.prompt, []);
    },
    [handleSend],
  );

  const chatInput = useMemo(() => (
    <ChatInput
      onSend={handleSend}
      onStop={onStop}
      onModelSelectorPress={openModelPicker}
      selectedAIModelName={aiModelName}
      isStreaming={isTyping}
      placeholder={chatPlaceholder}
    />
  ), [handleSend, onStop, openModelPicker, aiModelName, isTyping, chatPlaceholder]);

  const header = useMemo(() => (
    <AppHeader
      title={sessionTitle ?? t('assistant.title')}
      leftContent={
        <TouchableOpacity
          style={styles.menuBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={openDrawer}
          accessibilityRole="button"
          accessibilityLabel="Sohbet geçmişi menüsü"
        >
          <Ionicons name="menu" size={24} color={palette.white} />
        </TouchableOpacity>
      }
      rightContent={
        <TouchableOpacity
          onPress={() => router.push('/settings-sheet')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Profil"
          style={styles.avatarBtn}
        >
          <Avatar
            uri={user?.avatarUrl}
            name={isGuest ? 'G' : (user?.name ?? 'U')}
            width={30}
            height={30}
          />
        </TouchableOpacity>
      }
      subtitle={undefined}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [sessionTitle, t, openDrawer, user?.avatarUrl, user?.name, isGuest]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ChatLayout
        header={header}
        input={chatInput}
      >
        <MessageList
          chatId={chatId}
          messages={messages}
          optimisticUserMsg={optimisticUserMsg}
          isStreamingActive={isStreamingActive}
          streamingMessageId={streamingMessageId}
          optimisticUserMsgId={optimisticUserMsgId}
          pendingStreamSV={pendingStreamSV}
          isStreamingDoneSV={isStreamingDoneSV}
          streamResetCountSV={streamResetCountSV}
          onStreamingComplete={handleStreamingComplete}
          lastStreamTextRef={lastStreamTextRef}
          isTyping={isTyping}
          isSessionLoading={isSessionLoading}
          onLike={likeMessage}
          onLoadMore={handleLoadMore}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          welcomeGreeting={t('assistant.welcomeGreeting', { name: displayName })}
          welcomeGreetingReady={!isGuest && profileReady}
          welcomeQuestion={t('assistant.welcomeQuestion')}
          quickActions={chatId ? [] : quickActions}
          onQuickActionPress={handleQuickActionPress}
          onScrollStateChange={handleScrollStateChange}
          onScrollToLatestRef={scrollToLatestRef}
        />

      </ChatLayout>

      <ScrollToBottomButton
        visible={scrolledUp}
        unreadCountSV={unreadCountSV}
        onPress={handleScrollToLatest}
      />

      <ModelPickerSheet
        visible={modelPickerVisible}
        onClose={closeModelPicker}
        variant="liquidGlass"
      />

      {drawerEverOpened && (
        <ChatHistoryDrawer
          visible={drawerVisible}
          onClose={closeDrawer}
          onHidden={handleDrawerHidden}
          onNewChat={startNewChat}
          onSelectChat={handleSelectChat}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  /** AppHeader satırı scale(48); layout şişmesin, dokunma hitSlop ile kalır. */
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
