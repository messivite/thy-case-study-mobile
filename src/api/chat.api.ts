import { privateApi } from '@/services/api';
import { supabase } from '@/services/supabase';
import {
  ChatSearchParams,
  ChatSearchResponse,
  CreateChatRequest,
  CreateChatResponse,
  GetChatsResponse,
  GetChatResponse,
  GetMessagesParams,
  NonStreamChatRequest,
  NonStreamChatResponse,
  PaginatedChatsResponse,
  PaginatedMessagesResponse,
  StreamChatCallbacks,
  StreamChatRequest,
  StreamEvent,
  SyncChatRequest,
  SyncChatResponse,
} from '@/types/chat.api.types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com';

/**
 * POST /api/chats/:chatId/stream
 * Sunucudan gelen JSON satırlarını (newline-delimited JSON) okur,
 * her event'i parse edip ilgili callback'i çağırır.
 *
 * Kullanım:
 *   await streamChat(chatId, payload, {
 *     onMeta: (meta) => ...,
 *     onDelta: (delta) => setContent(prev => prev + delta),
 *     onDone: () => ...,
 *     onError: (err) => ...,
 *   });
 */
export const streamChat = async (
  chatId: string,
  payload: StreamChatRequest,
  callbacks: StreamChatCallbacks,
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${BASE_URL}/api/chats/${chatId}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    callbacks.onError?.(`HTTP ${response.status}: ${response.statusText}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.('ReadableStream desteklenmiyor.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Newline-delimited JSON: her satır ayrı bir event
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // son yarım satırı sakla

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const event = JSON.parse(trimmed) as StreamEvent;

        switch (event.type) {
          case 'meta':
            callbacks.onMeta?.(event.meta);
            break;
          case 'delta':
            callbacks.onDelta?.(event.delta);
            break;
          case 'done':
            callbacks.onDone?.();
            break;
          case 'error':
            callbacks.onError?.(event.error);
            break;
        }
      } catch {
        // Parse edilemeyen satır — yoksay
      }
    }
  }

  // Buffer'da kalan veri varsa işle
  const remaining = buffer.trim();
  if (remaining) {
    try {
      const event = JSON.parse(remaining) as StreamEvent;
      if (event.type === 'done') callbacks.onDone?.();
      else if (event.type === 'error') callbacks.onError?.(event.error);
    } catch {
      // yoksay
    }
  }
};

/**
 * POST /api/chats
 * Yeni bir chat oluşturur.
 */
export const createChat = async (payload: CreateChatRequest): Promise<CreateChatResponse> => {
  const { data } = await privateApi.post<CreateChatResponse>('/api/chats', payload);
  return data;
};

/**
 * GET /api/chats
 * Kullanıcıya ait tüm chat'lerin listesini döner.
 */
export const getChats = async (): Promise<GetChatsResponse> => {
  const { data } = await privateApi.get<GetChatsResponse>('/api/chats');
  return data;
};

/**
 * GET /api/chats?limit=X&cursor=Y
 * Cursor tabanlı sayfalanmış chat listesini döner. Infinite scroll için kullanılır.
 */
export const getPaginatedChats = async (
  limit: number = 20,
  cursor?: string,
): Promise<PaginatedChatsResponse> => {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await privateApi.get<PaginatedChatsResponse>('/api/chats', { params });
  return data;
};

/**
 * GET /api/chats/:chatId
 * Chat detayını ve tüm mesajlarını döner.
 */
export const getChat = async (chatId: string): Promise<GetChatResponse> => {
  const { data } = await privateApi.get<GetChatResponse>(`/api/chats/${chatId}`);
  return data;
};

/**
 * POST /api/chats/:chatId/messages
 * Mesaj gönderir, assistant'ın tam cevabını tek seferde döner (non-stream).
 */
export const sendMessage = async (
  chatId: string,
  payload: NonStreamChatRequest,
): Promise<NonStreamChatResponse> => {
  const { data } = await privateApi.post<NonStreamChatResponse>(
    `/api/chats/${chatId}/messages`,
    payload,
  );
  return data;
};

/**
 * POST /api/chats/:chatId/sync
 * Offline yazılan mesajları sunucuya sync eder, assistant yanıtını döner.
 */
export const syncChat = async (
  chatId: string,
  payload: SyncChatRequest,
): Promise<SyncChatResponse> => {
  const { data } = await privateApi.post<SyncChatResponse>(
    `/api/chats/${chatId}/sync`,
    payload,
  );
  return data;
};

/**
 * GET /api/chats/search?q=xxx&limit=20&cursor=xxx
 * Sohbet başlıkları ve mesaj içerikleri üzerinde full-text arama yapar.
 * Infinite scroll için cursor tabanlı sayfalama destekler.
 */
export const searchChats = async (params: ChatSearchParams): Promise<ChatSearchResponse> => {
  const queryParams: Record<string, string | number> = {
    q: params.q,
    limit: params.limit ?? 20,
  };
  if (params.cursor) queryParams.cursor = params.cursor;

  const { data } = await privateApi.get<ChatSearchResponse>('/api/chats/search', {
    params: queryParams,
  });
  return data;
};

/**
 * GET /api/chats/:chatId/messages?limit=20&direction=older&cursor=xxx
 * Chat mesajlarını paginated olarak döner. direction: 'older' | 'newer'
 * İlk yükleme: direction=older (son mesajlara doğru)
 * Yukarı kaydır: direction=older&cursor=OLDER_CURSOR
 * Yeni mesajları çek: direction=newer&cursor=NEWEST_VISIBLE_CURSOR
 */
export const getChatMessages = async (
  chatId: string,
  params: GetMessagesParams = {},
): Promise<PaginatedMessagesResponse> => {
  const { limit = 20, cursor, direction = 'older' } = params;
  const qp: Record<string, string | number> = { limit, direction };
  if (cursor) qp.cursor = cursor;

  const { data } = await privateApi.get<PaginatedMessagesResponse>(
    `/api/chats/${chatId}/messages`,
    { params: qp },
  );
  return data;
};
