import { useMutation, useQuery, useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { getChats, getChat, createChat, sendMessage, streamChat, syncChat, getChatMessages } from '@/api/chat.api';
import {
  CreateChatRequest,
  CreateChatResponse,
  GetChatsResponse,
  GetChatResponse,
  NonStreamChatRequest,
  NonStreamChatResponse,
  PaginatedMessagesResponse,
  StreamChatCallbacks,
  StreamChatRequest,
  SyncChatRequest,
  SyncChatResponse,
  ChatMessage,
} from '@/types/chat.api.types';

export const CHAT_QUERY_KEYS = {
  chats: ['chats'] as const,
  chat: (chatId: string) => ['chats', chatId] as const,
  messages: (chatId: string) => ['chats', chatId, 'messages'] as const,
};

/**
 * GET /api/chats
 * Kullanıcıya ait tüm chat listesini çeker.
 *
 * Kullanım:
 *   const { data, isLoading } = useGetChatsQuery();
 *   data?.map(chat => chat.title)
 */
export const useGetChatsQuery = () =>
  useQuery<GetChatsResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.chats,
    queryFn: () => getChats(),
  });

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
 * GET /api/chats/:chatId/messages (paginated)
 * Infinite scroll ile mesajları sayfa sayfa çeker.
 *
 * Kullanım:
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteMessagesQuery(chatId);
 *   const allMessages = data?.pages.flatMap(p => p.messages) ?? [];
 */
export const useInfiniteMessagesQuery = (chatId: string) =>
  useInfiniteQuery<PaginatedMessagesResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.messages(chatId),
    queryFn: ({ pageParam }) =>
      getChatMessages(chatId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!chatId,
  });
