import Realm from 'realm';
import { ChatListItem, ChatMessage } from '@/types/chat.api.types';

// ---------------------------------------------------------------------------
// Şema
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
// Realm instance (singleton, açık tutulur)
// ---------------------------------------------------------------------------

let _realm: Realm | null = null;

export const getRealmInstance = (): Realm => {
  if (!_realm || _realm.isClosed) {
    _realm = new Realm({
      schema: [RealmSession, RealmMessage],
      schemaVersion: 1,
    });
  }
  return _realm;
};

export const closeRealm = (): void => {
  if (_realm && !_realm.isClosed) {
    _realm.close();
    _realm = null;
  }
};

// ---------------------------------------------------------------------------
// Session servisi
// ---------------------------------------------------------------------------

export const realmService = {
  /**
   * Realm'deki sessionları ChatListItem[] olarak döner.
   * syncedAt: en son yazılan kaydın zamanı (initialDataUpdatedAt için).
   */
  getSessions(): { items: ChatListItem[]; syncedAt: number } {
    try {
      const realm = getRealmInstance();
      const sessions = realm.objects<RealmSession>('RealmSession')
        .sorted('lastMessageAt', true); // en yeni önce

      if (sessions.length === 0) return { items: [], syncedAt: 0 };

      const items: ChatListItem[] = Array.from(sessions).map((s) => ({
        id: s._id,
        title: s.title,
        provider: s.provider,
        model: s.model,
        createdAt: s.lastMessageAt,
        updatedAt: s.lastMessageAt,
        lastMessagePreview: '',
      }));

      const syncedAt = Math.max(...Array.from(sessions).map((s) => s.syncedAt));
      return { items, syncedAt };
    } catch {
      return { items: [], syncedAt: 0 };
    }
  },

  /**
   * Sessionları Realm'e kaydeder.
   * Upsert yapar, max 20 kuralını uygular (en eski silinir).
   */
  saveSessions(items: ChatListItem[]): void {
    try {
      const realm = getRealmInstance();
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

        // max 20 kural — en eskiyi sil
        const all = realm.objects<RealmSession>('RealmSession')
          .sorted('lastMessageAt', true);
        if (all.length > MAX_SESSIONS) {
          const toDelete = Array.from(all).slice(MAX_SESSIONS);
          for (const s of toDelete) realm.delete(s);
        }
      });
    } catch {
      // Realm yazma hatası — sessizce geç
    }
  },

  // ---------------------------------------------------------------------------
  // Message servisi
  // ---------------------------------------------------------------------------

  /**
   * Verilen sessionId'ye ait mesajları döner.
   */
  getMessages(sessionId: string): { messages: ChatMessage[]; syncedAt: number } {
    try {
      const realm = getRealmInstance();
      const msgs = realm.objects<RealmMessage>('RealmMessage')
        .filtered('sessionId == $0', sessionId)
        .sorted('createdAt', false); // en eski önce

      if (msgs.length === 0) return { messages: [], syncedAt: 0 };

      const messages: ChatMessage[] = Array.from(msgs).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        provider: '',
        model: '',
      }));

      const syncedAt = Math.max(...Array.from(msgs).map((m) => m.syncedAt));
      return { messages, syncedAt };
    } catch {
      return { messages: [], syncedAt: 0 };
    }
  },

  /**
   * Mesajları Realm'e kaydeder.
   * Upsert yapar, session başına max 20 kural uygular.
   */
  saveMessages(sessionId: string, messages: ChatMessage[]): void {
    try {
      const realm = getRealmInstance();
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

        // max 20 kural — en eskiyi sil
        const all = realm.objects<RealmMessage>('RealmMessage')
          .filtered('sessionId == $0', sessionId)
          .sorted('createdAt', true);
        if (all.length > MAX_MESSAGES_PER_SESSION) {
          const toDelete = Array.from(all).slice(MAX_MESSAGES_PER_SESSION);
          for (const m of toDelete) realm.delete(m);
        }
      });
    } catch {
      // sessizce geç
    }
  },

  /**
   * Belirli bir session'ın mesajlarını Realm'den siler.
   * Session değişince çağrılır.
   */
  clearSessionMessages(sessionId: string): void {
    try {
      const realm = getRealmInstance();
      realm.write(() => {
        const msgs = realm.objects<RealmMessage>('RealmMessage')
          .filtered('sessionId == $0', sessionId);
        realm.delete(msgs);
      });
    } catch {
      // sessizce geç
    }
  },
};
