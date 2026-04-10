import React, { useState, useCallback, useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { ChatLayout } from '@/templates/ChatLayout';
import { MessageList } from '@/organisms/MessageList';
import { ChatInput } from '@/organisms/ChatInput';
import { AppHeader } from '@/organisms/AppHeader';
import { ModelSelector } from '@/molecules/ModelSelector';
import { Avatar } from '@/atoms/Avatar';
import { useChatSession } from '@/hooks/useChatSession';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { ChatHistoryDrawer } from '@/organisms/ChatHistoryDrawer';

export default function HomeScreen() {
  const { user, isGuest } = useAuth();
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
          onPress={() => {
            // Profil/drawer aksiyonu sonraki adımda bağlanacak.
          }}
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
            onModelSelectorPress={() => setModelSelectorVisible(true)}
            selectedModel={selectedModel}
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
