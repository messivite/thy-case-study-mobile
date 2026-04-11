import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { InfiniteData } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSessionId, clearMessages } from '@/store/slices/chatSlice';
import {
  useCreateChatMutation,
  useInfiniteChatsQuery,
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

const toLocalMessage = (msg: ChatMessage, index: number): Message => ({
  id: msg.id ?? `msg_${msg.createdAt ?? index}_${msg.role}`,
  role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
  content: msg.content ?? '',
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
  const isGuest = useAppSelector((s) => s.auth.status === 'guest');

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

  // Session değişince in-flight stream'i kes (mesajları silme — diğer sessionlar korunsun)
  useEffect(() => {
    const prev = prevSessionIdRef.current;
    if (prev !== chatId) {
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
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
        id: `optimistic_user_${Date.now()}`,
        role: 'user',
        content,
        provider: selectedAIModel.provider,
        model: selectedAIModel.model,
        createdAt: new Date().toISOString(),
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
          // messages are newest→oldest (direction: 'older'), prepend = newest position
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
    console.log('[useChatSession] chatId:', chatId);
    console.log('[useChatSession] messagesQuery.data:', JSON.stringify(messagesQuery.data?.pages?.map(p => p.messages?.length)));
    console.log('[useChatSession] isLoading:', messagesQuery.isLoading, 'isFetching:', messagesQuery.isFetching);
    if (!messagesQuery.data) return [];
    const flat = messagesQuery.data.pages
      .flatMap((page) => page?.messages ?? [])
      .filter((msg): msg is ChatMessage => !!msg && typeof msg.role === 'string')
      .map(toLocalMessage);
    console.log('[useChatSession] persistedMessages count:', flat.length);
    return flat;
  }, [messagesQuery.data, chatId]);

  // Stream mesajını geçici olarak listeye ekle
  const messages: Message[] = useMemo(() => {
    if (!isStreamingActive || !streamingContent) return persistedMessages;

    const streamMsg: Message = {
      id: streamingMessageId ?? 'streaming',
      role: 'assistant',
      content: streamingContent,
      timestamp: Date.now(),
    };
    // messages are newest→oldest, stream msg is newest so prepend
    return [streamMsg, ...persistedMessages];
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

                const now = Date.now();
                const assistantMsg: ChatMessage = {
                  role: 'assistant',
                  content: assistantContent,
                  provider,
                  model,
                };

                const userMsgWithMeta: ChatMessage = {
                  ...userMsg,
                  id: `user_${now - 1}`,
                  createdAt: new Date(now - 1).toISOString(),
                };
                const assistantMsgWithMeta: ChatMessage = {
                  ...assistantMsg,
                  id: `assistant_${now}`,
                  createdAt: new Date(now).toISOString(),
                };

                // Cache'e direkt ekle — invalidateQueries yerine. Re-fetch duplicate'i önler.
                // Optimistic user mesajı zaten cache[0] başında, assistant'ı da ekle.
                queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
                  CHAT_QUERY_KEYS.messages(activeChatId!),
                  (old) => {
                    const base: InfiniteData<PaginatedMessagesResponse> = old ?? {
                      pages: [{ messages: [], nextCursor: null, hasMore: false }],
                      pageParams: [undefined],
                    };
                    const newPages = [...base.pages];
                    // assistant mesajı en yeni → pages[0] başına ekle
                    newPages[0] = {
                      ...newPages[0],
                      messages: [assistantMsgWithMeta, ...newPages[0].messages],
                    };
                    return { ...base, pages: newPages };
                  },
                );

                // Realm'e kaydet
                realmService.saveMessages(activeChatId!, [userMsgWithMeta, assistantMsgWithMeta]);

                // Chat listesi güncelle (title refresh için)
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
      // Eski (önceki) session'ın stale cache'ini temizle, yeni session'ın cache'ine dokunma
      if (sessionId) {
        queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.messages(sessionId) });
      }
      dispatch(setSessionId(id));
    },
    [sessionId, dispatch, queryClient],
  );

  const likeMessage = useCallback((_id: string, _liked: boolean | null) => {
    // TODO: API entegrasyonu
  }, []);

  const isTyping = streamingEnabled ? isStreamingActive : sendMessageMutation.isPending;

  // Seçili session'ın başlığı — chatsList query'sine subscribe eder, reaktif
  const { data: chatsData } = useInfiniteChatsQuery(isGuest);
  const sessionTitle = useMemo(() => {
    if (!chatId || !chatsData) return null;
    for (const page of chatsData.pages) {
      const found = page.items?.find((s) => s.id === chatId);
      if (found) return found.title;
    }
    return null;
  }, [chatId, chatsData]);

  return {
    messages,
    selectedAIModel,
    isTyping,
    chatId,
    sessionTitle,
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
    isFetching: messagesQuery.isFetching,
  };
};
