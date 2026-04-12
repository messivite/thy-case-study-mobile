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
  likeMessage,
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
  LikeMessageRequest,
  LikeMessageResponse,
  MessageLikeAction,
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
import { useOfflineMutation } from '@mustafaaksoy41/react-native-offline-queue';
import { OFFLINE_ACTIONS } from '@/lib/offlineQueue';

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
 *  1. Mount'ta Realm cache'i `initialData` olarak anında render edilir (instant gösterim).
 *  2. staleTime (30s) dolunca API fetch tetiklenir — gerçek veri gelir, cache güncellenir.
 *  3. Kullanıcı yukarı kaydırınca `fetchNextPage` → direction=older → eski mesajlar yüklenir.
 *  4. API fetch tamamlanınca mesajlar Realm'e upsert edilir (duplicate-safe).
 */
export const useInfiniteMessagesQuery = (sessionId: string, isAnonymous = false) => {
  // Realm'den senkron oku — mount anında initialData olarak ver
  const cached = useMemo(() => realmService.getMessages(sessionId), [sessionId]);

  const query = useInfiniteQuery<PaginatedMessagesResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.messages(sessionId),
    queryFn: ({ pageParam }) =>
      getChatMessages(sessionId, {
        limit: 40,
        cursor: pageParam as string | undefined,
        direction: 'older',
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: cached.messages.length > 0
      ? {
          pages: [{
            messages: cached.messages,
            nextCursor: null,
            hasMore: false,
          }],
          pageParams: [undefined],
        }
      : undefined,
    initialDataUpdatedAt: cached.syncedAt,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!sessionId && !isAnonymous,
  });

  // API fetch tamamlanınca Realm'e yaz
  // lastMsgSyncedAt sessionId'ye bağlı — session değişince sıfırla
  const lastMsgSyncedAt = useRef(0);
  const lastSyncedSessionId = useRef('');
  useEffect(() => {
    if (!sessionId || !query.data || !query.dataUpdatedAt) return;
    // Session değişince ref'i sıfırla — yeni session'da ilk fetch her zaman yazılsın
    if (lastSyncedSessionId.current !== sessionId) {
      lastSyncedSessionId.current = sessionId;
      lastMsgSyncedAt.current = 0;
    }
    if (query.dataUpdatedAt <= lastMsgSyncedAt.current) return;
    lastMsgSyncedAt.current = query.dataUpdatedAt;

    // Tüm yüklü sayfaları düzleştir, en yeni 40'ı Realm'e yaz.
    // pages[0] varsayımı kırılabilir (fetchNextPage sonrası sıra değişebilir),
    // flatten ile her zaman doğru 40 mesaj cache'lenir.
    const allMsgs = query.data.pages.flatMap((p) => p.messages ?? []);
    // createdAt'e göre azalan sıra → en yeni 40
    const newest40 = [...allMsgs]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 40);
    if (newest40.length > 0) {
      realmService.saveMessages(sessionId, newest40);
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

// ---------------------------------------------------------------------------
// Like / Unlike mutation
// ---------------------------------------------------------------------------

type LikeMessagePayload = {
  chatId: string;
  messageId: string;
  action: MessageLikeAction;
  liked: boolean | null;
};

/**
 * POST /api/chats/:chatId/messages/:messageId/like
 *
 * - Optimistic update: mesajın `liked` alanını hemen günceller
 * - Offline destekli: offline ise kuyruğa alınır, online olunca tekrar dener
 * - Hata durumunda query invalidate edilir — sunucudan gerçek state gelir
 * - Sync API ayrıca eklenecek (ileride)
 */
export const useLikeMessageMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  const applyOptimistic = (payload: LikeMessagePayload) => {
    const newLiked = payload.liked;
    // React Query cache güncelle
    queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
      CHAT_QUERY_KEYS.messages(chatId),
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
              (msg as any).id === payload.messageId
                ? { ...msg, liked: newLiked }
                : msg,
            ),
          })),
        };
      },
    );
    // Realm'e de yaz — uygulama restart'ta like durumu korunsun
    void realmService.updateMessageLiked(payload.messageId, newLiked);
  };

  return useOfflineMutation<LikeMessagePayload>(
    OFFLINE_ACTIONS.LIKE_MESSAGE,
    {
      handler: async (payload) => {
        await likeMessage(payload.chatId, payload.messageId, { action: payload.action });
      },
      onOptimisticSuccess: applyOptimistic,
      onError: (_err: Error, _payload: LikeMessagePayload) => {
        void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(chatId) });
      },
    },
  );
};
