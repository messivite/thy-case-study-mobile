/**
 * realm.web.ts — localStorage-backed cache for web
 *
 * Realm native-only olduğu için web'de localStorage kullanır.
 * API yüzeyi realm.native.ts ile birebir aynı.
 */

import type { ChatListItem, ChatMessage } from '@/types/chat.api.types';

const SESSIONS_KEY = 'thy:realm:sessions';
const MESSAGES_PREFIX = 'thy:realm:messages:';
const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 40;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage quota aşıldıysa sessizce geç
  }
}

type StoredSession = ChatListItem & { userId: string; syncedAt: number };
type StoredMessage = ChatMessage & { userId: string; syncedAt: number };

let _currentUserId = '';

export const realmService = {
  setUserId(userId: string): void {
    _currentUserId = userId;
  },

  prefetch(): void {
    // Web'de async open gerekmez
  },

  getSessions(): { items: ChatListItem[]; syncedAt: number } {
    if (!_currentUserId) return { items: [], syncedAt: 0 };
    const stored = readJSON<StoredSession[]>(SESSIONS_KEY);
    if (!stored || stored.length === 0) return { items: [], syncedAt: 0 };

    const owned = stored.filter((s) => s.userId === _currentUserId);
    if (owned.length === 0) return { items: [], syncedAt: 0 };

    const sorted = [...owned].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const items: ChatListItem[] = sorted.map(({ syncedAt: _s, userId: _u, ...item }) => item);
    const syncedAt = Math.max(...owned.map((s) => s.syncedAt));
    return { items, syncedAt };
  },

  saveSessions(items: ChatListItem[]): Promise<void> {
    if (!_currentUserId) return Promise.resolve();
    const userId = _currentUserId;
    const now = Date.now();
    const existing = readJSON<StoredSession[]>(SESSIONS_KEY) ?? [];

    const map = new Map<string, StoredSession>();
    for (const s of existing) map.set(s.id, s);
    for (const item of items) {
      map.set(item.id, { ...item, userId, syncedAt: now });
    }

    // Mevcut kullanıcıya ait olanlar için max SESSION sınırı uygula
    const allOwned = Array.from(map.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_SESSIONS);

    // Diğer kullanıcılara ait kayıtları koru
    const others = Array.from(map.values()).filter((s) => s.userId !== userId);

    writeJSON(SESSIONS_KEY, [...others, ...allOwned]);
    return Promise.resolve();
  },

  getMessages(sessionId: string): { messages: ChatMessage[]; syncedAt: number } {
    if (!_currentUserId) return { messages: [], syncedAt: 0 };
    const stored = readJSON<StoredMessage[]>(MESSAGES_PREFIX + sessionId);
    if (!stored || stored.length === 0) return { messages: [], syncedAt: 0 };

    const owned = stored.filter((m) => m.userId === _currentUserId);
    if (owned.length === 0) return { messages: [], syncedAt: 0 };

    const messages: ChatMessage[] = owned.map(({ syncedAt: _s, userId: _u, ...msg }) => msg);
    const syncedAt = Math.max(...owned.map((m) => m.syncedAt));
    return { messages, syncedAt };
  },

  saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    if (!_currentUserId) return Promise.resolve();
    const userId = _currentUserId;
    const now = Date.now();
    const existing = readJSON<StoredMessage[]>(MESSAGES_PREFIX + sessionId) ?? [];

    const map = new Map<string, StoredMessage>();
    for (const m of existing) if (m.id) map.set(m.id, m);
    for (const msg of messages) {
      const key = msg.id ?? `${sessionId}__${msg.createdAt ?? now}__${msg.role}`;
      const existingLiked = map.get(key)?.liked;
      const likedValue = msg.liked !== undefined && msg.liked !== null
        ? msg.liked
        : (existingLiked ?? null);
      map.set(key, { ...msg, id: key, userId, syncedAt: now, liked: likedValue });
    }

    const sorted = Array.from(map.values())
      .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime())
      .slice(-MAX_MESSAGES_PER_SESSION);

    writeJSON(MESSAGES_PREFIX + sessionId, sorted);
    return Promise.resolve();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const existing = readJSON<StoredSession[]>(SESSIONS_KEY) ?? [];
    writeJSON(SESSIONS_KEY, existing.filter((s) => s.id !== sessionId));
    localStorage.removeItem(MESSAGES_PREFIX + sessionId);
  },

  async clearSessionMessages(sessionId: string): Promise<void> {
    localStorage.removeItem(MESSAGES_PREFIX + sessionId);
  },

  async clearAll(): Promise<void> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === SESSIONS_KEY || k.startsWith(MESSAGES_PREFIX))) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  },

  async updateMessageLiked(messageId: string, liked: boolean | null): Promise<void> {
    try {
      const len = localStorage.length;
      for (let i = 0; i < len; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(MESSAGES_PREFIX)) continue;
        const stored = readJSON<StoredMessage[]>(k);
        if (!stored) continue;
        const idx = stored.findIndex((m) => m.id === messageId);
        if (idx === -1) continue;
        stored[idx] = { ...stored[idx], liked };
        writeJSON(k, stored);
        break;
      }
    } catch {
      // sessizce geç
    }
  },
};
