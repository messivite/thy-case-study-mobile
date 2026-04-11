import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useMemo, useEffect, useRef } from 'react';
import {
  getChats,
  getChat,
  createChat,
  deleteChat,
  sendMessage,
  streamChat,
  syncChat,
  getChatMessages,
  getPaginatedChats,
  searchChats,
} from '@/api/chat.api';
import {
  ChatSearchResponse,
  CreateChatRequest,
  CreateChatResponse,
  GetChatsResponse,
  GetChatResponse,
  NonStreamChatRequest,
  NonStreamChatResponse,
  PaginatedChatsResponse,
  PaginatedMessagesResponse,
  StreamChatCallbacks,
  StreamChatRequest,
  SyncChatRequest,
  SyncChatResponse,
} from '@/types/chat.api.types';
import { realmService } from '@/services/realm';

export const CHAT_QUERY_KEYS = {
  chats: ['chats'] as const,
  chatsList: ['chats', 'list'] as const,
  chat: (chatId: string) => ['chats', chatId] as const,
  messages: (chatId: string) => ['chats', chatId, 'messages'] as const,
  search: (q: string) => ['chats', 'search', q] as const,
};

/**
 * GET /api/chats — tüm chatleri döner (non-paginated)
 */
export const useGetChatsQuery = (options?: Partial<UseQueryOptions<GetChatsResponse, Error>>) =>
  useQuery<GetChatsResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chats,
    queryFn: () => getChats(),
    ...options,
  });

/**
 * GET /api/chats/:chatId
 */
export const useGetChatQuery = (chatId: string) =>
  useQuery<GetChatResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chat(chatId),
    queryFn: () => getChat(chatId),
    enabled: !!chatId,
  });

/**
 * POST /api/chats/:chatId/stream — streaming chat
 */
export const useStreamChatMutation = (chatId: string) =>
  useMutation<void, Error, { payload: StreamChatRequest; callbacks: StreamChatCallbacks }>({
    mutationFn: ({ payload, callbacks }) => streamChat(chatId, payload, callbacks),
  });

/**
 * POST /api/chats/:chatId/sync
 */
export const useSyncChatMutation = (chatId: string) =>
  useMutation<SyncChatResponse, Error, SyncChatRequest>({
    mutationFn: (payload) => syncChat(chatId, payload),
  });

/**
 * GET /api/chats?limit=20&cursor=X — Infinite scroll (cursor tabanli)
 *
 * initialData         : Realm cache — mount'ta aninda render (roket acilis)
 * initialDataUpdatedAt: Realm syncedAt — staleTime ile karsilastirilir
 * staleTime           : 2dk — dolunca arka planda refetch
 *
 * Realm sync : API'den dönen tum sessionlar bu hook'un useEffect'iyle Realm'e yazilir.
 * Guest guard: isAnonymous = true ise API cagrisi yapilmaz.
 */
export const useInfiniteChatsQuery = (isAnonymous = false) => {
  const cached = useMemo(() => realmService.getSessions(), []);

  const query = useInfiniteQuery<PaginatedChatsResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chatsList,
    queryFn: ({ pageParam }) =>
      getPaginatedChats(20, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData:
      cached.items.length > 0
        ? {
            pages: [
              {
                totalCount: cached.items.length,
                hasNext: false,
                nextCursor: null,
                items: cached.items,
              },
            ],
            pageParams: [undefined],
          }
        : undefined,
    initialDataUpdatedAt: cached.syncedAt,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    enabled: !isAnonymous,
  });

  // API'den gelen sessionlari Realm'e yaz — sadece yeni fetch oldugunda (dataUpdatedAt degisince)
  const lastSyncedAt = useRef(0);
  useEffect(() => {
    if (!query.data || !query.dataUpdatedAt) return;
    if (query.dataUpdatedAt <= lastSyncedAt.current) return; // ayni veri, yazma
    lastSyncedAt.current = query.dataUpdatedAt;
    const allItems = query.data.pages.flatMap((p) => p.items);
    if (allItems.length > 0) {
      realmService.saveSessions(allItems);
    }
  }, [query.dataUpdatedAt]); // query.data degil, timestamp'e bagla

  return query;
};

/**
 * DELETE /api/chats/:chatId — optimistic remove + rollback
 *
 * onMutate  : chatsList cache'inden optimistik olarak çıkar
 * onError   : rollback
 * onSuccess : Realm'den de sil
 */
export const useDeleteChatMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previous: InfiniteData<PaginatedChatsResponse> | undefined }>({
    mutationFn: (chatId) => deleteChat(chatId),
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
      const previous = queryClient.getQueryData<InfiniteData<PaginatedChatsResponse>>(
        CHAT_QUERY_KEYS.chatsList,
      );
      queryClient.setQueryData<InfiniteData<PaginatedChatsResponse>>(
        CHAT_QUERY_KEYS.chatsList,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((c) => c.id !== chatId),
            })),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _chatId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CHAT_QUERY_KEYS.chatsList, context.previous);
      }
    },
    onSuccess: (_data, chatId) => {
      void realmService.deleteSession(chatId);
    },
  });
};

/**
 * POST /api/chats
 */
export const useCreateChatMutation = () =>
  useMutation<CreateChatResponse, Error, CreateChatRequest>({
    mutationFn: (payload) => createChat(payload),
  });

/**
 * POST /api/chats/:chatId/messages — non-stream, optimistic UI
 */
export const useSendMessageMutation = (chatId: string) =>
  useMutation<NonStreamChatResponse, Error, NonStreamChatRequest>({
    mutationFn: (payload) => sendMessage(chatId, payload),
  });

/**
 * GET /api/chats/:chatId/messages?direction=older&cursor=X — Infinite scroll
 *
 * Akış:
 *  1. Mount'ta Realm cache'i `initialData` olarak anında render edilir.
 *  2. Realm'de veri varsa: en yeni mesajın createdAt'ini cursor olarak kullanıp
 *     `direction=newer` fetch yapılır (WhatsApp pattern) — aradaki yeni mesajlar merge edilir.
 *  3. Realm'de veri yoksa: normal `direction=older` fetch (ilk yükleme).
 *  4. Kullanıcı yukarı kaydırıp `onStartReached` tetiklerse `fetchNextPage` çağrılır
 *     → `direction=older&cursor=OLDEST_CURSOR` ile eski mesajlar remote'tan çekilir.
 *  5. API'den gelen mesajlar Realm'e upsert edilir (duplicate-safe).
 */
export const useInfiniteMessagesQuery = (sessionId: string, isAnonymous = false) => {
  const queryClient = useQueryClient();

  // Realm'den senkron oku — mount anında initialData olarak ver
  const cached = useMemo(() => realmService.getMessages(sessionId), [sessionId]);

  // Realm'deki en yeni mesajın createdAt'i — newer sync için cursor
  // messages: newest→oldest sıralı, index 0 = en yeni
  const newestCachedCreatedAt = cached.messages[0]?.createdAt ?? null;

  const query = useInfiniteQuery<PaginatedMessagesResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.messages(sessionId),
    queryFn: ({ pageParam }) =>
      getChatMessages(sessionId, {
        limit: 20,
        cursor: pageParam as string | undefined,
        direction: 'older',
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Realm'de veri varsa hemen göster — API fetch'i arka planda yap
    initialData: cached.messages.length > 0
      ? {
          pages: [{ messages: cached.messages, nextCursor: null, hasMore: false }],
          pageParams: [undefined],
        }
      : undefined,
    // Realm syncedAt — staleTime ile karşılaştırılır
    // syncedAt + staleTime > now → fresh skip; < now → arka planda refetch
    initialDataUpdatedAt: cached.syncedAt,
    staleTime: 30_000, // 30sn — sohbet sık değişir
    gcTime: 5 * 60_000,
    enabled: !!sessionId && !isAnonymous,
  });

  // WhatsApp pattern: Realm cache varsa en yeni mesajdan sonrasını çek
  // Her session mount'unda bir kez çalışır; yeni mesajları cache'e merge eder
  const newerSyncDoneRef = useRef<string | null>(null);
  // setQueryData tarafından tetiklenen dataUpdatedAt değişimini yoksaymak için flag
  const skipNextRealmWriteRef = useRef(false);

  useEffect(() => {
    if (!sessionId || isAnonymous || !newestCachedCreatedAt) return;
    if (newerSyncDoneRef.current === sessionId) return;
    newerSyncDoneRef.current = sessionId;

    getChatMessages(sessionId, {
      limit: 50,
      cursor: newestCachedCreatedAt,
      direction: 'newer',
    }).then((result) => {
      if (!result.messages || result.messages.length === 0) return;

      // Realm'e yaz (setQueryData öncesi — döngüyü önle)
      realmService.saveMessages(sessionId, result.messages);

      // Cache'e merge et — duplicate önleme: id kontrolü
      skipNextRealmWriteRef.current = true;
      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(sessionId),
        (old) => {
          const base: InfiniteData<PaginatedMessagesResponse> = old ?? {
            pages: [{ messages: [], nextCursor: null, hasMore: false }],
            pageParams: [undefined],
          };
          const existingIds = new Set(
            base.pages.flatMap((p) => p.messages.map((m) => m.id).filter(Boolean)),
          );
          const newMessages = result.messages.filter((m) => !m.id || !existingIds.has(m.id));
          if (newMessages.length === 0) return base;

          const newPages = [...base.pages];
          newPages[0] = {
            ...newPages[0],
            messages: [...newMessages, ...newPages[0].messages],
          };
          return { ...base, pages: newPages };
        },
      );
    }).catch(() => { /* sessizce geç */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isAnonymous]);

  // API fetch tamamlanınca Realm'e yaz — sadece gerçek API fetch'lerinde (setQueryData döngüsü değil)
  const lastMsgSyncedAt = useRef(0);
  useEffect(() => {
    if (!sessionId || !query.data || !query.dataUpdatedAt) return;
    if (query.dataUpdatedAt <= lastMsgSyncedAt.current) return;
    lastMsgSyncedAt.current = query.dataUpdatedAt;

    // WhatsApp newer sync'in setQueryData'sından tetiklendiyse yoksay
    if (skipNextRealmWriteRef.current) {
      skipNextRealmWriteRef.current = false;
      return;
    }

    const firstPage = query.data.pages[0]?.messages ?? [];
    if (firstPage.length > 0) {
      realmService.saveMessages(sessionId, firstPage);
    }
  }, [sessionId, query.dataUpdatedAt]);

  return query;
};

/**
 * GET /api/chats/search?q=xxx&limit=20&cursor=xxx — full-text arama
 *
 * initialData: Realm'den son sessionlar (focus aninda anlik gosterim)
 * enabled    : q.trim().length >= 2
 * staleTime  : 60s
 */
export const useSearchChatsQuery = (q: string, limit = 20) =>
  useInfiniteQuery<ChatSearchResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.search(q),
    queryFn: ({ pageParam }) =>
      searchChats({ q, limit, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
