import { useMutation, useQuery, useInfiniteQuery, useQueryClient, InfiniteData, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getChats, getChat, createChat, sendMessage, streamChat, syncChat, getChatMessages, getPaginatedChats, searchChats } from '@/api/chat.api';
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
 * GET /api/chats
 * Kullanıcıya ait tüm chat listesini çeker.
 *
 * Kullanım:
 *   const { data, isLoading } = useGetChatsQuery();
 *   data?.map(chat => chat.title)
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
 * GET /api/chats?limit=20&cursor=X — Infinite scroll (cursor tabanlı)
 * initialData: Realm cache'inden beslenir, anlık görünüm sağlar.
 * staleTime: 2dk — dolunca arka planda API refresh atar.
 *
 * Kullanım:
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteChatsQuery();
 *   const allChats = data?.pages.flatMap(p => p.items) ?? [];
 */
export const useInfiniteChatsQuery = () => {
  // Realm'i render sırasında değil, useMemo ile lazy oku
  const cached = useMemo(() => realmService.getSessions(), []);

  return useInfiniteQuery<PaginatedChatsResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chatsList,
    queryFn: ({ pageParam }) => getPaginatedChats(20, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: cached.items.length > 0 ? {
      pages: [{ totalCount: cached.items.length, hasNext: false, nextCursor: null, items: cached.items }],
      pageParams: [undefined],
    } : undefined,
    initialDataUpdatedAt: cached.syncedAt,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
};

/**
 * POST /api/chats
 * Yeni bir chat oluşturur.
 *
 * Kullanım:
 *   const { mutate, isPending } = useCreateChatMutation();
 *   mutate({ title: 'Yeni sohbet', provider: 'gemini', model: 'gemini-2.5-flash' });
 */
export const useCreateChatMutation = () =>
  useMutation<CreateChatResponse, Error, CreateChatRequest>({
    mutationFn: (payload) => createChat(payload),
  });

/**
 * GET /api/chats/:chatId
 * Chat detayını ve tüm mesajlarını çeker.
 *
 * Kullanım:
 *   const { data, isLoading } = useGetChatQuery(chatId);
 *   data.messages, data.title, data.provider
 */
export const useGetChatQuery = (chatId: string) =>
  useQuery<GetChatResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chat(chatId),
    queryFn: () => getChat(chatId),
    enabled: !!chatId,
  });

/**
 * POST /api/chats/:chatId/stream
 * Token'ları callback'lerle akıtır. mutationFn'e { payload, callbacks } geçilir.
 *
 * Kullanım:
 *   const { mutate, isPending } = useStreamChatMutation(chatId);
 *   mutate({
 *     payload: { provider: 'openai', model: 'gpt-4.1-mini', messages: [...] },
 *     callbacks: {
 *       onMeta: (meta) => setMessageId(meta.assistantMessageId),
 *       onDelta: (delta) => setContent(prev => prev + delta),
 *       onDone: () => setIsStreaming(false),
 *       onError: (err) => console.error(err),
 *     },
 *   });
 */
export const useStreamChatMutation = (chatId: string) =>
  useMutation<void, Error, { payload: StreamChatRequest; callbacks: StreamChatCallbacks }>({
    mutationFn: ({ payload, callbacks }) => streamChat(chatId, payload, callbacks),
  });

/**
 * POST /api/chats/:chatId/messages
 * Mesaj gönderir, assistant'ın tam cevabını tek seferde döner (non-stream).
 * Optimistic UI: kullanıcı mesajı anında cache'e eklenir.
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
      // Cancel ongoing fetches
      await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.messages(chatId) });

      // Snapshot previous data
      const previous = queryClient.getQueryData<InfiniteData<PaginatedMessagesResponse>>(
        CHAT_QUERY_KEYS.messages(chatId),
      );

      // Optimistic user message
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
          // First page = newest messages (inverted list)
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
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          CHAT_QUERY_KEYS.messages(chatId),
          context.previous,
        );
      }
    },
    onSuccess: (data) => {
      // Add assistant message to cache
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
 * Offline mesajları sync eder ve assistant yanıtını döner.
 *
 * Kullanım:
 *   const { mutate, isPending, data } = useSyncChatMutation(chatId);
 *   mutate({ provider: 'openai', model: 'gpt-4o', messages: [...] });
 */
export const useSyncChatMutation = (chatId: string) =>
  useMutation<SyncChatResponse, Error, SyncChatRequest>({
    mutationFn: (payload) => syncChat(chatId, payload),
  });

/**
 * GET /api/chats/:chatId/messages?direction=older&cursor=X — Infinite scroll
 * initialData: Realm cache'inden beslenir.
 * staleTime: 30sn — aktif chat daha sık değişir.
 *
 * Kullanım:
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMessagesQuery(chatId);
 *   const allMessages = data?.pages.flatMap(p => p.messages) ?? [];
 */
export const useInfiniteMessagesQuery = (sessionId: string) => {
  // Realm'i render sırasında değil, useMemo ile lazy oku
  const cached = useMemo(() => realmService.getMessages(sessionId), [sessionId]);

  return useInfiniteQuery<PaginatedMessagesResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.messages(sessionId),
    queryFn: ({ pageParam }) =>
      getChatMessages(sessionId, { limit: 20, cursor: pageParam as string | undefined, direction: 'older' }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: cached.messages.length > 0 ? {
      pages: [{ messages: cached.messages, nextCursor: null, hasMore: false }],
      pageParams: [undefined],
    } : undefined,
    initialDataUpdatedAt: cached.syncedAt,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    enabled: !!sessionId,
  });
};

/**
 * GET /api/chats/search?q=xxx&limit=20&cursor=xxx
 * Sohbet başlıkları ve mesaj içerikleri üzerinde full-text arama.
 * Infinite scroll destekli. En az 2 karakter girilmeden tetiklenmez.
 *
 * staleTime: 60s — aynı sorgu kısa sürede tekrar gelirse cache kullan
 * gcTime: 5dk — kullanıcı farklı sorgu girip geri gelirse sonuçlar bellekte kalsın
 *
 * Kullanım:
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSearchChatsQuery('thy');
 *   const results = data?.pages.flatMap(p => p.items) ?? [];
 */
export const useSearchChatsQuery = (q: string, limit: number = 20) =>
  useInfiniteQuery<ChatSearchResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.search(q),
    queryFn: ({ pageParam }) =>
      searchChats({ q, limit, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: q.trim().length >= 2,
    staleTime: 60_000,       // 60 sn — aynı sorgu cache'den gelir
    gcTime: 5 * 60_000,      // 5 dk — farklı sorguya geçince bellekte kalır
  });
