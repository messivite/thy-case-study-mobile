import Realm from 'realm';
import { ChatListItem, ChatMessage } from '@/types/chat.api.types';

// ---------------------------------------------------------------------------
// Sema
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 20;

export class RealmSession extends Realm.Object<RealmSession> {
  _id!: string;
  title!: string;
  provider!: string;
  model!: string;
  lastMessageAt!: string;
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
    schemaVersion: 1,
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
        lastMessagePreview: '',
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
  async saveSessions(items: ChatListItem[]): Promise<void> {
    try {
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
    } catch {
      // Realm yazma hatasi — sessizce gec
    }
  },

  /**
   * Mesajlari doner. Instance hazir degilse bos doner.
   */
  getMessages(sessionId: string): { messages: ChatMessage[]; syncedAt: number } {
    try {
      const realm = getRealmSync();
      if (!realm) return { messages: [], syncedAt: 0 };

      const msgs = realm
        .objects<RealmMessage>('RealmMessage')
        .filtered('sessionId == $0', sessionId)
        .sorted('createdAt', false);

      if (msgs.length === 0) return { messages: [], syncedAt: 0 };

      const arr = Array.from(msgs);
      const messages: ChatMessage[] = arr.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        provider: '',
        model: '',
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
  async saveMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    try {
      const realm = await openRealm();
      const now = Date.now();

      realm.write(() => {
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          realm.create<RealmMessage>(
            'RealmMessage',
            {
              _id: `${sessionId}_${i}_${msg.role}`,
              sessionId,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(now + i).toISOString(),
              syncedAt: now,
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
    } catch {
      // sessizce gec
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
