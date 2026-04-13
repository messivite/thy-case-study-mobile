/**
 * realm.web.ts — localStorage-backed cache testleri
 */

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
    clear: jest.fn(() => { store = {}; }),
    _store: store,
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { realmService } from '@/services/realm.web';

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  realmService.setUserId('test-user');
});


describe('realm.web — saveSessions / getSessions', () => {
  it('getSessions returns empty when nothing stored', () => {
    const result = realmService.getSessions();
    expect(result.items).toHaveLength(0);
    expect(result.syncedAt).toBe(0);
  });

  it('saveSessions persists and getSessions returns items sorted by updatedAt desc', async () => {
    await realmService.saveSessions([
      { id: 'a', title: 'A', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', lastMessagePreview: '' },
      { id: 'b', title: 'B', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z', lastMessagePreview: '' },
    ]);

    const result = realmService.getSessions();
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('b'); // newer first
    expect(result.syncedAt).toBeGreaterThan(0);
  });

  it('saveSessions upserts existing session', async () => {
    await realmService.saveSessions([
      { id: 'a', title: 'Old', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', lastMessagePreview: '' },
    ]);
    await realmService.saveSessions([
      { id: 'a', title: 'New', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', lastMessagePreview: '' },
    ]);

    const result = realmService.getSessions();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('New');
  });
});

describe('realm.web — saveMessages / getMessages', () => {
  it('getMessages returns empty for unknown session', () => {
    const result = realmService.getMessages('unknown');
    expect(result.messages).toHaveLength(0);
    expect(result.syncedAt).toBe(0);
  });

  it('saveMessages persists and getMessages returns them', async () => {
    await realmService.saveMessages('session1', [
      { id: 'msg1', role: 'user', content: 'hello', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T10:00:00Z', liked: null },
      { id: 'msg2', role: 'assistant', content: 'hi', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T10:01:00Z', liked: true },
    ]);

    const result = realmService.getMessages('session1');
    expect(result.messages).toHaveLength(2);
    expect(result.syncedAt).toBeGreaterThan(0);
  });

  it('saveMessages preserves liked field', async () => {
    await realmService.saveMessages('session1', [
      { id: 'msg1', role: 'assistant', content: 'hi', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T10:00:00Z', liked: true },
    ]);

    const result = realmService.getMessages('session1');
    expect(result.messages[0].liked).toBe(true);
  });

  it('sessions are isolated — different sessionIds', async () => {
    await realmService.saveMessages('s1', [
      { id: 'm1', role: 'user', content: 'a', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    await realmService.saveMessages('s2', [
      { id: 'm2', role: 'user', content: 'b', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z' },
    ]);

    expect(realmService.getMessages('s1').messages).toHaveLength(1);
    expect(realmService.getMessages('s2').messages).toHaveLength(1);
  });
});

describe('realm.web — updateMessageLiked', () => {
  it('updates liked field of a stored message', async () => {
    await realmService.saveMessages('session1', [
      { id: 'msg1', role: 'assistant', content: 'hi', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', liked: null },
    ]);

    await realmService.updateMessageLiked('msg1', true);

    const result = realmService.getMessages('session1');
    expect(result.messages[0].liked).toBe(true);
  });

  it('sets liked to null (unlike)', async () => {
    await realmService.saveMessages('session1', [
      { id: 'msg1', role: 'assistant', content: 'hi', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', liked: true },
    ]);

    await realmService.updateMessageLiked('msg1', null);

    const result = realmService.getMessages('session1');
    expect(result.messages[0].liked).toBeNull();
  });

  it('does nothing for unknown messageId', async () => {
    await expect(realmService.updateMessageLiked('nonexistent', true)).resolves.toBeUndefined();
  });
});

describe('realm.web — deleteSession', () => {
  it('removes session and its messages', async () => {
    await realmService.saveSessions([
      { id: 's1', title: 'S1', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', lastMessagePreview: '' },
    ]);
    await realmService.saveMessages('s1', [
      { id: 'm1', role: 'user', content: 'hi', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z' },
    ]);

    await realmService.deleteSession('s1');

    expect(realmService.getSessions().items).toHaveLength(0);
    expect(realmService.getMessages('s1').messages).toHaveLength(0);
  });
});

describe('realm.web — clearSessionMessages', () => {
  it('removes only messages, keeps session', async () => {
    await realmService.saveSessions([
      { id: 's1', title: 'S1', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', lastMessagePreview: '' },
    ]);
    await realmService.saveMessages('s1', [
      { id: 'm1', role: 'user', content: 'hi', provider: 'openai', model: 'gpt-4o', createdAt: '2024-01-01T00:00:00Z' },
    ]);

    await realmService.clearSessionMessages('s1');

    expect(realmService.getSessions().items).toHaveLength(1);
    expect(realmService.getMessages('s1').messages).toHaveLength(0);
  });
});
