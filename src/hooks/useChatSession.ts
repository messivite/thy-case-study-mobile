import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { shallowEqual } from 'react-redux';
import { setSessionId, clearMessages } from '@/store/slices/chatSlice';
import {
  useCreateChatMutation,
  useInfiniteChatsQuery,
  useInfiniteMessagesQuery,
  CHAT_QUERY_KEYS,
} from '@/hooks/api/useChats';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat, sendMessage as sendMessageApi } from '@/api/chat.api';
import { Attachment, Message } from '@/types/chat.types';
import { ChatMessage } from '@/types/chat.api.types';
import { realmService } from '@/services/realm';
import { toast } from '@/lib/toast';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toLocalMessage = (msg: ChatMessage): Message => ({
  id: msg.id ?? `msg_${msg.createdAt}_${msg.role}`,
  role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
  content: msg.content ?? '',
  timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
  provider: msg.provider,
  model: msg.model,
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useChatSession = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Tek subscription — 4 ayrı useAppSelector yerine bir kez Redux store'u dinle.
  // Her biri ayrı subscription açsaydı, birisi değişince 4 ayrı re-render tetiklerdi.
  const { selectedAIModel, sessionId, streamingEnabled, isGuest } = useAppSelector((s) => ({
    selectedAIModel: s.chat.selectedAIModel,
    sessionId: s.chat.sessionId,
    streamingEnabled: s.settings.streamingEnabled,
    isGuest: s.auth.status === 'guest',
  }), shallowEqual);

  // Ref: sendMessage/stream closure'ları stale değer tutmasın
  const selectedAIModelRef = useRef(selectedAIModel);
  useEffect(() => { selectedAIModelRef.current = selectedAIModel; }, [selectedAIModel]);
  const streamingEnabledRef = useRef(streamingEnabled);
  useEffect(() => { streamingEnabledRef.current = streamingEnabled; }, [streamingEnabled]);

  const chatId = sessionId;

  // Stream state — sadece boolean, metin artık UI thread'de
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  // Gerçek assistant mesaj ID'si — onMeta gelince güncellenir, re-render tetikler
  const [streamingMsgIdState, setStreamingMsgIdState] = useState<string>('streaming');

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

  // onMeta'dan gelen provider/model — cache yazımında kullanılır
  const streamMetaRef = useRef<{ provider?: string; model?: string; userMessageId?: string }>({});

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

  const prevMessagesRef = useRef<Message[]>([]);
  const messages: Message[] = useMemo(() => {
    if (!messagesQuery.data) return prevMessagesRef.current.length ? [] : prevMessagesRef.current;

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

    // İçerik değişmediyse aynı referansı döndür — downstream useMemo/memo re-render'ını önle
    const prev = prevMessagesRef.current;
    if (
      result.length === prev.length &&
      result.every((m, i) => m.id === prev[i]?.id && m.content === prev[i]?.content && m.liked === prev[i]?.liked)
    ) {
      return prev;
    }

    messagesCountRef.current = result.length;
    prevMessagesRef.current = result;
    return result;
  }, [messagesQuery.data]);

  // ---------------------------------------------------------------------------
  // handleStreamingComplete — StreamingBubble'dan runOnJS ile çağrılır
  // ---------------------------------------------------------------------------

  // Son streaming metnini JS tarafında sakla — MessageList geçiş sırasında kullanır
  const lastStreamTextRef = useRef('');

  const handleStreamingComplete = useCallback((finalText: string) => {
    if (streamCancelledRef.current) return;

    lastStreamTextRef.current = finalText;

    const cid = activeChatIdRef.current ?? null;
    const msgId = streamingMsgIdRef.current;
    const meta = streamMetaRef.current;
    const userMsg = optimisticUserMsgRef.current;
    const now = new Date().toISOString();

    if (cid && msgId && msgId !== 'streaming') {
      const userChatMsg: ChatMessage | null = userMsg && meta.userMessageId ? {
        id: meta.userMessageId,
        role: 'user',
        content: userMsg.content,
        createdAt: now,
        provider: meta.provider ?? '',
        model: meta.model ?? '',
      } : null;
      const assistantChatMsg: ChatMessage = {
        id: msgId,
        role: 'assistant',
        content: finalText,
        createdAt: now,
        provider: meta.provider ?? '',
        model: meta.model ?? '',
      };

      // React Query cache'ine yaz — sıra: eski→yeni (Realm/API ile aynı)
      queryClient.setQueryData<import('@tanstack/react-query').InfiniteData<import('@/types/chat.api.types').PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(cid),
        (old) => {
          if (!old) return old;
          const lastPageIdx = old.pages.length - 1;
          const lastPage = old.pages[lastPageIdx];
          const existing = lastPage?.messages ?? [];
          // optimistic ID'leri filtrele, gerçek mesajları sona ekle
          const filtered = existing.filter(
            (m) => m.id !== userMsg?.id && m.id !== meta.userMessageId && m.id !== msgId,
          );
          const newMessages = [
            ...filtered,
            ...(userChatMsg ? [userChatMsg] : []),
            assistantChatMsg,
          ];
          const newPages = old.pages.map((p, i) =>
            i === lastPageIdx ? { ...p, messages: newMessages } : p,
          );
          return { ...old, pages: newPages };
        },
      );

      // Realm'e yaz
      const msgsToSave: ChatMessage[] = [
        ...(userChatMsg ? [userChatMsg] : []),
        assistantChatMsg,
      ];
      realmService.saveMessages(cid, msgsToSave);
    }

    unstable_batchedUpdates(() => {
      setIsStreamingActive(false);
      setOptimisticUserMsg(null);
    });

    if (cid) {
      // Sadece chatlist — mesajlar setQueryData ile güncellendi, API fetch'e gerek yok
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setStreamingMsgIdState('streaming');
        lastStreamTextRef.current = '';
        streamCancelledRef.current = false;
        streamDoneRef.current = false;
        isStreamingDoneSV.value = false;
        pendingBufferRef.current = '';
        writtenLenRef.current = 0;
        pendingStreamSV.value = '';
        streamResetCountSV.value = streamResetCountSV.value + 1;

        // Typewriter interval: her 32ms'de buffer'dan 6 karakter SV'ye yaz.
        // 16ms/3char → JS bridge'e çok yük bindiriyordu; 32ms/6char aynı hızı verir, yük yarı.
        // Backend onDone geldi ve buffer tamamen yazıldıysa → isStreamingDoneSV set et, interval dur.
        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = setInterval(() => {
          const buf = pendingBufferRef.current;
          const written = writtenLenRef.current;
          if (written < buf.length) {
            const next = Math.min(written + 6, buf.length);
            writtenLenRef.current = next;
            pendingStreamSV.value = buf.slice(0, next);
          } else if (streamDoneRef.current) {
            clearInterval(typewriterIntervalRef.current!);
            typewriterIntervalRef.current = null;
            isStreamingDoneSV.value = true;
          }
        }, 32);

        try {
          await streamChat(
            activeChatId!,
            { provider, model, messages: [{ role: 'user', content }] },
            {
              onMeta: (meta) => {
                if (meta?.assistantMessageId && streamingMsgIdRef.current === 'streaming') {
                  streamingMsgIdRef.current = meta.assistantMessageId;
                  setStreamingMsgIdState(meta.assistantMessageId);
                }
                if (meta?.userMessageId && optimisticUserMsgRef.current && optimisticUserMsgRef.current.id !== meta.userMessageId) {
                  optimisticUserMsgRef.current = { ...optimisticUserMsgRef.current, id: meta.userMessageId };
                }
                streamMetaRef.current = {
                  provider: meta?.provider,
                  model: meta?.model,
                  userMessageId: meta?.userMessageId,
                };
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
    setStreamingMsgIdState('streaming');
    lastStreamTextRef.current = '';
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
      setStreamingMsgIdState('streaming');
      lastStreamTextRef.current = '';
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
  // sessionTitle: chatsData her invalidate'de yeni referans üretir.
  // useState ile stabil tut — gerçek string değişince setState, yoksa re-render yok.
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!chatId || !chatsData) { setSessionTitle(null); return; }
    for (const page of chatsData.pages) {
      const found = page.items?.find((s) => s.id === chatId);
      if (found) { setSessionTitle((prev) => prev === found.title ? prev : found.title); return; }
    }
    setSessionTitle(null);
  }, [chatId, chatsData]);

  // streamingMessageId: isStreamingActive olduğu sürece gerçek assistant mesaj ID'sini
  // (ya da henüz meta gelmemişse sabit sentinel) döndür.
  // State tabanlı — onMeta gelince re-render tetiklenir, FlatList gerçek ID'yi key olarak alır.
  const streamingMessageId = isStreamingActive ? streamingMsgIdState : null;

  // Hook içinde hesapla — isFetching/isLoading'i dışarı sızdırmak HomeScreen'i
  // her refetch'te re-render eder (mesaj gönderme anında çakışır).
  const isSessionLoading =
    !!chatId &&
    !isStreamingActive &&
    !optimisticUserMsg &&
    (messagesQuery.isLoading || (messagesQuery.isFetching && messages.length === 0));

  return {
    messages,
    optimisticUserMsg,
    isStreamingActive,
    streamingMessageId,
    pendingStreamSV,
    isStreamingDoneSV,
    streamResetCountSV,
    handleStreamingComplete,
    lastStreamTextRef,
    optimisticUserMsgId: optimisticUserMsg?.id ?? optimisticUserMsgRef.current?.id ?? null,
    selectedAIModel,
    isTyping,
    isSessionLoading,
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
  };
};
