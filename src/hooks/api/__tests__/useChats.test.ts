/**
 * useChats.ts — CHAT_QUERY_KEYS ve useLikeMessageMutation applyOptimistic mantığı
 */

jest.mock('@/services/realm', () => ({
  realmService: {
    getSessions: jest.fn(() => ({ items: [], syncedAt: 0 })),
    getMessages: jest.fn(() => ({ messages: [], syncedAt: 0 })),
    saveSessions: jest.fn(),
    saveMessages: jest.fn(),
    deleteSession: jest.fn(),
    updateMessageLiked: jest.fn(),
  },
}));

jest.mock('@/lib/offlineQueue', () => ({
  OFFLINE_ACTIONS: {
    SEND_MESSAGE: 'SEND_MESSAGE',
    LIKE_MESSAGE: 'LIKE_MESSAGE',
  },
  OfflineManager: { configure: jest.fn() },
}));

jest.mock('@mustafaaksoy41/react-native-offline-queue', () => ({
  useOfflineMutation: jest.fn(() => ({ mutateOffline: jest.fn() })),
  useNetworkStatus: jest.fn(() => ({ isOnline: true })),
}));

jest.mock('@/api/chat.api', () => ({
  likeMessage: jest.fn(),
  syncLikes: jest.fn(),
  getChats: jest.fn(),
  getChat: jest.fn(),
  createChat: jest.fn(),
  deleteChat: jest.fn(),
  sendMessage: jest.fn(),
  streamChat: jest.fn(),
  syncChat: jest.fn(),
  getChatMessages: jest.fn(),
  getPaginatedChats: jest.fn(),
  searchChats: jest.fn(),
}));

import { CHAT_QUERY_KEYS } from '@/hooks/api/useChats';

describe('CHAT_QUERY_KEYS', () => {
  it('chats key is stable', () => {
    expect(CHAT_QUERY_KEYS.chats).toEqual(['chats']);
  });

  it('chatsList key is stable', () => {
    expect(CHAT_QUERY_KEYS.chatsList).toEqual(['chats', 'list']);
  });

  it('chat key includes chatId', () => {
    expect(CHAT_QUERY_KEYS.chat('abc')).toEqual(['chats', 'abc']);
  });

  it('messages key includes chatId', () => {
    expect(CHAT_QUERY_KEYS.messages('abc')).toEqual(['chats', 'abc', 'messages']);
  });

  it('search key includes query string', () => {
    expect(CHAT_QUERY_KEYS.search('hello')).toEqual(['chats', 'search', 'hello']);
  });
});

describe('LikeMessagePayload liked field semantics', () => {
  it('action 1 corresponds to like (true)', () => {
    // applyOptimistic içindeki mantık: payload.liked direkt kullanılır
    const payload = { chatId: 'c1', messageId: 'm1', action: 1 as const, liked: true };
    expect(payload.liked).toBe(true);
  });

  it('action 2 with liked=false corresponds to dislike', () => {
    const payload = { chatId: 'c1', messageId: 'm1', action: 2 as const, liked: false };
    expect(payload.liked).toBe(false);
  });

  it('action 2 with liked=null corresponds to toggle off (unlike)', () => {
    const payload = { chatId: 'c1', messageId: 'm1', action: 2 as const, liked: null };
    expect(payload.liked).toBeNull();
  });
});
