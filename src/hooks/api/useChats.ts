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
  ChatMessage,
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
export const useSendMessageMutation = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    NonStreamChatResponse,
    Error,
    NonStreamChatRequest,
    { previous: InfiniteData<PaginatedMessagesResponse> | undefined }
  >({
    mutationFn: (payload) => sendMessage(chatId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.messages(chatId) });
      const previous = queryClient.getQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(chatId),
      );

      const userMessage = payload.messages[payload.messages.length - 1];
      const optimisticMsg: ChatMessage = {
        role: userMessage.role,
        content: userMessage.content,
        provider: payload.provider,
        model: payload.model,
      };

      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(chatId),
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          // messages are newest→oldest, prepend = newest position
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              messages: [optimisticMsg, ...newPages[0].messages],
            };
          }
          return { ...old, pages: newPages };
        },
      );
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CHAT_QUERY_KEYS.messages(chatId), context.previous);
      }
    },
    onSuccess: (data) => {
      const assistantMsg: ChatMessage = {
        role: data.assistantMessage.role,
        content: data.assistantMessage.content,
        provider: data.assistantMessage.provider,
        model: data.assistantMessage.model,
      };
      queryClient.setQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(chatId),
        (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              messages: [assistantMsg, ...newPages[0].messages],
            };
          }
          return { ...old, pages: newPages };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.messages(chatId) });
    },
  });
};

/**
 * GET /api/chats/:chatId/messages?direction=older&cursor=X — Infinite scroll
 *
 * initialData : Realm cache — mount'ta aninda render
 * staleTime   : 30sn — aktif chat daha sik degisir
 * Guest guard : isAnonymous = true ise API cagrisi yapilmaz.
 *
 * Realm sync  : API'den gelen mesajlar bu hook'un useEffect'iyle Realm'e yazilir.
 */
export const useInfiniteMessagesQuery = (sessionId: string, isAnonymous = false) => {
  const query = useInfiniteQuery<PaginatedMessagesResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.messages(sessionId),
    queryFn: async ({ pageParam }) => {
      // İlk sayfa (pageParam yok) → önce Realm'e bak, varsa hemen dön, arka planda API fetch et
      if (!pageParam) {
        const { messages: cached } = realmService.getMessages(sessionId);
        if (cached.length > 0) {
          console.log('[MessagesQuery] Realm hit, count:', cached.length);
          // Arka planda API'yi de fetch et (stale-while-revalidate)
          getChatMessages(sessionId, { limit: 20, direction: 'older' })
            .then((fresh) => {
              // Bu promise resolve olunca React Query zaten invalidate ile günceller
              // Burada bir şey yapmaya gerek yok — sadece Realm'i güncelle
              if (fresh.messages.length > 0) {
                realmService.saveMessages(sessionId, fresh.messages);
              }
            })
            .catch(() => { /* sessizce geç */ });
          return { messages: cached, nextCursor: null, hasMore: false };
        }
      }
      // Realm boş veya sayfalama → API'ye git
      const result = await getChatMessages(sessionId, {
        limit: 20,
        cursor: pageParam as string | undefined,
        direction: 'older',
      });
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!sessionId && !isAnonymous,
  });

  // API'den gelen mesajlari Realm'e yaz — sadece yeni fetch oldugunda
  const lastMsgSyncedAt = useRef(0);
  useEffect(() => {
    if (!sessionId || !query.data || !query.dataUpdatedAt) return;
    if (query.dataUpdatedAt <= lastMsgSyncedAt.current) return;
    lastMsgSyncedAt.current = query.dataUpdatedAt;
    const allMessages = query.data.pages.flatMap((p) => p.messages);
    if (allMessages.length > 0) {
      realmService.saveMessages(sessionId, allMessages);
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
