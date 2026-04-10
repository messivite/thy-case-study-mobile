import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedModel, clearMessages } from '@/store/slices/chatSlice';
import {
  useCreateChatMutation,
  useInfiniteMessagesQuery,
  useSendMessageMutation,
  CHAT_QUERY_KEYS,
} from '@/hooks/api/useChats';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat } from '@/api/chat.api';
import { AIModelId, AI_MODELS } from '@/constants/models';
import { Attachment } from '@/types/chat.types';
import { Message } from '@/types/chat.types';
import { ChatMessage } from '@/types/chat.api.types';
import { realmService } from '@/services/realm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toLocalMessage = (msg: ChatMessage, index: number): Message => ({
  id: `msg_${index}_${msg.role}`,
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
  modelId: providerToModelId(msg.provider),
  timestamp: Date.now() - index * 1000,
});

const providerToModelId = (provider: string): AIModelId => {
  const map: Record<string, AIModelId> = {
    google: 'gemini',
    gemini: 'gemini',
    openai: 'gpt',
    anthropic: 'claude',
  };
  return map[provider?.toLowerCase()] ?? 'custom';
};

const modelIdToProvider = (modelId: AIModelId): string => {
  const map: Record<AIModelId, string> = {
    gemini: 'google',
    gpt: 'openai',
    claude: 'anthropic',
    custom: 'custom',
  };
  return map[modelId];
};

const modelIdToModelName = (modelId: AIModelId): string => {
  const map: Record<AIModelId, string> = {
    gemini: 'gemini-2.5-flash',
    gpt: 'gpt-4.1-mini',
    claude: 'claude-sonnet-4-20250514',
    custom: 'custom-model',
  };
  return map[modelId];
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useChatSession = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const selectedModel = useAppSelector((s) => s.chat.selectedModel);
  const streamingEnabled = useAppSelector((s) => s.settings.streamingEnabled);

  const [chatId, setChatId] = useState<string | null>(null);
  const prevChatIdRef = useRef<string | null>(null);

  // Stream state
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Ref — onDone closure'da güncel content'e erişmek için
  const streamingContentRef = useRef('');

  // Mutations
  const createChatMutation = useCreateChatMutation();
  const sendMessageMutation = useSendMessageMutation(chatId ?? '');

  // Messages query
  const messagesQuery = useInfiniteMessagesQuery(chatId ?? '');

  // Session değişince eski session'ın mesajlarını Realm'den temizle
  useEffect(() => {
    const prev = prevChatIdRef.current;
    if (prev && prev !== chatId) {
      realmService.clearSessionMessages(prev);
    }
    prevChatIdRef.current = chatId;
  }, [chatId]);

  // Realm'e mesajları yaz — data gelince sync et
  useEffect(() => {
    if (!chatId || !messagesQuery.data) return;
    const allMessages = messagesQuery.data.pages.flatMap((p) => p.messages);
    if (allMessages.length > 0) {
      realmService.saveMessages(chatId, allMessages);
    }
  }, [chatId, messagesQuery.data]);

  // Flatten paginated messages — oldest first for display
  const persistedMessages: Message[] = useMemo(() => {
    if (!messagesQuery.data) return [];
    return messagesQuery.data.pages
      .flatMap((page) => page.messages)
      .map(toLocalMessage)
      .reverse();
  }, [messagesQuery.data]);

  // Stream mesajını geçici olarak listeye ekle
  const messages: Message[] = useMemo(() => {
    if (!isStreamingActive || !streamingContent) return persistedMessages;

    const streamMsg: Message = {
      id: streamingMessageId ?? 'streaming',
      role: 'assistant',
      content: streamingContent,
      modelId: selectedModel,
      timestamp: Date.now(),
    };
    return [...persistedMessages, streamMsg];
  }, [persistedMessages, isStreamingActive, streamingContent, streamingMessageId, selectedModel]);

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string, _attachments: Attachment[] = []) => {
      const provider = modelIdToProvider(selectedModel);
      const model = modelIdToModelName(selectedModel);

      let activeChatId = chatId;

      // İlk mesajda yeni chat oluştur
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

      const userMsg: ChatMessage = { role: 'user', content, provider, model };

      if (streamingEnabled) {
        // ── Stream modu ──────────────────────────────────────────────
        setIsStreamingActive(true);
        setStreamingContent('');
        setStreamingMessageId(null);

        streamingContentRef.current = '';

        try {
          await streamChat(
            activeChatId,
            { provider, model, messages: [{ role: 'user', content }] },
            {
              onMeta: (meta) => {
                setStreamingMessageId(meta.assistantMessageId);
              },
              onDelta: (delta) => {
                streamingContentRef.current += delta;
                setStreamingContent((prev) => prev + delta);
              },
              onDone: () => {
                const assistantContent = streamingContentRef.current;
                streamingContentRef.current = '';
                setIsStreamingActive(false);
                setStreamingContent('');
                setStreamingMessageId(null);
                // Realm'e user + assistant mesajlarını yaz
                const assistantMsg: ChatMessage = { role: 'assistant', content: assistantContent, provider, model };
                realmService.saveMessages(activeChatId!, [userMsg, assistantMsg]);
                queryClient.invalidateQueries({
                  queryKey: CHAT_QUERY_KEYS.messages(activeChatId!),
                });
                queryClient.invalidateQueries({
                  queryKey: CHAT_QUERY_KEYS.chatsList,
                });
              },
              onError: () => {
                streamingContentRef.current = '';
                setIsStreamingActive(false);
                setStreamingContent('');
              },
            },
          );
        } catch {
          setIsStreamingActive(false);
          setStreamingContent('');
        }
      } else {
        // ── Non-stream modu ──────────────────────────────────────────
        sendMessageMutation.mutate(
          { provider, model, messages: [{ role: 'user', content }] },
          {
            onSuccess: (data) => {
              const assistantMsg: ChatMessage = {
                role: data.assistantMessage.role,
                content: data.assistantMessage.content,
                provider: data.assistantMessage.provider,
                model: data.assistantMessage.model,
              };
              realmService.saveMessages(activeChatId!, [userMsg, assistantMsg]);
              queryClient.invalidateQueries({
                queryKey: CHAT_QUERY_KEYS.chatsList,
              });
            },
          },
        );
      }
    },
    [chatId, selectedModel, streamingEnabled, createChatMutation, sendMessageMutation, queryClient],
  );

  // ---------------------------------------------------------------------------
  // Diğer aksiyonlar
  // ---------------------------------------------------------------------------

  const changeModel = useCallback(
    (modelId: AIModelId) => {
      dispatch(setSelectedModel(modelId));
    },
    [dispatch],
  );

  const startNewChat = useCallback(() => {
    setChatId(null);
    setIsStreamingActive(false);
    setStreamingContent('');
    dispatch(clearMessages());
  }, [dispatch]);

  const likeMessage = useCallback((_id: string, _liked: boolean | null) => {
    // TODO: API entegrasyonu
  }, []);

  const isTyping = streamingEnabled ? isStreamingActive : sendMessageMutation.isPending;

  return {
    messages,
    selectedModel,
    isTyping,
    chatId,
    sendMessage,
    changeModel,
    startNewChat,
    likeMessage,
    // Infinite scroll (eskiye doğru)
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
  };
};
