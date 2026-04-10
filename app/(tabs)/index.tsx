import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
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
          onPress={() => {
            // Drawer/chat history akışı bir sonraki adımda bağlanacak.
          }}
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
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    borderRadius: 999,
    overflow: 'hidden',
  },
});
