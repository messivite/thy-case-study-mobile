import axios from 'axios';
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
  LikeMessageRequest,
  LikeMessageResponse,
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
/**
 * Newline-delimited JSON satırını parse edip callback'leri tetikler.
 */
function processLine(line: string, callbacks: StreamChatCallbacks): void {
  let trimmed = line.trim();
  if (!trimmed) return;
  // SSE format: lines start with "data: "
  if (trimmed.startsWith('data: ')) trimmed = trimmed.slice(6);
  if (!trimmed) return;
  try {
    const event = JSON.parse(trimmed) as StreamEvent;
    switch (event.type) {
      case 'meta':  callbacks.onMeta?.(event.meta);   break;
      case 'delta': callbacks.onDelta?.(event.delta); break;
      case 'done':  callbacks.onDone?.();             break;
      case 'error': callbacks.onError?.(event.error); break;
    }
  } catch {
    // Parse edilemeyen satır — yoksay
  }
}

export const streamChat = async (
  chatId: string,
  payload: StreamChatRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  return new Promise<void>((resolve) => {
    let buffer = '';
    let processedLength = 0;
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    // AbortSignal → axios CancelToken'a bağla
    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) {
        callbacks.onError?.('aborted');
        resolve();
        return;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    privateApi.post(
      `/api/chats/${chatId}/stream`,
      payload,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'text',
        transformResponse: [(data) => data],
        // onDownloadProgress: RN'de XHR onprogress — her chunk'ta çağrılır
        // event.target.responseText birikimli tüm text'i içerir
        onDownloadProgress: (progressEvent) => {
          const xhr = progressEvent.event?.target as XMLHttpRequest | undefined;
          const xhrAlt = progressEvent.event?.currentTarget as XMLHttpRequest | undefined;
          const fullText: string = xhr?.responseText ?? xhrAlt?.responseText ?? (progressEvent as any).responseText ?? '';

          if (!fullText || fullText.length <= processedLength) return;

          const newChunk = fullText.slice(processedLength);
          processedLength = fullText.length;

          buffer += newChunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          const isDelta = (l: string) => {
            const t = l.trim();
            const json = t.startsWith('data: ') ? t.slice(6) : t;
            return json.includes('"delta"') && json.includes('"type"');
          };

          const isMeta = (l: string) => {
            const t = l.trim();
            const json = t.startsWith('data: ') ? t.slice(6) : t;
            return json.includes('"meta"') && json.includes('"type"');
          };

          for (const line of lines) {
            const captured = line;
            if (isMeta(line)) {
              processLine(captured, callbacks);
            } else if (isDelta(line)) {
              processLine(captured, callbacks);
            } else {
              setTimeout(() => processLine(captured, callbacks), 1);
            }
          }
        },
        signal: controller.signal,
      },
    ).then((response) => {
      // Response tamamlandı — onDownloadProgress hiç tetiklenmediyse tüm text burada gelir
      if (processedLength === 0 && response.data) {
        const allText: string = typeof response.data === 'string' ? response.data : '';
        const lines = allText.split('\n');
        for (const line of lines) processLine(line, callbacks);
      } else if (buffer.trim()) {
        processLine(buffer, callbacks);
      }
      setTimeout(settle, 50);
    }).catch((err) => {
      if (axios.isCancel(err) || (err as Error)?.name === 'CanceledError' || (err as Error)?.name === 'AbortError') {
        callbacks.onError?.('aborted');
      } else {
        const status = (err as { response?: { status: number } })?.response?.status;
        console.error('[streamChat] error:', status, err);
        callbacks.onError?.(`HTTP ${status ?? 'network'}`);
      }
      settle();
    });
  });
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
 * DELETE /api/chats/:chatId
 * Sohbeti kalıcı olarak siler.
 */
export const deleteChat = async (chatId: string): Promise<void> => {
  await privateApi.delete(`/api/chats/${chatId}`);
};

/**
 * POST /api/chats/:chatId/messages/:messageId/like
 * action: 1 = like, 2 = unlike
 */
export const likeMessage = async (
  chatId: string,
  messageId: string,
  payload: LikeMessageRequest,
): Promise<LikeMessageResponse> => {
  const { data } = await privateApi.post<LikeMessageResponse>(
    `/api/chats/${chatId}/messages/${messageId}/like`,
    payload,
  );
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

  const { data } = await privateApi.get<any>(
    `/api/chats/${chatId}/messages`,
    { params: qp },
  );
  // Backend { items, hasNext, totalCount } → normalize to { messages, nextCursor, hasMore }
  const normalized: PaginatedMessagesResponse = {
    messages: data.messages ?? data.items ?? [],
    nextCursor: data.nextCursor ?? data.cursor ?? null,
    hasMore: data.hasMore ?? data.hasNext ?? false,
  };
  return normalized;
};
