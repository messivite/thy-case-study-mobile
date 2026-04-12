import { AIMessage, AIProviderInfo, AIUsage } from '@/types/api.types';

// ---------------------------------------------------------------------------
// POST /api/chats — Yeni chat oluşturma
// ---------------------------------------------------------------------------

/** Yeni chat oluşturma isteğinin body'si */
export type CreateChatRequest = AIProviderInfo & {
  title: string;
};

/** Yeni chat oluşturma response modeli */
export type CreateChatResponse = AIProviderInfo & {
  id: string;
};

// ---------------------------------------------------------------------------
// GET /api/chats — Tüm chat listesi
// ---------------------------------------------------------------------------

/** Chat listesi response'undaki tek bir chat özeti */
export type ChatListItem = AIProviderInfo & {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
};

/** GET /api/chats response tipi */
export type GetChatsResponse = ChatListItem[];

// ---------------------------------------------------------------------------
// GET /api/chats?limit=X&cursor=Y — Paginated chats (cursor tabanlı)
// ---------------------------------------------------------------------------

/** GET /api/chats query parametreleri */
export type GetChatsParams = {
  limit?: number;
  cursor?: string;
};

/** Paginated chat listesi response modeli — search ile aynı cursor yapısı */
export type PaginatedChatsResponse = {
  totalCount: number;
  hasNext: boolean;
  nextCursor: string | null;
  items: ChatListItem[];
};

// ---------------------------------------------------------------------------
// GET /api/chats/:chatId — Chat detayı + tüm mesajlar
// ---------------------------------------------------------------------------

/** Bir chat'e ait tek mesaj */
export type ChatMessage = AIMessage & AIProviderInfo & {
  id?: string;
  createdAt?: string;
  liked?: boolean | null;
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/messages/:messageId/like — Like / Unlike
// ---------------------------------------------------------------------------

/** 1 = like, 2 = unlike */
export type MessageLikeAction = 1 | 2;

/** Like/unlike isteğinin body'si */
export type LikeMessageRequest = {
  action: MessageLikeAction;
};

/** Like/unlike response modeli */
export type LikeMessageResponse = {
  messageId: string;
  liked: boolean | null;
};

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
    userMessageId?: string;
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
export type AssistantMessage = AIMessage & AIProviderInfo & {
  id?: string;
  createdAt?: string;
};

/** Sync endpoint'inin tam response modeli */
export type SyncChatResponse = {
  syncedCount: number;
  syncedMessages: SyncedMessage[];
  assistantMessage: AssistantMessage;
  usage: AIUsage;
};

// ---------------------------------------------------------------------------
// GET /api/chats/:chatId/messages — Paginated Messages (direction tabanlı)
// ---------------------------------------------------------------------------

/** GET /api/chats/:chatId/messages query parametreleri */
export type GetMessagesParams = {
  limit?: number;
  cursor?: string;
  direction?: 'older' | 'newer';
};

/** Paginated mesaj listesi response modeli */
export type PaginatedMessagesResponse = {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ---------------------------------------------------------------------------
// GET /api/chats/search — Sohbet arama (full-text)
// ---------------------------------------------------------------------------

/** Arama sonucundaki highlight aralığı */
export type SearchHighlight = {
  field: 'title' | 'matchedContent';
  start: number;
  end: number;
};

/** Tek bir arama sonucu öğesi */
export type ChatSearchResultItem = {
  sessionId: string;
  title: string;
  sessionCreatedAt: string;
  sessionUpdatedAt: string;
  lastMessageAt: string;
  titleMatched: boolean;
  matchedMessageId: string | null;
  matchedRole: 'user' | 'assistant' | null;
  matchedContent: string | null;
  matchedAt: string | null;
  highlights: SearchHighlight[];
};

/** GET /api/chats/search response modeli */
export type ChatSearchResponse = {
  totalCount: number;
  hasNext: boolean;
  nextCursor: string | null;
  items: ChatSearchResultItem[];
};

/** GET /api/chats/search query parametreleri */
export type ChatSearchParams = {
  q: string;
  limit?: number;
  cursor?: string;
};

// ---------------------------------------------------------------------------
// POST /api/chats/:chatId/likes/sync — Toplu like/unlike sync
// ---------------------------------------------------------------------------

/** Tek bir like/unlike sync kalemi */
export type LikeSyncItem = {
  messageId: string;
  action: MessageLikeAction; // 1 = like, 2 = unlike
};

/** Sync isteğinin body'si — max 100 öğe */
export type SyncLikesRequest = {
  items: LikeSyncItem[];
};

/** Tek bir sync sonucu */
export type LikeSyncResult = {
  messageId: string;
  ok: boolean;
  state: 1 | 2; // 1 = liked, 2 = unliked
  code?: string; // ok=false iken dolu
};

/** Sync endpoint response modeli */
export type SyncLikesResponse = {
  results: LikeSyncResult[];
};
