import { useState, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedModel, clearMessages } from '@/store/slices/chatSlice';
import { useCreateChatMutation, useInfiniteMessagesQuery, useSendMessageMutation } from '@/hooks/api/useChats';
import { AIModelId, AI_MODELS } from '@/constants/models';
import { Attachment } from '@/types/chat.types';
import { Message } from '@/types/chat.types';
import { ChatMessage } from '@/types/chat.api.types';

/** API ChatMessage -> local UI Message dönüşümü */
const toLocalMessage = (msg: ChatMessage, index: number): Message => ({
  id: `msg_${index}_${msg.role}`,
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
  modelId: providerToModelId(msg.provider),
  timestamp: Date.now() - index * 1000,
});

/** provider string -> AIModelId mapping */
const providerToModelId = (provider: string): AIModelId => {
  const map: Record<string, AIModelId> = {
    google: 'gemini',
    gemini: 'gemini',
    openai: 'gpt',
    anthropic: 'claude',
  };
  return map[provider.toLowerCase()] ?? 'custom';
};

/** AIModelId -> API provider string */
const modelIdToProvider = (modelId: AIModelId): string => {
  const map: Record<AIModelId, string> = {
    gemini: 'google',
    gpt: 'openai',
    claude: 'anthropic',
    custom: 'custom',
  };
  return map[modelId];
};

/** AIModelId -> API model name */
const modelIdToModelName = (modelId: AIModelId): string => {
  const map: Record<AIModelId, string> = {
    gemini: 'gemini-2.5-flash',
    gpt: 'gpt-4.1-mini',
    claude: 'claude-sonnet-4-20250514',
    custom: 'custom-model',
  };
  return map[modelId];
};

export const useChatSession = () => {
  const dispatch = useAppDispatch();
  const selectedModel = useAppSelector((s) => s.chat.selectedModel);

  const [chatId, setChatId] = useState<string | null>(null);

  // Mutations
  const createChatMutation = useCreateChatMutation();
  const sendMessageMutation = useSendMessageMutation(chatId ?? '');

  // Infinite query for messages
  const messagesQuery = useInfiniteMessagesQuery(chatId ?? '');

  // Flatten paginated messages into single array
  const messages: Message[] = useMemo(() => {
    if (!messagesQuery.data) return [];
    return messagesQuery.data.pages
      .flatMap((page) => page.messages)
      .map(toLocalMessage)
      .reverse(); // oldest first for display
  }, [messagesQuery.data]);

  const sendMessage = useCallback(
    async (content: string, _attachments: Attachment[] = []) => {
      const provider = modelIdToProvider(selectedModel);
      const model = modelIdToModelName(selectedModel);

      let activeChatId = chatId;

      // Create chat on first message
      if (!activeChatId) {
        try {
          const chat = await createChatMutation.mutateAsync({
            title: content.slice(0, 50),
            provider,
            model,
          });
          activeChatId = chat.id;
          setChatId(chat.id);
        } catch {
          return;
        }
      }

      // Send message (optimistic UI handled by mutation)
      sendMessageMutation.mutate({
        provider,
        model,
        messages: [{ role: 'user', content }],
      });
    },
    [chatId, selectedModel, createChatMutation, sendMessageMutation],
  );

  const changeModel = useCallback(
    (modelId: AIModelId) => {
      dispatch(setSelectedModel(modelId));
    },
    [dispatch],
  );

  const startNewChat = useCallback(() => {
    setChatId(null);
    dispatch(clearMessages());
  }, [dispatch]);

  const likeMessage = useCallback((_id: string, _liked: boolean | null) => {
    // TODO: API entegrasyonu
  }, []);

  return {
    messages,
    selectedModel,
    isTyping: sendMessageMutation.isPending,
    chatId,
    sendMessage,
    changeModel,
    startNewChat,
    likeMessage,
    // Infinite scroll
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
  };
};
