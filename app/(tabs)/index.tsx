import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { ChatLayout } from '@/templates/ChatLayout';
import { MessageList } from '@/organisms/MessageList';
import { ChatInput } from '@/organisms/ChatInput';
import { ModelSelector } from '@/molecules/ModelSelector';
import { ModelBadge } from '@/atoms/Badge';
import { Text } from '@/atoms/Text';
import { useChatSession } from '@/hooks/useChatSession';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useI18n } from '@/hooks/useI18n';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

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
    <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
      <TouchableOpacity
        style={styles.modelBadgeBtn}
        onPress={() => setModelSelectorVisible(true)}
      >
        <ModelBadge modelId={selectedModel} />
        <Ionicons name="chevron-down" size={14} color={palette.white} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Text variant="h4" color={palette.white} style={{ fontFamily: fontFamily.semiBold }}>
        {t('home.headerTitle')}
      </Text>

      <TouchableOpacity onPress={handleNewChat} style={styles.newChatBtn}>
        <Ionicons name="add-circle-outline" size={24} color={palette.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <SafeAreaView style={{ backgroundColor: colors.headerBg }} edges={['top']} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  modelBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatBtn: {
    padding: spacing[1],
  },
});
