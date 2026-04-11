import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Ref — onDelta/onDone closure'da güncel content'e erişmek için
  const streamingContentRef = useRef('');
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
    return allMsgs
      .filter((msg): msg is ChatMessage => !!msg && typeof msg.role === 'string')
      .filter((msg) => {
        const key = msg.id ?? `${msg.createdAt}_${msg.role}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(toLocalMessage);
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
      setOptimisticUserMsg(optimisticUser);

      if (streamingEnabled) {
        // ── Stream modu ─────────────────────────────────────────────
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
                streamingContentRef.current = '';
                abortCtrlRef.current = null;
                setIsStreamingActive(false);
                setStreamingContent('');
                setStreamingMessageId(null);
                setOptimisticUserMsg(null);

                // Gerçek veriyi API'den çek — client'ta fake data üretme
                queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(activeChatId!) });
                queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
              },
              onError: (err) => {
                streamingContentRef.current = '';
                setIsStreamingActive(false);
                setStreamingContent('');
                setStreamingMessageId(null);
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
          setIsStreamingActive(false);
          setStreamingContent('');
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
    setIsStreamingActive(false);
    setStreamingContent('');
    setOptimisticUserMsg(null);
    streamingContentRef.current = '';
    dispatch(setSessionId(null));
    dispatch(clearMessages());
  }, [dispatch]);

  const loadSession = useCallback(
    (id: string) => {
      if (id === sessionId) return;
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
      setIsStreamingActive(false);
      setStreamingContent('');
      setOptimisticUserMsg(null);
      streamingContentRef.current = '';
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
    streamingMessage: (isStreamingActive && streamingContent)
      ? { id: streamingMessageId ?? 'streaming', role: 'assistant' as const, content: streamingContent, timestamp: Date.now() }
      : null,
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
