import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSessionId, clearMessages } from '@/store/slices/chatSlice';
import {
  useCreateChatMutation,
  useInfiniteChatsQuery,
  useInfiniteMessagesQuery,
  CHAT_QUERY_KEYS,
} from '@/hooks/api/useChats';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat, getChatMessages, sendMessage as sendMessageApi } from '@/api/chat.api';
import { Attachment, Message } from '@/types/chat.types';
import { ChatMessage } from '@/types/chat.api.types';
import { toast } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  // Ref: sendMessage closure'u stale selectedAIModel tutmasın, dep array'e gerek yok
  const selectedAIModelRef = useRef(selectedAIModel);
  useEffect(() => { selectedAIModelRef.current = selectedAIModel; }, [selectedAIModel]);
  const sessionId = useAppSelector((s) => s.chat.sessionId);
  const streamingEnabled = useAppSelector((s) => s.settings.streamingEnabled);
  const streamingEnabledRef = useRef(streamingEnabled);
  useEffect(() => { streamingEnabledRef.current = streamingEnabled; }, [streamingEnabled]);
  const isGuest = useAppSelector((s) => s.auth.status === 'guest');

  const chatId = sessionId;

  // Stream state — sadece boolean, metin artık UI thread'de
  const [isStreamingActive, setIsStreamingActive] = useState(false);

  // Non-stream modunda isTyping için
  const [isNonStreamPending, setIsNonStreamPending] = useState(false);

  // Reanimated SharedValue — AnimatedTextInput buradan okur (UI thread)
  const pendingStreamSV = useSharedValue('');

  // JS thread'de biriken tüm delta'lar
  const pendingBufferRef = useRef('');
  // pendingStreamSV'ye kaç karakter yazıldı
  const writtenLenRef = useRef(0);
  // typewriter interval handle
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // backend onDone geldi mi — interval bunu kontrol eder
  const streamDoneRef = useRef(false);

  // onDone geldi mi? — SharedValue: worklet'ten güvenli okunabilir
  const isStreamingDoneSV = useSharedValue(false);

  // Her yeni stream başladığında artar → StreamingBubble drainedLen'i sıfırlar
  const streamResetCountSV = useSharedValue(0);


  // activeChatId'yi closure'dan kurtarmak için ref
  const activeChatIdRef = useRef<string | null>(null);

  // onMeta'dan gelen gerçek assistant message ID'si — FlatList key reuse için
  const streamingMsgIdRef = useRef<string>('streaming');

  // onMeta'dan gelen gerçek user message ID'si — optimistic key reuse için
  const optimisticUserMsgRef = useRef<Message | null>(null);

  // messages sayısı — fetchLimit için
  const messagesCountRef = useRef(0);

  // Stream iptal flag
  const streamCancelledRef = useRef(false);

  // Optimistic user message
  const [optimisticUserMsg, setOptimisticUserMsg] = useState<Message | null>(null);

  // AbortController
  const abortCtrlRef = useRef<AbortController | null>(null);

  // Önceki session id — temizlik için
  const prevSessionIdRef = useRef<string | null>(null);

  // Mutations
  const createChatMutation = useCreateChatMutation();

  // mutateAsync stable ref — sendMessage useCallback dep array'ini şişirmez
  const createChatMutateRef = useRef(createChatMutation.mutateAsync);
  useEffect(() => {
    createChatMutateRef.current = createChatMutation.mutateAsync;
  }, [createChatMutation.mutateAsync]);

  // Messages query
  const messagesQuery = useInfiniteMessagesQuery(chatId ?? '');

  // Session değişince in-flight stream'i kes
  // ANCAK: yeni chat oluşturulurken (null → newId) stream kesilmemeli,
  // sadece kullanıcı başka bir session'a geçtiğinde (nonNull → differentId) kesilmeli.
  useEffect(() => {
    const prev = prevSessionIdRef.current;
    const isNewChatCreated = prev === null && chatId !== null;
    if (prev !== chatId && !isNewChatCreated) {
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
    }
    prevSessionIdRef.current = chatId;
  }, [chatId]);

  // ---------------------------------------------------------------------------
  // Flatten paginated messages
  // ---------------------------------------------------------------------------

  const messages: Message[] = useMemo(() => {
    if (!messagesQuery.data) return [];

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
  // handleStreamingComplete — StreamingBubble'dan runOnJS ile çağrılır
  // ---------------------------------------------------------------------------

  const handleStreamingComplete = useCallback((_finalText: string) => {
    if (streamCancelledRef.current) return;

    const cid = activeChatIdRef.current;
    if (!cid) return;

    // Send button'u hemen aç — fetch bekleme
    setIsStreamingActive(false);

    const fetchLimit = Math.max(40, messagesCountRef.current + 2);
    getChatMessages(cid, { limit: fetchLimit, direction: 'older' })
      .then((result) => {
        // Fetch tamamlandı: önce cache'i doldur, sonra optimistic'i kaldır
        // Sıra önemli — önce mesajlar cache'e girmeli ki hasContent=false anı olmasın
        queryClient.setQueryData(
          CHAT_QUERY_KEYS.messages(cid),
          { pages: [result], pageParams: [undefined] },
        );
        setOptimisticUserMsg(null);
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
      })
      .catch(() => {
        setOptimisticUserMsg(null);
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(cid) });
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
      });
  }, [queryClient]);

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    async (content: string, _attachments: Attachment[] = []) => {
      const { provider, model } = selectedAIModelRef.current;

      let activeChatId = chatId;

      // Optimistic user mesajını hemen göster — chat oluşturmayı bekleme
      const optimisticUser: Message = {
        id: `optimistic_user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      optimisticUserMsgRef.current = optimisticUser;

      if (streamingEnabledRef.current) {
        // ── Stream modu ─────────────────────────────────────────────
        // Hemen UI'ı güncelle
        unstable_batchedUpdates(() => {
          setOptimisticUserMsg(optimisticUser);
          setIsStreamingActive(true);
        });

        // Yeni chat gerekiyorsa oluştur — UI zaten güncellendi
        if (!activeChatId) {
          try {
            const chat = await createChatMutateRef.current({
              title: content.slice(0, 50),
              provider,
              model,
            });
            activeChatId = chat.id;
            dispatch(setSessionId(activeChatId));
          } catch {
            toast.error('Sohbet oluşturulamadı');
            unstable_batchedUpdates(() => {
              setOptimisticUserMsg(null);
              setIsStreamingActive(false);
            });
            return;
          }
        }

        activeChatIdRef.current = activeChatId;

        const ctrl = new AbortController();
        abortCtrlRef.current = ctrl;

        streamingMsgIdRef.current = 'streaming';
        streamCancelledRef.current = false;
        streamDoneRef.current = false;
        isStreamingDoneSV.value = false;
        pendingBufferRef.current = '';
        writtenLenRef.current = 0;
        pendingStreamSV.value = '';
        streamResetCountSV.value = streamResetCountSV.value + 1;

        // Typewriter interval: her 16ms'de buffer'dan 3 karakter SV'ye yaz.
        // Backend onDone geldi ve buffer tamamen yazıldıysa → isStreamingDoneSV set et, interval dur.
        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = setInterval(() => {
          const buf = pendingBufferRef.current;
          const written = writtenLenRef.current;
          if (written < buf.length) {
            const next = Math.min(written + 3, buf.length);
            writtenLenRef.current = next;
            pendingStreamSV.value = buf.slice(0, next);
          } else if (streamDoneRef.current) {
            clearInterval(typewriterIntervalRef.current!);
            typewriterIntervalRef.current = null;
            isStreamingDoneSV.value = true;
          }
        }, 16);

        try {
          await streamChat(
            activeChatId!,
            { provider, model, messages: [{ role: 'user', content }] },
            {
              onMeta: (meta) => {
                if (meta?.assistantMessageId && streamingMsgIdRef.current === 'streaming') {
                  streamingMsgIdRef.current = meta.assistantMessageId;
                }
                if (meta?.userMessageId && optimisticUserMsgRef.current && optimisticUserMsgRef.current.id !== meta.userMessageId) {
                  const updated = { ...optimisticUserMsgRef.current, id: meta.userMessageId };
                  optimisticUserMsgRef.current = updated;
                  setOptimisticUserMsg(updated);
                }
              },
              onDelta: (delta) => {
                if (streamCancelledRef.current) return;
                pendingBufferRef.current = pendingBufferRef.current + delta;
              },
              onDone: () => {
                abortCtrlRef.current = null;
                streamDoneRef.current = true;
              },
              onError: (err) => {
                streamCancelledRef.current = true;
                streamDoneRef.current = false;
                if (typewriterIntervalRef.current) { clearInterval(typewriterIntervalRef.current); typewriterIntervalRef.current = null; }
                isStreamingDoneSV.value = false;
                pendingBufferRef.current = '';
                writtenLenRef.current = 0;
                pendingStreamSV.value = '';
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
          streamCancelledRef.current = true;
          streamDoneRef.current = false;
          if (typewriterIntervalRef.current) { clearInterval(typewriterIntervalRef.current); typewriterIntervalRef.current = null; }
          pendingBufferRef.current = '';
          writtenLenRef.current = 0;
          pendingStreamSV.value = '';
          setIsStreamingActive(false);
          setOptimisticUserMsg(null);
          toast.error('Mesaj gönderilemedi');
        }
      } else {
        // ── Non-stream modu ──────────────────────────────────────────
        unstable_batchedUpdates(() => {
          setOptimisticUserMsg(optimisticUser);
          setIsNonStreamPending(true);
        });

        if (!activeChatId) {
          try {
            const chat = await createChatMutateRef.current({
              title: content.slice(0, 50),
              provider,
              model,
            });
            activeChatId = chat.id;
            dispatch(setSessionId(activeChatId));
          } catch {
            toast.error('Sohbet oluşturulamadı');
            unstable_batchedUpdates(() => {
              setOptimisticUserMsg(null);
              setIsNonStreamPending(false);
            });
            return;
          }
        }

        activeChatIdRef.current = activeChatId;
        const nonStreamChatId = activeChatId!;
        sendMessageApi(nonStreamChatId, { provider, model, messages: [{ role: 'user', content }] })
          .then(() => {
            unstable_batchedUpdates(() => {
              setIsNonStreamPending(false);
              setOptimisticUserMsg(null);
            });
            queryClient.invalidateQueries({
              queryKey: CHAT_QUERY_KEYS.messages(nonStreamChatId),
            });
            queryClient.invalidateQueries({
              queryKey: CHAT_QUERY_KEYS.chatsList,
            });
          })
          .catch(() => {
            unstable_batchedUpdates(() => {
              setIsNonStreamPending(false);
              setOptimisticUserMsg(null);
            });
            toast.error('Mesaj gönderilemedi');
          });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, queryClient, dispatch],
  );

  // ---------------------------------------------------------------------------
  // Diğer aksiyonlar
  // ---------------------------------------------------------------------------

  const onStop = useCallback(() => {
    abortCtrlRef.current?.abort();
  }, []);

  const startNewChat = useCallback(() => {
    streamCancelledRef.current = true;
    streamDoneRef.current = false;
    if (typewriterIntervalRef.current) { clearInterval(typewriterIntervalRef.current); typewriterIntervalRef.current = null; }
    isStreamingDoneSV.value = false;
    abortCtrlRef.current?.abort();
    abortCtrlRef.current = null;
    pendingBufferRef.current = '';
    writtenLenRef.current = 0;
    pendingStreamSV.value = '';
    streamingMsgIdRef.current = 'streaming';
    optimisticUserMsgRef.current = null;
    activeChatIdRef.current = null;
    setIsStreamingActive(false);
    setOptimisticUserMsg(null);
    dispatch(setSessionId(null));
    dispatch(clearMessages());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const loadSession = useCallback(
    (id: string) => {
      if (id === sessionId) return;
      streamCancelledRef.current = true;
      streamDoneRef.current = false;
      if (typewriterIntervalRef.current) { clearInterval(typewriterIntervalRef.current); typewriterIntervalRef.current = null; }
      isStreamingDoneSV.value = false;
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
      pendingBufferRef.current = '';
      writtenLenRef.current = 0;
      pendingStreamSV.value = '';
      streamingMsgIdRef.current = 'streaming';
      optimisticUserMsgRef.current = null;
      activeChatIdRef.current = id;
      setIsStreamingActive(false);
      setOptimisticUserMsg(null);
      dispatch(setSessionId(id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, dispatch],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const likeMessage = useCallback((_id: string, _liked: boolean | null) => {
    // TODO: API entegrasyonu
  }, []);

  const isTyping = streamingEnabled ? isStreamingActive : isNonStreamPending;

  const { data: chatsData } = useInfiniteChatsQuery(isGuest);
  const sessionTitle = useMemo(() => {
    if (!chatId || !chatsData) return null;
    for (const page of chatsData.pages) {
      const found = page.items?.find((s) => s.id === chatId);
      if (found) return found.title;
    }
    return null;
  }, [chatId, chatsData]);

  // streamingMessageId: isStreamingActive olduğu sürece sabit '__streaming__' sentinel.
  // StreamingBubble hemen mount edilir; WaitingBubble kendi içinde loading gösterir.
  const streamingMessageId = isStreamingActive ? '__streaming__' : null;

  return {
    messages,
    optimisticUserMsg,
    isStreamingActive,
    streamingMessageId,
    // StreamingBubble'a geçilen UI-thread değerleri
    pendingStreamSV,
    isStreamingDoneSV,
    streamResetCountSV,
    handleStreamingComplete,
    // optimisticUserMsgId: bir frame daha tut → footer flash yok
    optimisticUserMsgId: optimisticUserMsg?.id ?? optimisticUserMsgRef.current?.id ?? null,
    selectedAIModel,
    isTyping,
    chatId,
    sessionTitle,
    sendMessage,
    startNewChat,
    loadSession,
    onStop,
    likeMessage,
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage ?? false,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    isLoading: messagesQuery.isLoading,
    isFetching: messagesQuery.isFetching,
  };
};
