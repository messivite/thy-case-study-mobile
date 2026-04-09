import { AIMessage, AIProviderInfo, AIUsage } from './api.types';

// ---------------------------------------------------------------------------
// GET /api/chats/:chatId — Chat detayı + tüm mesajlar
// ---------------------------------------------------------------------------

/** Bir chat'e ait tek mesaj */
export type ChatMessage = AIMessage & AIProviderInfo;

/** Chat detay response modeli */
export type GetChatResponse = AIProviderInfo & {
  id: string;
  title: string;
  messages: ChatMessage[];
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/messages — Non-stream Request
// ---------------------------------------------------------------------------

/** Non-stream mesaj isteğinin body'si — messages dizisi AIMessage kullanır */
export type NonStreamChatRequest = AIProviderInfo & {
  messages: AIMessage[];
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/messages — Non-stream Response
// ---------------------------------------------------------------------------

/** Non-stream endpoint'inin tam response modeli */
export type NonStreamChatResponse = {
  assistantMessage: AssistantMessage;
  usage: AIUsage;
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/stream — Request
// ---------------------------------------------------------------------------

/** Stream isteğinin body'si — messages dizisi AIMessage kullanır */
export type StreamChatRequest = AIProviderInfo & {
  messages: AIMessage[];
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/stream — Stream event tipleri (SSE/chunked)
// ---------------------------------------------------------------------------

/** İlk gelen event: assistant mesaj id'si ve model bilgisi */
export type StreamMetaEvent = {
  type: 'meta';
  meta: AIProviderInfo & {
    assistantMessageId: string;
  };
};

/** Token chunk'ı — her gelende content birikiyor */
export type StreamDeltaEvent = {
  type: 'delta';
  delta: string;
};

/** Stream tamamlandı */
export type StreamDoneEvent = {
  type: 'done';
};

/** Hata eventi */
export type StreamErrorEvent = {
  type: 'error';
  error: string;
};

/** Tüm olası stream event'lerinin union tipi */
export type StreamEvent =
  | StreamMetaEvent
  | StreamDeltaEvent
  | StreamDoneEvent
  | StreamErrorEvent;

/** streamChat fonksiyonuna geçilen callback'ler */
export type StreamChatCallbacks = {
  onMeta?: (meta: StreamMetaEvent['meta']) => void;
  onDelta?: (delta: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/sync — Request
// ---------------------------------------------------------------------------

/** Offline yazılan tek bir mesaj */
export type SyncMessageInput = {
  content: string;
  sentAt: string; // ISO 8601, örn: "2026-04-09T12:00:00Z"
};

/** Sync isteğinin body'si */
export type SyncChatRequest = AIProviderInfo & {
  messages: SyncMessageInput[];
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/sync — Response
// ---------------------------------------------------------------------------

/** Sunucuya sync edilen mesaj: temel AI mesajı + provider bilgisi */
export type SyncedMessage = AIMessage & AIProviderInfo;

/** Assistant'ın döndürdüğü yanıt mesajı */
export type AssistantMessage = AIMessage & AIProviderInfo;

/** Sync endpoint'inin tam response modeli */
export type SyncChatResponse = {
  syncedCount: number;
  syncedMessages: SyncedMessage[];
  assistantMessage: AssistantMessage;
  usage: AIUsage;
};
