import React, { useState, useCallback, useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@/lib/toast';
import { ChatLayout } from '@/templates/ChatLayout';
import { MessageList } from '@/organisms/MessageList';
import { ChatInput } from '@/organisms/ChatInput';
import { AppHeader } from '@/organisms/AppHeader';
import { ModelSelector } from '@/molecules/ModelSelector';
import { Avatar } from '@/atoms/Avatar';
import { useChatSession } from '@/hooks/useChatSession';
import { useAuth } from '@/hooks/useAuth';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { ChatHistoryDrawer } from '@/organisms/ChatHistoryDrawer';
import { WelcomeQuickAction } from '@/organisms/HomeWelcomePanel';

export default function HomeScreen() {
  const { user, isGuest } = useAuth();
  const { displayName: profileDisplayName, profileReady } = useWhoIAm();
  const { t } = useI18n();
  const {
    messages,
    selectedModel,
    isTyping,
    sendMessage,
    changeModel,
    likeMessage,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatSession();

  const [modelSelectorVisible, setModelSelectorVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Sol kenardan sağa swipe → drawer aç
  const openDrawer = useCallback(() => setDrawerVisible(true), []);
  const openDrawerGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([15, 999])
        .failOffsetY([-12, 12])
        .onEnd((e) => {
          'worklet';
          if (e.translationX > 40 && e.velocityX > 0) {
            runOnJS(openDrawer)();
          }
        }),
    [openDrawer],
  );

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

  const header = (
    <AppHeader
      title={t('assistant.title')}
      leftContent={
        <TouchableOpacity
          style={styles.menuBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => setDrawerVisible(true)}
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
  );

  return (
    <GestureDetector gesture={openDrawerGesture}>
      <View style={styles.root}>
      <ChatLayout
        header={header}
        input={
          <ChatInput
            onSend={handleSend}
            onStop={() => {/* TODO: stream abort */}}
            onModelSelectorPress={() => setModelSelectorVisible(true)}
            selectedModel={selectedModel}
            isStreaming={isTyping}
            placeholder={t('assistant.placeholder')}
          />
        }
      >
        <MessageList
          messages={messages}
          isTyping={isTyping}
          onLike={likeMessage}
          onLoadMore={handleLoadMore}
          hasMore={hasNextPage}
          isLoadingMore={isFetchingNextPage}
          welcomeGreeting={t('assistant.welcomeGreeting', { name: displayName })}
          welcomeGreetingReady={!isGuest && profileReady}
          welcomeQuestion={t('assistant.welcomeQuestion')}
          quickActions={quickActions}
          onQuickActionPress={handleQuickActionPress}
        />

      </ChatLayout>

      <ModelSelector
        visible={modelSelectorVisible}
        selectedModel={selectedModel}
        onSelect={(id) => {
          changeModel(id);
          toast.info(t('toast.modelChanged'));
        }}
        onClose={() => setModelSelectorVisible(false)}
      />

      <ChatHistoryDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
      </View>
    </GestureDetector>
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
