import React, { useState, useCallback } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { ChatLayout } from '@/templates/ChatLayout';
import { MessageList } from '@/organisms/MessageList';
import { ChatInput } from '@/organisms/ChatInput';
import { AppHeader } from '@/organisms/AppHeader';
import { ModelSelector } from '@/molecules/ModelSelector';
import { ModelBadge } from '@/atoms/Badge';
import { useChatSession } from '@/hooks/useChatSession';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { store } from '@/store';

export default function HomeScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { t } = useI18n();
  const {
    messages,
    selectedModel,
    isTyping,
    sendMessage,
    changeModel,
    startNewChat,
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

  const handleNewChat = () => {
    haptics.medium();
    startNewChat();
  };

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const header = (
    <AppHeader
      title={t('home.headerTitle')}
      leftContent={
        <TouchableOpacity
          style={styles.modelBadgeBtn}
          onPress={() => setModelSelectorVisible(true)}
        >
          <ModelBadge modelId={selectedModel} />
          <Ionicons name="chevron-down" size={14} color={palette.white} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      }
      rightIcons={[
        ...( __DEV__
          ? [
              {
                name: 'bug-outline' as const,
                onPress: () => {
                  console.log('[dev] Redux auth + full state', {
                    auth: store.getState().auth,
                    full: store.getState(),
                  });
                },
                accessibilityLabel: 'Debug: log store',
              },
            ]
          : []),
        {
          name: 'add-circle-outline',
          onPress: handleNewChat,
          accessibilityLabel: 'Yeni sohbet',
        },
      ]}
    />
  );

  return (
    <>
      <SafeAreaView style={{ backgroundColor: palette.primary }} edges={['top']} />
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
  modelBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
