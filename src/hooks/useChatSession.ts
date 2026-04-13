import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { unstable_batchedUpdates } from '@/lib/batchedUpdates';
import { useSharedValue } from 'react-native-reanimated';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { shallowEqual } from 'react-redux';
import { setSessionId, clearMessages } from '@/store/slices/chatSlice';
import {
  useCreateChatMutation,
  useInfiniteMessagesQuery,
  useLikeMessageMutation,
  CHAT_QUERY_KEYS,
} from '@/hooks/api/useChats';
import { useQueryClient, InfiniteData } from '@tanstack/react-query';
import { streamChat, sendMessage as sendMessageApi, syncChat } from '@/api/chat.api';
import { Attachment, Message } from '@/types/chat.types';
import { ChatMessage, PaginatedMessagesResponse } from '@/types/chat.api.types';
import { realmService } from '@/services/realm';
import { toast } from '@/lib/toast';
import { useOfflineMutation, useNetworkStatus, useOfflineQueue } from '@mustafaaksoy41/react-native-offline-queue';
import { OFFLINE_ACTIONS, withNoRetryOn4xx } from '@/lib/offlineQueue';

// ---------------------------------------------------------------------------
// Offline payload type
// ---------------------------------------------------------------------------

type SendMessagePayload = {
  content: string;
  chatId: string;
  provider: string;
  model: string;
  optimisticMsg: Message;
  sentAt: string;
  /** Kuyruktan işleniyorsa true — syncChat mi streamChat mı kullanılacağını belirler */
  fromQueue?: boolean;
};

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
  liked: msg.liked ?? null,
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useChatSession = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isOnline: _isOnline } = useNetworkStatus();
  // Web'de OfflineProvider mount edilmediğinden isOnline null gelir — web'de her zaman online say
  const isOnline = Platform.OS === 'web' ? true : _isOnline;
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  const { queue } = useOfflineQueue();

  // Tek subscription — 4 ayrı useAppSelector yerine bir kez Redux store'u dinle.
  // Her biri ayrı subscription açsaydı, birisi değişince 4 ayrı re-render tetiklerdi.
  const { selectedAIModel, sessionId, streamingEnabled } = useAppSelector((s) => ({
    selectedAIModel: s.chat.selectedAIModel,
    sessionId: s.chat.sessionId,
    streamingEnabled: s.settings.streamingEnabled,
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

  // Backend'den gelen tüm delta'lar — JS thread'de biriktirilen ham buffer
  const pendingBufferRef = useRef('');
  // UI thread typewriter: buffer'ın tamamı SV'ye kopyalandı mı?
  // writtenLenRef: setInterval yerine kullanılıyor — değer JS'de, sadece write path'i tutar
  const writtenLenRef = useRef(0);
  // typewriter interval handle — kullanılmaya devam ediyor (fallback)
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
  const { mutateOffline: mutateOfflineLike } = useLikeMessageMutation(sessionId ?? '');

  // ---------------------------------------------------------------------------
  // Offline mutation — online ise handler anında çalışır, offline ise kuyruğa alır
  // ---------------------------------------------------------------------------

  const { mutateOffline } = useOfflineMutation<SendMessagePayload>(
    OFFLINE_ACTIONS.SEND_MESSAGE,
    {
      handler: (payload) => withNoRetryOn4xx(async () => {
        const { content, chatId: cid, provider, model } = payload;

        // fromQueue açıkça set edildiyse veya sentAt 3sn+ önce ise kuyruktan geliyor.
        // 3sn: ilk anında deneme handler'ı çalıştırır, bu süre içinde geçemez.
        // Library payload'ı değiştirmiyor, bu yüzden zaman eşiği güvenli fallback.
        const isQueued = !!payload.fromQueue ||
          (Date.now() - new Date(payload.sentAt).getTime() > 3000);
        // Kullanıcı şu an bu chat'i görüyor mu?
        // activeChatIdRef.current === null: home ekranı — UI'a hiç dokunma.
        // Farklı bir chat'teyse — o chat'in state'ini bozma.
        const isActiveChat = activeChatIdRef.current === cid;

        // UI state güncellemesi: sadece aktif chat + kuyruktan geliyorsa
        // (isQueued=false → sendMessage'ın ilk anında çağırması,
        //  activeChatIdRef zaten o an sendMessage'da set edilmiş olmalıydı)
        if (isQueued && isActiveChat) {
          streamCancelledRef.current = false;
          streamingMsgIdRef.current = 'streaming';
          setStreamingMsgIdState('streaming');
          optimisticUserMsgRef.current = payload.optimisticMsg;
          if (streamingEnabledRef.current) {
            unstable_batchedUpdates(() => {
              setOptimisticUserMsg(payload.optimisticMsg);
              setIsStreamingActive(true);
            });
          } else {
            unstable_batchedUpdates(() => {
              setOptimisticUserMsg(payload.optimisticMsg);
              setIsNonStreamPending(true);
            });
          }
        }

        // Farklı chat işleniyorsa typewriter/stream state'lerine dokunma
        if (!isActiveChat) {
          // Sadece API çağrısını yap, cache invalidation onSuccess'te yapılır
          if (streamingEnabledRef.current) {
            await streamChat(
              cid,
              { provider, model, messages: [{ role: 'user', content }] },
              {
                onMeta: () => {},
                onDelta: () => {},
                onDone: () => {},
                onError: (err) => { if (err !== 'aborted') throw new Error(String(err)); },
              },
            );
          } else {
            if (isQueued) {
              await syncChat(cid, { provider, model, messages: [{ content, sentAt: payload.sentAt }] });
            } else {
              await sendMessageApi(cid, { provider, model, messages: [{ role: 'user', content }] });
            }
          }
          return;
        }

        if (streamingEnabledRef.current) {
          await new Promise<void>((resolve, reject) => {
            const ctrl = new AbortController();
            abortCtrlRef.current = ctrl;

            streamDoneRef.current = false;
            isStreamingDoneSV.value = false;
            pendingBufferRef.current = '';
            writtenLenRef.current = 0;
            pendingStreamSV.value = '';
            streamResetCountSV.value = streamResetCountSV.value + 1;

            // requestAnimationFrame döngüsü: frame-sync, setInterval'ın JS event loop
            // gecikmesinden bağımsız. Her frame'de buffer'dan 8 karakter yazar.
            if (typewriterIntervalRef.current) cancelAnimationFrame(typewriterIntervalRef.current as unknown as number);
            const tick = () => {
              const buf = pendingBufferRef.current;
              const written = writtenLenRef.current;
              if (written < buf.length) {
                const next = Math.min(written + 8, buf.length);
                writtenLenRef.current = next;
                pendingStreamSV.value = buf.slice(0, next);
                typewriterIntervalRef.current = requestAnimationFrame(tick) as unknown as ReturnType<typeof setInterval>;
              } else if (streamDoneRef.current) {
                typewriterIntervalRef.current = null;
                isStreamingDoneSV.value = true;
              } else {
                // Buffer dolmadı, stream devam ediyor — bir sonraki frame'de tekrar dene
                typewriterIntervalRef.current = requestAnimationFrame(tick) as unknown as ReturnType<typeof setInterval>;
              }
            };
            typewriterIntervalRef.current = requestAnimationFrame(tick) as unknown as ReturnType<typeof setInterval>;

            streamChat(
              cid,
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
                  if (!streamCancelledRef.current) {
                    pendingBufferRef.current = pendingBufferRef.current + delta;
                  }
                },
                onDone: () => {
                  abortCtrlRef.current = null;
                  streamDoneRef.current = true;
                  resolve();
                },
                onError: (err) => {
                  // onStop() tarafından abort edildiyse — tüm cleanup zaten yapıldı,
                  // burada sadece promise'i resolve et, UI'ya dokunma.
                  if (err === 'aborted' && streamCancelledRef.current) {
                    resolve();
                    return;
                  }

                  // Gerçek hata (ağ, timeout, 4xx vb.) — temizlik yap
                  streamCancelledRef.current = true;
                  streamDoneRef.current = false;
                  if (typewriterIntervalRef.current) {
                    cancelAnimationFrame(typewriterIntervalRef.current as unknown as number);
                    typewriterIntervalRef.current = null;
                  }
                  isStreamingDoneSV.value = false;
                  pendingBufferRef.current = '';
                  writtenLenRef.current = 0;
                  pendingStreamSV.value = '';
                  abortCtrlRef.current = null;
                  // 403: stale chatId — sıfırla
                  if (String(err).includes('403')) {
                    activeChatIdRef.current = null;
                    dispatch(setSessionId(null));
                    toast.error('Bu sohbet artık erişilemez, yeni sohbet başlatılıyor.');
                    unstable_batchedUpdates(() => {
                      setIsStreamingActive(false);
                      setOptimisticUserMsg(null);
                    });
                    resolve();
                    return;
                  }
                  if (!isOnlineRef.current) {
                    const queuedMsg = { ...payload.optimisticMsg, queued: true };
                    optimisticUserMsgRef.current = queuedMsg;
                    unstable_batchedUpdates(() => {
                      setIsStreamingActive(false);
                      setOptimisticUserMsg(queuedMsg);
                    });
                  } else {
                    unstable_batchedUpdates(() => {
                      setIsStreamingActive(false);
                      setOptimisticUserMsg(null);
                    });
                  }
                  reject(new Error(String(err)));
                },
              },
              ctrl.signal,
            ).catch(reject);
          });
        } else {
          if (isQueued) {
            // Kuyruktan gelen non-stream mesaj → sync API
            await syncChat(cid, {
              provider,
              model,
              messages: [{ content, sentAt: payload.sentAt }],
            });
            queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(cid) });
          } else {
            // Direkt gönderim — cevabı hemen cache'e yaz, flash olmaz
            const response = await sendMessageApi(cid, { provider, model, messages: [{ role: 'user', content }] });
            const userMsg = optimisticUserMsgRef.current;
            const now = new Date().toISOString();
            const userChatMsg: import('@/types/chat.api.types').ChatMessage | null = userMsg ? {
              id: `user_${Date.now()}`,
              role: 'user',
              content: userMsg.content,
              createdAt: now,
              provider,
              model,
            } : null;
            const assistantChatMsg: import('@/types/chat.api.types').ChatMessage = {
              id: response.assistantMessage.id ?? `assistant_${Date.now()}`,
              role: 'assistant',
              content: response.assistantMessage.content ?? '',
              createdAt: response.assistantMessage.createdAt ?? now,
              provider: response.assistantMessage.provider ?? provider,
              model: response.assistantMessage.model ?? model,
            };
            queryClient.setQueryData<import('@tanstack/react-query').InfiniteData<import('@/types/chat.api.types').PaginatedMessagesResponse>>(
              CHAT_QUERY_KEYS.messages(cid),
              (old) => {
                const basePage = { messages: [], nextCursor: null, hasMore: false };
                const existing = old ?? { pages: [basePage], pageParams: [undefined] };
                const lastPageIdx = existing.pages.length - 1;
                const lastPage = existing.pages[lastPageIdx];
                const filtered = (lastPage?.messages ?? []).filter(
                  (m) => m.id !== userMsg?.id,
                );
                const newMessages = [
                  ...filtered,
                  ...(userChatMsg ? [userChatMsg] : []),
                  assistantChatMsg,
                ];
                const newPages = existing.pages.map((p, i) =>
                  i === lastPageIdx ? { ...p, messages: newMessages } : p,
                );
                return { ...existing, pages: newPages };
              },
            );
            realmService.saveMessages(cid, [
              ...(userChatMsg ? [userChatMsg] : []),
              assistantChatMsg,
            ]);
          }
          queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
        }
      }),
      onOptimisticSuccess: (payload) => {
        if (!isOnlineRef.current) {
          // Sadece offline'da: optimistic bubble + toast
          const queuedMsg = { ...payload.optimisticMsg, queued: true };
          optimisticUserMsgRef.current = queuedMsg;
          if (streamingEnabledRef.current) {
            unstable_batchedUpdates(() => {
              setOptimisticUserMsg(queuedMsg);
              setIsStreamingActive(false);
            });
          } else {
            unstable_batchedUpdates(() => {
              setOptimisticUserMsg(queuedMsg);
              setIsNonStreamPending(false);
            });
          }
          toast.info('Çevrimdışı – mesaj kuyruğa alındı');
        }
      },
      onSuccess: (payload) => {
        // Non-stream: cache handler'da zaten güncellendi, sadece state temizle
        // Stream: handleStreamingComplete cache'e yazdı + bubble'ı temizledi
        //         ama chatsList sync için invalidate gerekli
        // Stop edilmişse — partial data yok, invalidate gereksiz network isteği olur
        if (streamCancelledRef.current) return;
        const cid = payload.chatId;
        // Stream: handleStreamingComplete zaten cache'e direkt yazdı — ayrıca invalidate gereksiz,
        // aksi halde chat seçilince mount fetch + bu invalidate üst üste 2-3 istek oluşur.
        // Non-stream: setQueryData ile cache güncellendi, invalidate yine gereksiz.
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
        // Sadece bu chat aktifse UI state'ini temizle — başka chat'in sync'i mevcut UI'ı bozmasın
        const isCurrentChat = activeChatIdRef.current === cid;
        if (optimisticUserMsgRef.current?.queued &&
            optimisticUserMsgRef.current.id === payload.optimisticMsg.id) {
          optimisticUserMsgRef.current = null;
          unstable_batchedUpdates(() => {
            setIsStreamingActive(false);
            setIsNonStreamPending(false);
            setOptimisticUserMsg(null);
          });
        } else if (isCurrentChat && !streamingEnabledRef.current) {
          unstable_batchedUpdates(() => {
            setIsNonStreamPending(false);
            setOptimisticUserMsg(null);
          });
        }
      },
      onError: (_err, payload) => {
        const isCurrentChat = activeChatIdRef.current === payload.chatId;
        if (!isOnlineRef.current) {
          // Offline'da hata → sadece aktif chat'teyse queued bubble göster
          if (isCurrentChat) {
            const queuedMsg = { ...payload.optimisticMsg, queued: true };
            optimisticUserMsgRef.current = queuedMsg;
            unstable_batchedUpdates(() => {
              setIsStreamingActive(false);
              setIsNonStreamPending(false);
              setOptimisticUserMsg(queuedMsg);
            });
          }
          toast.info('Çevrimdışı – mesaj kuyruğa alındı');
        } else if (isCurrentChat) {
          unstable_batchedUpdates(() => {
            setIsStreamingActive(false);
            setIsNonStreamPending(false);
            setOptimisticUserMsg(null);
          });
          toast.error('Mesaj gönderilemedi');
        }
      },
    },
  );

  // Web'de offline queue yoktur — handler'ı direkt çağır
  const mutateOfflineRef = useRef(mutateOffline);
  useEffect(() => { mutateOfflineRef.current = mutateOffline; }, [mutateOffline]);

  const dispatchMessage = useCallback(async (payload: SendMessagePayload) => {
    if (Platform.OS === 'web') {
      // Web'de offline queue yok, handler'ı senkron çağır
      const { content, chatId: cid, provider, model } = payload;
      if (streamingEnabledRef.current) {
        await new Promise<void>((resolve, reject) => {
          const ctrl = new AbortController();
          abortCtrlRef.current = ctrl;
          streamDoneRef.current = false;
          isStreamingDoneSV.value = false;
          pendingBufferRef.current = '';
          writtenLenRef.current = 0;
          pendingStreamSV.value = '';
          streamResetCountSV.value = streamResetCountSV.value + 1;
          if (typewriterIntervalRef.current) cancelAnimationFrame(typewriterIntervalRef.current as unknown as number);
          const tickWeb = () => {
            const buf = pendingBufferRef.current;
            const written = writtenLenRef.current;
            if (written < buf.length) {
              const next = Math.min(written + 8, buf.length);
              writtenLenRef.current = next;
              pendingStreamSV.value = buf.slice(0, next);
              typewriterIntervalRef.current = requestAnimationFrame(tickWeb) as unknown as ReturnType<typeof setInterval>;
            } else if (streamDoneRef.current) {
              typewriterIntervalRef.current = null;
              isStreamingDoneSV.value = true;
            } else {
              typewriterIntervalRef.current = requestAnimationFrame(tickWeb) as unknown as ReturnType<typeof setInterval>;
            }
          };
          typewriterIntervalRef.current = requestAnimationFrame(tickWeb) as unknown as ReturnType<typeof setInterval>;
          streamChat(
            cid,
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
                streamMetaRef.current = { provider: meta?.provider, model: meta?.model, userMessageId: meta?.userMessageId };
              },
              onDelta: (delta) => {
                if (!streamCancelledRef.current) pendingBufferRef.current = pendingBufferRef.current + delta;
              },
              onDone: () => {
                abortCtrlRef.current = null;
                streamDoneRef.current = true;
                resolve();
              },
              onError: (err) => {
                // onStop()'tan abort — cleanup zaten yapıldı
                if (err === 'aborted' && streamCancelledRef.current) {
                  resolve();
                  return;
                }
                streamCancelledRef.current = true;
                streamDoneRef.current = false;
                if (typewriterIntervalRef.current) { cancelAnimationFrame(typewriterIntervalRef.current as unknown as number); typewriterIntervalRef.current = null; }
                isStreamingDoneSV.value = false;
                pendingBufferRef.current = '';
                writtenLenRef.current = 0;
                pendingStreamSV.value = '';
                abortCtrlRef.current = null;
                if (String(err).includes('403')) {
                  activeChatIdRef.current = null;
                  dispatch(setSessionId(null));
                  toast.error('Bu sohbet artık erişilemez, yeni sohbet başlatılıyor.');
                  unstable_batchedUpdates(() => { setIsStreamingActive(false); setOptimisticUserMsg(null); });
                  resolve();
                  return;
                }
                unstable_batchedUpdates(() => { setIsStreamingActive(false); setOptimisticUserMsg(null); });
                reject(new Error(String(err)));
              },
            },
            ctrl.signal,
          ).catch(reject);
        });
      } else {
        // Cevabı hemen cache'e yaz — optimistic'le aynı render'da değişsin, flash olmaz
        const response = await sendMessageApi(cid, { provider, model, messages: [{ role: 'user', content }] });
        const userMsg = optimisticUserMsgRef.current;
        const now = new Date().toISOString();
        const userChatMsg: import('@/types/chat.api.types').ChatMessage | null = userMsg ? {
          id: `user_${Date.now()}`,
          role: 'user',
          content: userMsg.content,
          createdAt: now,
          provider,
          model,
        } : null;
        const assistantChatMsg: import('@/types/chat.api.types').ChatMessage = {
          id: response.assistantMessage.id ?? `assistant_${Date.now()}`,
          role: 'assistant',
          content: response.assistantMessage.content ?? '',
          createdAt: response.assistantMessage.createdAt ?? now,
          provider: response.assistantMessage.provider ?? provider,
          model: response.assistantMessage.model ?? model,
        };
        queryClient.setQueryData<import('@tanstack/react-query').InfiniteData<import('@/types/chat.api.types').PaginatedMessagesResponse>>(
          CHAT_QUERY_KEYS.messages(cid),
          (old) => {
            const basePage = { messages: [], nextCursor: null, hasMore: false };
            const existing = old ?? { pages: [basePage], pageParams: [undefined] };
            const lastPageIdx = existing.pages.length - 1;
            const lastPage = existing.pages[lastPageIdx];
            const filtered = (lastPage?.messages ?? []).filter(
              (m) => m.id !== userMsg?.id,
            );
            const newMessages = [
              ...filtered,
              ...(userChatMsg ? [userChatMsg] : []),
              assistantChatMsg,
            ];
            const newPages = existing.pages.map((p, i) =>
              i === lastPageIdx ? { ...p, messages: newMessages } : p,
            );
            return { ...existing, pages: newPages };
          },
        );
        realmService.saveMessages(cid, [
          ...(userChatMsg ? [userChatMsg] : []),
          assistantChatMsg,
        ]);
        queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
      }
      if (!streamingEnabledRef.current) {
        unstable_batchedUpdates(() => {
          setIsNonStreamPending(false);
          setOptimisticUserMsg(null);
        });
      }
    } else {
      await mutateOfflineRef.current(payload);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // App açılınca veya session değişince: queue'da bu chat'e ait pending mesaj varsa
  // queued bubble'ı restore et (en son kuyruğa alınan mesaj gösterilir)
  // Kullanıcı bir chat açınca: queue'da o chat'e ait pending mesaj varsa bubble'ı restore et
  useEffect(() => {
if (!chatId) return;
    const pending = queue.filter(
      (item) => item.actionName === OFFLINE_ACTIONS.SEND_MESSAGE &&
        (item.payload as SendMessagePayload).chatId === chatId,
    );
    if (pending.length === 0) {
      // Bu chat'te pending yok — eğer önceden queued bubble set edildiyse temizle
      if (optimisticUserMsgRef.current?.queued) {
        optimisticUserMsgRef.current = null;
        setOptimisticUserMsg(null);
      }
      return;
    }
    const last = pending[pending.length - 1];
    const payload = last.payload as SendMessagePayload;
    const queuedMsg = { ...payload.optimisticMsg, queued: true };
    optimisticUserMsgRef.current = queuedMsg;
    setOptimisticUserMsg(queuedMsg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, queue]);

  // ---------------------------------------------------------------------------
  // Flatten paginated messages
  // ---------------------------------------------------------------------------

  const prevMessagesRef = useRef<Message[]>([]);
  const messages: Message[] = useMemo(() => {
    if (!chatId) return [];
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

      // Optimistic user mesajını hemen göster — chatId beklenmez
      const optimisticUser: Message = {
        id: `optimistic_user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      optimisticUserMsgRef.current = optimisticUser;
      streamingMsgIdRef.current = 'streaming';
      setStreamingMsgIdState('streaming');
      lastStreamTextRef.current = '';
      streamCancelledRef.current = false;

      // UI'ı hemen güncelle — createChat beklenmeden
      if (isOnlineRef.current) {
        if (streamingEnabledRef.current) {
          unstable_batchedUpdates(() => {
            setOptimisticUserMsg(optimisticUser);
            setIsStreamingActive(true);
          });
        } else {
          unstable_batchedUpdates(() => {
            setOptimisticUserMsg(optimisticUser);
            setIsNonStreamPending(true);
          });
        }
      }

      // Chat yoksa oluştur — UI zaten güncellendi, sadece chatId'yi bekle
      let activeChatId = chatId;
      if (!activeChatId) {
        if (!isOnlineRef.current) {
          toast.info('Yeni sohbet başlatmak için internet bağlantısı gerekli');
          unstable_batchedUpdates(() => {
            setIsStreamingActive(false);
            setIsNonStreamPending(false);
            setOptimisticUserMsg(null);
          });
          return;
        }
        try {
          const chat = await createChatMutateRef.current({
            title: content.slice(0, 50),
            provider,
            model,
          });
          activeChatId = chat.id;
          dispatch(setSessionId(activeChatId));
        } catch {
          unstable_batchedUpdates(() => {
            setIsStreamingActive(false);
            setIsNonStreamPending(false);
            setOptimisticUserMsg(null);
          });
          toast.error('Sohbet oluşturulamadı');
          return;
        }
      }

      activeChatIdRef.current = activeChatId;

      await dispatchMessage({
        content,
        chatId: activeChatId,
        provider,
        model,
        optimisticMsg: optimisticUser,
        sentAt: new Date().toISOString(),
        fromQueue: false,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, dispatchMessage, dispatch],
  );

  // ---------------------------------------------------------------------------
  // Diğer aksiyonlar
  // ---------------------------------------------------------------------------

  const onStop = useCallback(() => {
    // Aktif stream yoksa no-op — double-tap koruması
    if (!abortCtrlRef.current) return;

    // 1. Flag'leri ÖNCE set et — onDelta/onDone callback'leri bir sonraki tick'te
    //    çalışabilir, bu flag'ler onları bloke eder (race condition koruması)
    streamCancelledRef.current = true;
    streamDoneRef.current = false;

    // 2. Typewriter RAF loop'u durdur — buffer → SV yazımı kesilsin
    if (typewriterIntervalRef.current) {
      cancelAnimationFrame(typewriterIntervalRef.current as unknown as number);
      typewriterIntervalRef.current = null;
    }

    // 3. SV'leri sıfırla: önce resetCount artır → StreamingBubble bir sonraki
    //    frame'de completedSV=false yapar, SONRA metin temizlenir.
    //    Sıra önemli: counter önce → text sonra → done en son
    streamResetCountSV.value = streamResetCountSV.value + 1;
    pendingStreamSV.value = '';
    isStreamingDoneSV.value = false;

    // 4. JS refs temizle
    pendingBufferRef.current = '';
    writtenLenRef.current = 0;
    lastStreamTextRef.current = '';
    streamingMsgIdRef.current = 'streaming';

    // 5. HTTP isteğini iptal et — abort sonrası onError('aborted') gelir.
    //    onError handler'ı streamCancelledRef=true görünce UI'ya dokunmaz (aşağıda guard var).
    const ctrl = abortCtrlRef.current;
    abortCtrlRef.current = null; // önce null yap — onError'da abort guard çalışsın
    ctrl.abort();

    // 6. React state: tek batch, tek render
    unstable_batchedUpdates(() => {
      setIsStreamingActive(false);
      setOptimisticUserMsg(null);
      // setStreamingMsgIdState('streaming') — gereksiz, ref zaten set edildi.
      // Bu state sadece FlatList key için kullanılıyor, stop'ta render tetiklemeye gerek yok.
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewChat = useCallback(() => {
    streamCancelledRef.current = true;
    streamDoneRef.current = false;
    if (typewriterIntervalRef.current) { cancelAnimationFrame(typewriterIntervalRef.current as unknown as number); typewriterIntervalRef.current = null; }
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
    (id: string, title?: string) => {
      if (id === sessionId) return;
      streamCancelledRef.current = true;
      streamDoneRef.current = false;
      if (typewriterIntervalRef.current) { cancelAnimationFrame(typewriterIntervalRef.current as unknown as number); typewriterIntervalRef.current = null; }
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
      // Title anında set et — chatsData'nın güncellenmesini bekleme
      if (title !== undefined) setSessionTitle(title);
      dispatch(setSessionId(id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, dispatch],
  );

  const likeMessage = useCallback((messageId: string, liked: boolean | null) => {
    if (!sessionId || !messageId) return;
    const action = liked === true ? 1 : 2;

    // Optimistic: React Query cache'i hemen güncelle — doğru sessionId ile
    queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
      CHAT_QUERY_KEYS.messages(sessionId),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
              (msg as any).id === messageId ? { ...msg, liked } : msg,
            ),
          })),
        };
      },
    );

    void mutateOfflineLike({ chatId: sessionId, messageId, action, liked });
  }, [sessionId, mutateOfflineLike, queryClient]);

  const isTyping = streamingEnabled ? isStreamingActive : isNonStreamPending;

  // sessionTitle: yeni subscriber açmadan cache'den oku — chatId veya invalidate sonrası güncellenir
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!chatId) { setSessionTitle(null); return; }
    const cached = queryClient.getQueryData<InfiniteData<{ items: { id: string; title: string }[] }>>(
      CHAT_QUERY_KEYS.chatsList,
    );
    if (!cached) return;
    for (const page of cached.pages) {
      const found = page.items?.find((s) => s.id === chatId);
      if (found) { setSessionTitle((prev) => prev === found.title ? prev : found.title); return; }
    }
  }, [chatId, queryClient]);

  // streamingMessageId: isStreamingActive olduğu sürece gerçek assistant mesaj ID'sini
  // (ya da henüz meta gelmemişse sabit sentinel) döndür.
  // State tabanlı — onMeta gelince re-render tetiklenir, FlatList gerçek ID'yi key olarak alır.
  const streamingMessageId = isStreamingActive ? streamingMsgIdState : null;

  // Hook içinde hesapla — isFetching/isLoading'i dışarı sızdırmak HomeScreen'i
  // her refetch'te re-render eder (mesaj gönderme anında çakışır).
  // Sadece isLoading (ilk fetch, cache yok): Realm cache varsa messages.length > 0, loading false.
  // isFetching background refresh — spinner gösterme, kullanıcı mesajları zaten görüyor.
  const isSessionLoading =
    !!chatId &&
    !isStreamingActive &&
    !optimisticUserMsg &&
    messagesQuery.isLoading;

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
