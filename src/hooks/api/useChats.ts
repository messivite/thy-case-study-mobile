import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
  UseQueryOptions,
} from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import {
  getChats,
  getChat,
  createChat,
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
 * GET /api/chats — non-paginated
 */
export const useGetChatsQuery = (
  options?: Partial<UseQueryOptions<GetChatsResponse, Error>>,
) =>
  useQuery<GetChatsResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chats,
    queryFn: () => getChats(),
    ...options,
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

  // API'den gelen tum sessionlari Realm'e yaz (drawer'dan bagimsiz)
  useEffect(() => {
    if (!query.data) return;
    const allItems = query.data.pages.flatMap((p) => p.items);
    if (allItems.length > 0) {
      realmService.saveSessions(allItems);
    }
  }, [query.data]);

  return query;
};

/**
 * POST /api/chats
 */
export const useCreateChatMutation = () =>
  useMutation<CreateChatResponse, Error, CreateChatRequest>({
    mutationFn: (payload) => createChat(payload),
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
 * POST /api/chats/:chatId/stream
 */
export const useStreamChatMutation = (chatId: string) =>
  useMutation<void, Error, { payload: StreamChatRequest; callbacks: StreamChatCallbacks }>({
    mutationFn: ({ payload, callbacks }) => streamChat(chatId, payload, callbacks),
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
 * POST /api/chats/:chatId/sync
 */
export const useSyncChatMutation = (chatId: string) =>
  useMutation<SyncChatResponse, Error, SyncChatRequest>({
    mutationFn: (payload) => syncChat(chatId, payload),
  });

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
  const cached = useMemo(() => realmService.getMessages(sessionId), [sessionId]);

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
    initialData:
      cached.messages.length > 0
        ? {
            pages: [{ messages: cached.messages, nextCursor: null, hasMore: false }],
            pageParams: [undefined],
          }
        : undefined,
    initialDataUpdatedAt: cached.syncedAt,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!sessionId && !isAnonymous,
  });

  // API'den gelen mesajlari Realm'e yaz
  useEffect(() => {
    if (!sessionId || !query.data) return;
    const allMessages = query.data.pages.flatMap((p) => p.messages);
    if (allMessages.length > 0) {
      realmService.saveMessages(sessionId, allMessages);
    }
  }, [sessionId, query.data]);

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
