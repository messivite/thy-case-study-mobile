import { useMutation, useQuery } from '@tanstack/react-query';
import { getChat, sendMessage, streamChat, syncChat } from '@/api/chat.api';
import {
  GetChatResponse,
  NonStreamChatRequest,
  NonStreamChatResponse,
  StreamChatCallbacks,
  StreamChatRequest,
  SyncChatRequest,
  SyncChatResponse,
} from '@/types/chat.api.types';

export const CHAT_QUERY_KEYS = {
  chat: (chatId: string) => ['chats', chatId] as const,
};

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
 *
 * Kullanım:
 *   const { mutate, isPending, data } = useSendMessageMutation(chatId);
 *   mutate({ provider: 'openai', model: 'gpt-4.1-mini', messages: [...] });
 */
export const useSendMessageMutation = (chatId: string) =>
  useMutation<NonStreamChatResponse, Error, NonStreamChatRequest>({
    mutationFn: (payload) => sendMessage(chatId, payload),
  });

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
