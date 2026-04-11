import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-native';
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
import { streamChat, getChatMessages } from '@/api/chat.api';
import { Attachment, Message } from '@/types/chat.types';
import { ChatMessage } from '@/types/chat.api.types';
import { toast } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// API newest→oldest sıralı döndürür, biz de aynı sırayı koruyoruz.
// FlashList inverted=true ile gösterilir — hiç manipülasyon yok.
const toLocalMessage = (msg: ChatMessage): Message => ({
  id: msg.id ?? `msg_${msg.createdAt}_${msg.role}`,
  role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
  content: msg.content ?? '',
  timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
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
  const streamingContentRef = useRef('');
  // onMeta'dan gelen gerçek assistant message ID'si — FlatList key reuse için
  const streamingMsgIdRef = useRef<string>('streaming');
  // onMeta'dan gelen gerçek user message ID'si — optimistic key reuse için
  const optimisticUserMsgRef = useRef<Message | null>(null);
  // messages'ın güncel sayısını ref'te tut — sendMessage callback'i stale closure yakalamaz
  const messagesCountRef = useRef(0);
  // rAF throttle — her frame'de bir setState
  const rafRef = useRef<number | null>(null);
  // Optimistic user message — cache'e karıştırmadan ayrı tut
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<Message | null>(null);

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

  // ---------------------------------------------------------------------------
  // Flatten paginated messages
  // API eski→yeni sıralı döndürür (direction=older + sunucu tarafı reverse).
  // pages[0] = en yeni blok, pages[1] = daha eski blok (yukarı scroll ile gelir).
  // flatMap sonrası: pages[0] eski→yeni, pages[1] daha eski→yeni — ters sırada birleşir.
  // ---------------------------------------------------------------------------

  const messages: Message[] = useMemo(() => {
    if (!messagesQuery.data) return [];

    // pages[0] = en yeni blok, pages[1+] = daha eski bloklar (yukarı scroll ile eklenir)
    // Eski bloklar önce, yeni blok sonda olacak şekilde pages'i ters çevir
    const allMsgs = [...messagesQuery.data.pages].reverse().flatMap((page) => page?.messages ?? []);

    const seen = new Set<string>();
    const result = allMsgs
      .filter((msg): msg is ChatMessage => !!msg && typeof msg.role === 'string')
      .filter((msg) => {
        const key = msg.id ?? `${msg.createdAt}_${msg.role}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(toLocalMessage);

    messagesCountRef.current = result.length;
    return result;
  }, [messagesQuery.data]);

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

      // Optimistic user mesajını göster — cache'e karıştırma
      const optimisticUser: Message = {
        id: `optimistic_user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      optimisticUserMsgRef.current = optimisticUser;
      setOptimisticUserMsg(optimisticUser);

      if (streamingEnabled) {
        // ── Stream modu ─────────────────────────────────────────────
        streamingContentRef.current = '';
        setStreamingContent('');
        setIsStreamingActive(true);

        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;

        streamingMsgIdRef.current = 'streaming'; // reset
        try {
          await streamChat(
            activeChatId,
            { provider, model, messages: [{ role: 'user', content }] },
            {
              onMeta: (meta) => {
                // Assistant ID — bir kez set et, override etme (backend iki kez gönderebilir)
                if (meta?.assistantMessageId && streamingMsgIdRef.current === 'streaming') {
                  streamingMsgIdRef.current = meta.assistantMessageId;
                }
                // User ID — bir kez set et
                if (meta?.userMessageId && optimisticUserMsgRef.current?.id !== meta.userMessageId) {
                  const updated = { ...optimisticUserMsgRef.current!, id: meta.userMessageId };
                  optimisticUserMsgRef.current = updated;
                  setOptimisticUserMsg(updated);
                }
              },
              onDelta: (delta) => {
                streamingContentRef.current += delta;
                // rAF throttle — her frame'de bir kez React state güncelle (smooth typewriter)
                if (rafRef.current === null) {
                  rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    setStreamingContent(streamingContentRef.current);
                  });
                }
              },
              onDone: () => {
                abortCtrlRef.current = null;
                if (rafRef.current !== null) {
                  cancelAnimationFrame(rafRef.current);
                  rafRef.current = null;
                }
                // Son delta'ları flush et
                setStreamingContent(streamingContentRef.current);

                // Fetch et, cache'e yaz → tek batch'te her şeyi kapat
                // limit: mevcut mesaj sayısı + 2 (user+assistant) → liste kaymasın
                const fetchLimit = Math.max(40, messagesCountRef.current + 2);
                getChatMessages(activeChatId!, { limit: fetchLimit, direction: 'older' })
                  .then((result) => {
                    // Tek render: setQueryData + tüm state temizliği
                    // filteredMessages=messages (optimistic null) + streamingAlreadyInMessages=true
                    // → FlatList real user + real assistant'ı direkt görür, flash yok
                    unstable_batchedUpdates(() => {
                      queryClient.setQueryData(
                        CHAT_QUERY_KEYS.messages(activeChatId!),
                        { pages: [result], pageParams: [undefined] },
                      );
                      streamingContentRef.current = '';
                      setStreamingContent('');
                      setOptimisticUserMsg(null);
                      setIsStreamingActive(false);
                    });
                    queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
                  })
                  .catch(() => {
                    unstable_batchedUpdates(() => {
                      streamingContentRef.current = '';
                      setStreamingContent('');
                      setIsStreamingActive(false);
                      setOptimisticUserMsg(null);
                    });
                    queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(activeChatId!) });
                    queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
                  });
              },
              onError: (err) => {
                if (rafRef.current !== null) {
                  cancelAnimationFrame(rafRef.current);
                  rafRef.current = null;
                }
                streamingContentRef.current = '';
                setStreamingContent('');
                setIsStreamingActive(false);
                setOptimisticUserMsg(null);
                abortCtrlRef.current = null;
                if (err !== 'aborted') {
                  console.error('[useChatSession] stream error:', err);
                  toast.error('Mesaj gönderilemedi');
                }
              },
            },
            ctrl.signal,
          );
        } catch {
          streamingContentRef.current = '';
          setStreamingContent('');
          setIsStreamingActive(false);
          setOptimisticUserMsg(null);
          toast.error('Mesaj gönderilemedi');
        }
      } else {
        // ── Non-stream modu ──────────────────────────────────────────
        sendMessageMutation.mutate(
          { provider, model, messages: [{ role: 'user', content }] },
          {
            onSuccess: (data) => {
              setOptimisticUserMsg(null);
              // API'den gerçek cevap geldi — cache'i invalide et, API fetch tetikle
              queryClient.invalidateQueries({
                queryKey: CHAT_QUERY_KEYS.messages(activeChatId!),
              });
              queryClient.invalidateQueries({
                queryKey: CHAT_QUERY_KEYS.chatsList,
              });
            },
            onError: () => {
              setOptimisticUserMsg(null);
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
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamingContentRef.current = '';
    streamingMsgIdRef.current = 'streaming';
    optimisticUserMsgRef.current = null;
    setStreamingContent('');
    setIsStreamingActive(false);
    setOptimisticUserMsg(null);
    dispatch(setSessionId(null));
    dispatch(clearMessages());
  }, [dispatch]);

  const loadSession = useCallback(
    (id: string) => {
      if (id === sessionId) return;
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      streamingContentRef.current = '';
      streamingMsgIdRef.current = 'streaming';
      optimisticUserMsgRef.current = null;
      setStreamingContent('');
      setIsStreamingActive(false);
      setOptimisticUserMsg(null);
      dispatch(setSessionId(id));
    },
    [sessionId, dispatch],
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
    optimisticUserMsg,
    isStreamingActive,
    // assistantMessageId gelene kadar streamingMessage gösterme — key değişimi flash yaratır
    streamingMessage: (isStreamingActive && streamingContent && streamingMsgIdRef.current !== 'streaming')
      ? { id: streamingMsgIdRef.current, role: 'assistant' as const, content: streamingContent, timestamp: Date.now() }
      : null,
    streamingMessageId: (isStreamingActive && streamingMsgIdRef.current !== 'streaming') ? streamingMsgIdRef.current : null,
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
