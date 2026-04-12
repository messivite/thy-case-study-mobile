import Realm from 'realm';
import { ChatListItem, ChatMessage } from '@/types/chat.api.types';

// ---------------------------------------------------------------------------
// Sema
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 40;

export class RealmSession extends Realm.Object<RealmSession> {
  _id!: string;
  title!: string;
  provider!: string;
  model!: string;
  lastMessageAt!: string;
  lastMessagePreview!: string;
  syncedAt!: number;

  static schema: Realm.ObjectSchema = {
    name: 'RealmSession',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      title: 'string',
      provider: 'string',
      model: 'string',
      lastMessageAt: 'string',
      lastMessagePreview: { type: 'string', default: '' },
      syncedAt: 'int',
    },
  };
}

export class RealmMessage extends Realm.Object<RealmMessage> {
  _id!: string;
  sessionId!: string;
  role!: string;
  content!: string;
  createdAt!: string;
  syncedAt!: number;
  provider?: string;
  model?: string;
  liked?: boolean | null;

  static schema: Realm.ObjectSchema = {
    name: 'RealmMessage',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      sessionId: 'string',
      role: 'string',
      content: 'string',
      createdAt: 'string',
      syncedAt: 'int',
      provider: 'string?',
      model: 'string?',
      liked: 'bool?',
    },
  };
}

// ---------------------------------------------------------------------------
// Realm instance — async open, modul seviyesinde baslatilir
//
// new Realm() JS thread'ini blokluyor (sync I/O + schema parse).
// Realm.open() async — splash / app init sirasinda paralel baslatilir,
// ilk getSessions() cagrisi geldiginde hazir olur, bekleme yok.
// ---------------------------------------------------------------------------

let _realmPromise: Promise<Realm> | null = null;
let _realm: Realm | null = null;

/**
 * Realm'i async olarak acar. Modul import edilince otomatik tetiklenir.
 * Birden fazla cagrida ayni promise doner (singleton).
 */
export const openRealm = (): Promise<Realm> => {
  if (_realm && !_realm.isClosed) return Promise.resolve(_realm);
  if (_realmPromise) return _realmPromise;

  _realmPromise = Realm.open({
    schema: [RealmSession, RealmMessage],
    schemaVersion: 9,
    onMigration: (_oldRealm: Realm, newRealm: Realm) => {
      // v1 → v2: lastMessagePreview alani eklendi, mevcutlara bos string ver
      const sessions = newRealm.objects('RealmSession');
      for (const s of sessions) {
        if ((s as unknown as RealmSession).lastMessagePreview === undefined) {
          (s as unknown as RealmSession).lastMessagePreview = '';
        }
      }
      // v2 → v3: kirlenmiş optimistic/timestamp ID'li mesajları temizle
      // v3 → v4: limit 20→100 oldu, eski cache'i temizle
      // v4 → v5: API artık id+createdAt dönüyor, eski composite-key kayıtları temizle
      // v5 → v6: Realm sıralama newest→oldest'ten oldest→newest'e değişti
      const messages = newRealm.objects('RealmMessage');
      newRealm.delete(messages);
    },
  }).then((realm) => {
    _realm = realm;
    _realmPromise = null;
    return realm;
  }).catch((err) => {
    _realmPromise = null;
    throw err;
  });

  return _realmPromise;
};

/**
 * Hazir instance'i senkron doner. Yoksa null — caller try/catch ile korumali.
 * Yalnizca realm kesinlikle hazir olduktan sonra cagrilan yerlerde kullanilir.
 */
const getRealmSync = (): Realm | null => {
  if (_realm && !_realm.isClosed) return _realm;
  return null;
};

export const closeRealm = (): void => {
  if (_realm && !_realm.isClosed) {
    _realm.close();
    _realm = null;
  }
  _realmPromise = null;
};

// ---------------------------------------------------------------------------
// writeQueue — aynı sessionId için concurrent Realm write'ı serialize eder.
// Realm JS thread'inde çalışır; iç içe write() transaction'ları exception atar.
// ---------------------------------------------------------------------------

const writeQueues = new Map<string, Promise<void>>();

const enqueue = (key: string, fn: () => Promise<void>): Promise<void> => {
  const prev = writeQueues.get(key) ?? Promise.resolve();
  const next = prev.then(fn).catch(() => {});
  writeQueues.set(key, next);
  // Tamamlanınca map'ten temizle — bellek sızdırma olmasın
  next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  return next;
};

// ---------------------------------------------------------------------------
// realmService
// ---------------------------------------------------------------------------

export const realmService = {
  /**
   * Realm'i arka planda acar — app init sirasinda (splash / _layout mount)
   * cagirilmali. Boylece ilk getSessions() geldiginde instance hazir olur.
   */
  prefetch(): void {
    void openRealm();
  },

  /**
   * Realm'deki sessionlari ChatListItem[] olarak doner.
   * Instance hazir degilse bos doner (React Query staleTime ile tekrar dener).
   */
  getSessions(): { items: ChatListItem[]; syncedAt: number } {
    try {
      const realm = getRealmSync();
      if (!realm) return { items: [], syncedAt: 0 };

      const sessions = realm
        .objects<RealmSession>('RealmSession')
        .sorted('lastMessageAt', true);

      if (sessions.length === 0) return { items: [], syncedAt: 0 };

      const arr = Array.from(sessions);
      const items: ChatListItem[] = arr.map((s) => ({
        id: s._id,
        title: s.title,
        provider: s.provider,
        model: s.model,
        createdAt: s.lastMessageAt,
        updatedAt: s.lastMessageAt,
        lastMessagePreview: s.lastMessagePreview ?? '',
      }));

      const syncedAt = Math.max(...arr.map((s) => s.syncedAt));
      return { items, syncedAt };
    } catch {
      return { items: [], syncedAt: 0 };
    }
  },

  /**
   * Sessionlari Realm'e kaydeder (upsert + max 20 kurali).
   * Async — JS thread'ini bloklamaz.
   */
  saveSessions(items: ChatListItem[]): Promise<void> {
    return enqueue('__sessions__', async () => {
      const realm = await openRealm();
      const now = Date.now();
      realm.write(() => {
        for (const item of items) {
          realm.create<RealmSession>(
            'RealmSession',
            {
              _id: item.id,
              title: item.title,
              provider: item.provider,
              model: item.model,
              lastMessageAt: item.updatedAt,
              lastMessagePreview: item.lastMessagePreview ?? '',
              syncedAt: now,
            },
            Realm.UpdateMode.Modified,
          );
        }
        const all = realm
          .objects<RealmSession>('RealmSession')
          .sorted('lastMessageAt', true);
        if (all.length > MAX_SESSIONS) {
          const toDelete = Array.from(all).slice(MAX_SESSIONS);
          for (const s of toDelete) realm.delete(s);
        }
      });
    });
  },

  /**
   * Mesajlari doner. Instance hazir degilse bos doner.
   */
  getMessages(sessionId: string): { messages: ChatMessage[]; syncedAt: number } {
    try {
      const realm = getRealmSync();
      if (!realm) return { messages: [], syncedAt: 0 };

      // oldest→newest (ascending createdAt) — API ile aynı sıra
      const msgs = realm
        .objects<RealmMessage>('RealmMessage')
        .filtered('sessionId == $0', sessionId)
        .sorted('createdAt', false);

      if (msgs.length === 0) return { messages: [], syncedAt: 0 };

      const arr = Array.from(msgs);
      const messages: ChatMessage[] = arr.map((m) => ({
        id: m._id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        provider: m.provider ?? '',
        model: m.model ?? '',
        createdAt: m.createdAt,
        liked: m.liked ?? null,
      }));

      const syncedAt = Math.max(...arr.map((m) => m.syncedAt));
      return { messages, syncedAt };
    } catch {
      return { messages: [], syncedAt: 0 };
    }
  },

  /**
   * Mesajlari Realm'e kaydeder (upsert + max 20 kurali).
   * Async — JS thread'ini bloklamaz.
   */
  saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    return enqueue(sessionId, async () => {
      const realm = await openRealm();
      const now = Date.now();
      realm.write(() => {
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const msgCreatedAt = msg.createdAt ?? new Date(now + i).toISOString();
          const msgId = msg.id ?? `${sessionId}__${msgCreatedAt}__${msg.role}`;
          realm.create<RealmMessage>(
            'RealmMessage',
            {
              _id: msgId,
              sessionId,
              role: msg.role,
              content: msg.content,
              createdAt: msgCreatedAt,
              syncedAt: now,
              provider: msg.provider ?? undefined,
              model: msg.model ?? undefined,
              liked: msg.liked ?? null,
            },
            Realm.UpdateMode.Modified,
          );
        }
        const all = realm
          .objects<RealmMessage>('RealmMessage')
          .filtered('sessionId == $0', sessionId)
          .sorted('createdAt', true);
        if (all.length > MAX_MESSAGES_PER_SESSION) {
          const toDelete = Array.from(all).slice(MAX_MESSAGES_PER_SESSION);
          for (const m of toDelete) realm.delete(m);
        }
      });
    });
  },

  /**
   * Session'i ve tum mesajlarini Realm'den siler. Async.
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const realm = await openRealm();
      realm.write(() => {
        const session = realm.objectForPrimaryKey<RealmSession>('RealmSession', sessionId);
        if (session) realm.delete(session);
        const msgs = realm
          .objects<RealmMessage>('RealmMessage')
          .filtered('sessionId == $0', sessionId);
        realm.delete(msgs);
      });
    } catch {
      // sessizce gec
    }
  },

  /**
   * Tek bir mesajın liked alanını günceller. Async.
   */
  async updateMessageLiked(messageId: string, liked: boolean | null): Promise<void> {
    try {
      const realm = await openRealm();
      realm.write(() => {
        const msg = realm.objectForPrimaryKey<RealmMessage>('RealmMessage', messageId);
        if (msg) msg.liked = liked;
      });
    } catch {
      // sessizce geç
    }
  },

  /**
   * Session mesajlarini siler. Async.
   */
  async clearSessionMessages(sessionId: string): Promise<void> {
    try {
      const realm = await openRealm();
      realm.write(() => {
        const msgs = realm
          .objects<RealmMessage>('RealmMessage')
          .filtered('sessionId == $0', sessionId);
        realm.delete(msgs);
      });
    } catch {
      // sessizce gec
    }
  },
};
