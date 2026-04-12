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

type StoredSession = ChatListItem & { syncedAt: number };
type StoredMessage = ChatMessage & { syncedAt: number };

export const realmService = {
  prefetch(): void {
    // Web'de async open gerekmez
  },

  getSessions(): { items: ChatListItem[]; syncedAt: number } {
    const stored = readJSON<StoredSession[]>(SESSIONS_KEY);
    if (!stored || stored.length === 0) return { items: [], syncedAt: 0 };

    const sorted = [...stored].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const items: ChatListItem[] = sorted.map(({ syncedAt: _s, ...item }) => item);
    const syncedAt = Math.max(...stored.map((s) => s.syncedAt));
    return { items, syncedAt };
  },

  saveSessions(items: ChatListItem[]): Promise<void> {
    const now = Date.now();
    const existing = readJSON<StoredSession[]>(SESSIONS_KEY) ?? [];

    const map = new Map<string, StoredSession>();
    for (const s of existing) map.set(s.id, s);
    for (const item of items) {
      map.set(item.id, { ...item, syncedAt: now });
    }

    const sorted = Array.from(map.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_SESSIONS);

    writeJSON(SESSIONS_KEY, sorted);
    return Promise.resolve();
  },

  getMessages(sessionId: string): { messages: ChatMessage[]; syncedAt: number } {
    const stored = readJSON<StoredMessage[]>(MESSAGES_PREFIX + sessionId);
    if (!stored || stored.length === 0) return { messages: [], syncedAt: 0 };

    const messages: ChatMessage[] = stored.map(({ syncedAt: _s, ...msg }) => msg);
    const syncedAt = Math.max(...stored.map((m) => m.syncedAt));
    return { messages, syncedAt };
  },

  saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const now = Date.now();
    const existing = readJSON<StoredMessage[]>(MESSAGES_PREFIX + sessionId) ?? [];

    const map = new Map<string, StoredMessage>();
    for (const m of existing) if (m.id) map.set(m.id, m);
    for (const msg of messages) {
      const key = msg.id ?? `${sessionId}__${msg.createdAt ?? now}__${msg.role}`;
      map.set(key, { ...msg, id: key, syncedAt: now });
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
};
