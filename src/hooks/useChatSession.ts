import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { InfiniteData } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSessionId, clearMessages } from '@/store/slices/chatSlice';
import {
  useCreateChatMutation,
  useInfiniteMessagesQuery,
  useSendMessageMutation,
  CHAT_QUERY_KEYS,
} from '@/hooks/api/useChats';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat } from '@/api/chat.api';
import { Attachment, Message } from '@/types/chat.types';
import { ChatMessage, PaginatedMessagesResponse } from '@/types/chat.api.types';
import { realmService } from '@/services/realm';
import { toast } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toLocalMessage = (
  msg: ChatMessage & { createdAt?: string; id?: string },
  index: number,
): Message => ({
  id: msg.id ?? `msg_${index}_${msg.role}`,
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
  timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now() - index * 1000,
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useChatSession = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const selectedAIModel = useAppSelector((s) => s.chat.selectedAIModel);
  const sessionId = useAppSelector((s) => s.chat.sessionId);
  const streamingEnabled = useAppSelector((s) => s.settings.streamingEnabled);

  // Okunabilirlik için alias — yazma hep dispatch(setSessionId(...)) ile
  const chatId = sessionId;

  // Stream state
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Ref — onDone closure'da güncel content'e erişmek için
  const streamingContentRef = useRef('');

  // AbortController — stream durdurma için
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Önceki session id — temizlik için
  const prevSessionIdRef = useRef<string | null>(null);

  // Mutations
  const createChatMutation = useCreateChatMutation();
  const sendMessageMutation = useSendMessageMutation(chatId ?? '');

  // Messages query
  const messagesQuery = useInfiniteMessagesQuery(chatId ?? '');

  // Session değişince eski session'ı temizle ve in-flight stream'i kes
  useEffect(() => {
    const prev = prevSessionIdRef.current;
    if (prev && prev !== chatId) {
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
      realmService.clearSessionMessages(prev);
    }
    prevSessionIdRef.current = chatId;
  }, [chatId]);

  // ---------------------------------------------------------------------------
  // Optimistic helpers
  // ---------------------------------------------------------------------------

  const addOptimisticUserMessage = useCallback(
    (activeChatId: string, content: string) => {
      const snapshot = queryClient.getQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(activeChatId),
      );

      const optimisticMsg: ChatMessage = {
        role: 'user',
        content,
        provider: selectedAIModel.provider,
        model: selectedAIModel.model,
      };

      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(activeChatId),
        (old) => {
          // Yeni session için cache boş olabilir — başlat
          const base: InfiniteData<PaginatedMessagesResponse> = old ?? {
            pages: [{ messages: [], nextCursor: null, hasMore: false }],
            pageParams: [undefined],
          };
          const newPages = [...base.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [optimisticMsg, ...newPages[0].messages],
          };
          return { ...base, pages: newPages };
        },
      );

      return snapshot;
    },
    [queryClient, selectedAIModel],
  );

  const rollbackOptimisticMessage = useCallback(
    (
      activeChatId: string,
      snapshot: InfiniteData<PaginatedMessagesResponse> | undefined,
    ) => {
      if (snapshot !== undefined) {
        queryClient.setQueryData(CHAT_QUERY_KEYS.messages(activeChatId), snapshot);
      } else {
        // Yeni session için oluşturulmuştu — tamamen kaldır
        queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.messages(activeChatId) });
      }
    },
    [queryClient],
  );

  // ---------------------------------------------------------------------------
  // Flatten paginated messages — oldest first for display
  // ---------------------------------------------------------------------------

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
      timestamp: Date.now(),
    };
    return [...persistedMessages, streamMsg];
  }, [persistedMessages, isStreamingActive, streamingContent, streamingMessageId]);

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string, _attachments: Attachment[] = []) => {
      const { provider, model } = selectedAIModel;

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
          dispatch(setSessionId(chat.id));
        } catch {
          toast.error('Sohbet oluşturulamadı');
          return;
        }
      }

      // Her iki modda da kullanıcı mesajını anında cache'e ekle
      const snapshot = addOptimisticUserMessage(activeChatId, content);

      const userMsg: ChatMessage = { role: 'user', content, provider, model };

      if (streamingEnabled) {
        // ── Stream modu ──────────────────────────────────────────────
        setIsStreamingActive(true);
        setStreamingContent('');
        setStreamingMessageId(null);
        streamingContentRef.current = '';

        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;

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
                abortCtrlRef.current = null;

                const assistantMsg: ChatMessage = {
                  role: 'assistant',
                  content: assistantContent,
                  provider,
                  model,
                };
                realmService.saveMessages(activeChatId!, [userMsg, assistantMsg]);
                queryClient.invalidateQueries({
                  queryKey: CHAT_QUERY_KEYS.messages(activeChatId!),
                });
                queryClient.invalidateQueries({
                  queryKey: CHAT_QUERY_KEYS.chatsList,
                });
              },
              onError: (err) => {
                streamingContentRef.current = '';
                setIsStreamingActive(false);
                setStreamingContent('');
                setStreamingMessageId(null);
                abortCtrlRef.current = null;
                rollbackOptimisticMessage(activeChatId!, snapshot);
                if (err !== 'aborted') {
                  toast.error('Mesaj gönderilemedi');
                }
              },
            },
            ctrl.signal,
          );
        } catch {
          streamingContentRef.current = '';
          setIsStreamingActive(false);
          setStreamingContent('');
          rollbackOptimisticMessage(activeChatId, snapshot);
          toast.error('Mesaj gönderilemedi');
        }
      } else {
        // ── Non-stream modu ──────────────────────────────────────────
        // cancelQueries önce çağrılır ki useSendMessageMutation.onMutate'in
        // snapshot'ı optimistic state'i içersin (temiz rollback için)
        await queryClient.cancelQueries({
          queryKey: CHAT_QUERY_KEYS.messages(activeChatId),
        });

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
            onError: () => {
              rollbackOptimisticMessage(activeChatId!, snapshot);
              toast.error('Mesaj gönderilemedi');
            },
          },
        );
      }
    },
    [
      chatId,
      selectedAIModel,
      streamingEnabled,
      createChatMutation,
      sendMessageMutation,
      queryClient,
      dispatch,
      addOptimisticUserMessage,
      rollbackOptimisticMessage,
    ],
  );

  // ---------------------------------------------------------------------------
  // Diğer aksiyonlar
  // ---------------------------------------------------------------------------

  const onStop = useCallback(() => {
    abortCtrlRef.current?.abort();
    // onError('aborted') tetiklenecek, oradan rollback + state temizliği yapılır
  }, []);

  const startNewChat = useCallback(() => {
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    setIsStreamingActive(false);
    setStreamingContent('');
    streamingContentRef.current = '';
    if (sessionId) {
      queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.messages(sessionId) });
    }
    dispatch(setSessionId(null));
    dispatch(clearMessages());
  }, [sessionId, dispatch, queryClient]);

  const loadSession = useCallback(
    (id: string) => {
      if (id === sessionId) return;
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
      setIsStreamingActive(false);
      setStreamingContent('');
      streamingContentRef.current = '';
      dispatch(setSessionId(id));
    },
    [sessionId, dispatch],
  );

  const likeMessage = useCallback((_id: string, _liked: boolean | null) => {
    // TODO: API entegrasyonu
  }, []);

  const isTyping = streamingEnabled ? isStreamingActive : sendMessageMutation.isPending;

  return {
    messages,
    selectedAIModel,
    isTyping,
    chatId,
    sendMessage,
    startNewChat,
    loadSession,
    onStop,
    likeMessage,
    // Infinite scroll (eskiye doğru)
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
  };
};
