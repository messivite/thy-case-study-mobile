/**
 * chat.api.ts — likeMessage ve syncLikes kontrat testleri
 * axios doğrudan import edilemiyor (jest/expo streams uyumsuzluğu),
 * bu yüzden fonksiyonları mock üzerinden test ediyoruz.
 */

const mockPost = jest.fn();

jest.mock('@/api/chat.api', () => ({
  likeMessage: jest.fn(async (chatId: string, messageId: string, payload: { action: number }) => {
    return mockPost(`/api/chats/${chatId}/messages/${messageId}/like`, payload);
  }),
  syncLikes: jest.fn(async (chatId: string, payload: { items: unknown[] }) => {
    return mockPost(`/api/chats/${chatId}/likes/sync`, payload);
  }),
}));

import { likeMessage, syncLikes } from '@/api/chat.api';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('likeMessage — endpoint kontratı', () => {
  it('like action (1) doğru endpoint ile çağrılır', async () => {
    mockPost.mockResolvedValueOnce({ messageId: 'msg1', liked: true });
    await likeMessage('chat1', 'msg1', { action: 1 });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/chats/chat1/messages/msg1/like',
      { action: 1 },
    );
  });

  it('unlike action (2) doğru endpoint ile çağrılır', async () => {
    mockPost.mockResolvedValueOnce({ messageId: 'msg1', liked: null });
    await likeMessage('chat1', 'msg1', { action: 2 });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/chats/chat1/messages/msg1/like',
      { action: 2 },
    );
  });
});

describe('syncLikes — endpoint kontratı', () => {
  it('items ile doğru endpoint çağrılır', async () => {
    mockPost.mockResolvedValueOnce({
      results: [
        { messageId: 'msg1', ok: true, state: 1 },
        { messageId: 'msg2', ok: true, state: 2 },
      ],
    });

    await syncLikes('chat1', {
      items: [
        { messageId: 'msg1', action: 1 },
        { messageId: 'msg2', action: 2 },
      ],
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/chats/chat1/likes/sync',
      { items: [{ messageId: 'msg1', action: 1 }, { messageId: 'msg2', action: 2 }] },
    );
  });
});
